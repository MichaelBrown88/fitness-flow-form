/**
 * Debounced sync of in-progress assessment drafts to Firestore (org-scoped).
 * Complements sessionStorage drafts in useAssessmentDraft for cross-tab / device resilience.
 */

import { useEffect, useRef, useCallback } from 'react';
import { saveDraftAssessment } from '@/services/coachAssessments';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { hasAssessmentDraftableData } from '@/hooks/useAssessmentDraft';
import { logger } from '@/lib/utils/logger';
import type { FormData } from '@/contexts/FormContext';

const DEBOUNCE_MS = 45_000;

export function useAssessmentFirestoreDraftSync(
  formData: FormData,
  isResultsPhase: boolean,
  organizationId: string | undefined,
  activePhaseIdx: number,
): void {
  const isEditModeRef = useRef(
    !!sessionStorage.getItem(STORAGE_KEYS.EDIT_ASSESSMENT),
  );
  const formRef = useRef(formData);
  const phaseRef = useRef(activePhaseIdx);
  formRef.current = formData;
  phaseRef.current = activePhaseIdx;

  const flushToFirestore = useCallback(async () => {
    if (isEditModeRef.current || isResultsPhase) return;
    const orgId = organizationId;
    if (!orgId) return;
    const fd = formRef.current;
    if (!hasAssessmentDraftableData(fd)) return;
    const clientName = (fd.fullName || 'Unnamed client').trim();
    try {
      await saveDraftAssessment(clientName, fd, orgId, {
        activePhaseIdx: phaseRef.current,
      });
    } catch (e) {
      logger.warn('[Draft] Firestore sync failed (non-fatal)', e);
    }
  }, [isResultsPhase, organizationId]);

  useEffect(() => {
    if (isEditModeRef.current || isResultsPhase) return;
    if (!organizationId || !hasAssessmentDraftableData(formData)) return;

    const t = setTimeout(() => {
      void flushToFirestore();
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [formData, isResultsPhase, organizationId, flushToFirestore]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        void flushToFirestore();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [flushToFirestore]);
}
