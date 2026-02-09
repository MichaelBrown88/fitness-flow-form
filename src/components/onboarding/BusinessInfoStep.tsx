/**
 * Business Info Step (Step 2)
 *
 * Collects: business name, facility type.
 * Removed: business age (not needed for onboarding).
 */

import { User, Store, Building2 } from 'lucide-react';
import { BUSINESS_TYPES, type BusinessProfileData, type BusinessType } from '@/types/onboarding';
import { useState } from 'react';
import { OptionCard, OnboardingInput } from './SharedOnboardingComponents';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (businessName.trim()) {
      onNext({ name: businessName.trim(), type: businessType });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Tell us about your facility</h2>
        <p className="text-sm text-slate-500">We optimize the workflow based on your operational scale.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Business Name</label>
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
          <label className="block text-xs font-bold text-slate-600 mb-2">Facility Type</label>
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

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="h-12 px-6 rounded-xl border border-slate-200 font-bold text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Back
          </button>
          <button
            type="submit"
            className="flex-1 h-12 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors"
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}
