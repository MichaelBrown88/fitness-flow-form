import type { Dispatch, SetStateAction } from 'react';
import type { PhaseField, PhaseSection } from '@/lib/phaseConfig';
import { SingleFieldFlow } from '@/components/assessment/SingleFieldFlow';

type IntakeSection = {
  id: string;
  title: string;
  fields: PhaseField[];
};

type SectionType = PhaseSection | IntakeSection;

/** Phase slice from navigation (includes empty fallback when no phases). */
export type PhaseFormFlowPhase = {
  id: string;
  title: string;
  summary: string;
  sections?: PhaseSection[];
};

export interface PhaseFormSingleFieldFlowProps {
  activePhase: PhaseFormFlowPhase;
  activePhaseIdx: number;
  totalPhases: number;
  visiblePhases: PhaseFormFlowPhase[];
  expandedSections: Record<string, boolean>;
  activeFieldIdx: number;
  setActiveFieldIdx: (idx: number | ((prev: number) => number)) => void;
  setExpandedSections: Dispatch<SetStateAction<Record<string, boolean>>>;
  setActivePhaseIdx: (idx: number | ((prev: number) => number)) => void;
  isPartialAssessment: boolean;
  onShowCamera: (mode: 'ocr') => void;
  onShowPostureCompanion: () => void;
  onShowBodyCompCompanion: () => void;
  onRequestPreResultsReview: () => void;
}

function getSectionsForPhase(phase: PhaseFormFlowPhase): SectionType[] {
  if (phase.sections && phase.sections.length > 0) {
    return phase.sections as SectionType[];
  }
  return [];
}

export function PhaseFormSingleFieldFlow({
  activePhase,
  activePhaseIdx,
  totalPhases,
  visiblePhases,
  expandedSections,
  activeFieldIdx,
  setActiveFieldIdx,
  setExpandedSections,
  setActivePhaseIdx,
  isPartialAssessment,
  onShowCamera,
  onShowPostureCompanion,
  onShowBodyCompCompanion,
  onRequestPreResultsReview,
}: PhaseFormSingleFieldFlowProps) {
  if (activePhase.id === 'P7') return null;

  const allSections = getSectionsForPhase(activePhase);
  if (allSections.length === 0) return null;

  const expandedSectionId = Object.keys(expandedSections).find((id) => expandedSections[id]);
  const activeSection = allSections.find((s) => s.id === expandedSectionId) || allSections[0];
  if (!activeSection) return null;

  const handleGoToPreviousSection = () => {
    const currentIndex = allSections.findIndex((s) => s.id === activeSection.id);
    if (currentIndex > 0) {
      const prevSection = allSections[currentIndex - 1];
      setExpandedSections({ [prevSection.id]: true });
      const prevSectionFields = (prevSection.fields || []).length;
      setActiveFieldIdx(Math.max(0, prevSectionFields - 1));
    } else if (activePhaseIdx > 0) {
      const prevPhaseIdx = visiblePhases.findIndex((_, i) => i === activePhaseIdx) - 1;
      if (prevPhaseIdx >= 0) {
        const prevPhase = visiblePhases[prevPhaseIdx];
        const prevPhaseSections = prevPhase.sections || [];
        if (prevPhaseSections.length > 0) {
          const lastSection = prevPhaseSections[prevPhaseSections.length - 1];
          setActivePhaseIdx(prevPhaseIdx);
          setExpandedSections({ [lastSection.id]: true });
          const lastSectionFields = (lastSection.fields || []).length;
          setActiveFieldIdx(Math.max(0, lastSectionFields - 1));
        } else {
          setActivePhaseIdx(prevPhaseIdx);
        }
      }
    }
  };

  return (
    <SingleFieldFlow
      key={activeSection.id}
      section={activeSection}
      activeFieldIdx={activeFieldIdx}
      setActiveFieldIdx={setActiveFieldIdx}
      onShowCamera={onShowCamera}
      onShowPostureCompanion={onShowPostureCompanion}
      onShowBodyCompCompanion={onShowBodyCompCompanion}
      onGoToPreviousSection={handleGoToPreviousSection}
      onComplete={() => {
        const currentIndex = allSections.findIndex((s) => s.id === activeSection.id);
        if (currentIndex < allSections.length - 1) {
          setExpandedSections({ [allSections[currentIndex + 1].id]: true });
        } else if (activePhaseIdx < totalPhases - 1) {
          if (isPartialAssessment) {
            onRequestPreResultsReview();
          } else {
            const nextVisibleIdx = visiblePhases.findIndex((p, i) => i > activePhaseIdx);
            if (nextVisibleIdx !== -1) {
              setActivePhaseIdx(nextVisibleIdx);
            }
          }
        }
      }}
    />
  );
}
