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
    <section className="py-24 sm:py-32 bg-slate-900 relative overflow-hidden">
      {/* Subtle gradient glow */}
      <div className="absolute inset-0 -z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2
            ref={headingRef}
            className="mb-6 text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl"
          >
            Assess Smarter.{' '}
            <span className={LANDING_H2_ACCENT_ON_DARK}>Retain Longer.</span>
          </h2>
          <p ref={subtitleRef} className="text-lg text-slate-300 mb-10 max-w-2xl mx-auto">
            {LANDING_COPY.ctaSectionSubtitle}
          </p>
          
          <div ref={ctaRef}>
            {user ? (
              <Link 
                to="/dashboard"
                className="inline-flex items-center justify-center gap-2 bg-white text-slate-900 px-8 py-4 rounded-xl text-base font-bold shadow-lg shadow-white/10 hover:bg-slate-100 transition-colors"
              >
                Go to Dashboard
                <ArrowRight className="h-5 w-5" />
              </Link>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <LandingTrialCtaLink
                  className="inline-flex items-center justify-center gap-2 bg-white text-slate-900 px-8 py-4 rounded-xl text-base font-bold shadow-lg shadow-white/10 hover:bg-slate-100 transition-colors"
                  ariaLabel={landingTrialAriaLabel('cta', LANDING_GUEST_CHECKOUT_ENABLED)}
                >
                  Start Free Trial
                  <ArrowRight className="h-5 w-5" />
                </LandingTrialCtaLink>
                <p className="text-slate-400 text-sm">{LANDING_COPY.ctaSectionMicrocopy}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
