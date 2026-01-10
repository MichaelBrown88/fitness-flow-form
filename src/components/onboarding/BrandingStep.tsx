import { Check } from 'lucide-react';
import { useState } from 'react';
import type { BrandingConfig } from '@/types/onboarding';
import { getAllGradients, type GradientId } from '@/lib/design/gradients';

interface BrandingStepProps {
  data?: Partial<BrandingConfig>;
  companyName?: string;
  onNext: (data: Partial<BrandingConfig>) => void;
  onBack: () => void;
}

export function BrandingStep({ data, companyName, onNext, onBack }: BrandingStepProps) {
  // Get all available gradients from the centralized gradient system
  const gradients = getAllGradients();
  
  // Use the gradientId directly (or default to first gradient)
  const [selectedGradientId, setSelectedGradientId] = useState<GradientId>(
    (data?.gradientId as GradientId) || gradients[0]?.id || 'purple-indigo'
  );

  const selectedGradient = gradients.find(g => g.id === selectedGradientId) || gradients[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const brandingData: Partial<BrandingConfig> = {
      gradientId: selectedGradientId,
      clientSeats: data?.clientSeats || 15, // Keep existing seats, will be updated in capacity step
    };
    onNext(brandingData);
  };

  return (
    <div className="space-y-12 animate-fade-in-up max-w-3xl mx-auto text-center">
      <div>
        <h3 className="text-3xl font-bold text-slate-900 mb-4">Make it yours.</h3>
        <p className="text-slate-500 text-lg">
          Select your primary brand color. We'll use this for your client-facing reports and dashboard.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-12">
        {/* Gradient Selection */}
        <div className="flex flex-wrap gap-6 justify-center">
          {gradients.map((gradient) => (
            <button
              key={gradient.id}
              type="button"
              onClick={() => setSelectedGradientId(gradient.id)}
              className={`group relative w-24 h-24 rounded-3xl flex flex-col items-center justify-center transition-all duration-300 ${
                selectedGradientId === gradient.id ? 'scale-110 shadow-xl' : 'hover:scale-105 opacity-70 hover:opacity-100'
              }`}
            >
              <div
                className={`w-14 h-14 rounded-full shadow-lg mb-2 flex items-center justify-center transition-transform overflow-hidden ${
                  selectedGradientId === gradient.id ? 'ring-4 ring-offset-2 ring-slate-300' : ''
                }`}
                style={{
                  background: `linear-gradient(135deg, ${gradient.fromHex}, ${gradient.toHex})`
                }}
              >
                {selectedGradientId === gradient.id && <Check className="text-white drop-shadow-lg" size={24} />}
              </div>
              <span className="text-xs font-bold text-slate-600">{gradient.name}</span>
            </button>
          ))}
        </div>

        {/* Visual Preview */}
        <div className="mt-12 mx-auto max-w-sm bg-white p-6 rounded-2xl shadow-xl border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shadow-md"
              style={{
                background: `linear-gradient(135deg, ${selectedGradient.fromHex}, ${selectedGradient.toHex})`
              }}
            >
              {companyName ? companyName.substring(0, 2).toUpperCase() : 'FF'}
            </div>
            <div className="text-left">
              <div className="h-2 w-24 bg-slate-200 rounded mb-1"></div>
              <div className="h-2 w-16 bg-slate-100 rounded"></div>
            </div>
          </div>
          <div
            className="h-8 w-full rounded-lg mb-2 opacity-20"
            style={{
              background: `linear-gradient(90deg, ${selectedGradient.fromHex}, ${selectedGradient.toHex})`
            }}
          ></div>
          <div className="space-y-2">
            <div className="h-2 w-full bg-slate-50 rounded"></div>
            <div className="h-2 w-3/4 bg-slate-50 rounded"></div>
          </div>
          <div
            className="mt-6 w-full h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md transition-colors"
            style={{
              background: `linear-gradient(135deg, ${selectedGradient.fromHex}, ${selectedGradient.toHex})`
            }}
          >
            View Report
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
