/**
 * User-facing copy for modular assessments, session-scoped scores, and remote intake.
 * Keep in sync with product naming in the modular assessments plan.
 */

export const ASSESSMENT_COPY = {
  SESSION_RESULTS_TITLE: "This session's AXIS snapshot",
  FULL_PROFILE_SCORE: 'AXIS Score™',
  PROFILE_PREVIEW: 'Your AXIS Score™ so far',
  COMPLETE_PROFILE: 'Complete AXIS profile',
  NOT_INCLUDED_THIS_VISIT: 'Not included this visit',
  SESSION_FOCUS: 'Session focus',
  SESSION_PROGRESS: (current: number, total: number) =>
    `Step ${current} of ${total} (this session)`,
  STUDIO_FIRST_TITLE: 'In studio',
  STUDIO_FIRST_DESC: 'You will run this assessment with your client now.',
  SEND_LINK_FIRST_TITLE: 'Send link first',
  SEND_LINK_FIRST_DESC:
    'Your client can complete eligible sections from their phone first; you finish coach-only parts in studio.',
  WIZARD_TITLE: 'What are you covering today?',
  WIZARD_SUBTITLE: 'Choose a template or customise which phases appear. You can change this before starting.',
  BASELINE_CHOOSER_TITLE: 'First assessment for this client',
  BASELINE_CHOOSER_SUBTITLE:
    'Their first visit is always a full AXIS assessment. Run physical tests in studio, or send a pre-assessment link so they complete basics, PAR-Q, lifestyle, and goals before you meet.',
  BASELINE_STUDIO_DESC: 'Run the full assessment together now — all enabled phases.',
  BASELINE_SEND_LINK_DESC:
    'They complete pre-assessment on their phone first; you run physical tests in studio.',
  BASELINE_LINK_SECTION_TITLE: 'Send pre-assessment link',
  BASELINE_LINK_SECTION_DESC:
    'Covers basics, PAR-Q, lifestyle, goals, and optional posture photos. When they submit, continue from Today or their profile.',
  BASELINE_GENERATE_LINK: 'Generate pre-assessment link',
  BASELINE_START_STUDIO_ANYWAY: 'Start in studio anyway',
  INTAKE_PREFILL_BANNER_TITLE: 'Pre-assessment complete',
  INTAKE_PREFILL_BANNER_BODY:
    'Your client’s answers are loaded below. Continue with physical assessment in studio.',
  TEMPLATE_FULL: 'Full assessment',
  TEMPLATE_FULL_DESC: 'All phases — unlock your full AXIS Score™ when finished.',
  TEMPLATE_LIFESTYLE: 'Lifestyle check-in',
  TEMPLATE_LIFESTYLE_DESC: 'Intake, PAR-Q, lifestyle, and results.',
  TEMPLATE_BODY_COMP: 'Body composition',
  TEMPLATE_BODY_COMP_DESC: 'Intake, PAR-Q, body comp, and results.',
  TEMPLATE_CARDIO: 'Metabolic fitness',
  TEMPLATE_CARDIO_DESC: 'Intake, PAR-Q, cardio testing, and results.',
  TEMPLATE_STRENGTH: 'Strength session',
  TEMPLATE_STRENGTH_DESC: 'Intake, PAR-Q, strength tests, and results.',
  TEMPLATE_MOVEMENT: 'Movement & posture',
  TEMPLATE_MOVEMENT_DESC: 'Intake, PAR-Q, movement quality, and results.',
  CUSTOM_FOCUS_LABEL: 'Custom session focus',
  CUSTOM_FOCUS_HINT: 'Add or remove modules beyond your template (always includes intake, PAR-Q, and wrap-up).',
  TOGGLE_LIFESTYLE: 'Lifestyle',
  TOGGLE_BODY_COMP: 'Body composition',
  TOGGLE_CARDIO: 'Cardio / metabolic',
  TOGGLE_STRENGTH: 'Strength',
  TOGGLE_MOVEMENT: 'Posture & movement',
  CONTINUE_TO_ASSESSMENT: 'Continue to assessment',
  REMOTE_THANKS: 'Thanks — your coach will finish any remaining steps with you in studio.',
  REMOTE_ENTRY_TITLE: 'Pre-visit client check-in',
  REMOTE_ENTRY_CLIENT_HINT:
    'If your coach sent you a link, open that full message — the address includes a long code after /remote/. This page alone cannot start your check-in.',
  REMOTE_ENTRY_COACH_TITLE: 'Are you the coach?',
  REMOTE_ENTRY_COACH_BODY:
    'Log in to create and email a pre-assessment link (Clients → add client → Send link, or start a new assessment and choose “Send link first”).',
  REMOTE_INVALID:
    'This pre-assessment link is not valid. Ask your coach to send a new one from their dashboard.',
  REMOTE_EXPIRED:
    'This pre-assessment link has expired. Ask your coach to send a fresh link — they last about 7 days.',
  REMOTE_UNAVAILABLE:
    'Pre-assessment is temporarily unavailable. Please contact your coach to complete this in the studio.',
  REMOTE_NETWORK:
    'We could not verify this link. Check your connection and try again, or ask your coach for a new link.',
  REMOTE_INTAKE_WELCOME_EYEBROW: 'Pre-assessment',
  REMOTE_INTAKE_WELCOME_LINE_1: 'This is your first step on your journey.',
  REMOTE_INTAKE_WELCOME_LINE_2:
    'A few quick questions so your coach can focus on you from the moment you walk in.',
  REMOTE_INTAKE_START: 'Start your pre-assessment',
  REMOTE_INTAKE_DURATION_HINT: '(about 10 minutes)',
  REMOTE_INTAKE_WELCOME_PRIVACY: 'Only you and your coach can see what you submit.',
  REMOTE_INTAKE_DOB_TITLE: 'When were you born?',
  REMOTE_INTAKE_DOB_HINT: 'Scroll day, month, and year.',
  REMOTE_INTAKE_POSTURE_TITLE: 'Quick body photos',
  REMOTE_INTAKE_POSTURE_BODY:
    'Your phone guides four standing shots — front, back, and each side.',
  REMOTE_INTAKE_POSTURE_PREP: 'Fitted clothes, good light, a little space behind you.',
  REMOTE_INTAKE_POSTURE_SKIP:
    "I'll do posture photos in studio instead — finish pre-assessment",
  REMOTE_INTAKE_POSTURE_OPTION_PHONE: 'Take guided photos on my phone',
  REMOTE_INTAKE_POSTURE_OPTION_PHONE_HINT: 'About four minutes — front, back, and each side.',
  REMOTE_INTAKE_POSTURE_OPTION_STUDIO: 'My coach will do posture in studio',
  REMOTE_INTAKE_POSTURE_OPTION_STUDIO_HINT: 'Skip photos now and finish pre-assessment.',
  REMOTE_INTAKE_POSTURE_START: 'Start guided photos',
  REMOTE_INTAKE_POSTURE_RETAKE: 'Retake photos',
  REMOTE_INTAKE_POSTURE_DONE: (count: number) =>
    `${count} of 4 photos saved. Tap Next to continue, or retake if you need to.`,
  AWAITING_STUDIO_BADGE: 'Awaiting studio',
  AWAITING_STUDIO_HINT: 'Client completed pre-assessment; finish physical assessment in studio.',
  FULL_PROFILE_HEADLINE: (score: number) => `AXIS Score™: ${score}/100`,
  SESSION_SCORE_HEADLINE: (score: number) => `AXIS snapshot: ${score}/100 (assessed areas only)`,
  COACH_GUIDANCE_TOGGLE: 'Show coach guidance (scripts & cues)',
  FIRST_CLIENT_SELF_TITLE: 'Your first assessment is on you',
  FIRST_CLIENT_SELF_DESC:
    'We will create you as the first client so you experience the same flow your clients will see. PAR-Q still applies.',
  REMOTE_LINK_SCOPE_LIFESTYLE: 'Lifestyle check-in only',
  REMOTE_LINK_SCOPE_LIFESTYLE_POSTURE: 'Lifestyle + progress photos (posture)',
  REMOTE_LINK_SCOPE_POSTURE: 'Progress photos (posture) only',
  REMOTE_POSTURE_INTRO:
    'Add clear photos in good light. Your coach uses these for posture tracking — skip any angle you cannot safely capture.',
  REMOTE_POSTURE_VIEW_LABEL: (view: string) => {
    const m: Record<string, string> = {
      front: 'Front',
      back: 'Back',
      'side-left': 'Left side',
      'side-right': 'Right side',
    };
    return m[view] ?? view;
  },
  REMOTE_CONTINUE_TO_PHOTOS: 'Continue to photos',
  REMOTE_CHECKIN_STRIP_TITLE: 'Suggested check-ins',
  REMOTE_CHECKIN_LIFESTYLE_CTA: 'Lifestyle check-in',
  REMOTE_CHECKIN_POSTURE_CTA: 'Progress photos (posture)',
} as const;

/** Coach assessment report header — arrow control is “up” navigation, not browser history */
export const COACH_ASSESSMENT_REPORT_NAV = {
  BACK_TO_CLIENT_ARIA: 'Back to client profile',
  BACK_TO_DASHBOARD_ARIA: 'Back to dashboard',
} as const;
