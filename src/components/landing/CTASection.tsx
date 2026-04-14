import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { LandingTrialCtaLink } from '@/components/landing/LandingTrialCtaLink';
import {
  LANDING_COPY,
  LANDING_H2_ACCENT_ON_DARK,
  landingTrialAriaLabel,
} from '@/constants/landingCopy';
import { LANDING_GUEST_CHECKOUT_ENABLED } from '@/constants/platform';
import { useScrollReveal } from '@/hooks/useScrollReveal';

export function CTASection() {
  const { user } = useAuth();
  const headingRef = useScrollReveal({ staggerDelay: 150, staggerIndex: 0 });
  const subtitleRef = useScrollReveal({ staggerDelay: 150, staggerIndex: 1 });
  const ctaRef = useScrollReveal({ staggerDelay: 150, staggerIndex: 2 });

  return (
    <section className="relative overflow-hidden bg-landing-contrast-bg py-28 sm:py-36">
      {/* Subtle gradient glow */}
      <div className="absolute inset-0 -z-0">
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-landing-contrast-surface-elevated/60 blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2
            ref={headingRef}
            className="text-balance mb-6 text-3xl font-bold leading-tight text-landing-contrast-fg sm:text-4xl md:text-5xl"
          >
            Assess Smarter.{' '}
            <span className={LANDING_H2_ACCENT_ON_DARK}>Retain Longer.</span>
          </h2>
          <p ref={subtitleRef} className="mx-auto mb-10 max-w-2xl text-balance text-lg text-landing-contrast-subtle">
            {LANDING_COPY.ctaSectionSubtitle}
          </p>
          
          <div ref={ctaRef}>
            {user ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-[0.99]"
              >
                Go to Dashboard
                <ArrowRight className="h-5 w-5" />
              </Link>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <LandingTrialCtaLink
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-[0.99]"
                  ariaLabel={landingTrialAriaLabel('cta', LANDING_GUEST_CHECKOUT_ENABLED)}
                >
                  Start Free Trial
                  <ArrowRight className="h-5 w-5" />
                </LandingTrialCtaLink>
                <p className="text-sm text-landing-contrast-muted">{LANDING_COPY.ctaSectionMicrocopy}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
