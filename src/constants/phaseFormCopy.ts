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
  INTRO: 'One continuous flow: resting heart rate, the test, then the one-minute recovery reading.',
  RESTING_LABEL: 'Resting heart rate',
  RESTING_HINT: 'Seated and calm for at least 5 minutes before you record it.',
  PROTOCOL_LABEL: 'Test protocol',
  PROTOCOL_AUTO_HINT: 'Step test selected — no cardio equipment configured for this studio.',
  TEST_LABEL: 'Test',
  TEST_HINT: 'Pace off the machine\u2019s own display. Start here when the client begins — stopping starts the one-minute recovery countdown automatically.',
  TEST_START: 'Start test',
  TEST_STOP: 'Stop test',
  TEST_RUNNING: 'Test running',
  TEST_DONE: 'Test done — take the peak heart rate. Recovery countdown is running.',
  PEAK_LABEL: 'Peak heart rate',
  RECOVERY_TIMER_LABEL: '1-minute recovery',
  RECOVERY_HINT: 'Starts on its own when you stop the test. Sit the client down and record heart rate when it hits zero.',
  RECOVERY_START: 'Start recovery timer',
  RECOVERY_RUNNING: 'Client seated — measuring recovery',
  RECOVERY_DONE: 'Take the recovery heart rate now.',
  RECOVERY_LABEL: 'Recovery heart rate',
  RESET_TIMER: 'Reset',
  BPM_UNIT: 'bpm',
  COMPLETE: 'Section complete',
  COMPLETE_HINT_PROTOCOL: 'Choose a test protocol to finish this section.',
  BACK: 'Back',
} as const;
