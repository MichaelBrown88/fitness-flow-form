import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

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
  return (
    <div 
      className={`relative p-8 rounded-3xl animate-fade-in-up ${
        highlighted 
          ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-2xl scale-105' 
          : 'bg-white border border-border/50 hover:border-indigo-200 hover:shadow-lg'
      } transition-all duration-300`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {highlighted && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="px-4 py-1 text-xs font-semibold bg-amber-400 text-amber-900 rounded-full">
            Most Popular
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className={`text-xl font-bold mb-2 ${highlighted ? 'text-white' : 'text-foreground'}`}>
          {name}
        </h3>
        <p className={`text-sm ${highlighted ? 'text-indigo-100' : 'text-foreground-secondary'}`}>
          {description}
        </p>
      </div>

      <div className="mb-6">
        <span className={`text-4xl font-bold ${highlighted ? 'text-white' : 'text-foreground'}`}>
          {price}
        </span>
        {price !== 'Custom' && (
          <span className={`text-sm ${highlighted ? 'text-indigo-100' : 'text-foreground-secondary'}`}>
            {period}
          </span>
        )}
      </div>

      <ul className="space-y-3 mb-8">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
              feature.included 
                ? highlighted 
                  ? 'bg-white/20' 
                  : 'bg-indigo-100'
                : 'bg-slate-100'
            }`}>
              <Check className={`w-3 h-3 ${
                feature.included
                  ? highlighted
                    ? 'text-white'
                    : 'text-indigo-600'
                  : 'text-slate-400'
              }`} />
            </div>
            <span className={`text-sm ${
              feature.included
                ? highlighted
                  ? 'text-white'
                  : 'text-foreground'
                : highlighted
                  ? 'text-indigo-200 line-through'
                  : 'text-foreground-tertiary line-through'
            }`}>
              {feature.text}
            </span>
          </li>
        ))}
      </ul>

      <Button 
        asChild 
        className={`w-full h-12 rounded-xl font-semibold ${
          highlighted 
            ? 'bg-white text-indigo-600 hover:bg-indigo-50' 
            : 'gradient-bg text-white'
        }`}
      >
        <Link to="/signup">{ctaText}</Link>
      </Button>
    </div>
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

