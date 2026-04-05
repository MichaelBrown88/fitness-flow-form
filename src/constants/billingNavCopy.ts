/**
 * Short context lines so coaches and org admins know which billing surface to use.
 */

export const BILLING_NAV_COPY = {
  /** Shown at top of `/billing` (coach-facing full page) */
  COACH_PAGE_CONTEXT:
    "Manage your subscription, view usage, and access your invoices. If you manage a gym team, you’ll also find team billing under Org admin \u2192 Billing.",
  /** Shown at top of `/org/dashboard/billing` */
  ORG_ADMIN_PAGE_CONTEXT:
    'Organization-level plan, seats, and portal. Coaches can open Billing & subscription from their profile menu for the same Stripe customer when they manage payment.',
} as const;
