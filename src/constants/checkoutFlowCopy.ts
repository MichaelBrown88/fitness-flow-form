/**
 * Coach- and visitor-facing copy for Stripe checkout outcomes (i18n-ready).
 */

export const CHECKOUT_FLOW_COPY = {
  guestSuccessTitle: 'Payment received',
  guestSuccessLead:
    'Your subscription is set up in Stripe. Create your One Assess account next so we can link this billing to your organization.',
  guestSuccessSessionHint: 'Reference:',
  guestSuccessCtaSignup: 'Create your account',
  guestSuccessCtaLogin: 'Already have an account? Sign in',
  guestSuccessCtaSampleReport: 'See a sample client report',
  guestSuccessCtaHome: 'Back to home',

  guestCancelTitle: 'Checkout cancelled',
  guestCancelLead: 'No charge was made. You can choose a plan again when you are ready.',
  guestCancelCtaPricing: 'Return to pricing',
  guestCancelCtaHome: 'Home',

  billingSuccessTitle: 'You are all set',
  billingSuccessLead:
    'Your subscription is updating. It can take a minute for your plan limits and AI credits to appear.',
  billingSuccessStepDashboard: 'Open your dashboard and add or review clients.',
  billingSuccessStepBilling: 'Check Billing if your plan or payment details look out of date.',
  billingSuccessStepSample: 'New to reports? Preview a sample client report.',
  billingSuccessCtaDashboard: 'Go to dashboard',
  billingSuccessCtaBilling: 'View billing',
  billingSuccessCtaSample: 'View sample report',

  billingSubscribeTitle: 'Subscribe with Stripe',
  billingSubscribeLeadGym:
    'Choose billing period, then continue to secure checkout. You are billed for the gym capacity tier that matches your selected client seats ({seats}).',
  billingSubscribeLeadSolo:
    'Choose billing period, then continue to secure checkout. You are billed for the solo capacity tier that matches at least your next client slot ({seats} clients).',
  billingSubscribeOpening: 'Opening checkout…',
  billingSubscribeContinue: 'Continue to checkout',
  billingSubscribeRegionNote:
    'Capacity checkout is only available for the UK (GB) region. Contact support to change region or subscribe.',
} as const;
