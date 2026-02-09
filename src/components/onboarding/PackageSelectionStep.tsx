import { useState } from 'react';
import { CheckCircle, CreditCard } from 'lucide-react';
import { calculateMonthlyFee } from '@/lib/pricing';
import type { SubscriptionPlan } from '@/lib/pricing';
import type { BrandingConfig, BusinessType } from '@/types/onboarding';
import { BUSINESS_TYPES } from '@/types/onboarding';
import { useCheckout } from '@/hooks/useCheckout';
import { useAuth } from '@/hooks/useAuth';

interface PackageSelectionStepProps {
  data?: Partial<BrandingConfig>;
  businessType?: BusinessType;
  onNext: (seats: number) => void;
  onBack: () => void;
}

export function PackageSelectionStep({
  data,
  businessType,
  onNext,
  onBack,
}: PackageSelectionStepProps) {
  const [seats, setSeats] = useState(data?.clientSeats || 15);
  const { startCheckout, loading: checkoutLoading, error: checkoutError, isStripeEnabled } = useCheckout();
  const { profile } = useAuth();

  // Determine plan based on business type
  const getPlanForBusinessType = (): SubscriptionPlan => {
    const config = BUSINESS_TYPES.find(b => b.value === businessType);
    return config?.recommendedPlan || 'starter';
  };

  const plan = getPlanForBusinessType();
  const monthlyFee = calculateMonthlyFee(plan, seats);

  const handleContinue = async () => {
    if (isStripeEnabled && profile?.organizationId) {
      // Stripe is configured — start checkout flow
      const checkoutPlan = plan === 'free' || plan === 'none' ? 'starter' : plan;
      const redirected = await startCheckout(profile.organizationId, checkoutPlan, seats);
      if (!redirected) {
        // Stripe not configured or error — fall back to trial
        onNext(seats);
      }
    } else {
      // No Stripe configured — proceed as trial
      onNext(seats);
    }
  };

  return (
    <div className="space-y-12 animate-fade-in-up max-w-3xl mx-auto">
      <div className="text-center">
        <h3 className="text-3xl font-bold text-slate-900 mb-4">Select Capacity</h3>
        <p className="text-slate-500">How many active clients will you be managing?</p>
      </div>

      <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100">
        <div className="flex justify-between items-end mb-12">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-black text-slate-900 tracking-tighter">{seats}</span>
              <span className="text-xl text-slate-400 font-bold">Seats</span>
            </div>
            <p className="text-indigo-600 font-bold mt-2">
              {seats <= 15 ? 'Solo Coach Tier' : seats <= 50 ? 'Growth Studio Tier' : 'Enterprise Tier'}
            </p>
          </div>
          <div className="text-right">
            <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Estimated Price</span>
            <div className="flex items-center justify-end gap-1">
              <span className="text-4xl font-bold text-slate-900">KWD {monthlyFee.toFixed(3)}</span>
              <span className="text-lg text-slate-400 font-medium">/mo</span>
            </div>
          </div>
        </div>

        <div className="relative mb-12 px-2">
          <input
            type="range"
            min="5"
            max="100"
            step="5"
            value={seats}
            onChange={(e) => setSeats(parseInt(e.target.value))}
            className="w-full h-4 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100"
            style={{
              backgroundImage: `linear-gradient(to right, #4F46E5 0%, #4F46E5 ${((seats - 5) / 95) * 100}%, #F1F5F9 ${((seats - 5) / 95) * 100}%, #F1F5F9 100%)`
            }}
          />
          <div className="flex justify-between text-xs font-bold text-slate-400 mt-4 uppercase tracking-wide px-1">
            <span>5 Clients</span>
            <span>50 Clients</span>
            <span>100+</span>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
            <CheckCircle size={18} className="text-emerald-500" />
            <span>Unlimited Assessments per client</span>
          </div>
          <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
            <CheckCircle size={18} className="text-emerald-500" />
            <span>White-labeled Reports</span>
          </div>
          <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
            <CheckCircle size={18} className="text-emerald-500" />
            <span>Access to Clinical Logic Engine</span>
          </div>
        </div>
      </div>

      {checkoutError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {checkoutError}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onBack}
          disabled={checkoutLoading}
          className="flex-1 h-12 rounded-2xl bg-white border border-slate-200 font-bold text-lg flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm text-slate-600 disabled:opacity-50"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={checkoutLoading}
          className="flex-1 h-12 rounded-2xl bg-slate-900 text-white font-bold text-lg flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
        >
          {checkoutLoading ? (
            <>
              <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Processing…
            </>
          ) : isStripeEnabled ? (
            <>
              <CreditCard size={20} />
              Subscribe
            </>
          ) : (
            <>
              Continue
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
