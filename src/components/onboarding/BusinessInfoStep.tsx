import { Building2, User, Building, Store, Check, Calendar, TrendingUp, Briefcase } from 'lucide-react';
import { BUSINESS_TYPES, type BusinessProfileData, type BusinessType } from '@/types/onboarding';
import { useState } from 'react';
import { OptionCard } from './SharedOnboardingComponents';

interface BusinessInfoStepProps {
  data?: Partial<BusinessProfileData>;
  onNext: (data: Partial<BusinessProfileData>) => void;
  onBack: () => void;
}

export function BusinessInfoStep({ data, onNext, onBack }: BusinessInfoStepProps) {
  const [businessName, setBusinessName] = useState(data?.name || '');
  const [businessType, setBusinessType] = useState<BusinessType>(data?.type || 'solo_coach');
  const [businessAge, setBusinessAge] = useState<'new' | 'growing' | 'established' | ''>(data?.businessAge || '');

  const getIcon = (type: BusinessType) => {
    switch (type) {
      case 'solo_coach': return User;
      case 'gym': return Store;
      case 'gym_chain': return Building2;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (businessName && businessType && businessAge) {
      onNext({
        name: businessName,
        type: businessType,
        businessAge: businessAge as 'new' | 'growing' | 'established',
      });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up max-w-4xl mx-auto">
      <div>
        <h3 className="text-3xl font-bold text-slate-900 mb-2">Tell us about your facility.</h3>
        <p className="text-slate-500">We optimize the workflow based on your operational scale.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Business Name */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Business Name</label>
          <input
            type="text"
            required
            className="w-full px-5 py-4 rounded-2xl bg-white/50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-lg"
            placeholder="e.g. Iron Clad Performance"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </div>

        {/* Facility Type & Business Age Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3">Facility Type</label>
            <div className="space-y-3">
              {BUSINESS_TYPES.map((type) => {
                const Icon = getIcon(type.value);
                // Map business types to match the new flow
                const mappedType = type.value === 'solo_coach' ? 'coach' : type.value === 'gym' ? 'studio' : 'gym';
                return (
                  <OptionCard
                    key={type.value}
                    selected={businessType === type.value}
                    onClick={() => setBusinessType(type.value)}
                    icon={Icon}
                    title={type.value === 'solo_coach' ? 'Solo / Independent' : type.value === 'gym' ? 'Boutique Studio' : 'Commercial Gym'}
                    subtitle={type.description}
                  />
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3">Time in Business</label>
            <div className="space-y-3">
              {[
                { id: 'new', label: 'Pre-launch / <1 Year', icon: Calendar },
                { id: 'growing', label: '1 - 5 Years', icon: TrendingUp },
                { id: 'established', label: '5+ Years', icon: Briefcase },
              ].map((age) => (
                <OptionCard
                  key={age.id}
                  selected={businessAge === age.id}
                  onClick={() => setBusinessAge(age.id as 'new' | 'growing' | 'established')}
                  icon={age.icon}
                  title={age.label}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 h-12 rounded-2xl bg-white border border-slate-200 font-bold text-lg flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm text-slate-600"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <button
            type="submit"
            className="flex-1 h-12 rounded-2xl bg-slate-900 text-white font-bold text-lg flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95"
          >
            Continue
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
