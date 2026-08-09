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

  /** Active phase id (e.g. 'P3') persisted alongside the positional index — id wins on resume so phase reorders can't land on the wrong phase */
  ASSESSMENT_PHASE_ID: 'assessment_phase_id',

  /** Session flag: coach confirmed AssessmentSetupStep (draft + client); suppress capture-phase draft banners */
  ASSESSMENT_SETUP_CONFIRMED: 'assessmentSetupConfirmed',

  /** `1` = first-time full baseline session (skip modular plan wizard). */
  BASELINE_ASSESSMENT_SESSION: 'baselineAssessmentSession',
  /** JSON-serialized full AssessmentPlan for baseline sessions. */
  BASELINE_ASSESSMENT_PLAN: 'baselineAssessmentPlan',
  /** `studio` | `send_link_first` during baseline intake chooser. */
  BASELINE_INTAKE_MODE: 'baselineIntakeMode',
  /** `1` = resuming after client completed remote intake (show prefill banner). */
  REMOTE_INTAKE_RESUME: 'remoteIntakeResume',

  /** Legacy studio step key (cleared on baseline start) */
  STUDIO_SESSION_STEP: 'studioSessionStep',
  /** Legacy consultation gate (cleared on baseline start) */
  CONSULTATION_COMPLETE: 'consultationComplete',
  /** `1` = returning client modular session plan (not first baseline). */
  RETURNING_SESSION_PLAN: 'returningSessionPlan',

  /** '1' = show extra coach guidance during assessments; '0' = hide */
  COACH_GUIDANCE_IN_ASSESSMENT: 'coachGuidanceInAssessment',

  /** localStorage: last grip test method chosen ('deadhang' | 'pinch') — default for the next session on this device. */
  LAST_GRIP_METHOD: 'oneassess-last-grip-method',

  /** `1` = coach workspace sidebar collapsed on large screens (key name is historical). */
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
