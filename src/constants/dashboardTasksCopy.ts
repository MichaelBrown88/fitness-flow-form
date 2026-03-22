/**
 * Coach-visible copy for dashboard Tasks tab and related surfaces.
 * Keeps cadence language neutral (operational, not punitive).
 */

export const DASHBOARD_TASKS = {
  EXPLAINER:
    'Based on your cadence settings. Adjust intervals in client or org settings anytime.',

  SECTION_CADENCE: 'Cadence',
  SECTION_FOLLOWUPS: 'Follow-ups',

  URGENCY_PAST_CADENCE: 'Past cadence',
  URGENCY_THIS_WEEK: 'Due this week',
  URGENCY_COMING_UP: 'Coming up',
  URGENCY_LATER: 'Later',

  FOCUS_STRIP_TITLE: 'Suggested next',
  FOCUS_STRIP_CLIENT_LINK_ARIA: 'Open client profile',

  EMPTY_NO_TASKS_TITLE: 'Nothing queued',
  EMPTY_NO_TASKS_BODY:
    'When assessments and cadence are active, follow-ups will appear here.',

  SEARCH_NO_MATCH: 'No tasks match that search.',

  /** Days past cadence before showing stronger emphasis (score-red tier in UI) */
  PAST_CADENCE_SEVERE_DAYS: 14,

  /** Max clients in the focus strip */
  FOCUS_STRIP_MAX: 5,

  SUMMARY_SEPARATOR: ' · ',

  TAB_BADGE_TOOLTIP: 'Clients with at least one check-in past cadence',

  /** Dashboard header subtitle fragment */
  HEADER_PAST_CADENCE: (n: number) =>
    n === 1 ? '1 past cadence' : `${n} past cadence`,

  BULK_PAUSE_TITLE: (n: number) => `Pause ${n} client${n === 1 ? '' : 's'}?`,
  BULK_PAUSE_DESCRIPTION:
    'Selected clients will be paused and reassessment timers frozen until you unpause them.',

  BULK_ARCHIVE_TITLE: (n: number) => `Archive ${n} client${n === 1 ? '' : 's'}?`,
  BULK_ARCHIVE_DESCRIPTION:
    'Archived clients are hidden from the active list. All assessments and history stay saved.',

  BULK_TRANSFER_ONE_AT_A_TIME: 'Transfer one client at a time. Select a single client and use Transfer.',

  BULK_TOAST_PAUSED_TITLE: 'Clients paused',
  BULK_TOAST_ARCHIVED_TITLE: 'Clients archived',
  BULK_SUCCESS_PAUSED_DESC: (n: number) =>
    `${n} client${n === 1 ? '' : 's'} are now paused.`,
  BULK_SUCCESS_ARCHIVED_DESC: (n: number) =>
    `${n} client${n === 1 ? '' : 's'} moved to archived.`,

  BULK_ERROR: 'Something went wrong. Check your connection and try again.',

  BULK_NONE_ELIGIBLE_PAUSE:
    'None of the selected clients can be paused (already paused or archived).',
  BULK_NONE_ELIGIBLE_ARCHIVE: 'None of the selected clients can be archived (already archived).',
} as const;

export function taskReassessmentTitle(pillarLabel: string, isPastCadence: boolean): string {
  return isPastCadence
    ? `${pillarLabel} — past cadence`
    : `${pillarLabel} — due soon`;
}

export function taskReassessmentDescription(
  clientName: string,
  pillarLabel: string,
  isPastCadence: boolean,
): string {
  return isPastCadence
    ? `${clientName}'s ${pillarLabel} check-in is past its cadence date.`
    : `${clientName}'s ${pillarLabel} check-in is coming up.`;
}
