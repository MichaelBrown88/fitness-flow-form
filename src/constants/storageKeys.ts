/**
 * Centralized storage keys to prevent magic string typos
 * across the application's persistence layers (sessionStorage/localStorage).
 */

export const STORAGE_KEYS = {
  /** Light/dark appearance; keep in sync with inline script in index.html (FOUC). */
  COLOR_MODE: 'oneassess-color-mode',

  // Assessment Flow
  PARTIAL_ASSESSMENT: 'partialAssessment',
  EDIT_ASSESSMENT: 'editAssessmentData',
  PREFILL_CLIENT: 'prefillClientData',
  IS_DEMO: 'isDemoAssessment',
  LAST_UPDATED_ID: 'lastUpdatedAssessmentId',
  HIGHLIGHT_CATEGORY: 'highlightCategory',
  
  // Posture/Camera (if used in storage)
  POSTURE_TEMP_IMAGE: 'postureTempImage',

  // Onboarding mid-flow persistence
  ONBOARDING_SESSION: 'onboardingSession',

  // Assessment draft auto-save
  DRAFT_ASSESSMENT: 'draftAssessment',

  // Assessment phase (for back/refresh persistence)
  ASSESSMENT_PHASE: 'assessment_phase',

  /** Session flag: coach confirmed AssessmentSetupStep (draft + client); suppress capture-phase draft banners */
  ASSESSMENT_SETUP_CONFIRMED: 'assessmentSetupConfirmed',

  /** '1' = show extra coach guidance during assessments; '0' = hide */
  COACH_GUIDANCE_IN_ASSESSMENT: 'coachGuidanceInAssessment',

  /** Coach workspace assistant: JSON array of thread metadata + messages (scoped in code by uid/org). */
  COACH_ASSISTANT_THREADS: 'coachAssistantThreads',
  /** `data` | `assist` — persisted per device. */
  COACH_ASSISTANT_INTERACTION_MODE: 'coachAssistantInteractionMode',
  /** `1` = assistant workspace sidebar collapsed on large screens. */
  COACH_ASSISTANT_SIDEBAR_COLLAPSED: 'coachAssistantSidebarCollapsed',
} as const;
