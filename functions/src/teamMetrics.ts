/**
 * Team Metrics Cloud Function
 *
 * Server-side computation of per-coach and org-wide KPIs.
 * Replaces the client-side scan that violated the analytics-server-side rule.
 * Restricted to authenticated org members.
 */

import * as admin from 'firebase-admin';

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

function toDate(ts: unknown): Date | null {
  if (!ts) return null;
  if (ts instanceof admin.firestore.Timestamp) return ts.toDate();
  if (ts instanceof Date) return ts;
  if (typeof ts === 'object' && ts !== null && 'seconds' in ts) {
    const obj = ts as { seconds: number; nanoseconds?: number };
    return new admin.firestore.Timestamp(obj.seconds, obj.nanoseconds ?? 0).toDate();
  }
  return null;
}

export async function computeTeamMetrics(
  request: { auth?: { uid?: string } },
  data: { orgId: string },
): Promise<TeamMetricsResult> {
  if (!request.auth?.uid) throw new Error('Authentication required.');

  const { orgId } = data;
  if (!orgId || typeof orgId !== 'string') throw new Error('orgId is required.');

  const db = getDb();

  // Verify caller is a member of the org
  const callerProfile = await db.doc(`userProfiles/${request.auth.uid}`).get();
  const profileData = callerProfile.data();
  const isPlatformAdmin = (await db.doc(`platform_admins/${request.auth.uid}`).get()).exists;
  if (!isPlatformAdmin && profileData?.organizationId !== orgId) {
    throw new Error('Access denied: caller is not a member of this organization.');
  }

  // 1. Fetch coaches
  const coachesSnap = await db
    .collection(`organizations/${orgId}/coaches`)
    .get();

  interface Coach {
    uid: string;
    displayName: string;
    email?: string;
    role: string;
  }
  const coaches: Coach[] = coachesSnap.docs.map((d) => ({
    uid: d.id,
    displayName: d.data().displayName || d.data().name || 'Coach',
    email: d.data().email,
    role: d.data().role || 'coach',
  }));

  // 2. Fetch assessments (up to 500, server-side)
  const assessmentsSnap = await db
    .collection(`organizations/${orgId}/assessments`)
    .orderBy('createdAt', 'desc')
    .limit(500)
    .get();

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
      createdAt: toDate(dd.createdAt),
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

  const coachMetrics: CoachMetrics[] = coaches.map((c) =>
    buildCoachMetrics(c.uid, c.displayName, c.email, c.role),
  );

  // Include coaches with assessments but not in coaches collection
  for (const [uid] of coachMap) {
    if (coachMetrics.some((c) => c.uid === uid)) continue;
    coachMetrics.push(buildCoachMetrics(uid, 'Unknown Coach', undefined, 'coach'));
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
