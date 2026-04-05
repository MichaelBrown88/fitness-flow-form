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

  checkoutStep1Short: 'Choose package',
  checkoutStep2Short: 'Pay on Stripe',
  checkoutStep2ShortActiveSub: 'Confirm change',
  checkoutClientsInOrg: 'Clients in your organisation: {count}',
  checkoutPlanSummaryTitle: 'Plan summary',
  checkoutSummaryPanelSub: 'Review and continue to Stripe.',
  checkoutSummaryPackageLabel: 'Package',
  checkoutSummaryNoTier: 'Choose a client capacity.',
  checkoutSummaryBillingPeriod: 'Billing',
  checkoutSummaryClients: 'Client capacity',
  checkoutSummaryAiCredits: 'AI credits / month',
  checkoutSummaryNextStep: 'Opens Stripe Checkout in this tab.',
  checkoutSummaryCompareHeading: 'Same package over 12 months',
  checkoutSummaryTwelveMonthlyTotal: '12 × monthly (full year)',
  checkoutSummaryAnnualOnePayment: '1 × annual payment',
  checkoutSummaryEstimatedSaving: 'Estimated saving vs paying monthly',
  checkoutSummaryDueToday: 'Due today',
  /** Shown under line items — Stripe is source of truth for proration. */
  checkoutSummaryStripeAmountsNote: 'Final total is confirmed on Stripe (incl. proration if applicable).',
  checkoutSummaryOngoingHeading: 'Ongoing subscription',
  checkoutSummaryDueAtCheckoutHeading: 'Estimated due at checkout',
  checkoutSummaryDueAtCheckoutHeadingIllustrative: 'Illustrative checkout total',
  checkoutSummaryDueAtCheckoutSub:
    'First invoice: your subscription period plus any one-time add-ons you selected.',
  checkoutSummaryDueAtCheckoutSubIllustrative: 'Illustrative; Stripe applies proration for live subs.',
  checkoutSummaryBasePlanLine: 'Capacity plan',
  checkoutSummaryBrandingAddonLabel: 'Custom branding',
  checkoutSummaryBrandingAddonSublabel: 'One-time add-on',
  checkoutSummaryIncludeBrandingLabel: 'Add custom branding (one-time)',
  checkoutSummaryIncludeBrandingHint: 'Billed once with this checkout.',
  checkoutSummaryIncludeBrandingLockedTitle: 'Custom branding',
  checkoutSummaryIncludeBrandingLockedBody:
    'One-time ({price}). Add it when you use Stripe Checkout; for plan tweaks only, use support or your billing contact.',
  checkoutPoweredByStripeNote: 'Payments are processed by Stripe.',
  checkoutAllPricesGbpNote: 'All prices are in GBP.',

  billingSubscribeSectionLabel: 'Plan & checkout',
  billingSubscribeTitle: 'Capacity & billing',
  billingSubscribeTitleCompare: 'Change capacity',
  billingSubscribeLeadCompare:
    'Active subscription — pick capacity and period, then confirm. Monthly ↔ annual: Card & invoices (Stripe).',
  billingSubscribeLeadCheckout: 'Choose billing cycle and client capacity, then pay on Stripe.',
  billingSubscribeContinueDisabled: 'Change plan in Stripe (use button above)',
  /** Active subscription: primary CTA runs in-app plan update (Stripe API) */
  billingSubscribeConfirmPlanChange: 'Confirm plan change',
  billingSubscribeActiveSubBanner:
    'Subscribed — confirm below to update capacity in Stripe (proration may apply).',
  checkoutSummaryNextStepLocked: 'Applies to your live subscription; proration may apply.',
  checkoutSummaryPanelSubLocked: 'Stripe confirms the exact charge when you confirm.',
  billingSubscribeCurrentBadge: 'Current',
  billingSubscribeCapacityLabel: 'Client capacity',
  /** Option row in capacity dropdown: clients, main price, AI credits */
  billingSubscribeCapacityOption: '{clients} clients · {price} · {ai} AI/mo',
  billingSubscribePeriodLabel: 'Billing',
  billingSubscribePeriodMonthly: 'Monthly',
  billingSubscribePeriodAnnual: 'Annual',
  billingSubscribePackagesMonthlyTitle: 'Packages (monthly prices)',
  billingSubscribePackagesAnnualTitle: 'Packages (annual prices)',
  billingSubscribePerMonthShort: '/month',
  billingSubscribePerYearShort: '/year',
  billingSubscribeEquivMonthly: '~{amount}/mo avg when paid annually',
  billingSubscribePackageLabel: 'Capacity package',
  billingSubscribePackageHint: 'Tier changes later: Stripe customer portal (if enabled).',
  billingSubscribePackageHintActiveSub:
    'Monthly ↔ annual: use Card & invoices (Stripe).',
  billingSubscribeOpening: 'Opening checkout…',
  billingSubscribeContinue: 'Continue to Stripe Checkout',

  billingSubscribeGbpCatalogNote: 'GBP · UK billing region.',

  billingNonGbSectionTitle: 'Checkout in your region',
  billingNonGbSectionLead:
    'Self-serve capacity checkout in this app is only available when your organisation’s billing region is United Kingdom (GB). Your account is on a different region, so we cannot start Stripe Checkout from here.',
  billingNonGbActiveSubHint:
    'You already have an active subscription — open the billing portal from the Payment & account section on this page to manage invoices and plan changes in Stripe.',
  billingNonGbContactCta: 'Contact us to change region or subscribe',

  /** Shown under checkout callable errors in the plan summary panel */
  checkoutErrorAlertHint: 'Try again with the button below, or refresh the page if this continues.',

  checkoutCallableFailedToastTitle: 'Could not start checkout',
} as const;
