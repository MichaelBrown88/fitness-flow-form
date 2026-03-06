/**
 * Centralizes assessment flow state: phase/section/field index, section expand state,
 * partial vs full mode. Wraps useAssessmentNavigation and adds section/field-level state.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import type { PhaseSection } from '@/lib/phaseConfig';
import { useAssessmentNavigation } from '@/hooks/useAssessmentNavigation';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import type { FormData } from '@/contexts/FormContext';
import type { OrgSettings } from '@/services/organizations';

export interface UseAssessmentFlowProps {
  formData: FormData;
  orgSettings?: Partial<OrgSettings>;
}

export function useAssessmentFlow({ formData, orgSettings }: UseAssessmentFlowProps) {
  const navigation = useAssessmentNavigation({ formData, orgSettings });
  const {
    activePhaseIdx,
    setActivePhaseIdx,
    visiblePhases,
    totalPhases,
    activePhase,
    isResultsPhase,
    isPartialAssessment,
    setIsPartialAssessment,
    partialCategory,
    setPartialCategory,
    isSectionCompleted,
    isPhaseCompleted,
    progressValue,
  } = navigation;

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [activeFieldIdx, setActiveFieldIdx] = useState(0);
  const [isReviewMode, setIsReviewMode] = useState(false);

  const maxUnlockedPhaseIdx = useMemo(() => Math.max(0, totalPhases - 1), [totalPhases]);

  const setActivePhaseIdxAndPersist = useCallback(
    (value: number | ((prev: number) => number)) => {
      setActivePhaseIdx((prev) => {
        const next = typeof value === 'function' ? value(prev) : value;
        try {
          sessionStorage.setItem(STORAGE_KEYS.ASSESSMENT_PHASE, String(next));
        } catch {
          // non-fatal
        }
        return next;
      });
    },
    [setActivePhaseIdx],
  );

  const toggleSection = useCallback(
    (sectionId: string) => {
      setIsReviewMode(true);
      const phaseIdx = visiblePhases.findIndex((p) => p.sections?.some((s) => s.id === sectionId));
      if (phaseIdx !== -1) {
        setActivePhaseIdxAndPersist(phaseIdx);
      }
      setExpandedSections((prev) => ({ ...prev, [sectionId]: true }));
      setActiveFieldIdx(0);
    },
    [visiblePhases, setActivePhaseIdxAndPersist],
  );

  useEffect(() => {
    const sections = activePhase.sections || [];
    const newExpanded: Record<string, boolean> = {};
    sections.forEach((section: PhaseSection, index: number) => {
      newExpanded[section.id] = index === 0;
    });
    setExpandedSections(newExpanded);
  }, [activePhaseIdx, activePhase.sections]);

  useEffect(() => {
    setActiveFieldIdx(0);
  }, [activePhaseIdx, expandedSections]);

  return {
    ...navigation,
    setActivePhaseIdx: setActivePhaseIdxAndPersist,
    expandedSections,
    setExpandedSections,
    activeFieldIdx,
    setActiveFieldIdx,
    isReviewMode,
    setIsReviewMode,
    maxUnlockedPhaseIdx,
    toggleSection,
  };
}
