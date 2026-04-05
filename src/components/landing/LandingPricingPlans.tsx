import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { LANDING_GUEST_CHECKOUT_ENABLED } from '@/constants/platform';
import GlassCard from '@/components/ui/GlassCard';
import {
  FREE_TIER_CLIENT_LIMIT,
  FREE_TIER_MONTHLY_AI_CREDITS,
  DEFAULT_CURRENCY,
  type BillingPeriod,
} from '@/constants/pricing';
import { formatPrice } from '@/lib/utils/currency';
import { type PlanPackageTrack } from '@/lib/pricing/planPackageTracks';
import { cn } from '@/lib/utils';
import {
  FeatureList,
  LandingPaidPlanCard,
  type PricingFeature,
} from '@/components/landing/LandingPaidPlanCard';
import { LANDING_COPY } from '@/constants/landingCopy';

const PAID_TRACK_ORDER: PlanPackageTrack[] = ['solo', 'gym'];

const FREE_FEATURES: PricingFeature[] = [
  { text: `${FREE_TIER_MONTHLY_AI_CREDITS} AI scans / month`, included: true },
  { text: 'Clinical Logic Engine & client reports', included: true },
];

export function LandingPricingPlans() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const guest = searchParams.get('guest_checkout');
    if (guest !== 'success' && guest !== 'cancel') return;
    const sessionId = searchParams.get('session_id');
    const path = guest === 'success' ? ROUTES.CHECKOUT_SUCCESS : ROUTES.CHECKOUT_CANCEL;
    const qs = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : '';
    navigate(`${path}${qs}`, { replace: true });
  }, [searchParams, navigate]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      <div className="flex justify-center">
        <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setBillingPeriod('monthly')}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-bold transition-apple',
              billingPeriod === 'monthly'
                ? 'bg-foreground text-background shadow-sm'
                : 'text-foreground-secondary hover:text-foreground',
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingPeriod('annual')}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-bold transition-apple',
              billingPeriod === 'annual'
                ? 'bg-foreground text-background shadow-sm'
                : 'text-foreground-secondary hover:text-foreground',
            )}
          >
            Annual{' '}
            <span className={cn('font-semibold', billingPeriod === 'annual' ? 'text-background/70' : 'text-foreground-tertiary')}>
              ~20% off
            </span>
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8 items-start">
        <GlassCard className="bg-card/70 p-8 transition-apple hover:shadow-md sm:p-10">
          <h3 className="text-xl font-bold mb-2 text-foreground">Free</h3>
          <p className="text-sm text-foreground-secondary mb-8 font-medium">
            Up to {FREE_TIER_CLIENT_LIMIT} clients, no card
          </p>
          <div className="flex items-baseline gap-1 mb-8">
            <span className="text-5xl font-bold text-foreground">
              {formatPrice(0, DEFAULT_CURRENCY, 'en-GB')}
            </span>
            <span className="text-foreground-tertiary font-medium">/month</span>
          </div>
          <Link
            to="/try"
            className="w-full py-4 rounded-xl bg-background border border-border text-foreground font-bold hover:bg-secondary transition-apple mb-8 shadow-sm block text-center"
          >
            Start free
          </Link>
          <FeatureList features={FREE_FEATURES} />
          <p className="mt-5 text-xs font-medium leading-relaxed text-foreground-tertiary">
            {LANDING_COPY.freeTierPaidAddOnsNote}
          </p>
        </GlassCard>

        {PAID_TRACK_ORDER.map((track) => (
          <LandingPaidPlanCard
            key={track}
            track={track}
            billingPeriod={billingPeriod}
            highlighted={track === 'solo'}
          />
        ))}
      </div>

      {LANDING_GUEST_CHECKOUT_ENABLED ? (
        <p className="text-center text-sm text-foreground-secondary">
          <Link
            to={ROUTES.ONBOARDING}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create your account first
          </Link>
          {', no payment required.'}
        </p>
      ) : null}

      <p className="text-center text-sm text-foreground-secondary max-w-xl mx-auto">
        Need more than 100 clients (Solo) or 250 (Gym)?{' '}
        <Link to={ROUTES.CONTACT} className="font-semibold text-primary underline-offset-4 hover:underline">
          Contact sales
        </Link>
        .
      </p>
    </div>
  );
}
