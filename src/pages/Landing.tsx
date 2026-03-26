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
import { Seo } from '@/components/seo/Seo';
import { requireSeoForPath, SEO_INDEXABLE_BY_PATH } from '@/constants/seo';

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

  const seoMeta =
    SEO_INDEXABLE_BY_PATH[location.pathname] ?? requireSeoForPath(ROUTES.HOME);

  return (
    <div className="min-h-screen landing-page">
      <Seo
        pathname={location.pathname}
        title={seoMeta.title}
        description={seoMeta.description}
        noindex={seoMeta.noindex}
      />
      <Navbar />

      <main id="main-content" className="pb-28 md:pb-0">
        <HeroSection
          variant={location.pathname === ROUTES.PRICING ? 'pricing' : 'home'}
        />
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
        <div className="safe-area-pb border-t border-border/60 bg-background/80 px-4 py-3 backdrop-blur-xl dark:border-border dark:bg-background/95">
          {user ? (
            <Link
              to="/dashboard"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg"
            >
              Go to Dashboard <ArrowRight size={16} />
            </Link>
          ) : (
            <Link
              to="/try"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg"
            >
              {LANDING_COPY.mobileStickyCta} <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
