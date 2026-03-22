/**
 * Coach-visible marketing copy for the public landing. Single source for hero/CTA consistency.
 */

export const LANDING_COPY = {
  /** Single hero trust line under CTAs (keep short for scanability). */
  heroTrustMicro: '5k+ assessments · Solo free · Gym 14-day trial',
  /** Hero subhead: reports + share link + between-session value (max ~2 sentences). */
  heroSubtitle:
    'Professional reports and a secure link clients can revisit. Show progress between sessions—coach more, chase updates less.',
  howItWorksStep2Footer:
    'Turn data into a narrative with instant gap-style reports. Share a private link so clients reopen results anytime—and see how their plan breaks into phases.',
  howItWorksStep3Footer:
    'Retention means showing progress. Re-check single pillars without repeating the full intake, compare assessments over time, and spot who needs a nudge before they go quiet.',
  /** Features section header subtitle. */
  featuresSubtitle:
    'From first assessment to long-term follow-up: structured data, client-facing progress, and less spreadsheet work.',
  /** Scanner section: capture → output thread. */
  scannerShowcaseSubtitle:
    'Turn photos into structured data—no manual typing. Feed it straight into client-ready reports and secure share links.',
  ctaSectionSubtitle:
    'Professional assessments, secure client links, and progress between sessions. Solo: free tier without a card. Gyms: start a 14-day trial, then subscribe when you are ready.',
  ctaSectionMicrocopy: 'No card required to start on the solo free tier.',
  mobileStickyCta: 'Start free',
  footerAdminLinkAriaLabel: 'Platform admin login',
} as const;

/** Four feature rows: order matches icon list in FeaturesSection. */
export const LANDING_FEATURE_CARDS = [
  {
    title: 'Clinical Logic Engine',
    desc: '360+ data points checked against 5,000+ clinical benchmarks. Automatically.',
  },
  {
    title: 'Progress clients see',
    desc: 'Scores, milestones, and achievements clients want to improve—on the secure link you share.',
  },
  {
    title: 'Team management',
    desc: 'Same assessment rails and shared client views across every coach. One method, one brand.',
  },
  {
    title: 'Secure & private',
    desc: 'Enterprise-grade encryption. HIPAA and GDPR compliant.',
  },
] as const;

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
      'The Clinical Logic Engine is incredibly accurate. It catches biomechanical issues I might miss, and the evidence-based reports make it easy to explain findings to clients with confidence.',
    author: 'Marcus Johnson',
    role: 'Gym Owner',
    company: 'Iron Works Gym',
  },
  {
    quote:
      'Clients actually use the link between sessions—fewer "send that again" messages. I stay on top of who needs a follow-up, and retention feels noticeably stickier.',
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
    question: 'How does the Clinical Logic Engine work?',
    answer:
      'Our proprietary Clinical Logic Engine uses deterministic algorithms (not AI guessing) to analyze biomechanical data. It maps 360+ key points on the body against a database of 5,000+ validated clinical benchmarks. Each measurement is compared to normative data, and our engine generates evidence-based findings in seconds. You can review and customize all results before generating client reports.',
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
    answer:
      'Solo coaches can use the free plan forever for up to 2 clients — no card required. Gyms and studios get a 14-day trial with a generous client cap during the trial; subscribe when you are ready to continue.',
  },
  {
    question: 'How do I invite my team members?',
    answer:
      'On paid plans you can invite team members directly from your dashboard. They\'ll receive an email invitation to join your organization. You can manage their permissions and access levels.',
  },
  {
    question: 'How do clients see their report and plan?',
    answer:
      'You share a secure, private link per client. They can view their report, phased plan, and progress in the browser—no separate client app required. You stay in control of what you send.',
  },
  {
    question: 'Do clients need to sign up or create an account?',
    answer:
      'No. Coaches work inside One Assess. Clients open the links you send (token-based, designed for mobile) so they can review results and next steps without managing another password.',
  },
];

/** Accessible names for multiple “Start free trial” controls (screen readers). */
export function landingTrialAriaLabel(
  context: 'nav' | 'hero' | 'cta' | 'roi' | 'mobileNav',
  goesToPricingFirst: boolean,
): string {
  if (goesToPricingFirst) {
    switch (context) {
      case 'nav':
        return 'Start free trial — jump to pricing and plans';
      case 'hero':
        return 'Start free trial — view pricing and plans';
      case 'cta':
        return 'Start free trial — view pricing and plans';
      case 'roi':
        return 'Start free trial — view pricing and plans';
      case 'mobileNav':
        return 'Start free trial — jump to pricing and plans';
      default:
        return 'Start free trial';
    }
  }
  switch (context) {
    case 'nav':
      return 'Start free trial — begin coach signup';
    case 'hero':
      return 'Start free trial — begin coach signup';
    case 'cta':
      return 'Start free trial — begin coach signup';
    case 'roi':
      return 'Start free trial — begin coach signup';
    case 'mobileNav':
      return 'Start free trial — begin coach signup';
    default:
      return 'Start free trial';
  }
}
