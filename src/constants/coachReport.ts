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
  brief: 'Brief',
  priorities: 'Priorities',
  'program-strategy': 'Program strategy',
  'movement-blocks': 'Movement blocks',
  'training-context': 'Training context',
  posture: 'Posture',
  'body-lifestyle': 'Body & lifestyle',
};
