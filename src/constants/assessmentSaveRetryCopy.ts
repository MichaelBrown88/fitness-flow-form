/** Toast copy when an online save fails transiently and the assessment is queued for retry. */
export const ASSESSMENT_SAVE_RETRY_QUEUE_COPY = {
  title: 'Saved locally — will sync automatically',
  description:
    'We could not reach the server. Your assessment is queued and will upload when the connection is stable.',
  queueFailedTitle: 'Could not save',
  queueFailedDescription: 'Please check your connection and try saving again.',
} as const;
