import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { ArrowRight } from 'lucide-react';
import {
  Navbar,
  HeroSection,
  HowItWorksSection,
  ScannerShowcase,
  UnderTheHood,
  FeaturesSection,
  TestimonialsSection,
  TestimonialCard,
  ROIComparison,
  BuiltByExperts,
  PricingSection,
  LandingPricingPlans,
  FAQSection,
  CTASection,
  Footer,
  LandingBackToTop,
} from '@/components/landing';
import { useAuth } from '@/hooks/useAuth';
import { LANDING_COPY } from '@/constants/landingCopy';

// Testimonial data
const testimonials = [
  {
    quote: 'One Assess has completely transformed how I run assessments. What used to take me 2 hours now takes 15 minutes, and my clients love the professional reports.',
    author: 'Sarah Chen',
    role: 'Performance Coach',
    company: 'Elite Fitness Studio',
  },
  {
    quote: 'The Clinical Logic Engine is incredibly accurate. It catches biomechanical issues I might miss, and the evidence-based reports make it easy to explain findings to clients with confidence.',
    author: 'Marcus Johnson',
    role: 'Gym Owner',
    company: 'Iron Works Gym',
  },
  {
    quote: 'We rolled this out to all 12 coaches in our gym. The consistency in our assessments has improved dramatically, and client retention is up 25%.',
    author: 'Emma Rodriguez',
    role: 'Head of Training',
    company: 'FitLife Chain',
  },
];

// FAQ data
const faqItems = [
  {
    question: 'How does the Clinical Logic Engine work?',
    answer: 'Our proprietary Clinical Logic Engine uses deterministic algorithms (not AI guessing) to analyze biomechanical data. It maps 360+ key points on the body against a database of 5,000+ validated clinical benchmarks. Each measurement is compared to normative data, and our engine generates evidence-based findings in seconds. You can review and customize all results before generating client reports.',
  },
  {
    question: 'Can I customize the reports with my branding?',
    answer: 'Reports always show "Powered by One Assess" so clients know the platform behind your brand. Your logo and brand colours on reports and in the app are available as a paid add-on on paid plans. Custom domains for sharing reports are also available on higher tiers.',
  },
  {
    question: 'Is my clients\' data secure?',
    answer: 'Absolutely. We use bank-level encryption for all data at rest and in transit. Your clients\' photos and personal information are stored securely and never shared with third parties. We\'re GDPR compliant and take privacy seriously.',
  },
  {
    question: 'Do I need special equipment for posture analysis?',
    answer: 'No special equipment needed! A smartphone camera works perfectly. We recommend good lighting and a plain background for best results. Our app guides you through capturing the right angles.',
  },
  {
    question: 'Can I try it before committing?',
    answer:
      'Solo coaches can use the free plan forever for up to 2 clients — no card required. Gyms and studios get a 14-day trial with a generous client cap during the trial; subscribe when you are ready to continue.',
  },
  {
    question: 'How do I invite my team members?',
    answer: 'On paid plans you can invite team members directly from your dashboard. They\'ll receive an email invitation to join your organization. You can manage their permissions and access levels.',
  },
];

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
        <ScannerShowcase />
        <UnderTheHood />
        <FeaturesSection />

        <TestimonialsSection>
          {testimonials.map((testimonial, index) => (
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
        <BuiltByExperts />

        <PricingSection>
          <LandingPricingPlans />
        </PricingSection>

        <FAQSection items={faqItems} />
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
