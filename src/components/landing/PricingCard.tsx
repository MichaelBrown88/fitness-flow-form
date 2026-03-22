import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { DEFAULT_CURRENCY } from '@/constants/pricing';
import { formatPrice } from '@/lib/utils/currency';

interface PricingFeature {
  text: string;
  included: boolean;
}

interface PricingCardProps {
  name: string;
  description: string;
  price: number | string;
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
  if (highlighted) {
    return (
      <div className="relative transform md:-translate-y-4">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-gradient-from to-gradient-to opacity-20 blur-sm" />
        <GlassCard className="p-10 relative bg-card border border-brand-medium shadow-2xl">
          <div className="absolute top-0 right-0 bg-gradient-to-l from-gradient-from to-gradient-to text-primary-foreground text-[10px] font-bold uppercase tracking-[0.15em] px-4 py-2 rounded-bl-2xl rounded-tr-2xl">
            Most Popular
          </div>
          <h3 className="text-xl font-bold mb-2 text-foreground">{name}</h3>
          <p className="text-sm text-foreground-secondary mb-8 font-medium">{description}</p>
          <div className="flex items-baseline gap-1 mb-8">
            <span className="text-5xl font-bold text-foreground">
              {typeof price === 'number' ? formatPrice(price, DEFAULT_CURRENCY, 'en-GB') : price}
            </span>
            <span className="text-foreground-tertiary font-medium">{period}</span>
          </div>
          <Link 
            to="/onboarding"
            className="w-full py-4 rounded-xl bg-foreground text-primary-foreground hover:opacity-90 transition-apple font-bold mb-8 shadow-xl block text-center"
          >
            Start Free Trial
          </Link>
          <ul className="space-y-4 text-sm text-foreground-secondary font-medium">
            {features.map((feature, i) => (
              <li key={i} className="flex items-center gap-3">
                {feature.included ? (
                  <>
                    <Check size={18} className="text-primary"/> <span>{feature.text}</span>
                  </>
                ) : (
                  <>
                    <div className="w-[18px] h-[18px] rounded-full bg-muted flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-border flex items-center justify-center"></div>
                    </div>
                    <span className="text-foreground-tertiary line-through">{feature.text}</span>
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
    <GlassCard className="p-10 bg-card/70 hover:shadow-xl transition-apple">
      <h3 className="text-xl font-bold mb-2 text-foreground">{name}</h3>
      <p className="text-sm text-foreground-secondary mb-8 font-medium">{description}</p>
      <div className="flex items-baseline gap-1 mb-8">
        <span className="text-5xl font-bold text-foreground">
          {typeof price === 'number' ? formatPrice(price, DEFAULT_CURRENCY, 'en-GB') : price}
        </span>
        {typeof price === 'number' && <span className="text-foreground-tertiary font-medium">{period}</span>}
      </div>
      <Link 
        to={ctaText === 'Contact Sales' ? '/contact' : '/onboarding'}
        className="w-full py-4 rounded-xl bg-background border border-border text-foreground font-bold hover:bg-secondary transition-apple mb-8 shadow-sm block text-center"
      >
        {ctaText}
      </Link>
      <ul className="space-y-4 text-sm text-foreground-secondary font-medium">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-3">
            {feature.included ? (
              <>
                <Check size={18} className="text-primary"/> <span>{feature.text}</span>
              </>
            ) : (
              <>
                <div className="w-[18px] h-[18px] rounded-full bg-muted flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-border flex items-center justify-center"></div>
                </div>
                <span className="text-foreground-tertiary line-through">{feature.text}</span>
              </>
            )}
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
