import { useState } from 'react';
import { Instagram, Linkedin, Search, Cast, Users, Mail, PieChart, Check } from 'lucide-react';
import { OptionCard } from './SharedOnboardingComponents';
import type { MarketingData } from '@/types/onboarding';

interface MarketingStepProps {
  data?: Partial<MarketingData>;
  onNext: (data: MarketingData) => void;
  onBack: () => void;
}

export function MarketingStep({ data, onNext, onBack }: MarketingStepProps) {
  const [formData, setFormData] = useState<MarketingData>({
    referralSource: data?.referralSource || '',
    primaryGoal: data?.primaryGoal || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(formData);
  };

  return (
    <div className="space-y-8 animate-fade-in-up max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h3 className="text-3xl font-bold text-slate-900 mb-2">How did you find us?</h3>
        <p className="text-slate-500">Help us understand where our best partners come from.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { id: 'instagram', label: 'Instagram', icon: Instagram },
            { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
            { id: 'google', label: 'Google Search', icon: Search },
            { id: 'podcast', label: 'Podcast', icon: Cast },
            { id: 'referral', label: 'Friend / Colleague', icon: Users },
            { id: 'email', label: 'Email / Newsletter', icon: Mail },
          ].map((source) => (
            <button
              key={source.id}
              type="button"
              onClick={() => setFormData({ ...formData, referralSource: source.id })}
              className={`p-6 rounded-2xl border transition-all flex flex-col items-center gap-3 ${
                formData.referralSource === source.id
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-105'
                  : 'bg-white/40 border-slate-200 text-slate-600 hover:bg-white hover:border-indigo-200'
              }`}
            >
              <source.icon size={24} />
              <span className="font-bold">{source.label}</span>
            </button>
          ))}
        </div>

        <div className="pt-8">
          <label className="block text-sm font-bold text-slate-700 mb-4 text-center">
            What is your #1 Goal right now?
          </label>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { id: 'save_time', label: 'Save Admin Time', desc: 'Automate reporting & analysis' },
              { id: 'retention', label: 'Improve Retention', desc: 'Keep clients longer with data' },
            ].map((goal) => (
              <OptionCard
                key={goal.id}
                selected={formData.primaryGoal === goal.id}
                onClick={() => setFormData({ ...formData, primaryGoal: goal.id })}
                title={goal.label}
                subtitle={goal.desc}
                icon={PieChart}
              />
            ))}
          </div>
        </div>

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
