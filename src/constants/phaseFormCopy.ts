/**
 * User-visible strings for the multi-phase assessment form shell.
 */

export const PHASE_FORM_COPY = {
  SAVE_AND_EXIT: 'Save and exit',
  SAVE_AND_EXIT_TOAST_DESCRIPTION: 'Your progress is saved. You can pick up where you left off from the dashboard.',
  SAVE_AND_EXIT_LOCAL_ONLY_DESCRIPTION:
    'Saved on this device. Cloud backup will retry when you resume the assessment.',
  PARTIAL_BADGE_PREFIX: 'Quick Update:',
  /** Single end-of-session loading state (covers scoring + report chunk load; save runs in the background) */
  RESULTS_SUSPENSE_TITLE: "Building your client's report\u2026",
  /** Shown on the results tab while the assessment is uploading to the dashboard */
  RESULTS_SAVING_STATUS: 'Saving to your dashboard…',
  FOOTER_PROFESSIONAL_SUFFIX: 'Professional v2.1 • Confidential Client Data',
  FOOTER_DEFAULT_ORG_NAME: 'One Assess',
  NO_PHASES_CONFIGURED: 'This assessment has no sections set up yet. Go to Settings to configure your assessment phases.',
} as const;

/** Copy for the single-flow cardio run sheet (P3). */
export const CARDIO_RUN_SHEET_COPY = {
  KICKER: 'Fitness test',
  INTRO: 'One continuous flow: resting heart rate, 3-minute test, then the recovery reading.',
  RESTING_LABEL: 'Resting heart rate',
  RESTING_HINT: 'Seated and calm for at least 5 minutes before you record it.',
  PROTOCOL_LABEL: 'Test protocol',
  PROTOCOL_AUTO_HINT: 'Step test selected — no cardio equipment configured for this studio.',
  TEST_LABEL: '3-minute test',
  TEST_HINT: 'Start the timer when the client begins. Record peak heart rate the moment it ends.',
  TEST_START: 'Start test',
  TEST_RUNNING: 'Test running — keep pace steady',
  TEST_DONE: 'Time! Take the peak heart rate now.',
  PEAK_LABEL: 'Peak heart rate',
  RECOVERY_TIMER_LABEL: '1-minute recovery',
  RECOVERY_HINT: 'Sit the client down immediately, start the timer, and record heart rate when it ends.',
  RECOVERY_START: 'Start recovery timer',
  RECOVERY_RUNNING: 'Client seated — measuring recovery',
  RECOVERY_DONE: 'Take the recovery heart rate now.',
  RECOVERY_LABEL: 'Recovery heart rate',
  RESET_TIMER: 'Reset',
  BPM_UNIT: 'bpm',
  COMPLETE: 'Section complete',
  BACK: 'Back',
} as const;
