import type { User } from 'firebase/auth';
import type { FormData } from '@/contexts/FormContext';
import { useAssessmentDraft } from '@/hooks/useAssessmentDraft';
import { usePhaseFormDraftRecovery } from '@/hooks/usePhaseFormDraftRecovery';
import { useAssessmentFirestoreDraftSync } from '@/hooks/useAssessmentFirestoreDraftSync';
import { isAssessmentSetupConfirmedInSession } from '@/lib/assessment/assessmentSessionStorage';

/**
 * Single entry point for assessment draft persistence:
 * - Session debounce (useAssessmentDraft): writes DRAFT_ASSESSMENT while in progress; skips results phase and edit mode.
 * - Firestore debounce (useAssessmentFirestoreDraftSync): org-scoped cloud draft; skips same conditions inside hook.
 * - Recovery UI (usePhaseFormDraftRecovery): compares cloud vs session timestamps; resume/discard handlers sync both.
 */
export function useAssessmentDraftOrchestration(params: {
  user: User | null;
  organizationId: string | undefined;
  formData: FormData;
  formDataFullName: string;
  activeClientName: string;
  isPartialAssessment: boolean;
  isResultsPhase: boolean;
  activePhaseIdx: number;
  /** Active phase id — persisted with the draft so resume is order-change safe. */
  activePhaseId?: string;
  updateFormData: (data: Partial<FormData>) => void;
  setActivePhaseIdx: (idx: number | ((prev: number) => number)) => void;
  /** Maps a persisted phase id to its current index for id-preferred resume. */
  resolvePhaseIdxById?: (phaseId: string) => number | null;
}): ReturnType<typeof usePhaseFormDraftRecovery> {
  const {
    user,
    organizationId,
    formData,
    formDataFullName,
    activeClientName,
    isPartialAssessment,
    isResultsPhase,
    activePhaseIdx,
    activePhaseId,
    updateFormData,
    setActivePhaseIdx,
    resolvePhaseIdxById,
  } = params;

  useAssessmentFirestoreDraftSync(formData, isResultsPhase, organizationId, activePhaseIdx, activePhaseId);
  useAssessmentDraft(formData, isResultsPhase);

  const draftRecoveryActive = !isAssessmentSetupConfirmedInSession();

  return usePhaseFormDraftRecovery({
    user,
    organizationId,
    formDataFullName,
    activeClientName,
    isPartialAssessment,
    updateFormData,
    setActivePhaseIdx,
    resolvePhaseIdxById,
    draftRecoveryActive,
  });
}
