/**
 * Organization admin Billing tab — coach-visible copy (i18n-ready).
 */

export const ORG_BILLING_COPY = {
  billingPageIntro:
    'Choose your client-capacity plan in One Assess. Stripe Checkout collects payment for new subscriptions; Stripe also hosts card and invoice management.',
  billingPageIntroShort:
    'See your plan and usage here. Change capacity in the packages section; use Stripe only for checkout (new subs) or card and invoices.',

  billingPageYourPlanEyebrow: 'Your plan',
  billingPageAccountStripTitle: 'Billing contact',
  billingPageAccountStripLead:
    'This person receives billing-related email from One Assess. The card on file and invoice PDFs are in Stripe; your capacity plan is managed in One Assess.',

  billingPageMissingOrgTitle: 'No organisation linked',
  billingPageMissingOrgBody:
    'Your account is not linked to an organisation yet. Finish onboarding or contact support if this persists.',

  billingPageLoadFailedTitle: 'Could not load billing',
  billingPageLoadFailedBody:
    'We could not load your organisation billing record. Check your connection and try again, or contact support.',

  billingPageOrgDocMissingTitle: 'Organisation not found',
  billingPageOrgDocMissingBody:
    'There is no organisation record for this account yet. If you just finished onboarding, try again in a moment; otherwise contact support.',

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
  billingPagePlanTrialNoPrice: 'Free trial — pick a capacity package below when you are ready to subscribe.',
  /** Active org, Stripe customer, but amount not synced to Firestore yet */
  billingPagePlanActiveWithPortal:
    'Stripe customer on file — change capacity in the packages section below; open Stripe for your card and invoices.',
  /** Active but no Stripe customer and no price in app data */
  billingPagePlanActiveNoStripe:
    'No subscription price on file — use checkout below to choose a package.',
  /** cancelled, past_due, none, etc. with no amount */
  billingPagePlanOtherNoPrice: 'No recurring price on file — use checkout or the portal to fix billing.',

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
    'You are subscribed. Your current plan and usage are above — compare packages below and confirm changes in One Assess. Open Stripe only for your card and invoices.',

  /** Toast when opening portal but Stripe lists no subscriptions for this customer */
  billingPagePortalNoSubscriptionToastTitle: 'No subscription in Stripe yet',
  billingPagePortalNoSubscriptionToastBody:
    'You can still update your card in the portal. To cancel or change plans, complete checkout on this page first so Stripe creates a subscription.',

  /** Inline hint — customer exists but Firestore has no stripeSubscriptionId */
  billingPagePortalHintNoSubId:
    'Stripe only shows plan changes when there is an active subscription on your customer. Finish checkout below if you have not subscribed yet.',

  /** Inline hint — org appears subscribed; portal misconfiguration is common */
  billingPagePortalHintDashboard:
    'If the portal opens but you only see payment method and invoices, enable subscription management in Stripe Dashboard → Settings → Billing → Customer portal, and add every capacity price (monthly and annual) customers can switch to. To keep solo and gym on separate plan lists, create two portal configurations in Stripe and set STRIPE_BILLING_PORTAL_CONFIGURATION_ID_SOLO_* and _GYM_* on Cloud Functions.',
} as const;
