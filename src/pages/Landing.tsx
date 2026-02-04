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
  PricingCard,
  FAQSection,
  CTASection,
  Footer,
} from '@/components/landing';

// Testimonial data
const testimonials = [
  {
    quote: 'FitnessFlow has completely transformed how I run assessments. What used to take me 2 hours now takes 15 minutes, and my clients love the professional reports.',
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

// Pricing data
const pricingPlans = [
  {
    name: 'Starter',
    description: 'Perfect for solo coaches getting started',
    price: '$29',
    features: [
      { text: 'Unlimited assessments', included: true },
      { text: 'Clinical Logic Engine analysis', included: true },
      { text: 'Branded live reports', included: true },
      { text: 'Client portal access', included: true },
      { text: 'Team members', included: false },
      { text: 'Custom domain', included: false },
      { text: 'Priority support', included: false },
    ],
  },
  {
    name: 'Professional',
    description: 'For gyms and growing teams',
    price: '$79',
    highlighted: true,
    features: [
      { text: 'Everything in Starter', included: true },
      { text: 'Unlimited team members', included: true },
      { text: 'Advanced analytics', included: true },
      { text: 'Client progress tracking', included: true },
      { text: 'API access', included: true },
      { text: 'Custom domain', included: false },
      { text: 'Priority support', included: true },
    ],
  },
  {
    name: 'Enterprise',
    description: 'For gym chains and large organizations',
    price: 'Custom',
    features: [
      { text: 'Everything in Professional', included: true },
      { text: 'Multiple locations', included: true },
      { text: 'Custom domain & branding', included: true },
      { text: 'Dedicated account manager', included: true },
      { text: 'Custom integrations', included: true },
      { text: 'SLA guarantee', included: true },
      { text: '24/7 phone support', included: true },
    ],
    ctaText: 'Contact Sales',
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
    answer: 'Yes! All plans include the ability to add your logo and brand colors to reports. Professional and Enterprise plans offer additional customization options including custom domains for sharing reports.',
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
    answer: 'Yes! All plans include a 14-day free trial with full access to all features. No credit card required to start. Cancel anytime during the trial if it\'s not right for you.',
  },
  {
    question: 'How do I invite my team members?',
    answer: 'On Professional and Enterprise plans, you can invite team members directly from your dashboard. They\'ll receive an email invitation to join your organization. You can manage their permissions and access levels.',
  },
];

export default function Landing() {
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
          {pricingPlans.map((plan, index) => (
            <PricingCard
              key={plan.name}
              name={plan.name}
              description={plan.description}
              price={plan.price}
              features={plan.features}
              highlighted={plan.highlighted}
              ctaText={plan.ctaText}
              index={index}
            />
          ))}
        </PricingSection>

        <FAQSection items={faqItems} />

        <CTASection />
      </main>

      <Footer />
      
      {/* Sticky Bottom CTA for Mobile */}
      <div className="fixed bottom-6 left-6 right-6 z-40 md:hidden">
        <Link 
          to="/onboarding"
          className="w-full bg-slate-900 text-white py-4 rounded-full font-bold shadow-xl flex items-center justify-center gap-2"
        >
          Start Free Trial <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}

