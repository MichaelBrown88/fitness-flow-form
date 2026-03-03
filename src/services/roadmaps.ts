import { getDb } from '@/services/firebase';
import { COLLECTIONS } from '@/constants/collections';
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import type { RoadmapDoc, RoadmapItem, RoadmapPhase, PhaseTarget } from '@/lib/roadmap/types';
import type { ScoreSummary } from '@/lib/scoring/types';
import { logger } from '@/lib/utils/logger';
import { sanitizeForFirestore } from '@/lib/utils/firebaseUtils';

type RoadmapWithId = RoadmapDoc & { id: string };

function orgRoadmapsRef(organizationId: string) {
  return collection(
    getDb(),
    COLLECTIONS.ORGANIZATIONS,
    organizationId,
    COLLECTIONS.ROADMAPS,
  );
}

export async function getRoadmapForClient(
  organizationId: string,
  clientName: string,
): Promise<RoadmapWithId | null> {
  const q = query(
    orgRoadmapsRef(organizationId),
    where('clientName', '==', clientName),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { ...(d.data() as RoadmapDoc), id: d.id };
}

export async function getRoadmapById(
  organizationId: string,
  roadmapId: string,
): Promise<RoadmapWithId | null> {
  const ref = doc(orgRoadmapsRef(organizationId), roadmapId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { ...(snap.data() as RoadmapDoc), id: snap.id };
}

export async function createRoadmap(params: {
  organizationId: string;
  clientName: string;
  assessmentId: string;
  coachUid: string;
  summary: string;
  items: RoadmapItem[];
  previousScores?: ScoreSummary;
  phaseTargets?: Record<RoadmapPhase, PhaseTarget[]>;
  baselineScores?: Record<string, number>;
  activePhase?: RoadmapPhase;
}): Promise<string> {
  const ref = doc(orgRoadmapsRef(params.organizationId));
  const payload: Record<string, unknown> = {
    clientName: params.clientName,
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
  await setDoc(ref, sanitizeForFirestore(payload) as Record<string, unknown>);
  return ref.id;
}

export async function updateRoadmap(
  organizationId: string,
  roadmapId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const ref = doc(orgRoadmapsRef(organizationId), roadmapId);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function setRoadmapShareToken(
  organizationId: string,
  roadmapId: string,
  shareToken: string,
): Promise<void> {
  const ref = doc(orgRoadmapsRef(organizationId), roadmapId);
  await updateDoc(ref, { shareToken, updatedAt: serverTimestamp() });
}

export async function getRoadmapByShareToken(
  shareToken: string,
): Promise<RoadmapWithId | null> {
  const db = getDb();
  const q = query(
    collectionGroup(db, COLLECTIONS.ROADMAPS),
    where('shareToken', '==', shareToken),
    limit(1),
  );
  try {
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { ...(d.data() as RoadmapDoc), id: d.id };
  } catch (err) {
    logger.error('Failed to query roadmap by share token', 'ROADMAPS', err);
    return null;
  }
}

export async function getRoadmapHistory(
  organizationId: string,
  clientName: string,
): Promise<RoadmapWithId[]> {
  const q = query(
    orgRoadmapsRef(organizationId),
    where('clientName', '==', clientName),
    orderBy('createdAt', 'desc'),
    limit(10),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...(d.data() as RoadmapDoc), id: d.id }));
}

export async function deleteRoadmap(organizationId: string, roadmapId: string): Promise<void> {
  const ref = doc(orgRoadmapsRef(organizationId), roadmapId);
  await deleteDoc(ref);
}

export function generateShareToken(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
