import { Link } from 'react-router-dom';
import { LANDING_GUEST_CHECKOUT_ENABLED } from '@/constants/platform';
import { ROUTES } from '@/constants/routes';

export interface LandingTrialCtaLinkProps {
  className: string;
  children: React.ReactNode;
  onNavigate?: () => void;
}

/**
 * Logged-out “Start free trial” style CTAs: when guest Stripe checkout is enabled, send users to
 * the pricing block (`#pricing`) so “Get started” opens Checkout; otherwise `/onboarding`.
 */
export function LandingTrialCtaLink({ className, children, onNavigate }: LandingTrialCtaLinkProps) {
  if (LANDING_GUEST_CHECKOUT_ENABLED) {
    return (
      <a href="#pricing" className={className} onClick={onNavigate}>
        {children}
      </a>
    );
  }
  return (
    <Link to={ROUTES.ONBOARDING} className={className} onClick={onNavigate}>
      {children}
    </Link>
  );
}
