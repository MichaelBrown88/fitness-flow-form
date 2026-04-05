import { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import type { FormData } from '@/contexts/FormContext';
import {
  shouldSuppressLocalDraftRecovery,
  writeAssessmentPhaseIndex,
  writeSessionDraftAssessmentJson,
} from '@/lib/assessment/assessmentSessionStorage';
import { getDraft, clearDraft } from '@/hooks/useAssessmentDraft';
import { getDraftAssessment } from '@/services/coachAssessments';
import { logger } from '@/lib/utils/logger';

export type DraftBannerState = { clientName: string; timestamp: number };

export type CloudDraftOfferState = {
  clientName: string;
  updatedAtMs: number;
  formData: FormData;
  activePhaseIdx: number | null;
};

/**
 * Session + Firestore draft detection and resume/discard handlers for the assessment flow.
 * Used by `useAssessmentDraftOrchestration`; documents the session + Firestore draft model in one place.
 */
export function usePhaseFormDraftRecovery(params: {
  user: User | null;
  organizationId: string | undefined;
  formDataFullName: string;
  activeClientName: string;
  isPartialAssessment: boolean;
  updateFormData: (data: Partial<FormData>) => void;
  setActivePhaseIdx: (idx: number | ((prev: number) => number)) => void;
  /**
   * When false, skip draft detection and handlers (capture phase after AssessmentSetupStep).
   */
  draftRecoveryActive?: boolean;
}): {
  draftBanner: DraftBannerState | null;
  cloudDraftOffer: CloudDraftOfferState | null;
  handleResumeCloudDraft: () => void;
  handleDismissCloudDraft: () => void;
  handleResumeDraft: () => void;
  handleDiscardDraft: () => void;
} {
  const {
    user,
    organizationId,
    formDataFullName,
    activeClientName,
    isPartialAssessment,
    updateFormData,
    setActivePhaseIdx,
    draftRecoveryActive = true,
  } = params;

  const [draftBanner, setDraftBanner] = useState<DraftBannerState | null>(null);
  const [cloudDraftOffer, setCloudDraftOffer] = useState<CloudDraftOfferState | null>(null);

  useEffect(() => {
    if (!draftRecoveryActive) return;
    if (shouldSuppressLocalDraftRecovery()) return;

    const draft = getDraft();
    if (draft && draft.clientName) {
      setDraftBanner({ clientName: draft.clientName, timestamp: draft.timestamp });
    }
  }, [draftRecoveryActive]);

  useEffect(() => {
    if (!draftRecoveryActive) return;
    const orgId = organizationId;
    if (!user || !orgId || shouldSuppressLocalDraftRecovery() || isPartialAssessment) return;

    const name = (
      formDataFullName.trim() ||
      getDraft()?.clientName ||
      activeClientName ||
      ''
    ).trim();
    if (!name) return;

    let cancelled = false;
    void (async () => {
      try {
        const cloud = await getDraftAssessment(name, orgId);
        if (cancelled || !cloud?.formData || Object.keys(cloud.formData).length === 0) return;

        const sessionDraft = getDraft();
        const cloudMs = cloud.updatedAt?.toMillis() ?? 0;
        const sessionMs = sessionDraft?.timestamp ?? 0;

        if (cloudMs > sessionMs) {
          setCloudDraftOffer({
            clientName: name,
            updatedAtMs: cloudMs,
            formData: cloud.formData,
            activePhaseIdx: cloud.activePhaseIdx,
          });
          setDraftBanner(null);
        }
      } catch (e) {
        logger.warn('[Draft] Failed to load Firestore draft for comparison', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [draftRecoveryActive, user, organizationId, formDataFullName, activeClientName, isPartialAssessment]);

  const handleResumeCloudDraft = useCallback(() => {
    if (!draftRecoveryActive || !cloudDraftOffer) return;
    updateFormData(cloudDraftOffer.formData as Partial<FormData>);
    const p = cloudDraftOffer.activePhaseIdx;
    if (typeof p === 'number' && p >= 0) {
      writeAssessmentPhaseIndex(p);
      setActivePhaseIdx(p);
    }
    writeSessionDraftAssessmentJson(
      JSON.stringify({
        formData: cloudDraftOffer.formData,
        timestamp: Date.now(),
        clientName: cloudDraftOffer.clientName,
      }),
    );
    setCloudDraftOffer(null);
    setDraftBanner(null);
  }, [draftRecoveryActive, cloudDraftOffer, updateFormData, setActivePhaseIdx]);

  const handleDismissCloudDraft = useCallback(() => {
    if (!draftRecoveryActive) return;
    setCloudDraftOffer(null);
    const d = getDraft();
    if (d?.clientName) {
      setDraftBanner({ clientName: d.clientName, timestamp: d.timestamp });
    }
  }, [draftRecoveryActive]);

  const handleResumeDraft = useCallback(() => {
    if (!draftRecoveryActive) return;
    setCloudDraftOffer(null);
    const draft = getDraft();
    if (draft?.formData) {
      updateFormData(draft.formData as Partial<FormData>);
    }
    setDraftBanner(null);
  }, [draftRecoveryActive, updateFormData]);

  const handleDiscardDraft = useCallback(() => {
    if (!draftRecoveryActive) return;
    setCloudDraftOffer(null);
    clearDraft();
    setDraftBanner(null);
  }, [draftRecoveryActive]);

  return {
    draftBanner: draftRecoveryActive ? draftBanner : null,
    cloudDraftOffer: draftRecoveryActive ? cloudDraftOffer : null,
    handleResumeCloudDraft,
    handleDismissCloudDraft,
    handleResumeDraft,
    handleDiscardDraft,
  };
}
