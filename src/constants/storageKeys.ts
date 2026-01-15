/**
 * Centralized storage keys to prevent magic string typos
 * across the application's persistence layers (sessionStorage/localStorage).
 */

export const STORAGE_KEYS = {
  // Assessment Flow
  PARTIAL_ASSESSMENT: 'partialAssessment',
  EDIT_ASSESSMENT: 'editAssessmentData',
  PREFILL_CLIENT: 'prefillClientData',
  IS_DEMO: 'isDemoAssessment',
  LAST_UPDATED_ID: 'lastUpdatedAssessmentId',
  HIGHLIGHT_CATEGORY: 'highlightCategory',
  
  // Posture/Camera (if used in storage)
  POSTURE_TEMP_IMAGE: 'postureTempImage',
} as const;
