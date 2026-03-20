import { getDb } from '@/services/firebase';
import {
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import type { RoadmapDoc, RoadmapItem, RoadmapPhase, PhaseTarget } from '@/lib/roadmap/types';
import type { ScoreSummary } from '@/lib/scoring/types';
import { refreshTrackablesFromScores } from '@/lib/roadmap/refreshTrackables';
import { logger } from '@/lib/utils/logger';
import { sanitizeForFirestore } from '@/lib/utils/firebaseUtils';
import { ORGANIZATION } from '@/lib/database/paths';
import { generateClientSlug } from '@/services/clientProfiles';

type RoadmapWithId = RoadmapDoc & { id: string };

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
}

export async function setRoadmapShareToken(
  organizationId: string,
  clientSlug: string,
  shareToken: string,
): Promise<void> {
  const ref = roadmapRef(organizationId, clientSlug);
  await updateDoc(ref, { shareToken, updatedAt: serverTimestamp() });
}

export async function getRoadmapByShareToken(
  shareToken: string,
): Promise<RoadmapWithId | null> {
  const db = getDb();
  const q = query(
    collectionGroup(db, 'roadmap'),
    where('shareToken', '==', shareToken),
    limit(1),
  );
  try {
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    // Parent path: organizations/{orgId}/clients/{clientSlug}/roadmap/plan
    const clientSlug = d.ref.parent.parent?.id ?? d.id;
    return { ...(d.data() as RoadmapDoc), id: clientSlug };
  } catch (err) {
    logger.error('Failed to query roadmap by share token', 'ROADMAPS', err);
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
}
