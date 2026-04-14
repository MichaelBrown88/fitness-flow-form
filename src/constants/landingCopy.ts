/**
 * Coach-visible marketing copy for the public landing. Single source for hero/CTA consistency.
 */

import { FREE_TIER_CLIENT_LIMIT } from '@/constants/pricing';

/**
 * Accent word(s) in section headings — no colour treatment in either mode.
 * Volt is reserved for interactive elements (buttons, CTAs, selected states).
 */
export const LANDING_H2_ACCENT_LIGHT = '';

/** Same as LANDING_H2_ACCENT_LIGHT — kept for import compatibility. */
export const LANDING_H2_ACCENT_LIGHT_READABLE = LANDING_H2_ACCENT_LIGHT;

/** H2 keyword accent on DARK section backgrounds — vivid gradient text fill, no shadow needed. */
export const LANDING_H2_ACCENT_ON_DARK =
  'text-transparent bg-clip-text bg-gradient-to-r from-gradient-from to-gradient-to';

export const LANDING_COPY = {
  heroTrustMicro: '5k+ assessments · Solo free · Gym 14-day trial',
  /** Single hero subheading under H1 on `/` (aligned with home SEO keywords). */
  heroSubtitle:
    'Fitness assessment software for coaches and gyms. AI posture checks, professional reports, and a clear AXIS Score™ for clients. ARC™ plans and milestones between sessions — less admin for you.',
  /** H1 first line when `pathname` is `/pricing` (same landing shell as home). */
  heroPricingTitleLine1: 'Pricing for',
  /** H1 gradient line for `/pricing`. */
  heroPricingTitleAccent: 'coaches & gyms.',
  /** Hero + pricing section subcopy on `/pricing` (also used under the pricing table). */
  heroPricingSubtitle:
    'Solo is free with no card, and gyms get a 14-day trial. Choose Solo or Gym and your seats. Prices match what you see at checkout.',
  heroLoggedInDashboardCta: 'Go to Dashboard',
  /** Anonymous `/try` session on marketing home */
  heroAnonymousContinueTrial: 'Continue trial',
  heroAnonymousCreateAccount: 'Create free account',

  howItWorksPill: 'The Workflow',
  howItWorksTitleBefore: 'A Connected ',
  howItWorksTitleAccent: 'Ecosystem',
  howItWorksSubtitle:
    'From first assessment through long-term retention: clear steps for you and a polished experience for every client.',

  howItWorksStep1Title: 'Assess',
  howItWorksStep1Footer:
    'Guided intake on tablet or phone: posture from the camera, movement screens, and body comp without retyping everything. The same flow every time.',

  howItWorksStep2Title: 'Report and share',
  howItWorksStep2Footer:
    'Turn results into a clear story. SIGNAL™ highlights cross-pillar priorities for coaches; send a private link so clients reopen their report and AXIS Score™ anytime.',

  howItWorksStep3Title: 'Stay on track',
  howItWorksStep3Footer:
    'Keep clients engaged with ARC™ milestones they can see, lighter single-area check-ins, and AXIS Score™ trends so you know who needs a nudge.',

  capabilitiesPill: 'One Workflow',
  capabilitiesSectionTitleBefore: 'Everything In One Calm ',
  capabilitiesSectionTitleAccent: 'Workflow',
  capabilitiesSectionSubtitle:
    'Capture assessments, explain findings with clarity, and follow through with ARC™ — without extra tools or a pile of admin.',

  capabilitiesComplianceAriaLabel: 'Compliance certifications',
  capabilitiesComplianceHeading: 'Certified compliance',
  capabilitiesHipaaBadgeAbbrev: 'HIPAA',
  capabilitiesGdprBadgeAbbrev: 'GDPR',
  capabilitiesCompliantLabel: 'Compliant',

  ctaSectionSubtitle:
    'Professional assessments, secure client links, AXIS Score™, and ARC™ between sessions. Solo is free without a card; gyms get a 14-day trial, then subscribe when you are ready.',
  ctaSectionMicrocopy: 'No card required to start on the solo free tier.',
  mobileStickyCta: 'Start free',
  /** Visible footer link to platform staff sign-in (not org admin). */
  footerStaffLoginLabel: 'Staff login',
  footerStaffLoginAriaLabel: 'Platform staff sign-in',
  /** Shown under the free pricing tier feature list. */
  freeTierPaidAddOnsNote: 'Custom branding and priority support are available on paid plans.',

  coachPositioningPill: 'Your Expertise',
  coachPositioningTitleBefore: "We Don't Replace Your ",
  coachPositioningTitleAccent: 'Coaching',
  coachPositioningSubtitle:
    'One Assess does not generate workout programs. We help you run consistent assessments, clear professional reports, SIGNAL™ priority themes, and client-visible ARC™ plans. Less admin, more time for the coaching only you can do. Your programming and judgment stay yours.',
  testimonialsSectionTitleBefore: 'Trusted by ',
  testimonialsSectionTitleAccent: 'Coaches Everywhere',

  faqSectionTitleBefore: 'Frequently Asked ',
  faqSectionTitleAccent: 'Questions',
} as const;

export const LANDING_COACH_POSITIONING_BULLETS: readonly string[] = [
  'No auto-generated training plans. Your programs stay yours.',
  'Built to add clarity and consistency to your workflow — AXIS Score™, SIGNAL™, and ARC™ — not to sit in your seat with the client.',
  'Less paperwork and chasing updates; more room for coaching that needs a human touch.',
];

export type LandingCapabilityVisualId = 'capture' | 'reportPortal' | 'progress';

export interface LandingCapabilityRowCopy {
  eyebrow: string;
  title: string;
  bullets: readonly string[];
  imageSide: 'left' | 'right';
  visualId: LandingCapabilityVisualId;
}

/** Decorative labels inside capability visuals (landing-only; keep in sync with product patterns). */
export const LANDING_CAPABILITY_VISUAL_COPY = {
  capture: {
    poseGuideLabel: 'Front view',
    framingHint: 'Step into the frame',
    bodyCompTitle: 'Body comp',
    weightRow: 'Weight',
    bodyFatRow: 'Body fat',
    weightValue: '82 kg',
    bodyFatValue: '18%',
    confirmHint: 'Confirm to save',
  },
  reportPortal: {
    reportBadge: 'Assessment report',
    reportDate: 'Jan 12, 2025',
    clientNameLine: 'Alex Chen',
    reportTagline: 'Your AXIS Score™, pillars, and pathway to better health and performance.',
    sectionStartingPoint: 'Your starting point',
    sectionGapAnalysis: 'Gap Analysis',
    linkCaption: 'What clients see',
    mobilePreviewTitle: 'Their phone',
    tabOverview: 'Overview',
    tabAnalysis: 'Analysis',
    tabMovement: 'Movement',
    tabPlan: 'Your ARC™',
  },
  progress: {
    journeyEyebrow: 'Your ARC™',
    planHeadline: "Hi Alex, here's your ARC™",
    overallProgress: 'ARC™ progress',
    milestonesSummary: '3 of 8 milestones completed',
    phasePill: 'Phase 2: Development',
    milestoneTitle: 'Two strength sessions weekly',
    milestoneMeta: 'This phase · Strength',
    completedBadge: 'Completed',
  },
} as const;

export const LANDING_CAPABILITY_ROWS: readonly LandingCapabilityRowCopy[] = [
  {
    eyebrow: 'Capture',
    title: 'Posture, movement, and body comp without the busywork',
    bullets: [
      'Use your phone for posture capture with on-screen guidance.',
      'Add body comp from a printout or photo, confirm, and move on.',
      'One guided flow your whole team can repeat.',
    ],
    imageSide: 'right',
    visualId: 'capture',
  },
  {
    eyebrow: 'Share',
    title: 'Reports clients actually open',
    bullets: [
      'Professional output you review before it goes out.',
      'Clients use a secure link in the browser. No extra app.',
      'Same link can show their ARC™, milestones, and AXIS Score™ alongside the report.',
    ],
    imageSide: 'left',
    visualId: 'reportPortal',
  },
  {
    eyebrow: 'Follow through',
    title: 'Progress that keeps people with you',
    bullets: [
      'ARC™ phases and next steps stay visible between sessions.',
      'ARC™ milestones give clients something to aim for.',
      'AXIS Score™ trends help you see who might be drifting before they ghost.',
    ],
    imageSide: 'right',
    visualId: 'progress',
  },
];

export interface LandingTestimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
}

export const LANDING_TESTIMONIALS: readonly LandingTestimonial[] = [
  {
    quote:
      'One Assess has completely transformed how I run assessments. What used to take me 2 hours now takes 15 minutes, and my clients love the professional reports.',
    author: 'Sarah Chen',
    role: 'Performance Coach',
    company: 'Elite Fitness Studio',
  },
  {
    quote:
      'The Movement Analysis Engine has transformed how I run assessments. It helps me structure posture observations I can discuss with clients, and the professional reports make it easy to explain what I see.',
    author: 'Marcus Johnson',
    role: 'Gym Owner',
    company: 'Iron Works Gym',
  },
  {
    quote:
      'Clients actually use the link between sessions. Fewer "send that again" messages. I stay on top of who needs a follow-up, and retention feels noticeably stickier.',
    author: 'Priya Nair',
    role: 'Online Coach',
    company: 'Stronger Daily',
  },
];

export interface LandingFaqItem {
  question: string;
  answer: string;
}

export const LANDING_FAQ_ITEMS: readonly LandingFaqItem[] = [
  {
    question: 'Does One Assess write workout programs for my clients?',
    answer:
      'No. One Assess does not generate workout programs. It supports assessment capture, professional reports, AXIS Score™, SIGNAL™ for coaches, and ARC™ plans you define. You stay in control of programming and coaching decisions.',
  },
  {
    question: 'How does the Movement Analysis Engine work?',
    answer:
      'Our Movement Analysis Engine uses computer vision to observe posture and movement patterns and generate structured fitness coaching insights. It identifies key body positions, flags notable deviations from typical alignment ranges, and produces observations your coach can review and discuss with you. All results are for fitness coaching context — they are not a medical assessment. You can review and customise all results before generating client reports.',
  },
  {
    question: 'Can I customize the reports with my branding?',
    answer:
      'Reports always show "Powered by One Assess" so clients know the platform behind your brand. Your logo and brand colours on reports and in the app are available as a paid add-on on paid plans. Custom domains for sharing reports are also available on higher tiers.',
  },
  {
    question: 'Is my clients\' data secure?',
    answer:
      'Absolutely. We use bank-level encryption for all data at rest and in transit. Your clients\' photos and personal information are stored securely and never shared with third parties. We\'re GDPR compliant and take privacy seriously.',
  },
  {
    question: 'Do I need special equipment for posture analysis?',
    answer:
      'No special equipment needed! A smartphone camera works perfectly. We recommend good lighting and a plain background for best results. Our app guides you through capturing the right angles.',
  },
  {
    question: 'Can I try it before committing?',
    answer: `Solo coaches can use the free plan forever for up to ${FREE_TIER_CLIENT_LIMIT} clients, no card required. Gyms and studios get a 14-day trial with a generous client cap. When the trial ends, subscribe to keep full access.`,
  },
  {
    question: 'How do I invite my team members?',
    answer:
      'On paid plans you can invite team members directly from your dashboard. They\'ll receive an email invitation to join your organization. You can manage their permissions and access levels.',
  },
  {
    question: 'How do clients see their report and plan?',
    answer:
      'You share a secure, private link per client. They can view their report, AXIS Score™, ARC™ (phased plan), and milestones in the browser. No separate client app required. You stay in control of what you send.',
  },
  {
    question: 'What are AXIS Score™, SIGNAL™, and ARC™?',
    answer:
      'AXIS Score™ is your client’s 0–100 rollup across five pillars. SIGNAL™ is the coach-facing layer that surfaces cross-pillar priority themes from the assessment. ARC™ is the client’s phased plan and milestones — the journey you build and they follow between sessions.',
  },
  {
    question: 'Do clients need to sign up or create an account?',
    answer:
      'No. Coaches work inside One Assess. Clients open the links you send (token-based, designed for mobile) so they can review results and next steps without managing another password.',
  },
];

export function landingTrialAriaLabel(
  context: 'nav' | 'hero' | 'cta' | 'roi' | 'mobileNav',
  goesToPricingFirst: boolean,
): string {
  if (goesToPricingFirst) {
    switch (context) {
      case 'nav':
        return 'Start free trial, jump to pricing and plans';
      case 'hero':
        return 'Start free trial, view pricing and plans';
      case 'cta':
        return 'Start free trial, view pricing and plans';
      case 'roi':
        return 'Start free trial, view pricing and plans';
      case 'mobileNav':
        return 'Start free trial, jump to pricing and plans';
      default:
        return 'Start free trial';
    }
  }
  switch (context) {
    case 'nav':
      return 'Start free trial, begin coach signup';
    case 'hero':
      return 'Start free trial, begin coach signup';
    case 'cta':
      return 'Start free trial, begin coach signup';
    case 'roi':
      return 'Start free trial, begin coach signup';
    case 'mobileNav':
      return 'Start free trial, begin coach signup';
    default:
      return 'Start free trial';
  }
}
