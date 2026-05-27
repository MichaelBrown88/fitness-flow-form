/**
 * Firestore CRUD for coach consultation transcripts.
 * Path: organizations/{orgId}/clients/{clientSlug}/consultations/{id}
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { ORGANIZATION } from '@/lib/database/paths';
import { validateOrganizationId } from '@/lib/utils/validateOrganizationId';
import { logger } from '@/lib/utils/logger';
import type { ConsultationDoc, ConsultationSaveInput } from '@/lib/consultation/types';
import type { ConsultationQuestionId } from '@/constants/consultation';
import { CONSULTATION_QUESTIONS } from '@/constants/consultation';

const LIST_LIMIT = 20;

function emptyAnswers(): Record<ConsultationQuestionId, string> {
  const out = {} as Record<ConsultationQuestionId, string>;
  for (const q of CONSULTATION_QUESTIONS) {
    out[q.id] = '';
  }
  return out;
}

function clientDocRef(orgId: string, clientSlug: string) {
  return doc(getDb(), ORGANIZATION.clients.doc(orgId, clientSlug));
}

function consultationRef(orgId: string, clientSlug: string, consultationId: string) {
  return doc(getDb(), ORGANIZATION.clients.consultations.doc(orgId, clientSlug, consultationId));
}

function toConsultationDoc(id: string, data: Record<string, unknown>): ConsultationDoc | null {
  const organizationId = typeof data.organizationId === 'string' ? data.organizationId : '';
  const clientSlug = typeof data.clientSlug === 'string' ? data.clientSlug : '';
  const coachUid = typeof data.coachUid === 'string' ? data.coachUid : '';
  if (!organizationId || !clientSlug || !coachUid) return null;

  const rawAnswers = data.answers;
  const answers =
    rawAnswers && typeof rawAnswers === 'object' && !Array.isArray(rawAnswers)
      ? { ...emptyAnswers(), ...(rawAnswers as ConsultationDoc['answers']) }
      : emptyAnswers();

  const clientGoals = Array.isArray(data.clientGoals)
    ? data.clientGoals.filter((g): g is string => typeof g === 'string')
    : [];

  return {
    id,
    organizationId,
    clientSlug,
    coachUid,
    createdAt: data.createdAt as ConsultationDoc['createdAt'],
    updatedAt: data.updatedAt as ConsultationDoc['updatedAt'],
    prepNotes: typeof data.prepNotes === 'string' ? data.prepNotes : '',
    answers,
    clientGoals,
    trainingFrequency:
      typeof data.trainingFrequency === 'string' ? data.trainingFrequency : undefined,
    goalDeadline: typeof data.goalDeadline === 'string' ? data.goalDeadline : undefined,
    assessmentId: typeof data.assessmentId === 'string' ? data.assessmentId : undefined,
  };
}

export async function getConsultationById(
  orgId: string,
  clientSlug: string,
  consultationId: string,
): Promise<ConsultationDoc | null> {
  const validOrgId = validateOrganizationId(orgId, null);
  if (!validOrgId || !clientSlug?.trim() || !consultationId?.trim()) return null;
  try {
    const snap = await getDoc(consultationRef(validOrgId, clientSlug, consultationId));
    if (!snap.exists()) return null;
    return toConsultationDoc(snap.id, snap.data());
  } catch (err) {
    logger.error('Failed to load consultation', 'CONSULTATION', err);
    return null;
  }
}

export async function getLatestConsultation(
  orgId: string,
  clientSlug: string,
): Promise<ConsultationDoc | null> {
  const validOrgId = validateOrganizationId(orgId, null);
  if (!validOrgId || !clientSlug?.trim()) return null;
  try {
    const clientSnap = await getDoc(clientDocRef(validOrgId, clientSlug));
    const latestId =
      clientSnap.exists() && typeof clientSnap.data().latestConsultationId === 'string'
        ? clientSnap.data().latestConsultationId
        : null;
    if (latestId) {
      const latest = await getConsultationById(validOrgId, clientSlug, latestId);
      if (latest) return latest;
    }

    const q = query(
      collection(getDb(), ORGANIZATION.clients.consultations.collection(validOrgId, clientSlug)),
      orderBy('updatedAt', 'desc'),
      limit(1),
    );
    const snaps = await getDocs(q);
    const first = snaps.docs[0];
    if (!first) return null;
    return toConsultationDoc(first.id, first.data());
  } catch (err) {
    logger.error('Failed to load latest consultation', 'CONSULTATION', err);
    return null;
  }
}

export async function listConsultations(
  orgId: string,
  clientSlug: string,
): Promise<ConsultationDoc[]> {
  const validOrgId = validateOrganizationId(orgId, null);
  if (!validOrgId || !clientSlug?.trim()) return [];
  try {
    const q = query(
      collection(getDb(), ORGANIZATION.clients.consultations.collection(validOrgId, clientSlug)),
      orderBy('updatedAt', 'desc'),
      limit(LIST_LIMIT),
    );
    const snaps = await getDocs(q);
    const docs: ConsultationDoc[] = [];
    for (const d of snaps.docs) {
      const parsed = toConsultationDoc(d.id, d.data());
      if (parsed) docs.push(parsed);
    }
    return docs;
  } catch (err) {
    logger.error('Failed to list consultations', 'CONSULTATION', err);
    return [];
  }
}

export async function saveConsultation(input: ConsultationSaveInput): Promise<ConsultationDoc> {
  const validOrgId = validateOrganizationId(input.organizationId, null);
  if (!validOrgId || !input.clientSlug?.trim() || !input.coachUid?.trim()) {
    throw new Error('Invalid consultation save input');
  }

  const now = Timestamp.now();
  let consultationId = input.consultationId?.trim() ?? '';
  const existing = consultationId
    ? await getConsultationById(validOrgId, input.clientSlug, consultationId)
    : null;

  if (!consultationId || !existing) {
    consultationId = doc(
      collection(getDb(), ORGANIZATION.clients.consultations.collection(validOrgId, input.clientSlug)),
    ).id;
    const payload = {
      organizationId: validOrgId,
      clientSlug: input.clientSlug,
      coachUid: input.coachUid,
      createdAt: now,
      updatedAt: now,
      prepNotes: input.prepNotes ?? '',
      answers: { ...emptyAnswers(), ...(input.answers ?? {}) },
      clientGoals: input.clientGoals ?? [],
      ...(input.trainingFrequency ? { trainingFrequency: input.trainingFrequency } : {}),
      ...(input.goalDeadline ? { goalDeadline: input.goalDeadline } : {}),
      ...(input.assessmentId ? { assessmentId: input.assessmentId } : {}),
    };
    await setDoc(consultationRef(validOrgId, input.clientSlug, consultationId), payload);
  } else {
    const patch: Record<string, unknown> = { updatedAt: now };
    if (input.prepNotes !== undefined) patch.prepNotes = input.prepNotes;
    if (input.answers !== undefined) {
      patch.answers = { ...existing.answers, ...input.answers };
    }
    if (input.clientGoals !== undefined) patch.clientGoals = input.clientGoals;
    if (input.trainingFrequency !== undefined) {
      patch.trainingFrequency = input.trainingFrequency;
    }
    if (input.goalDeadline !== undefined) patch.goalDeadline = input.goalDeadline;
    if (input.assessmentId !== undefined) patch.assessmentId = input.assessmentId;
    await updateDoc(consultationRef(validOrgId, input.clientSlug, consultationId), patch);
  }

  await updateDoc(clientDocRef(validOrgId, input.clientSlug), {
    latestConsultationId: consultationId,
  });

  const saved = await getConsultationById(validOrgId, input.clientSlug, consultationId);
  if (!saved) {
    throw new Error('Consultation save failed');
  }
  return saved;
}
