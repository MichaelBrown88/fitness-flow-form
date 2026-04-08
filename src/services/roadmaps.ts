import { COLLECTIONS } from '@/constants/collections';
import { getDb, getFirebaseAuth } from '@/services/firebase';
import {
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { RoadmapDoc, RoadmapItem, RoadmapPhase, PhaseTarget } from '@/lib/roadmap/types';
import type { ScoreSummary } from '@/lib/scoring/types';
import { refreshTrackablesFromScores } from '@/lib/roadmap/refreshTrackables';
import { logger } from '@/lib/utils/logger';
import { sanitizeForFirestore } from '@/lib/utils/firebaseUtils';
import { ORGANIZATION } from '@/lib/database/paths';
import { generateClientSlug } from '@/services/clientProfiles';

type RoadmapWithId = RoadmapDoc & { id: string };

const DEBUG_ROADMAP_SESSION_KEY = '__dbg523b0c_roadmap';

// #region agent log
function pushRoadmapDebugToSession(payload: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  try {
    const prev = sessionStorage.getItem(DEBUG_ROADMAP_SESSION_KEY);
    const rows: unknown[] = prev ? (JSON.parse(prev) as unknown[]) : [];
    if (!Array.isArray(rows)) return;
    rows.push(payload);
    sessionStorage.setItem(DEBUG_ROADMAP_SESSION_KEY, JSON.stringify(rows.slice(-30)));
  } catch {
    /* quota / private mode */
  }
}

/** Ring buffer JSON for `?roadmapDebug=1` on the public roadmap page (no tokens/PII in entries). */
export function readRoadmapLoadDebugLog(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  try {
    const raw = sessionStorage.getItem(DEBUG_ROADMAP_SESSION_KEY);
    if (!raw) {
      return '(no entries — sessionStorage empty or blocked)';
    }
    return JSON.stringify(JSON.parse(raw) as unknown, null, 2);
  } catch {
    return '(could not read debug log)';
  }
}

function debugRoadmapAgentLog(entry: {
  location: string;
  message: string;
  hypothesisId: string;
  data?: Record<string, unknown>;
}): void {
  const payload = { sessionId: '523b0c', ...entry, timestamp: Date.now() };
  pushRoadmapDebugToSession(payload);
  void fetch('http://127.0.0.1:7242/ingest/3297ca30-a29e-4ea7-8c63-6ef8b09c9c6c', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '523b0c' },
    body: JSON.stringify(payload),
  }).catch(() => {});
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    void fetch('/__debug_ndjson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }
}
// #endregion

/** Same shape as public report doc ids (`crypto.randomUUID`). Case must be preserved for Firestore path equality. */
const PUBLIC_REPORT_UUID_SHAPE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Rich-text / copy-paste often injects Unicode hyphens or zero-width chars that break Firestore doc id lookups. */
function normalizePublicShareToken(raw: string): string {
  const unicodeDashRe = new RegExp('[\\u2010\\u2011\\u2012\\u2013\\u2014\\u2212]', 'g');
  const zeroWidthChars = ['\u200b', '\u200c', '\u200d', '\ufeff'] as const;
  let s = raw.trim();
  for (const ch of zeroWidthChars) {
    if (s.includes(ch)) {
      s = s.split(ch).join('');
    }
  }
  try {
    s = decodeURIComponent(s);
  } catch {
    /* ignore malformed % sequences */
  }
  s = s.replace(unicodeDashRe, '-').trim();
  // Roadmap-only hex token (24 chars): case-insensitive; canonical lowercase matches `roadmap.shareToken`.
  if (/^[a-f0-9]{24}$/i.test(s)) {
    return s.toLowerCase();
  }
  // Public report UUID: Firestore document ids are case-sensitive — do not force lowercase.
  if (PUBLIC_REPORT_UUID_SHAPE.test(s)) {
    return s;
  }
  return s.toLowerCase();
}

/**
 * Public, token-keyed mirror so anonymous clients can open /r/:token/roadmap without org-scoped rules.
 */
async function syncPublicRoadmapMirror(
  shareToken: string,
  clientSlug: string,
  data: RoadmapDoc,
): Promise<void> {
  const payload: Record<string, unknown> = {
    clientSlug,
    clientName: data.clientName,
    summary: data.summary,
    items: data.items ?? [],
    clientGoals: data.clientGoals ?? [],
    coachUid: data.coachUid,
    organizationId: data.organizationId,
    assessmentId: data.assessmentId,
    updatedAt: serverTimestamp(),
  };
  if (data.activePhase !== undefined) {
    payload.activePhase = data.activePhase;
  }
  await setDoc(
    doc(getDb(), COLLECTIONS.PUBLIC_ROADMAPS, shareToken),
    sanitizeForFirestore(payload) as Record<string, unknown>,
    { merge: true },
  );
}

/**
 * If the org roadmap has a shareToken but no public mirror yet (pre-migration links),
 * create the mirror so anonymous /r/:token/roadmap works. Safe to call on every coach load.
 */
export async function ensurePublicRoadmapMirrorIfMissing(
  organizationId: string,
  clientSlug: string,
): Promise<void> {
  const ref = roadmapRef(organizationId, clientSlug);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const rm = snap.data() as RoadmapDoc;
  if (!rm.shareToken) return;
  const pubSnap = await getDoc(doc(getDb(), COLLECTIONS.PUBLIC_ROADMAPS, rm.shareToken));
  if (pubSnap.exists()) return;
  await syncPublicRoadmapMirror(rm.shareToken, clientSlug, rm);
}

/**
 * In v2 the roadmap lives at clients/{clientSlug}/roadmap/plan.
 * The returned `id` is the clientSlug — callers pass it back to updateRoadmap, deleteRoadmap, etc.
 */
function roadmapRef(organizationId: string, clientSlug: string) {
  return doc(getDb(), ORGANIZATION.clients.roadmap(organizationId, clientSlug));
}

export async function getRoadmapForClient(
  organizationId: string,
  clientName: string,
  _clientId?: string,
): Promise<RoadmapWithId | null> {
  const clientSlug = generateClientSlug(clientName);
  const ref = roadmapRef(organizationId, clientSlug);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { ...(snap.data() as RoadmapDoc), id: clientSlug };
}

export async function getRoadmapById(
  organizationId: string,
  clientSlug: string,
): Promise<RoadmapWithId | null> {
  const ref = roadmapRef(organizationId, clientSlug);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { ...(snap.data() as RoadmapDoc), id: clientSlug };
}

export async function createRoadmap(params: {
  organizationId: string;
  clientName: string;
  clientId?: string;
  assessmentId: string;
  coachUid: string;
  summary: string;
  items: RoadmapItem[];
  previousScores?: ScoreSummary;
  phaseTargets?: Record<RoadmapPhase, PhaseTarget[]>;
  baselineScores?: Record<string, number>;
  activePhase?: RoadmapPhase;
  clientGoals?: string[];
}): Promise<string> {
  const clientSlug = generateClientSlug(params.clientName);
  const ref = roadmapRef(params.organizationId, clientSlug);
  const payload: Record<string, unknown> = {
    clientName: params.clientName,
    ...(params.clientId ? { clientId: params.clientId } : {}),
    assessmentId: params.assessmentId,
    coachUid: params.coachUid,
    organizationId: params.organizationId,
    summary: params.summary,
    items: params.items,
    published: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (params.previousScores) payload.previousScores = params.previousScores;
  if (params.phaseTargets) payload.phaseTargets = params.phaseTargets;
  if (params.baselineScores) payload.baselineScores = params.baselineScores;
  if (params.activePhase) payload.activePhase = params.activePhase;
  if (params.clientGoals?.length) payload.clientGoals = params.clientGoals;
  await setDoc(ref, sanitizeForFirestore(payload) as Record<string, unknown>);
  return clientSlug;
}

export async function updateRoadmap(
  organizationId: string,
  clientSlug: string,
  data: Record<string, unknown>,
): Promise<void> {
  const ref = roadmapRef(organizationId, clientSlug);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const rm = snap.data() as RoadmapDoc;
  if (rm.shareToken) {
    await syncPublicRoadmapMirror(rm.shareToken, clientSlug, rm);
  }
}

export async function setRoadmapShareToken(
  organizationId: string,
  clientSlug: string,
  shareToken: string,
): Promise<void> {
  const ref = roadmapRef(organizationId, clientSlug);
  await updateDoc(ref, { shareToken, updatedAt: serverTimestamp() });
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const rm = snap.data() as RoadmapDoc;
  await syncPublicRoadmapMirror(shareToken, clientSlug, rm);
}

export async function getRoadmapByShareToken(
  shareToken: string,
): Promise<RoadmapWithId | null> {
  const token = normalizePublicShareToken(shareToken);
  if (!token) return null;
  /** Mirror docs are always keyed lowercase so reads stay stable regardless of URL UUID casing. */
  const publicMirrorDocId = PUBLIC_REPORT_UUID_SHAPE.test(token) ? token.toLowerCase() : token;
  const db = getDb();
  try {
    debugRoadmapAgentLog({
      location: 'roadmaps.ts:getRoadmapByShareToken',
      message: 'load start',
      hypothesisId: 'H_CASE',
      data: {
        tokenLen: token.length,
        uuidShape: PUBLIC_REPORT_UUID_SHAPE.test(token),
        mirrorDocIdLen: publicMirrorDocId.length,
      },
    });
    const pub = await getDoc(doc(db, COLLECTIONS.PUBLIC_ROADMAPS, publicMirrorDocId));
    if (pub.exists()) {
      const raw = pub.data() as Record<string, unknown>;
      const mirrorCoach =
        typeof raw.coachUid === 'string' ? raw.coachUid.trim() : '';
      const mirrorOrg =
        typeof raw.organizationId === 'string' ? raw.organizationId.trim() : '';
      debugRoadmapAgentLog({
        location: 'roadmaps.ts:getRoadmapByShareToken',
        message: 'publicRoadmaps mirror state',
        hypothesisId: 'H_MIRROR',
        data: { complete: !!(mirrorCoach && mirrorOrg) },
      });
      // Incomplete mirrors must not short-circuit; otherwise anonymous users never hit the callable.
      if (mirrorCoach && mirrorOrg) {
        const clientSlug =
          typeof raw.clientSlug === 'string' ? raw.clientSlug : token;
        const items = Array.isArray(raw.items) ? (raw.items as RoadmapItem[]) : [];
        const clientGoals = Array.isArray(raw.clientGoals)
          ? (raw.clientGoals as string[])
          : undefined;
        const base = raw as unknown as RoadmapDoc;
        return {
          ...base,
          id: clientSlug,
          clientName: typeof raw.clientName === 'string' ? raw.clientName : base.clientName ?? 'Client',
          summary: typeof raw.summary === 'string' ? raw.summary : base.summary ?? '',
          items,
          clientGoals,
        };
      }
    } else {
      debugRoadmapAgentLog({
        location: 'roadmaps.ts:getRoadmapByShareToken',
        message: 'no publicRoadmaps mirror doc',
        hypothesisId: 'H_MIRROR',
        data: { uuidShape: PUBLIC_REPORT_UUID_SHAPE.test(token) },
      });
    }

    // Prefer callable first: Admin SDK avoids client rules/index issues on collectionGroup.
    // Legacy Firestore query is only a fallback for signed-in coaches after soft callable failures.
    try {
      const { httpsCallable } = await import('firebase/functions');
      const { getFirebaseFunctions } = await import('@/services/firebase');
      const fn = httpsCallable<
        { shareToken: string },
        {
          clientSlug: string;
          clientName: string;
          summary: string;
          items: unknown[];
          activePhase?: unknown;
          clientGoals?: unknown[];
          coachUid: string;
          organizationId: string;
          assessmentId: string;
        }
      >(getFirebaseFunctions(), 'syncPublicRoadmapMirror');
      const { data } = await fn({ shareToken: token });
      debugRoadmapAgentLog({
        location: 'roadmaps.ts:getRoadmapByShareToken',
        message: 'syncPublicRoadmapMirror ok',
        hypothesisId: 'H_OK',
        data: { clientSlugLen: data.clientSlug?.length ?? 0, uuidShape: PUBLIC_REPORT_UUID_SHAPE.test(token) },
      });
      const now = Timestamp.now();
      const items = Array.isArray(data.items) ? (data.items as RoadmapItem[]) : [];
      const clientGoals = Array.isArray(data.clientGoals)
        ? (data.clientGoals as string[])
        : [];
      return {
        id: data.clientSlug,
        clientName: data.clientName,
        summary: data.summary,
        items,
        activePhase: data.activePhase as RoadmapPhase | undefined,
        clientGoals,
        coachUid: data.coachUid,
        organizationId: data.organizationId,
        assessmentId: data.assessmentId,
        published: true,
        createdAt: now,
        updatedAt: now,
      };
    } catch (callableErr: unknown) {
      const code =
        callableErr &&
        typeof callableErr === 'object' &&
        'code' in callableErr &&
        typeof (callableErr as { code: unknown }).code === 'string'
          ? (callableErr as { code: string }).code
          : '';
      const errMsg =
        callableErr instanceof Error
          ? callableErr.message.slice(0, 240)
          : undefined;
      debugRoadmapAgentLog({
        location: 'roadmaps.ts:getRoadmapByShareToken',
        message: 'syncPublicRoadmapMirror callable err',
        hypothesisId: 'H_CALLABLE',
        data: {
          code,
          tokenLen: token.length,
          uuidShape: PUBLIC_REPORT_UUID_SHAPE.test(token),
          errMsg,
        },
      });
      if (import.meta.env.DEV) {
        logger.warn('[ROADMAPS][debug] syncPublicRoadmapMirror callable', {
          code,
          tokenPrefix: token.slice(0, 8),
        });
      }

      const softCallableFailure =
        code === 'functions/not-found' ||
        code === 'functions/failed-precondition' ||
        code === 'functions/resource-exhausted' ||
        code === 'functions/internal' ||
        code === '';

      // Report-UUID URLs use a different credential than `roadmap.shareToken` (24-char hex); skip legacy query.
      if (
        getFirebaseAuth().currentUser &&
        softCallableFailure &&
        !PUBLIC_REPORT_UUID_SHAPE.test(token)
      ) {
        try {
          const legacyQ = query(
            collectionGroup(db, COLLECTIONS.ROADMAP),
            where('shareToken', '==', token),
            limit(1),
          );
          const snap = await getDocs(legacyQ);
          if (!snap.empty) {
            const d = snap.docs[0];
            const clientSlug = d.ref.parent.parent?.id ?? d.id;
            return { ...(d.data() as RoadmapDoc), id: clientSlug };
          }
        } catch (legacyErr) {
          logger.warn('[ROADMAPS] legacy shareToken collectionGroup failed after callable', legacyErr);
        }
      }

      if (
        code === 'functions/not-found' ||
        code === 'functions/invalid-argument' ||
        code === 'functions/failed-precondition' ||
        code === 'functions/resource-exhausted'
      ) {
        return null;
      }
      logger.warn('[ROADMAPS] syncPublicRoadmapMirror callable failed', callableErr);
      return null;
    }
  } catch (err) {
    logger.error('Failed to load public ARC™ by share token', 'ROADMAPS', err);
    return null;
  }
}

/**
 * In v2 there is one roadmap per client — returns a single-element array or empty.
 */
export async function getRoadmapHistory(
  organizationId: string,
  clientName: string,
): Promise<RoadmapWithId[]> {
  const roadmap = await getRoadmapForClient(organizationId, clientName);
  return roadmap ? [roadmap] : [];
}

export async function deleteRoadmap(organizationId: string, clientSlug: string): Promise<void> {
  const ref = roadmapRef(organizationId, clientSlug);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data() as RoadmapDoc;
    if (data.shareToken) {
      try {
        await deleteDoc(doc(getDb(), COLLECTIONS.PUBLIC_ROADMAPS, data.shareToken));
      } catch (e) {
        logger.warn('[ROADMAPS] Failed to delete public ARC™ mirror', e);
      }
    }
  }
  await deleteDoc(ref);
}

export function generateShareToken(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Refresh the latest assessment scores on the client's active roadmap.
 * Writes `currentScores` (pillar id → score) and `lastScoreRefreshedAt`.
 * When `fullScores` is provided, also updates `items[].trackables[].current`
 * via refreshTrackablesFromScores (preserving baseline and target).
 * Called non-blocking after every assessment save.
 */
export async function refreshRoadmapScores(
  organizationId: string,
  clientName: string,
  currentScores: Record<string, number>,
  _clientId?: string,
  fullScores?: ScoreSummary,
): Promise<void> {
  const clientSlug = generateClientSlug(clientName);
  const ref = roadmapRef(organizationId, clientSlug);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const roadmap = snap.data() as RoadmapDoc;

  if (fullScores && roadmap.items?.length) {
    const updatedItems = refreshTrackablesFromScores(roadmap.items, fullScores);
    await updateDoc(ref, {
      currentScores,
      items: updatedItems,
      lastScoreRefreshedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    await updateDoc(ref, {
      currentScores,
      lastScoreRefreshedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  const after = await getDoc(ref);
  if (after.exists()) {
    const rm = after.data() as RoadmapDoc;
    if (rm.shareToken) {
      await syncPublicRoadmapMirror(rm.shareToken, clientSlug, rm);
    }
  }
}
