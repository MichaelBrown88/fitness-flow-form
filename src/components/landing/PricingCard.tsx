import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import React from 'react';

interface PricingFeature {
  text: string;
  included: boolean;
}

interface PricingCardProps {
  name: string;
  description: string;
  price: string;
  period?: string;
  features: PricingFeature[];
  highlighted?: boolean;
  ctaText?: string;
  index?: number;
}

export function PricingCard({
  name,
  description,
  price,
  period = '/month',
  features,
  highlighted = false,
  ctaText = 'Get Started',
  index = 0,
}: PricingCardProps) {
  const GlassCard: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
    <div className={`backdrop-blur-2xl bg-white/60 border border-white/50 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:bg-white/80 transition-all duration-500 ${className}`}>
      {children}
    </div>
  );

  if (highlighted) {
    return (
      <div className="relative transform md:-translate-y-4">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500 to-violet-600 rounded-[32px] blur-sm opacity-20"></div>
        <GlassCard className="p-10 relative bg-white border-indigo-100 shadow-2xl">
          <div className="absolute top-0 right-0 bg-gradient-to-l from-indigo-600 to-violet-600 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-bl-2xl rounded-tr-2xl">
            Most Popular
          </div>
          <h3 className="text-xl font-bold mb-2 text-slate-900">{name}</h3>
          <p className="text-sm text-slate-500 mb-8 font-medium">{description}</p>
          <div className="flex items-baseline gap-1 mb-8">
            <span className="text-5xl font-bold text-slate-900">{price}</span>
            <span className="text-slate-400 font-medium">{period}</span>
          </div>
          <Link 
            to="/onboarding"
            className="w-full py-4 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors font-bold mb-8 shadow-xl shadow-slate-900/10 block text-center"
          >
            Start Free Trial
          </Link>
          <ul className="space-y-4 text-sm text-slate-600 font-medium">
            {features.map((feature, i) => (
              <li key={i} className="flex items-center gap-3">
                {feature.included ? (
                  <>
                    <Check size={18} className="text-indigo-600"/> <span>{feature.text}</span>
                  </>
                ) : (
                  <>
                    <div className="w-[18px] h-[18px] rounded-full bg-slate-100 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                    </div>
                    <span className="text-slate-400 line-through">{feature.text}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>
    );
  }

  return (
    <GlassCard className="p-10 bg-white/70 hover:shadow-xl transition-all">
      <h3 className="text-xl font-bold mb-2 text-slate-900">{name}</h3>
      <p className="text-sm text-slate-500 mb-8 font-medium">{description}</p>
      <div className="flex items-baseline gap-1 mb-8">
        <span className="text-5xl font-bold text-slate-900">{price}</span>
        {price !== 'Custom' && <span className="text-slate-400 font-medium">{period}</span>}
      </div>
      <Link 
        to={ctaText === 'Contact Sales' ? '/contact' : '/onboarding'}
        className="w-full py-4 rounded-xl bg-white border border-slate-200 text-slate-900 font-bold hover:bg-slate-50 transition-colors mb-8 shadow-sm block text-center"
      >
        {ctaText}
      </Link>
      <ul className="space-y-4 text-sm text-slate-600 font-medium">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-3">
            {feature.included ? (
              <>
                <Check size={18} className="text-indigo-600"/> <span>{feature.text}</span>
              </>
            ) : (
              <>
                <div className="w-[18px] h-[18px] rounded-full bg-slate-100 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                </div>
                <span className="text-slate-400 line-through">{feature.text}</span>
              </>
            )}
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}

// Pricing Section wrapper
interface PricingSectionProps {
  children: React.ReactNode;
}

export function PricingSection({ children }: PricingSectionProps) {
  return (
    <section id="pricing" className="py-24 bg-gradient-to-b from-white to-slate-50/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Simple,
            <span className="gradient-text"> Transparent Pricing</span>
          </h2>
          <p className="text-foreground-secondary max-w-2xl mx-auto">
            Choose the plan that fits your needs. All plans include a 14-day free trial.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-center">
          {children}
        </div>
      </div>
    </section>
  );
}

