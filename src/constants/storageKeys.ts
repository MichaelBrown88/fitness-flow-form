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

  /** `1` = user dismissed the "verify your email" banner; persists across refreshes. */
  EMAIL_BANNER_DISMISSED: 'oneassess-email-banner-dismissed',

  /** Last share token successfully loaded by a client — used to redirect the installed PWA back to their report. */
  CLIENT_LAST_TOKEN: 'oneassess-client-last-token',

  /** sessionStorage flag: client has seen the privacy notice on their report this session. */
  CLIENT_PRIVACY_NOTICE_SEEN: 'oneassess-client-privacy-seen',

  /**
   * localStorage key prefix for consent gate state per token.
   * Full key: `${CLIENT_CONSENT_STATE_PREFIX}${token}`
   * Value: 'answered' once the client has responded to the consent prompt (yes or no).
   * Persistent across sessions so the gate only shows once per device per token.
   */
  CLIENT_CONSENT_STATE_PREFIX: 'oneassess-consent-',
} as const;
