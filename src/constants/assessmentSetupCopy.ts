/**
 * Copy for assessment setup (client confirm, draft resolution) and pre-results review.
 */

export const ASSESSMENT_SETUP_COPY = {
  TITLE: 'Confirm assessment',
  SUBTITLE:
    'Check who you are assessing and how you are working before you continue. You can change the client if needed.',
  ASSESSING_LABEL: 'Client',
  NEW_CLIENT_PLACEHOLDER: 'New client',
  MODE_FULL: 'New full assessment',
  MODE_PARTIAL: (category: string) => `Quick update: ${category}`,
  MODE_EDITING: 'Editing saved assessment',
  CONTINUE: 'Continue',
  CHANGE_CLIENT: 'Change client',
  PLAN_NEXT_HINT:
    'Next you will set session focus and equipment for this assessment (if applicable).',
  RESOLVING_CLIENT: 'Resolving client…',

  DISCARD_DRAFT_TITLE: 'Start fresh?',
  DISCARD_DRAFT_DESC:
    'This removes the saved progress on this device for this session. You can still use data saved online if you sync later.',
  DISCARD_DRAFT_CANCEL: 'Keep draft',
  DISCARD_DRAFT_CONFIRM: 'Discard',

  REVIEW_TITLE: 'Ready to generate the report?',
  REVIEW_SUBTITLE:
    'We will save your progress and open results. You can keep editing afterward if something is missing.',
  REVIEW_CLIENT: 'Client',
  REVIEW_PROGRESS: 'Completion',
  REVIEW_COMPLETE_YES: 'Ready to update live report',
  REVIEW_COMPLETE_NO: 'Still collecting — you can save and continue later',
  REVIEW_MISSING_HINT:
    'Add at least one scored section for this client before updating the live report.',
  GENERATE_REPORT: 'Generate report',
  KEEP_EDITING: 'Keep editing',
  SAVE_AND_EXIT: 'Save and exit',

  /** Shown when coach jumps to a section from the sidebar while in linear capture */
  JUMP_REVIEW_TITLE: 'Jumped to a section',
  JUMP_REVIEW_DESC:
    'You are editing an earlier section from the sidebar. Continue step by step, or use Save and exit to finish later.',
} as const;
