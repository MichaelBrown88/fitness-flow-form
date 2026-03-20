/**
 * Package Selection Step (Step 4)
 *
 * Client count dropdown + Stripe checkout.
 * Uses region-based pricing (GB, US, KW) and seat blocks.
 */

import { useState } from 'react';
import { CheckCircle, CreditCard } from 'lucide-react';
import { SEAT_TIERS, REGION_TO_CURRENCY, DEFAULT_REGION, type Region } from '@/constants/pricing';
import { getMonthlyPrice } from '@/lib/pricing/config';
import { formatPrice, getLocaleForRegion } from '@/lib/utils/currency';
import type { BrandingConfig, BusinessType } from '@/types/onboarding';
import { useCheckout } from '@/hooks/useCheckout';
import { useAuth } from '@/hooks/useAuth';

interface PackageSelectionStepProps {
  data?: Partial<BrandingConfig>;
  businessType?: BusinessType;
  region?: Region;
  onNext: (clientCount: number) => void;
  onBack: () => void;
}

const DEFAULT_CLIENT_COUNT = 10;

export function PackageSelectionStep({
  data,
  region = DEFAULT_REGION,
  onNext,
  onBack,
}: PackageSelectionStepProps) {
  const clientCountFromData = data?.clientSeats ?? DEFAULT_CLIENT_COUNT;
  const nearestTier = SEAT_TIERS.find((t) => t >= clientCountFromData) ?? SEAT_TIERS[0];
  const [clientCount, setClientCount] = useState(nearestTier);

  const { startCheckout, loading: checkoutLoading, error: checkoutError, isStripeEnabled } = useCheckout();
  const { profile } = useAuth();

  const currency = REGION_TO_CURRENCY[region];
  const locale = getLocaleForRegion(region);
  const monthlyFee = getMonthlyPrice(region, clientCount);

  const handleContinue = async () => {
    if (isStripeEnabled && profile?.organizationId) {
      const redirected = await startCheckout(profile.organizationId, region, clientCount);
      if (!redirected) {
        onNext(clientCount);
      }
    } else {
      onNext(clientCount);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Choose your plan</h2>
        <p className="text-sm text-foreground-secondary">How many active clients will you be managing?</p>
      </div>

      <div className="bg-card p-6 rounded-xl border border-border">
        <div className="flex justify-between items-end mb-6">
          <div>
            <label className="block text-xs font-bold text-foreground-secondary mb-2">Client capacity</label>
            <select
              value={clientCount}
              onChange={(e) => setClientCount(Number(e.target.value))}
              className="block w-full max-w-[180px] h-12 rounded-xl border border-border bg-background px-4 text-base font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {SEAT_TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {tier} clients
                </option>
              ))}
              <option value={300}>300+ clients</option>
            </select>
          </div>
          <div className="text-right">
            <span className="block text-[10px] font-bold text-foreground-tertiary uppercase tracking-[0.15em] mb-0.5">Monthly</span>
            <div className="flex items-baseline gap-0.5">
              <span className="text-2xl font-bold text-foreground">{formatPrice(monthlyFee, currency, locale)}</span>
              <span className="text-xs text-foreground-tertiary">/mo</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {[
            'Unlimited assessments per client',
            'Custom branding (logo & colours) on paid plans',
            'Powered by One Assess on every report',
            'Clinical Logic Engine',
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-2 text-xs text-foreground-secondary">
              <CheckCircle size={14} className="text-score-green shrink-0" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {checkoutError && (
        <div className="rounded-lg border border-score-red-muted bg-score-red-light px-3 py-2 text-sm text-score-red-fg">
          {checkoutError}
        </div>
      )}

      <div className="space-y-3 pt-2">
        <button
          type="button"
          onClick={handleContinue}
          disabled={checkoutLoading}
          className="w-full h-12 rounded-xl bg-foreground text-primary-foreground font-bold text-sm hover:opacity-90 transition-apple disabled:opacity-50 flex items-center justify-center gap-2"
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
          className="w-full text-center text-xs font-medium text-foreground-tertiary hover:text-foreground-secondary transition-apple disabled:opacity-50"
        >
          Go back
        </button>
      </div>
    </div>
  );
}
