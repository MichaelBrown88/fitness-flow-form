import { Link } from 'react-router-dom';
import { LANDING_GUEST_CHECKOUT_ENABLED } from '@/constants/platform';
import { ROUTES } from '@/constants/routes';

export interface LandingTrialCtaLinkProps {
  className: string;
  children: React.ReactNode;
  onNavigate?: () => void;
  /** Distinct name when multiple “Start free trial” links exist (WCAG 2.4.4). */
  ariaLabel?: string;
}

/**
 * Logged-out “Start free trial” style CTAs: when guest Stripe checkout is enabled, send users to
 * the pricing block (`#pricing`) so “Get started” opens Checkout; otherwise `/onboarding`.
 */
export function LandingTrialCtaLink({
  className,
  children,
  onNavigate,
  ariaLabel,
}: LandingTrialCtaLinkProps) {
  if (LANDING_GUEST_CHECKOUT_ENABLED) {
    return (
      <a
        href="#pricing"
        className={className}
        onClick={onNavigate}
        aria-label={ariaLabel}
      >
        {children}
      </a>
    );
  }
  return (
    <Link
      to={ROUTES.ONBOARDING}
      className={className}
      onClick={onNavigate}
      aria-label={ariaLabel}
    >
      {children}
    </Link>
  );
}
