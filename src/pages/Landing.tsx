import { useEffect } from 'react';
import { Link } from 'react-router-dom';
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
} from '@/components/landing';
import { useAuth } from '@/hooks/useAuth';

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

export default function Landing() {
  const { user } = useAuth();

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen landing-page">
      <Navbar />
      
      <main>
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
              Try Free — No Sign-up <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
