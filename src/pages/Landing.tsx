import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { ArrowRight } from 'lucide-react';
import {
  Navbar,
  HeroSection,
  HowItWorksSection,
  LandingCapabilitiesSection,
  TestimonialsSection,
  TestimonialCard,
  ROIComparison,
  UnderTheHood,
  CoachPositioningSection,
  BuiltByExperts,
  PricingSection,
  LandingPricingPlans,
  FAQSection,
  CTASection,
  Footer,
  LandingBackToTop,
} from '@/components/landing';
import { useAuth } from '@/hooks/useAuth';
import { LANDING_COPY, LANDING_FAQ_ITEMS, LANDING_TESTIMONIALS } from '@/constants/landingCopy';

const LANDING_SCROLL_PATHS: readonly string[] = [ROUTES.HOME, ROUTES.PRICING];

export default function Landing() {
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!LANDING_SCROLL_PATHS.includes(location.pathname)) return;

    const id = location.hash.replace(/^#/, '').trim();
    if (id) {
      const decoded = decodeURIComponent(id);
      const prefersReduced =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const behavior: ScrollBehavior = prefersReduced ? 'auto' : 'smooth';

      const t = window.setTimeout(() => {
        document.getElementById(decoded)?.scrollIntoView({ block: 'start', behavior });
      }, 0);
      return () => window.clearTimeout(t);
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.hash]);

  return (
    <div className="min-h-screen landing-page">
      <Navbar />

      <main id="main-content" className="pb-28 md:pb-0">
        <HeroSection />
        <HowItWorksSection />
        <LandingCapabilitiesSection />

        <TestimonialsSection>
          {LANDING_TESTIMONIALS.map((testimonial, index) => (
            <TestimonialCard
              key={testimonial.author}
              quote={testimonial.quote}
              author={testimonial.author}
              role={testimonial.role}
              company={testimonial.company}
              index={index}
            />
          ))}
        </TestimonialsSection>

        <ROIComparison />
        <UnderTheHood />
        <CoachPositioningSection />
        <BuiltByExperts />

        <PricingSection>
          <LandingPricingPlans />
        </PricingSection>

        <FAQSection items={[...LANDING_FAQ_ITEMS]} />
        <CTASection />
      </main>

      <Footer />

      <LandingBackToTop />

      {/* Sticky Bottom CTA for Mobile — frosted glass bar, Apple-style */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
        <div className="bg-white/80 backdrop-blur-xl border-t border-slate-200/60 px-4 py-3 safe-area-pb">
          {user ? (
            <Link
              to="/dashboard"
              className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 text-sm"
            >
              Go to Dashboard <ArrowRight size={16} />
            </Link>
          ) : (
            <Link
              to="/try"
              className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 text-sm"
            >
              {LANDING_COPY.mobileStickyCta} <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
