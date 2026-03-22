/**
 * Platform Configuration Constants
 * 
 * Centralized constants for platform-level features and settings.
 * Following "Zero Magic Strings" rule from .cursorrules
 */

/** Feature flag keys - used for kill switches */
export const FEATURE_FLAGS = {
  POSTURE_ENABLED: 'posture_enabled',
  OCR_ENABLED: 'ocr_enabled',
  REPORT_GENERATION_ENABLED: 'report_generation_enabled',
} as const;

/** Human-readable feature names for UI display */
export const FEATURE_NAMES: Record<keyof typeof FEATURE_FLAGS, string> = {
  POSTURE_ENABLED: 'AI Posture Analysis',
  OCR_ENABLED: 'Report Photo Import',
  REPORT_GENERATION_ENABLED: 'AI Report Generation',
};

/** Feature descriptions for tooltips/help text */
export const FEATURE_DESCRIPTIONS: Record<keyof typeof FEATURE_FLAGS, string> = {
  POSTURE_ENABLED: 'Enables AI-powered posture analysis using Gemini Vision. Disable if experiencing provider outages.',
  OCR_ENABLED: 'Reads values from body comp report photos automatically. Turn off if results aren\'t accurate.',
  REPORT_GENERATION_ENABLED: 'Enables AI-generated insights in client reports. Disable if generation is failing.',
};

/** Feature flag type for type safety */
export type FeatureFlagKey = typeof FEATURE_FLAGS[keyof typeof FEATURE_FLAGS];

/** Platform Dashboard tab IDs (zero magic strings) */
export const PLATFORM_DASHBOARD_TABS = {
  OVERVIEW: 'overview',
  ORGANIZATIONS: 'organizations',
  FINANCIAL: 'financial',
  ADMIN: 'admin',
  DATA_INTELLIGENCE: 'data-intelligence',
  PLATFORM_INTELLIGENCE: 'platform-intelligence',
} as const;

export type PlatformDashboardTab = (typeof PLATFORM_DASHBOARD_TABS)[keyof typeof PLATFORM_DASHBOARD_TABS];

/**
 * Stripe & billing (client). Keys come from env; see `.env.example`.
 */

export const STRIPE_CONFIG = {
  /** Client-side publishable key — safe to expose in frontend */
  publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
  /** Whether Stripe is configured and payment should be collected */
  isEnabled: !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
  /** Success redirect path after capacity checkout (Stripe appends session_id) */
  successPath: '/billing/success',
  /** Cancel redirect path if user backs out of checkout */
  cancelPath: '/billing',
} as const;

const landingGuestOptInRaw = String(import.meta.env.VITE_ENABLE_LANDING_GUEST_CHECKOUT ?? '')
  .trim()
  .toLowerCase();
const landingGuestOptIn =
  landingGuestOptInRaw === 'true' ||
  landingGuestOptInRaw === '1' ||
  landingGuestOptInRaw === 'yes';

/**
 * Logged-out landing paid flow → `createLandingGuestCheckoutSession` (server: STRIPE_MODE=test + ENABLE_LANDING_GUEST_CHECKOUT).
 * On when publishable key is set, not explicitly disabled, and (Vite dev server OR explicit opt-in).
 */
export const LANDING_GUEST_CHECKOUT_ENABLED =
  STRIPE_CONFIG.isEnabled &&
  import.meta.env.VITE_DISABLE_LANDING_GUEST_CHECKOUT !== 'true' &&
  (import.meta.env.DEV || landingGuestOptIn);
