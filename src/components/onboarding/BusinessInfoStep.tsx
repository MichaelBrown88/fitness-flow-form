/**
 * Business Info Step (Step 2)
 *
 * Collects: business name, facility type, billing region, and (for gym/gym_chain)
 * whether the admin also coaches clients directly.
 */

import { User, Store, Building2, Globe, Sparkles } from 'lucide-react';
import { BUSINESS_TYPES, type BusinessProfileData, type BusinessType } from '@/types/onboarding';
import { REGIONS, REGION_LABELS, DEFAULT_REGION, type Region } from '@/constants/pricing';
import { useState, useMemo } from 'react';
import { OptionCard, OnboardingInput } from './SharedOnboardingComponents';

function detectRegionFromTimezone(): Region {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (/^America\//.test(tz)) return 'US';
    if (/^Asia\/Kuwait/.test(tz)) return 'KW';
  } catch {
    // Intl not supported — fall through to default
  }
  return DEFAULT_REGION;
}

interface BusinessInfoStepProps {
  data?: Partial<BusinessProfileData>;
  onNext: (data: BusinessProfileData) => void;
  onBack: () => void;
}

const TYPE_ICONS: Record<BusinessType, React.ElementType> = {
  solo_coach: User,
  gym: Store,
  gym_chain: Building2,
};

const TYPE_LABELS: Record<BusinessType, string> = {
  solo_coach: 'Solo / Independent',
  gym: 'Boutique Studio',
  gym_chain: 'Commercial Gym',
};

export function BusinessInfoStep({ data, onNext, onBack }: BusinessInfoStepProps) {
  const [businessName, setBusinessName] = useState(data?.name || '');
  const [businessType, setBusinessType] = useState<BusinessType>(data?.type || 'solo_coach');
  const detectedRegion = useMemo(() => detectRegionFromTimezone(), []);
  const [region, setRegion] = useState<Region>(data?.region ?? detectedRegion);
  const [isAutoDetected, setIsAutoDetected] = useState(!data?.region);
  const [isActiveCoach, setIsActiveCoach] = useState(data?.isActiveCoach ?? true);

  const showCoachToggle = businessType !== 'solo_coach';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (businessName.trim()) {
      onNext({
        name: businessName.trim(),
        type: businessType,
        region,
        isActiveCoach: businessType === 'solo_coach' ? true : isActiveCoach,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Tell us about your facility</h2>
        <p className="text-sm text-foreground-secondary">We optimize the workflow based on your operational scale.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-foreground-secondary mb-1.5">Business Name</label>
          <OnboardingInput
            type="text"
            required
            placeholder="e.g. Iron Clad Performance"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-foreground-secondary mb-2">Facility Type</label>
          <div className="space-y-2">
            {BUSINESS_TYPES.map((type) => (
              <OptionCard
                key={type.value}
                selected={businessType === type.value}
                onClick={() => setBusinessType(type.value)}
                icon={TYPE_ICONS[type.value]}
                title={TYPE_LABELS[type.value]}
                subtitle={type.description}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-foreground-secondary">Where are you based?</label>
            {isAutoDetected && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-primary/70 bg-brand-light px-2 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" />
                Auto-detected
              </span>
            )}
          </div>
          <p className="text-xs text-foreground-secondary mb-2">Pricing is shown in your local currency.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {REGIONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setRegion(r);
                  setIsAutoDetected(false);
                }}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-left transition-apple ${
                  region === r
                    ? 'border-primary bg-brand-light ring-2 ring-primary/20'
                    : 'border-border hover:bg-secondary'
                }`}
              >
                <Globe className="w-4 h-4 shrink-0 text-foreground-tertiary" />
                <span className="text-sm font-medium text-foreground">{REGION_LABELS[r]}</span>
              </button>
            ))}
          </div>
        </div>

        {showCoachToggle && (
          <div className="rounded-xl border border-border bg-secondary/50 p-4">
            <button
              type="button"
              onClick={() => setIsActiveCoach(!isActiveCoach)}
              className="w-full flex items-center justify-between gap-3"
            >
              <div className="text-left">
                <p className="text-sm font-bold text-foreground">I also coach clients myself</p>
                <p className="text-xs text-foreground-secondary mt-0.5">
                  {isActiveCoach
                    ? 'You will see your own client list alongside team management.'
                    : 'You will manage your coaching team without a personal client list.'}
                </p>
              </div>
              <div className={`relative w-10 h-6 rounded-full shrink-0 transition-apple ${isActiveCoach ? 'bg-primary' : 'bg-muted'}`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-background shadow-sm transition-transform ${isActiveCoach ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
              </div>
            </button>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="h-12 px-6 rounded-xl border border-border font-bold text-sm text-foreground-secondary hover:bg-secondary transition-apple"
          >
            Back
          </button>
          <button
            type="submit"
            className="flex-1 h-12 rounded-xl bg-foreground text-primary-foreground font-bold text-sm hover:opacity-90 transition-apple"
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}
