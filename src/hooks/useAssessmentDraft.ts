/**
 * Assessment Draft Auto-Save Hook
 *
 * Debounces form data changes into sessionStorage so coaches never
 * lose work mid-assessment. Provides helpers to detect, restore,
 * and clear saved drafts.
 */

import { useEffect, useRef } from 'react';
import {
  readDraftAssessmentRaw,
  removeDraftAssessment,
  hasEditAssessmentInSession,
  writeSessionDraftAssessmentJson,
} from '@/lib/assessment/assessmentSessionStorage';
import { logger } from '@/lib/utils/logger';
import type { FormData } from '@/contexts/FormContext';

export interface DraftData {
  formData: Partial<FormData>;
  timestamp: number;
  clientName: string;
}

const DEBOUNCE_MS = 2_000;

/** Meaningful fields — if none are filled the form is "empty". */
const SENTINEL_KEYS: (keyof FormData)[] = [
  'fullName',
  'email',
  'inbodyWeightKg',
  'cardioRestingHr',
  'ohsKneeAlignment',
  'cardioTestSelected',
  'pushupsOneMinuteReps',
];

function hasAnyData(formData: FormData): boolean {
  return SENTINEL_KEYS.some((key) => {
    const val = formData[key];
    if (Array.isArray(val)) return val.length > 0;
    return val !== '' && val !== undefined && val !== null;
  });
}

/** True when the form has enough filled fields to warrant draft auto-save / Firestore sync. */
export function hasAssessmentDraftableData(formData: FormData): boolean {
  return hasAnyData(formData);
}

// ── Static Helpers ───────────────────────────────────────────────

/** Read a saved draft (or null). */
export function getDraft(): DraftData | null {
  try {
    const raw = readDraftAssessmentRaw();
    if (!raw) return null;
    return JSON.parse(raw) as DraftData;
  } catch {
    return null;
  }
}

/** Remove the saved draft. */
export function clearDraft(): void {
  removeDraftAssessment();
}

// ── Hook ─────────────────────────────────────────────────────────

/**
 * Call this inside the assessment flow. It debounces `formData`
 * changes into sessionStorage under `DRAFT_ASSESSMENT`.
 *
 * Skips saving when:
 *  - The form has no meaningful data (empty assessment).
 *  - We're on the results phase (assessment is being finalized).
 *  - We're in edit mode (editing an existing saved assessment).
 */
export function useAssessmentDraft(
  formData: FormData,
  isResultsPhase: boolean,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEditMode = useRef(hasEditAssessmentInSession());

  useEffect(() => {
    if (isEditMode.current || isResultsPhase) return;
    if (!hasAnyData(formData)) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      try {
        const draft: DraftData = {
          formData,
          timestamp: Date.now(),
          clientName: formData.fullName || 'Unnamed',
        };
        writeSessionDraftAssessmentJson(JSON.stringify(draft));
      } catch (e) {
        logger.warn('[Draft] Failed to persist draft:', e);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [formData, isResultsPhase]);
}
