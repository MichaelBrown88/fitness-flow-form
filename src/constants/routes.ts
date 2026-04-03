export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  DASHBOARD_SCHEDULE: '/dashboard/schedule',
  DASHBOARD_CALENDAR: '/dashboard/calendar',
  DASHBOARD_TEAM: '/dashboard/team',
  ASSESSMENT: '/assessment',
  LOGIN: '/login',
  SETTINGS: '/settings',
  ACHIEVEMENTS: '/achievements',
  ORG_DASHBOARD: '/org/dashboard',
  ORG_DASHBOARD_TEAM: '/org/dashboard/team',
  ORG_DASHBOARD_RETENTION: '/org/dashboard/retention',
  ORG_DASHBOARD_BILLING: '/org/dashboard/billing',
  ORG_DASHBOARD_INTEGRATIONS: '/org/dashboard/integrations',
  CLIENT_VIEW: '/client/:id',
  CLIENT_HISTORY: '/client/:id/history',
  CLIENT_SETTINGS: '/client/:id/settings',
  PUBLIC_REPORT: '/r/:token',
  PUBLIC_REPORT_ACHIEVEMENTS: '/r/:token/achievements',
  PUBLIC_REPORT_ROADMAP: '/r/:token/roadmap',
  PUBLIC_REPORT_LIFESTYLE: '/r/:token/lifestyle',
  PUBLIC_REPORT_ERASURE: '/r/:token/erasure',
  PUBLIC_REPORT_PRE_SESSION: '/r/:token/pre-session',
  ASSESSMENT_REPORT: '/coach/assessments/:id',
  ASSESSMENT_REPORT_CLIENT: '/coach/assessments/:id/client',
  /** Marketing pricing — same page as landing pricing section; always reachable when signed in. */
  PRICING: '/pricing',
  ABOUT: '/about',
  CONTACT: '/contact',
  BLOG: '/blog',
  COOKIES: '/cookies',
  DEMO: '/demo',
  COMPARE: '/compare',
  BILLING: '/billing',
  BILLING_SUCCESS: '/billing/success',
  /** Guest Stripe Checkout return URLs (not the marketing pricing page). */
  CHECKOUT_SUCCESS: '/checkout/success',
  CHECKOUT_CANCEL: '/checkout/cancel',
  /** Gym trial expired — full-page upgrade (Everfit-style entry to checkout). */
  SUBSCRIBE: '/subscribe',
  ONBOARDING: '/onboarding',
  /** Marketing alias; same onboarding flow as `/onboarding`. */
  SIGNUP: '/signup',
  TRY: '/try',
  CLIENT_ROADMAP: '/coach/clients/:name/roadmap',

  /** Platform admin (separate from org admin) */
  ADMIN: '/admin',
  ADMIN_LOGIN: '/admin/login',
  ADMIN_SETUP: '/admin/setup',
  ADMIN_ORGANIZATIONS: '/admin/organizations',
  ADMIN_ORGANIZATION: (orgId: string) => `/admin/organizations/${orgId}` as const,
} as const;

/**
 * Deep links into Settings main + Organization sub-tabs (synced in Settings.tsx via search params).
 */
export const SETTINGS_URL = {
  ORG_BRANDING: `${ROUTES.SETTINGS}?tab=organization&orgTab=branding`,
  ORG_EQUIPMENT: `${ROUTES.SETTINGS}?tab=organization&orgTab=equipment`,
} as const;

/** Coach assessment report URL builder (path segments encoded). */
export function coachAssessmentReportPath(
  assessmentId: string,
  query?: Record<string, string>,
): string {
  const base = `/coach/assessments/${encodeURIComponent(assessmentId)}`;
  if (!query || Object.keys(query).length === 0) return base;
  return `${base}?${new URLSearchParams(query).toString()}`;
}

/** Query params for `/coach/assessments/:id` deep links. */
export const COACH_ASSESSMENT_QUERY = {
  /** When set to `OPEN_SHARE_VALUE`, AssessmentReport opens the share dialog once loaded. */
  OPEN_SHARE_MODAL: 'share',
  OPEN_SHARE_VALUE: '1',
} as const;

/** Query keys for public client routes (support diagnostics). */
export const PUBLIC_CLIENT_URL_QUERY = {
  /** `?roadmapDebug=1` on `/r/:token/roadmap` shows roadmap load diagnostics. */
  ROADMAP_DEBUG: 'roadmapDebug',
} as const;
