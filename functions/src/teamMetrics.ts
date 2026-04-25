/**
 * Team Metrics Cloud Function
 *
 * Server-side computation of per-coach and org-wide KPIs.
 * Replaces the client-side scan that violated the analytics-server-side rule.
 * Restricted to authenticated org members.
 */

import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { HttpsError } from 'firebase-functions/v2/https';
import { firestoreValueToDate } from './firestoreTimestamp';

function getDb() {
  return admin.firestore();
}

export interface CoachMetrics {
  uid: string;
  displayName: string;
  email?: string;
  role: string;
  clientCount: number;
  assessments30d: number;
  avgScore: number;
  avgTrend: number;
  lastActive: string | null;
  overdueCount: number;
}

export interface TeamSummary {
  totalClients: number;
  totalCoaches: number;
  assessmentsThisMonth: number;
  avgScoreChange: number;
}

export interface TeamMetricsResult {
  summary: TeamSummary;
  coaches: CoachMetrics[];
}

const GENERIC_COACH_LABEL = 'Coach';
const BATCH_GET_LIMIT = 10;
/** Caps worst-case reads; team dashboard is roster-scale (typical orgs well under this). */
const TEAM_METRICS_MAX_COACHES = 500;
/**
 * Upper bound on distinct UIDs passed to getAll (coaches + assessment coachUids).
 * Uses batched document reads, not list queries — cap prevents pathological fan-out.
 */
const TEAM_METRICS_MAX_PROFILE_UID_LOOKUPS = 1000;
/** Sequential auth.getUser calls are expensive; cap enrich pass for worst-case orgs. */
const TEAM_METRICS_MAX_AUTH_ENRICH_UIDS = 200;

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function getAuthUserWithTransientRetry(
  auth: admin.auth.Auth,
  uid: string,
): Promise<admin.auth.UserRecord | null> {
  const retryableCodes = new Set(['auth/network-error', 'auth/internal-error']);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await auth.getUser(uid);
    } catch (e: unknown) {
      const code =
        e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : '';
      if (attempt === 0 && retryableCodes.has(code)) {
        await sleepMs(280);
        continue;
      }
      return null;
    }
  }
  return null;
}

async function batchGetProfileDisplayNames(
  db: admin.firestore.Firestore,
  orgId: string,
  uids: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  let unique = [...new Set(uids.filter(Boolean))];
  if (unique.length > TEAM_METRICS_MAX_PROFILE_UID_LOOKUPS) {
    logger.warn('[teamMetrics] profile uid lookup list truncated', {
      orgId,
      requested: unique.length,
      cap: TEAM_METRICS_MAX_PROFILE_UID_LOOKUPS,
    });
    unique = unique.slice(0, TEAM_METRICS_MAX_PROFILE_UID_LOOKUPS);
  }
  for (let i = 0; i < unique.length; i += BATCH_GET_LIMIT) {
    const chunk = unique.slice(i, i + BATCH_GET_LIMIT);
    const refs = chunk.map((uid) => db.doc(`user-profiles/${uid}`));
    const snaps = await db.getAll(...refs);
    for (const snap of snaps) {
      if (!snap.exists) continue;
      const d = snap.data() as { organizationId?: unknown; displayName?: unknown };
      if (d.organizationId !== orgId) continue;
      const n = typeof d.displayName === 'string' ? d.displayName.trim() : '';
      if (n && n !== GENERIC_COACH_LABEL) out.set(snap.id, n);
    }
  }
  return out;
}

/** When user-profiles still says "Coach", fall back to Firebase Auth displayName or email local-part. */
async function enrichDisplayNamesFromFirebaseAuth(
  orgId: string,
  uids: string[],
  names: Map<string, string>,
): Promise<void> {
  const auth = admin.auth();
  let list = uids;
  if (list.length > TEAM_METRICS_MAX_AUTH_ENRICH_UIDS) {
    logger.warn('[teamMetrics] auth displayName enrich list truncated', {
      orgId,
      requested: list.length,
      cap: TEAM_METRICS_MAX_AUTH_ENRICH_UIDS,
    });
    list = list.slice(0, TEAM_METRICS_MAX_AUTH_ENRICH_UIDS);
  }
  for (const uid of list) {
    const existing = names.get(uid);
    if (existing && existing !== GENERIC_COACH_LABEL) continue;
    const u = await getAuthUserWithTransientRetry(auth, uid);
    if (!u) continue;
    const fromAuth = (u.displayName || '').trim();
    if (fromAuth && fromAuth !== GENERIC_COACH_LABEL) {
      names.set(uid, fromAuth);
      continue;
    }
    const local = u.email?.split('@')[0]?.replace(/[._-]+/g, ' ').trim();
    if (local) {
      const pretty = local
        .split(/\s+/g)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
      if (pretty) names.set(uid, pretty);
    }
  }
}

export async function computeTeamMetrics(
  request: { auth?: { uid?: string } },
  data: { orgId: string },
): Promise<TeamMetricsResult> {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const { orgId } = data;
  if (!orgId || typeof orgId !== 'string') {
    throw new HttpsError('invalid-argument', 'orgId is required.');
  }

  const db = getDb();

  // Verify caller is a member of the org
  const callerProfile = await db.doc(`user-profiles/${request.auth.uid}`).get();
  const profileData = callerProfile.data();
  const isPlatformAdmin = (await db.doc(`platform-admins/${request.auth.uid}`).get()).exists;
  if (!isPlatformAdmin && profileData?.organizationId !== orgId) {
    throw new HttpsError(
      'permission-denied',
      'Access denied: caller is not a member of this organisation.',
    );
  }

  // 1. Fetch coaches
  const coachesSnap = await db
    .collection(`organizations/${orgId}/coaches`)
    .limit(TEAM_METRICS_MAX_COACHES)
    .get();

  interface Coach {
    uid: string;
    displayName: string;
    email?: string;
    role: string;
  }
  const coaches: Coach[] = coachesSnap.docs.map((d) => {
    const raw = d.data();
    const fromDoc =
      (typeof raw.displayName === 'string' && raw.displayName.trim()) ||
      (typeof raw.name === 'string' && raw.name.trim()) ||
      GENERIC_COACH_LABEL;
    return {
      uid: d.id,
      displayName: fromDoc,
      email: typeof raw.email === 'string' ? raw.email : undefined,
      role: (typeof raw.role === 'string' && raw.role) || 'coach',
    };
  });

  // 2. Fetch assessments (up to 500, server-side)
  const assessmentsCol = db.collection(`organizations/${orgId}/assessments`);
  let assessmentsSnap;
  try {
    assessmentsSnap = await assessmentsCol.orderBy('createdAt', 'desc').limit(500).get();
  } catch (err) {
    logger.warn('[teamMetrics] ordered assessments query failed; using unordered limit', {
      orgId,
      error: err instanceof Error ? err.message : String(err),
    });
    assessmentsSnap = await assessmentsCol.limit(500).get();
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  interface AssessmentRecord {
    coachUid: string;
    clientName: string;
    overallScore: number;
    trend: number;
    createdAt: Date | null;
  }

  const allAssessments: AssessmentRecord[] = assessmentsSnap.docs.map((d) => {
    const dd = d.data();
    return {
      coachUid: dd.coachUid || '',
      clientName: dd.clientName || '',
      overallScore: typeof dd.overallScore === 'number' ? dd.overallScore : (dd.scores?.overall ?? 0),
      trend: typeof dd.trend === 'number' ? dd.trend : 0,
      createdAt: firestoreValueToDate(dd.createdAt),
    };
  });

  // 3. Group by coachUid
  const coachMap = new Map<string, AssessmentRecord[]>();
  for (const a of allAssessments) {
    if (!a.coachUid) continue;
    const list = coachMap.get(a.coachUid) ?? [];
    list.push(a);
    coachMap.set(a.coachUid, list);
  }

  const uidsForProfileLookup = new Set<string>();
  for (const c of coaches) {
    const t = c.displayName.trim();
    if (!t || t === GENERIC_COACH_LABEL) uidsForProfileLookup.add(c.uid);
  }
  for (const uid of coachMap.keys()) {
    if (!coaches.some((c) => c.uid === uid)) uidsForProfileLookup.add(uid);
  }
  const profileDisplayNames = await batchGetProfileDisplayNames(db, orgId, [...uidsForProfileLookup]);
  const needAuthEnrich = [...uidsForProfileLookup].filter((uid) => {
    const fromProfile = profileDisplayNames.get(uid);
    return !fromProfile || fromProfile === GENERIC_COACH_LABEL;
  });
  await enrichDisplayNamesFromFirebaseAuth(orgId, needAuthEnrich, profileDisplayNames);

  const coachesResolved: Coach[] = coaches.map((c) => {
    const fromProfile = profileDisplayNames.get(c.uid);
    if (fromProfile) return { ...c, displayName: fromProfile };
    const t = c.displayName.trim();
    if (!t || t === GENERIC_COACH_LABEL) return { ...c, displayName: GENERIC_COACH_LABEL };
    return c;
  });

  function buildCoachMetrics(uid: string, displayName: string, email: string | undefined, role: string): CoachMetrics {
    const records = coachMap.get(uid) ?? [];
    const uniqueClients = new Set(records.map((r) => r.clientName));
    const recent30d = records.filter((r) => r.createdAt && r.createdAt >= thirtyDaysAgo);
    const scores = records.filter((r) => r.overallScore > 0).map((r) => r.overallScore);
    const trends = records.filter((r) => r.trend !== 0).map((r) => r.trend);
    const latest = records.reduce<Date | null>((max, r) => {
      if (!r.createdAt) return max;
      if (!max) return r.createdAt;
      return r.createdAt > max ? r.createdAt : max;
    }, null);
    return {
      uid,
      displayName,
      email,
      role,
      clientCount: uniqueClients.size,
      assessments30d: recent30d.length,
      avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      avgTrend: trends.length > 0 ? Math.round((trends.reduce((a, b) => a + b, 0) / trends.length) * 10) / 10 : 0,
      lastActive: latest ? latest.toISOString() : null,
      overdueCount: 0,
    };
  }

  const coachMetrics: CoachMetrics[] = coachesResolved.map((c) =>
    buildCoachMetrics(c.uid, c.displayName, c.email, c.role),
  );

  // Include coaches with assessments but not in coaches collection
  for (const [uid] of coachMap) {
    if (coachMetrics.some((c) => c.uid === uid)) continue;
    const resolved = profileDisplayNames.get(uid) || 'Unknown Coach';
    coachMetrics.push(buildCoachMetrics(uid, resolved, undefined, 'coach'));
  }

  coachMetrics.sort((a, b) => b.assessments30d - a.assessments30d);

  // 4. Org summary
  const allClients = new Set(allAssessments.map((a) => a.clientName));
  const assessmentsThisMonth = allAssessments.filter(
    (a) => a.createdAt && a.createdAt >= monthStart,
  ).length;
  const allTrends = allAssessments.filter((a) => a.trend !== 0).map((a) => a.trend);
  const avgScoreChange =
    allTrends.length > 0
      ? Math.round((allTrends.reduce((a, b) => a + b, 0) / allTrends.length) * 10) / 10
      : 0;

  return {
    summary: {
      totalClients: allClients.size,
      totalCoaches: coachMetrics.length,
      assessmentsThisMonth,
      avgScoreChange,
    },
    coaches: coachMetrics,
  };
}
