/**
 * Organization admin Billing tab — coach-visible copy (i18n-ready).
 */

export const ORG_BILLING_COPY = {
  billingPageIntro:
    'Choose your client-capacity plan in One Assess. Stripe Checkout collects payment for new subscriptions; Stripe also hosts card and invoice management.',
  billingPageIntroShort:
    'Your plan and usage are shown here. Change your client limit in the packages section below.',

  billingPageYourPlanEyebrow: 'Your plan',
  billingPageAccountStripTitle: 'Billing contact',
  billingPageAccountStripLead:
    'This person receives billing emails from One Assess. Your card and invoices are managed through our billing portal.',

  billingPageMissingOrgTitle: "Your account isn't set up yet",
  billingPageMissingOrgBody:
    "It looks like your account setup isn't complete. Go back to onboarding to finish, or contact support if you're stuck.",

  billingPageLoadFailedTitle: "Couldn't load your billing details",
  billingPageLoadFailedBody:
    "Something went wrong loading your plan. Check your connection and try again — your data is safe.",

  billingPageOrgDocMissingTitle: "We couldn't find your account",
  billingPageOrgDocMissingBody:
    "This sometimes happens right after signing up — it just takes a moment to finish creating your account. Wait a few seconds and refresh. If the problem continues, contact support.",

  stripeDisabledTitle: 'Online checkout',
  stripeDisabledBody:
    'Stripe is not configured in this environment (missing publishable key). In production, subscribe and manage payment appear here for paying organizations.',
  portalCardTitle: 'Card & invoices (Stripe)',
  portalCardLead:
    'Stripe’s hosted page for the card on file, receipts, and invoices. Plan capacity is changed in One Assess above; use Stripe here for payment details and billing history.',
  portalCtaOpen: 'Open Stripe',
  portalCtaOpening: 'Opening…',
  noCustomerLead:
    'No Stripe customer on file yet. Use the checkout section below to add a subscription, or open Settings → Billing for the same flow.',

  clientCapacityTitle: 'Client capacity',
  clientCapacityUsed: (active: number, limit: number) =>
    `${active} of ${limit} client slots used`,
  clientCapacityAtLimit:
    'At your client limit. Upgrade your plan on the billing page to add more active clients.',
  clientCapacityNearlyFull: (remaining: number) =>
    `Nearly at capacity — ${remaining} client slot${remaining === 1 ? '' : 's'} remaining.`,
  clientCapacityCoaches: (n: number) =>
    `${n} ${n === 1 ? 'coach' : 'coaches'} in your organisation`,
  orgBillingLinkFullPage: 'Full billing page',
  orgBillingLinkFullPageHint: 'Stripe checkout, capacity, invoices — same as Settings → Billing',
  orgBillingLinkFullPageCta: 'Open billing',

  billingPagePortalTitle: 'Card, invoices & receipts',
  billingPagePortalLead:
    'Stripe hosts this page. Use it for payment method and paperwork — not for picking your capacity package (that happens in One Assess).',
  billingPagePortalBulletPayment: 'Update the card on file or billing details',
  billingPagePortalBulletInvoices: 'View and download invoices and receipts',
  billingPagePortalBulletPlan: 'Cancel subscription (if enabled in your Stripe portal settings)',
  billingPagePortalBulletCapacity:
    'Switching monthly ↔ annual billing if your Stripe portal allows — otherwise contact support',
  billingPagePortalCta: 'Open Stripe',
  billingPagePortalCtaLoading: 'Opening…',
  billingPagePortalFootnote:
    'You will leave One Assess briefly and return to this page when you are done. Exact options depend on your Stripe Customer Portal settings.',
  billingPagePastDuePortalHint:
    'Your account shows a past-due payment. Open the portal to update your payment method and avoid interruption.',
  billingPageTrialWithCustomerHint:
    'You have a Stripe customer on file. Use the portal to add a payment method before the trial ends, or subscribe using the checkout section below.',
  billingPageNoCustomerBody:
    'No Stripe customer on file yet. Use the subscribe section below to run through checkout like a new paying organization.',

  /** When Firestore has no amount yet but status is still "trial" */
  billingPagePlanTrialNoPrice: "You're on a free trial. Choose a plan below when you're ready to subscribe.",
  /** Active org, Stripe customer, but amount not synced to Firestore yet */
  billingPagePlanActiveWithPortal:
    "You're subscribed. Change your client limit in the packages section, or open the billing portal for your card and invoices.",
  /** Active but no Stripe customer and no price in app data */
  billingPagePlanActiveNoStripe:
    "You don't have an active subscription yet. Choose a package below to get started.",
  /** cancelled, past_due, none, etc. with no amount */
  billingPagePlanOtherNoPrice: "Your billing isn't fully set up. Choose a package below or contact support.",

  billingPageSectionYourSubscription: 'Your subscription',
  billingPageSectionManageStripe: 'Manage in Stripe',
  billingPageSectionAccount: 'Account',

  billingPagePaymentCardTitle: 'Payment & invoices',
  billingPagePaymentCardBodyWithPortal:
    'Update your card, download invoices, or cancel in Stripe. Change client capacity in the packages section on this page.',
  billingPagePaymentCardBulletOne: 'Payment method and billing details',
  billingPagePaymentCardBulletTwo: 'Invoices, receipts, and subscription changes',
  billingPagePaymentCardBodyNoPortal:
    'After you pick a package below, you will add a payment method on Stripe’s checkout page.',
  billingPagePaymentOpenPortal: 'Open Stripe',

  billingPageContactCardTitle: 'Billing contact',
  billingPageContactCardHint: 'Organisation admin receiving billing emails.',

  billingSubscriptionManagePlan: 'Card & invoices (Stripe)',
  billingSubscriptionScrollToPackages: 'Choose a new package',
  billingPageStripePortalHonestCta: 'Card & invoices (Stripe)',

  billingActiveSubSectionEyebrow: 'Change or cancel your subscription',
  billingActiveSubSectionTitle: 'Plan changes happen in Stripe',
  billingActiveSubSectionLead:
    'You already have an active subscription, so we do not run a second checkout from this page. Use Stripe for billing tasks. If your portal only shows payment method and invoice history, subscription self-serve is not enabled in Stripe yet.',
  billingActiveSubBulletPortal:
    'Open Stripe to update your card, download invoices, or change/cancel the subscription when your portal allows it.',
  billingActiveSubBulletNoCompare:
    'The package grid below is hidden while you are subscribed so you are not stuck with a greyed‑out checkout button.',
  billingActiveSubBulletStripeConfig:
    'To offer upgrade/downgrade inside the portal, enable subscription management in Stripe Dashboard → Settings → Billing → Customer portal, and attach every price customers may switch to.',
  billingActiveSubClientsNote: 'You currently have {count} active clients in this organisation.',
  billingActiveSubContactCta: 'Contact support',

  billingPageIntroActiveLocked:
    "You're all set. Your plan and client usage are shown above. To change your client limit, pick a different package below. Use the billing portal only to update your card or download invoices.",

  /** Toast when opening portal but Stripe lists no subscriptions for this customer */
  billingPagePortalNoSubscriptionToastTitle: 'No active subscription found',
  billingPagePortalNoSubscriptionToastBody:
    'You can still update your card in the billing portal. To change or cancel your plan, choose a package on this page first.',

  /** Inline hint — customer exists but Firestore has no stripeSubscriptionId */
  billingPagePortalHintNoSubId:
    'The billing portal shows your card and invoices. To change your plan or client limit, use the packages section on this page.',

  /** Inline hint — org appears subscribed; portal misconfiguration is common */
  billingPagePortalHintDashboard:
    'The billing portal is for updating your card and downloading invoices. To change your client capacity, use the packages section below.',
} as const;
