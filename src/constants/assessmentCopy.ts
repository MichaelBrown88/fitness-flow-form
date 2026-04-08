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
  WIZARD_SUBTITLE: 'Choose a template or customise which phases appear. You can change this anytime before results.',
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
  REMOTE_INVALID: 'This link is invalid or has expired. Ask your coach for a new link.',
  AWAITING_STUDIO_BADGE: 'Awaiting studio',
  AWAITING_STUDIO_HINT: 'Client completed remote steps; finish coach-only phases in studio.',
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
