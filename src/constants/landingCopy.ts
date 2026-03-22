/**
 * Coach-visible marketing copy for the public landing. Single source for hero/CTA consistency.
 */

export const LANDING_COPY = {
  /** Single hero trust line under CTAs (keep short for scanability). */
  heroTrustMicro: '5k+ assessments · Solo free · Gym 14-day trial',
  ctaSectionSubtitle:
    'Solo: free tier without a card. Gyms: start a 14-day trial, then subscribe when you are ready.',
  ctaSectionMicrocopy: 'No card required to start on the solo free tier.',
  mobileStickyCta: 'Start free',
  footerAdminLinkAriaLabel: 'Platform admin login',
} as const;

/** Accessible names for multiple “Start free trial” controls (screen readers). */
export function landingTrialAriaLabel(
  context: 'nav' | 'hero' | 'cta' | 'roi' | 'mobileNav',
  goesToPricingFirst: boolean,
): string {
  if (goesToPricingFirst) {
    switch (context) {
      case 'nav':
        return 'Start free trial — jump to pricing and plans';
      case 'hero':
        return 'Start free trial — view pricing and plans';
      case 'cta':
        return 'Start free trial — view pricing and plans';
      case 'roi':
        return 'Start free trial — view pricing and plans';
      case 'mobileNav':
        return 'Start free trial — jump to pricing and plans';
      default:
        return 'Start free trial';
    }
  }
  switch (context) {
    case 'nav':
      return 'Start free trial — begin coach signup';
    case 'hero':
      return 'Start free trial — begin coach signup';
    case 'cta':
      return 'Start free trial — begin coach signup';
    case 'roi':
      return 'Start free trial — begin coach signup';
    case 'mobileNav':
      return 'Start free trial — begin coach signup';
    default:
      return 'Start free trial';
  }
}
