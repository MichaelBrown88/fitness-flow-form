/**
 * Package Selection Step (Step 4)
 *
 * Capacity slider + Stripe checkout.
 * Fixed: tier label/plan variable mismatch.
 * Cleaned up: back button as text link, full-width primary CTA.
 */

import { useState } from 'react';
import { CheckCircle, CreditCard } from 'lucide-react';
import { calculateMonthlyFee } from '@/lib/pricing';
import type { SubscriptionPlan } from '@/lib/pricing';
import type { BrandingConfig, BusinessType } from '@/types/onboarding';
import { BUSINESS_TYPES } from '@/types/onboarding';
import { useCheckout } from '@/hooks/useCheckout';
import { useAuth } from '@/hooks/useAuth';
import { formatPrice } from '@/lib/utils/currency';

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

  const getPlanForBusinessType = (): SubscriptionPlan => {
    const config = BUSINESS_TYPES.find(b => b.value === businessType);
    return config?.recommendedPlan || 'starter';
  };

  const plan = getPlanForBusinessType();
  const monthlyFee = calculateMonthlyFee(plan, seats);

  // Derive tier label from seat count (matches plan variable)
  const tierLabel =
    seats <= 15 ? 'Starter' :
    seats <= 50 ? 'Professional' :
    'Enterprise';

  const handleContinue = async () => {
    if (isStripeEnabled && profile?.organizationId) {
      const checkoutPlan = plan === 'free' || plan === 'none' ? 'starter' : plan;
      const redirected = await startCheckout(profile.organizationId, checkoutPlan, seats);
      if (!redirected) {
        onNext(seats);
      }
    } else {
      onNext(seats);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Choose your plan</h2>
        <p className="text-sm text-slate-500">How many active clients will you be managing?</p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <div className="flex justify-between items-end mb-8">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-bold text-slate-900">{seats}</span>
              <span className="text-sm text-slate-400 font-bold">Seats</span>
            </div>
            <p className="text-xs font-bold text-slate-500 mt-1">{tierLabel} Tier</p>
          </div>
          <div className="text-right">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-0.5">Estimated</span>
            <div className="flex items-baseline gap-0.5">
              <span className="text-2xl font-bold text-slate-900">{formatPrice(monthlyFee)}</span>
              <span className="text-xs text-slate-400">/mo</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <input
            type="range"
            min="5"
            max="100"
            step="5"
            value={seats}
            onChange={(e) => setSeats(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-slate-900"
            style={{
              backgroundImage: `linear-gradient(to right, #0f172a 0%, #0f172a ${((seats - 5) / 95) * 100}%, #f1f5f9 ${((seats - 5) / 95) * 100}%, #f1f5f9 100%)`
            }}
          />
          <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-[0.15em]">
            <span>5</span>
            <span>50</span>
            <span>100+</span>
          </div>
        </div>

        <div className="space-y-2">
          {[
            'Unlimited assessments per client',
            'Custom branding (logo & colours) on paid plans',
            'Powered by One Assess on every report',
            'Clinical Logic Engine',
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-2 text-xs text-slate-600">
              <CheckCircle size={14} className="text-emerald-500 shrink-0" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {checkoutError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {checkoutError}
        </div>
      )}

      <div className="space-y-3 pt-2">
        <button
          type="button"
          onClick={handleContinue}
          disabled={checkoutLoading}
          className="w-full h-12 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {checkoutLoading ? (
            <>
              <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Processing...
            </>
          ) : isStripeEnabled ? (
            <>
              <CreditCard size={16} />
              Subscribe
            </>
          ) : (
            'Start Free Trial'
          )}
        </button>
        <button
          type="button"
          onClick={onBack}
          disabled={checkoutLoading}
          className="w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
        >
          Go back
        </button>
      </div>
    </div>
  );
}
