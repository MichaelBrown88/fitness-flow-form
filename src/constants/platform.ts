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
  OCR_ENABLED: 'InBody OCR Scanning',
  REPORT_GENERATION_ENABLED: 'AI Report Generation',
};

/** Feature descriptions for tooltips/help text */
export const FEATURE_DESCRIPTIONS: Record<keyof typeof FEATURE_FLAGS, string> = {
  POSTURE_ENABLED: 'Enables AI-powered posture analysis using Gemini Vision. Disable if experiencing provider outages.',
  OCR_ENABLED: 'Enables automatic reading of InBody scan results. Disable if OCR accuracy issues arise.',
  REPORT_GENERATION_ENABLED: 'Enables AI-generated insights in client reports. Disable if generation is failing.',
};

/** Feature flag type for type safety */
export type FeatureFlagKey = typeof FEATURE_FLAGS[keyof typeof FEATURE_FLAGS];

/**
 * Stripe Configuration Constants
 * 
 * All Stripe keys are sourced from environment variables.
 * If VITE_STRIPE_PUBLISHABLE_KEY is not set, payment is skipped
 * and onboarding falls back to free trial mode.
 */
export const STRIPE_CONFIG = {
  /** Client-side publishable key — safe to expose in frontend */
  publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
  /** Whether Stripe is configured and payment should be collected */
  isEnabled: !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
  /** Success redirect path after checkout completion */
  successPath: '/onboarding?step=success',
  /** Cancel redirect path if user backs out of checkout */
  cancelPath: '/onboarding?step=payment',
} as const;
