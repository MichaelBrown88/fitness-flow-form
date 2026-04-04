/**
 * Coach-visible copy for Settings (profile, hints).
 */

export const SETTINGS_COPY = {
  PROFILE_EMAIL_MANAGED:
    'This is your sign-in email. To change it, contact support or use your provider’s account settings where supported.',
  PROFILE_DISPLAY_NAME_HELP: 'Shown to clients on reports and in your team list.',
  PROFILE_SAVE: 'Save profile',
  PROFILE_SAVED: 'Profile updated',
  PROFILE_SAVE_ERROR: 'Could not save profile',
  PROFILE_ORG_LINK: 'Edit organisation name',
  PROFILE_ORG_READONLY_COACH:
    'Organisation name is managed by your admin. You can update your display name above.',

  BILLING_CARD_TITLE: 'Billing & subscription',
  BILLING_CARD_DESCRIPTION:
    'Stripe checkout, client capacity, payment method, and invoices. Organization → Billing is a shorter summary for admins.',
  BILLING_CARD_CTA: 'Open billing',

  BRANDING_PURCHASE_CTA: 'Purchase custom branding',
  BRANDING_PURCHASE_LOADING: 'Opening checkout…',
  BRANDING_PURCHASE_HELP:
    'One-time add-on. After payment, you can upload your logo and use your gradient on reports and in the app.',
  BRANDING_PURCHASE_SUCCESS: 'Custom branding purchase complete',
  BRANDING_PURCHASE_SUCCESS_DETAIL:
    'Stripe has confirmed payment. If logo upload is still locked, refresh the page in a moment.',
  BRANDING_PURCHASE_ERROR: 'Could not start branding checkout',
  BRANDING_STRIPE_DISABLED: 'Online payments are not configured in this environment.',
} as const;
