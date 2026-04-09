/**
 * Coach- and visitor-facing copy for Stripe checkout outcomes (i18n-ready).
 */

export const CHECKOUT_FLOW_COPY = {
  guestSuccessTitle: 'Payment received',
  guestSuccessLead:
    'Your subscription is set up. Create your account next so we can link this billing to your organisation.',
  guestSuccessSessionHint: 'Reference:',
  guestSuccessCtaSignup: 'Create your account',
  guestSuccessCtaLogin: 'Already have an account? Sign in',
  guestSuccessCtaSampleReport: 'See a sample client report',
  guestSuccessCtaHome: 'Back to home',

  guestCancelTitle: 'Checkout cancelled',
  guestCancelLead: 'No charge was made. You can choose a plan again when you are ready.',
  guestCancelCtaPricing: 'Return to pricing',
  guestCancelCtaHome: 'Home',

  billingSuccessTitle: 'You\'re all set',
  billingSuccessLead:
    'Your subscription is confirmed. Your plan limits and AI credits will update within a minute.',
  billingSuccessStepDashboard: 'Head to your dashboard to start working with clients.',
  billingSuccessStepBilling: 'Your plan details and invoices are in Billing & subscription.',
  billingSuccessStepSample: 'New to reports? Preview a sample client report.',
  billingSuccessCtaDashboard: 'Go to dashboard',
  billingSuccessCtaBilling: 'View billing',
  billingSuccessCtaSample: 'View sample report',

  checkoutStep1Short: 'Choose plan',
  checkoutStep2Short: 'Pay securely',
  checkoutStep2ShortActiveSub: 'Confirm change',
  checkoutClientsInOrg: 'You currently have {count} active clients.',
  checkoutPlanSummaryTitle: 'Plan summary',
  checkoutSummaryPanelSub: 'Review your selection and continue to payment.',
  checkoutSummaryPackageLabel: 'Package',
  checkoutSummaryNoTier: 'Choose a client capacity above.',
  checkoutSummaryBillingPeriod: 'Billing',
  checkoutSummaryClients: 'Client capacity',
  checkoutSummaryAiCredits: 'AI credits / month',
  checkoutSummaryNextStep: 'You\'ll complete payment on Stripe\'s secure checkout.',
  checkoutSummaryCompareHeading: 'Same plan over 12 months',
  checkoutSummaryTwelveMonthlyTotal: '12 × monthly',
  checkoutSummaryAnnualOnePayment: '1 × annual payment',
  checkoutSummaryEstimatedSaving: 'Your saving',
  checkoutSummaryDueToday: 'Due today',
  /** Shown under line items — Stripe is source of truth for proration. */
  checkoutSummaryStripeAmountsNote: 'Final total confirmed on Stripe.',
  checkoutSummaryOngoingHeading: 'Ongoing subscription',
  checkoutSummaryDueAtCheckoutHeading: 'Estimated due at checkout',
  checkoutSummaryDueAtCheckoutHeadingIllustrative: 'Plan change estimate',
  checkoutSummaryDueAtCheckoutSub:
    'First payment includes your subscription plus any one-time add-ons.',
  checkoutSummaryDueAtCheckoutSubIllustrative:
    'Stripe calculates the exact amount when you confirm, accounting for any credit from your current billing period.',
  checkoutSummaryBasePlanLine: 'Capacity plan',
  checkoutSummaryBrandingAddonLabel: 'Custom branding',
  checkoutSummaryBrandingAddonSublabel: 'One-time add-on',
  checkoutSummaryIncludeBrandingLabel: 'Add custom branding',
  checkoutSummaryIncludeBrandingHint: 'One-time payment, billed with this checkout.',
  checkoutSummaryIncludeBrandingLockedTitle: 'Custom branding',
  checkoutSummaryIncludeBrandingLockedBody:
    'One-time add-on ({price}). Contact support to add this to your existing subscription.',
  checkoutPoweredByStripeNote: 'Payments processed by Stripe.',
  checkoutAllPricesGbpNote: 'All prices in GBP.',

  billingSubscribeSectionLabel: 'Your plan',
  billingSubscribeTitle: 'Choose your plan',
  billingSubscribeTitleCompare: 'Change your plan',
  billingSubscribeLeadCompare:
    'Pick a different capacity or billing period and confirm below.',
  billingSubscribeLeadCheckout: 'Choose a billing cycle and client capacity, then continue to payment.',
  billingSubscribeContinueDisabled: 'Change plan in billing portal',
  /** Active subscription: primary CTA runs in-app plan update (Stripe API) */
  billingSubscribeConfirmPlanChange: 'Confirm plan change',
  billingSubscribeActiveSubBanner:
    'Active subscription — confirm below to update your capacity.',
  checkoutSummaryNextStepLocked:
    'Stripe will apply any credit from your current billing period.',
  checkoutSummaryPanelSubLocked: 'Stripe confirms the exact charge when you confirm.',
  billingSubscribeCurrentBadge: 'Current',
  billingSubscribeCapacityLabel: 'Client capacity',
  /** Option row in capacity dropdown: clients, main price, AI credits */
  billingSubscribeCapacityOption: '{clients} clients · {price} · {ai} AI/mo',
  billingSubscribePeriodLabel: 'Billing',
  billingSubscribePeriodMonthly: 'Monthly',
  billingSubscribePeriodAnnual: 'Annual',
  billingSubscribePackagesMonthlyTitle: 'Plans (monthly)',
  billingSubscribePackagesAnnualTitle: 'Plans (annual)',
  billingSubscribePerMonthShort: '/month',
  billingSubscribePerYearShort: '/year',
  billingSubscribeEquivMonthly: '~{amount}/mo average',
  billingSubscribePackageLabel: 'Plan',
  billingSubscribePackageHint: 'To switch between monthly and annual billing, use the billing portal.',
  billingSubscribePackageHintActiveSub:
    'To switch between monthly and annual, use the billing portal.',
  billingSubscribeOpening: 'Opening…',
  billingSubscribeContinue: 'Continue to payment',

  billingSubscribeGbpCatalogNote: 'Prices in GBP.',

  billingNonGbSectionTitle: 'Contact us to subscribe',
  billingNonGbSectionLead:
    'Online checkout is currently available for UK billing accounts. To subscribe or change your plan, get in touch and we\'ll get you set up.',
  billingNonGbActiveSubHint:
    'You already have an active subscription — open the billing portal from the plan section to manage invoices and payment details.',
  billingNonGbContactCta: 'Contact us',

  /** Shown under checkout callable errors in the plan summary panel */
  checkoutErrorAlertHint: 'Try again or refresh the page. If the problem continues, contact support.',

  checkoutCallableFailedToastTitle: 'Could not start checkout',

  // Custom branding add-on
  brandingAddOnTitle: 'Custom branding',
  brandingAddOnDesc: 'White-label client reports with your own logo and colours.',
  brandingAddOnPrice: (price: string) => `${price} one-time`,
  brandingAddOnCheckboxLabel: 'Add to this checkout',
  brandingAddOnActiveSubNote: 'Already subscribed? Contact us to add custom branding to your account.',
  brandingAddOnAlreadyEnabled: 'Custom branding is active on your account.',
} as const;
