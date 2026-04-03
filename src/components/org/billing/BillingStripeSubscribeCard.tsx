/**
 * Logged-in Stripe Checkout from Billing (gym or solo capacity), for orgs not yet active-paid via Stripe webhooks.
 */

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCheckout } from '@/hooks/useCheckout';
import { STRIPE_CONFIG } from '@/constants/platform';
import { CHECKOUT_FLOW_COPY } from '@/constants/checkoutFlowCopy';
import { GYM_TRIAL_CLIENT_CAP } from '@/constants/pricing';
import type { Region, BillingPeriod, PackageTrack } from '@/constants/pricing';

export interface BillingStripeSubscribeCardProps {
  organizationId: string;
  region: Region;
  /** Drives capacity tier resolution server-side (same as onboarding). */
  clientTarget: number;
  subscriptionStatus: string;
  stripeSubscriptionId?: string;
  /** Firestore organizations.type */
  orgType?: string;
  /** Firestore subscription.packageTrack */
  packageTrack?: string;
}

export function BillingStripeSubscribeCard({
  organizationId,
  region,
  clientTarget,
  subscriptionStatus,
  stripeSubscriptionId,
  orgType,
  packageTrack,
}: BillingStripeSubscribeCardProps) {
  const { startCheckout, loading, error } = useCheckout();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');

  if (!STRIPE_CONFIG.isEnabled) {
    return null;
  }

  const isGymOrg =
    orgType === 'gym' ||
    orgType === 'gym_chain' ||
    packageTrack === 'gym';

  const isSoloOrg = orgType === 'solo_coach' || packageTrack === 'solo';

  if (!isGymOrg && !isSoloOrg) {
    return null;
  }

  const paidViaStripe = subscriptionStatus === 'active' && Boolean(stripeSubscriptionId?.trim());
  if (paidViaStripe) {
    return null;
  }

  const packageTrackCheckout: PackageTrack = isGymOrg ? 'gym' : 'solo';
  const defaultSeats = isGymOrg ? GYM_TRIAL_CLIENT_CAP : 10;
  const seats = Math.max(1, Math.min(300, Math.floor(clientTarget || defaultSeats)));

  const handleSubscribe = () => {
    void startCheckout(organizationId, region, seats, billingPeriod, packageTrackCheckout);
  };

  const lead =
    packageTrackCheckout === 'gym'
      ? CHECKOUT_FLOW_COPY.billingSubscribeLeadGym.replace('{seats}', String(seats))
      : CHECKOUT_FLOW_COPY.billingSubscribeLeadSolo.replace('{seats}', String(seats));

  return (
    <div className="bg-background rounded-xl border border-border p-6">
      <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">
        {CHECKOUT_FLOW_COPY.billingSubscribeTitle}
      </h2>
      <p className="text-sm text-muted-foreground mb-4">{lead}</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {(['monthly', 'annual'] as const).map((p) => (
          <Button
            key={p}
            type="button"
            variant={billingPeriod === p ? 'default' : 'outline'}
            size="sm"
            className="rounded-lg capitalize"
            onClick={() => setBillingPeriod(p)}
            disabled={loading}
          >
            {p === 'monthly' ? 'Monthly' : 'Annual'}
          </Button>
        ))}
      </div>
      <Button
        type="button"
        className="rounded-xl font-bold"
        onClick={handleSubscribe}
        disabled={loading || region !== 'GB'}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />
            {CHECKOUT_FLOW_COPY.billingSubscribeOpening}
          </>
        ) : (
          CHECKOUT_FLOW_COPY.billingSubscribeContinue
        )}
      </Button>
      {region !== 'GB' && (
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-3">
          {CHECKOUT_FLOW_COPY.billingSubscribeRegionNote}
        </p>
      )}
      {error ? <p className="text-sm text-destructive mt-3">{error}</p> : null}
    </div>
  );
}
