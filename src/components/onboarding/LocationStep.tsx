import { useState } from 'react';
import { MapPin, Link as LinkIcon, AtSign } from 'lucide-react';
import type { BusinessProfileData } from '@/types/onboarding';

interface LocationStepProps {
  data?: Partial<BusinessProfileData>;
  onNext: (data: Partial<BusinessProfileData>) => void;
  onBack: () => void;
}

export function LocationStep({ data, onNext, onBack }: LocationStepProps) {
  const [formData, setFormData] = useState<Partial<BusinessProfileData>>({
    address: data?.address || '',
    city: data?.city || '',
    state: data?.state || '',
    zip: data?.zip || '',
    website: data?.website || '',
    instagram: data?.instagram || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Middle Eastern/UK format: Address, City, Region/Governorate, Postal Code (all required)
    if (formData.address && formData.city && formData.state && formData.zip) {
      onNext(formData);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up max-w-4xl mx-auto">
      <div>
        <h3 className="text-3xl font-bold text-slate-900 mb-2">Location & Online Presence.</h3>
        <p className="text-slate-500">Where can clients find you? This helps with local SEO features.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Street Address</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                required
                className="w-full pl-12 pr-5 py-4 rounded-2xl bg-white/50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
                placeholder="Building 12, Street 123, Block 5"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="block text-sm font-bold text-slate-700 mb-2">City</label>
              <input
                type="text"
                required
                className="w-full px-5 py-4 rounded-2xl bg-white/50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
                placeholder="Kuwait City"
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="col-span-1">
              <label className="block text-sm font-bold text-slate-700 mb-2">Governorate / Region</label>
              <input
                type="text"
                required
                className="w-full px-5 py-4 rounded-2xl bg-white/50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
                placeholder="Kuwait"
                value={formData.state || ''}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </div>
            <div className="col-span-1">
              <label className="block text-sm font-bold text-slate-700 mb-2">Postal Code</label>
              <input
                type="text"
                required
                className="w-full px-5 py-4 rounded-2xl bg-white/50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
                placeholder="12345"
                value={formData.zip || ''}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="pt-4 grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Website</label>
            <div className="relative">
              <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                className="w-full pl-12 pr-5 py-4 rounded-2xl bg-white/50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
                placeholder="www.yourgym.com"
                value={formData.website || ''}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Instagram Handle</label>
            <div className="relative">
              <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                className="w-full pl-12 pr-5 py-4 rounded-2xl bg-white/50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
                placeholder="@yourgym"
                value={formData.instagram || ''}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
              />
            </div>
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
