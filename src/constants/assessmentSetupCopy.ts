/**
 * Copy for assessment setup (client confirm, draft resolution) and pre-results review.
 */

export const ASSESSMENT_SETUP_COPY = {
  TITLE: 'Confirm assessment',
  SUBTITLE:
    'Confirm who you\'re assessing and your assessment mode. You can change the client if needed.',
  ASSESSING_LABEL: 'Client',
  NEW_CLIENT_PLACEHOLDER: 'New client',
  MODE_FULL: 'New full assessment',
  MODE_PARTIAL: (category: string) => `Quick update: ${category}`,
  MODE_EDITING: 'Editing saved assessment',
  CONTINUE: 'Continue',
  CHANGE_CLIENT: 'Change client',
  PLAN_NEXT_HINT:
    'Next, you\'ll set session focus and any equipment for this assessment.',
  RESOLVING_CLIENT: 'Resolving client…',

  DISCARD_DRAFT_TITLE: 'Discard this draft?',
  DISCARD_DRAFT_DESC:
    'This will clear the draft saved on this device. Any progress saved to the cloud will still be available.',
  DISCARD_DRAFT_CANCEL: 'Keep draft',
  DISCARD_DRAFT_CONFIRM: 'Discard draft',

  REVIEW_TITLE: 'Ready to generate the report?',
  REVIEW_SUBTITLE:
    'We\'ll save your progress and generate the report. You can keep editing afterward if something is missing.',
  REVIEW_CLIENT: 'Client',
  REVIEW_PROGRESS: 'Completion',
  REVIEW_COMPLETE_YES: 'Ready to generate the report',
  REVIEW_COMPLETE_NO: 'Still collecting — you can save and continue later',
  REVIEW_MISSING_HINT:
    'Complete at least one scored section before generating a report.',
  GENERATE_REPORT: 'Generate report',
  KEEP_EDITING: 'Keep editing',
  SAVE_AND_EXIT: 'Save and exit',

  /** Shown when coach jumps to a section from the sidebar while in linear capture */
  JUMP_REVIEW_TITLE: 'Editing an earlier section',
  JUMP_REVIEW_DESC:
    "You navigated back to an earlier section. When you're done, continue forward through the form or save and exit to finish later.",
} as const;
