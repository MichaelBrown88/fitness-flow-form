/**
 * User-visible strings for the multi-phase assessment form shell.
 */

export const PHASE_FORM_COPY = {
  SAVE_AND_EXIT: 'Save & Exit',
  SAVE_AND_EXIT_TOAST_DESCRIPTION: 'Your progress is saved. You can pick up where you left off from the dashboard.',
  PARTIAL_BADGE_PREFIX: 'Quick Update:',
  GENERATING_REPORTS_TITLE: "Building your client's report\u2026",
  GENERATING_REPORTS_DESCRIPTION: 'Scoring results, building the roadmap, and preparing the coaching report. This takes a few seconds.',
  RESULTS_SUSPENSE_TITLE: 'Finalizing Report...',
  /** Shown on the results tab while the assessment is uploading to the dashboard */
  RESULTS_SAVING_STATUS: 'Saving to your dashboard…',
  FOOTER_PROFESSIONAL_SUFFIX: 'Professional v2.1 • Confidential Client Data',
  FOOTER_DEFAULT_ORG_NAME: 'One Assess',
  NO_PHASES_CONFIGURED: 'This assessment has no sections set up yet. Go to Settings to configure your assessment phases.',
} as const;
