/**
 * Firestore CRUD for coach notes.
 * Path: organizations/{orgId}/clients/{clientSlug}/coachNotes/notes
 */

import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { getDb } from './firebase';
import { ORGANIZATION } from '@/lib/database/paths';
import { logger } from '@/lib/utils/logger';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring/types';
import { generateCoachNotes, mergeCoachNotes } from '@/lib/coachNotes/generateCoachNotes';
import type { CoachNotesDoc, CoachFinding, PillarId } from '@/lib/coachNotes/types';

export async function getCoachNotes(
  orgId: string,
  clientSlug: string,
): Promise<CoachNotesDoc | null> {
  if (!orgId || !clientSlug) return null;
  try {
    const ref = doc(getDb(), ORGANIZATION.clients.coachNotes(orgId, clientSlug));
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as CoachNotesDoc;
  } catch (err) {
    logger.error('Failed to load coach notes', 'COACH_NOTES', err);
    return null;
  }
}

/**
 * Generate fresh notes from an assessment, merge with any existing
 * coach-authored overrides, and persist. Single source of truth used
 * by both the post-assessment hook and the Console "regenerate" button.
 */
export async function regenerateCoachNotes(args: {
  orgId: string;
  clientSlug: string;
  formData: FormData;
  scores: ScoreSummary;
  assessmentId?: string;
}): Promise<CoachNotesDoc> {
  const { orgId, clientSlug, formData, scores, assessmentId } = args;
  const existing = await getCoachNotes(orgId, clientSlug);
  const fresh = generateCoachNotes({
    clientSlug,
    organizationId: orgId,
    formData,
    scores,
    assessmentId,
  });
  const merged = mergeCoachNotes(existing, fresh);
  await persistCoachNotes(merged);
  return merged;
}

/**
 * Persist a CoachNotesDoc directly. Use after coach edits a finding's
 * `coachNote`, `acknowledged`, or `status` field.
 */
export async function persistCoachNotes(notes: CoachNotesDoc): Promise<void> {
  const ref = doc(getDb(), ORGANIZATION.clients.coachNotes(notes.organizationId, notes.clientSlug));
  const sanitized = stripUndefined({ ...notes, updatedAt: Timestamp.now() });
  await setDoc(ref, sanitized, { merge: true });
}

/**
 * Deep-strip `undefined` values from a CoachNotesDoc before sending to
 * Firestore. setDoc rejects undefined; the doc has many optional fields
 * (sourceAssessmentId, measurements, references, coachOverview, etc.)
 * so a recursive strip is more resilient than per-field guards.
 *
 * Recurses through plain objects + arrays; passes class instances
 * (Timestamp) through unchanged.
 */
function stripUndefined<T>(value: T): T {
  if (value === undefined || value === null) return value;
  if (Array.isArray(value)) {
    return value.map((v) => stripUndefined(v)) as unknown as T;
  }
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return value;
}

/**
 * Convenience: update one finding in-place without regenerating.
 * Used when the coach edits a single finding's note / status / etc.
 */
export async function updateCoachFinding(args: {
  orgId: string;
  clientSlug: string;
  pillar: PillarId;
  findingId: string;
  patch: Partial<CoachFinding>;
}): Promise<CoachNotesDoc | null> {
  const { orgId, clientSlug, pillar, findingId, patch } = args;
  const existing = await getCoachNotes(orgId, clientSlug);
  if (!existing) return null;
  const pillarBlock = existing.pillars[pillar];
  if (!pillarBlock) return null;
  const idx = pillarBlock.findings.findIndex((f) => f.id === findingId);
  if (idx < 0) return null;

  const next: CoachNotesDoc = {
    ...existing,
    pillars: {
      ...existing.pillars,
      [pillar]: {
        ...pillarBlock,
        findings: pillarBlock.findings.map((f, i) => (i === idx ? { ...f, ...patch } : f)),
      },
    },
    updatedAt: Timestamp.now(),
  };
  await persistCoachNotes(next);
  return next;
}
