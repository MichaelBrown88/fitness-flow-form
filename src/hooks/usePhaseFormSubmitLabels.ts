import { useMemo } from 'react';
import type { FormData } from '@/contexts/FormContext';
import { ASSESSMENT_SUBMIT_LABELS } from '@/constants/assessment';
import {
  hasEditAssessmentInSession,
  readPartialAssessmentCategory,
} from '@/lib/assessment/assessmentSessionStorage';
import { isAssessmentComplete } from '@/lib/assessmentCompleteness';

const COMPLETION_PROBE_FIELDS = [
  'inbodyScore',
  'postureHeadOverall',
  'pushupsOneMinuteReps',
  'cardioTestSelected',
] as const satisfies ReadonlyArray<keyof FormData>;

export function usePhaseFormSubmitLabels(
  formData: FormData,
  isPartialAssessment: boolean,
): {
  submitButtonLabel: string;
  submitButtonDisabled: boolean;
  submitButtonHint: string;
  isCompleteForReport: boolean;
} {
  const anyAssessmentCompleted = useMemo(() => {
    return COMPLETION_PROBE_FIELDS.some((field) => {
      const val = formData[field];
      return val !== '' && val !== undefined && val !== null;
    });
  }, [formData]);

  const assessmentMode = isPartialAssessment ? 'partial' : 'full';
  const partialCategoryFromStorage = useMemo(() => readPartialAssessmentCategory(), []);
  const isComplete = isAssessmentComplete(formData, assessmentMode, partialCategoryFromStorage);
  const hasExistingContext = isPartialAssessment || hasEditAssessmentInSession();

  const submitButtonLabel = !isComplete
    ? ASSESSMENT_SUBMIT_LABELS.SAVE_FOR_LATER
    : hasExistingContext
      ? ASSESSMENT_SUBMIT_LABELS.UPDATE_REPORT
      : ASSESSMENT_SUBMIT_LABELS.GENERATE_REPORT;
  const submitButtonDisabled = !anyAssessmentCompleted;
  const submitButtonHint = !anyAssessmentCompleted
    ? ASSESSMENT_SUBMIT_LABELS.COMPLETE_SECTION_HINT
    : submitButtonLabel;

  return {
    submitButtonLabel,
    submitButtonDisabled,
    submitButtonHint,
    isCompleteForReport: isComplete,
  };
}
