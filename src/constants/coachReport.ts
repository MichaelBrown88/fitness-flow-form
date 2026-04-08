/**
 * Coach Report section IDs for in-page navigation.
 * Use with id={getCoachReportSectionId(key)} for section elements.
 */

export const COACH_REPORT_SECTION_IDS = [
  'brief',
  'priorities',
  'program-strategy',
  'movement-blocks',
  'training-context',
  'posture',
  'body-lifestyle',
] as const;

export type CoachReportSectionId = (typeof COACH_REPORT_SECTION_IDS)[number];

const PREFIX = 'coach-';

export function getCoachReportSectionId(key: CoachReportSectionId): string {
  return `${PREFIX}${key}`;
}

export const COACH_REPORT_NAV_LABELS: Record<CoachReportSectionId, string> = {
  brief: 'SIGNAL™ brief',
  priorities: 'Priorities',
  'program-strategy': 'Program strategy',
  'movement-blocks': 'Movement blocks',
  'training-context': 'Training context',
  posture: 'Posture',
  'body-lifestyle': 'Body & lifestyle',
};

/** User-visible strings for the one-page CoachReport summary component */
export const COACH_REPORT_COPY = {
  RESULTS_UNAVAILABLE: 'Results are not available yet. Please complete the assessment steps and try again.',
  CLIENT_FALLBACK: 'Client',
  PRIMARY_GOAL_LABEL: 'Primary goal: ',
  SECONDARY_GOAL_LABEL: 'Secondary: ',
  STARTING_POINT_LABEL: 'Starting point: ',
  STARTING_POINT_FALLBACK: 'Assessment complete. Use priorities below to structure Phase 1.',
  CONSIDER_PHASE_1: 'Consider in Phase 1',
  PHASES_TITLE: 'Phases',
  PHASE_1_NOW: 'Phase 1 — Now',
  WHEN_TO_PROGRESS: 'When to progress',
  PHASE_2_THEN_3_TITLE: 'Phase 2 → then Phase 3',
  PHASE_2_THEN_3_BODY: 'Shift focus to next priorities from outlook; then fine-tune load and specificity.',
  AT_A_GLANCE: 'At a glance',
  GOOD: 'Good',
  NEEDS_WORK: 'Needs work',
  AVOID_WHEN_OK: 'Avoid / when OK',
  LIFESTYLE: 'Lifestyle',
  NUTRITION: 'Nutrition',
  NO_LIFESTYLE_DATA: 'No lifestyle data from assessment.',
  LABEL_SLEEP: 'Sleep:',
  LABEL_STRESS: 'Stress:',
  LABEL_DAILY_MOVEMENT: 'Daily movement:',
  LABEL_INFLAMMATION: 'Inflammation:',
  LABEL_ENERGY: 'Energy:',
  LABEL_PROTEIN: 'Protein:',
  LABEL_HYDRATION: 'Hydration:',
  LABEL_CARB_TIMING: 'Carb timing:',
  OUTLOOK_FALLBACK: 'When baseline movement and stability improve.',
  OVERALL_SCORE_ARIA: 'AXIS Score™',
} as const;
