import type { PhaseId } from '@/lib/phases/types';

export const ASSESSMENT_SESSION_STAGES = {
  preAssessment: {
    id: 'pre-assessment',
    label: 'Pre-assessment',
  },
  physicalAssessment: {
    id: 'physical-assessment',
    label: 'Physical assessment',
  },
} as const;

const PRE_ASSESSMENT_PHASE_IDS: PhaseId[] = ['P0', 'P1'];
const PHYSICAL_PHASE_IDS: PhaseId[] = ['P2', 'P3', 'P4', 'P5', 'P7'];

export function getAssessmentSessionStage(phaseId: PhaseId): keyof typeof ASSESSMENT_SESSION_STAGES {
  if (PRE_ASSESSMENT_PHASE_IDS.includes(phaseId)) {
    return 'preAssessment';
  }
  return 'physicalAssessment';
}

export function groupIndexedPhasesByStage<T extends { id: PhaseId }>(
  phases: T[],
): { stage: keyof typeof ASSESSMENT_SESSION_STAGES; items: { phase: T; idx: number }[] }[] {
  const pre: { phase: T; idx: number }[] = [];
  const physical: { phase: T; idx: number }[] = [];
  phases.forEach((phase, idx) => {
    const item = { phase, idx };
    if (PRE_ASSESSMENT_PHASE_IDS.includes(phase.id)) {
      pre.push(item);
    } else {
      physical.push(item);
    }
  });
  const groups: {
    stage: keyof typeof ASSESSMENT_SESSION_STAGES;
    items: { phase: T; idx: number }[];
  }[] = [];
  if (pre.length > 0) groups.push({ stage: 'preAssessment', items: pre });
  if (physical.length > 0) groups.push({ stage: 'physicalAssessment', items: physical });
  return groups;
}
