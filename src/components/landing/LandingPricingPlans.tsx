import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import {
  LANDING_CHECKOUT_TEST_ENABLED,
  LANDING_GUEST_CHECKOUT_ENABLED,
  STRIPE_CONFIG,
} from '@/constants/platform';
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

const PAID_TRACK_ORDER: PlanPackageTrack[] = ['solo', 'gym'];

const FREE_FEATURES: PricingFeature[] = [
  { text: `${FREE_TIER_MONTHLY_AI_CREDITS} AI scans per month`, included: true },
  { text: 'Clinical Logic Engine', included: true },
  { text: 'Client assessments & reports', included: true },
  { text: 'Upgrade when you need more clients', included: true },
  { text: 'Custom branding add-on', included: false },
  { text: 'Priority support', included: false },
];

export function LandingPricingPlans() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const guestCheckoutSuccess = searchParams.get('guest_checkout') === 'success';
  const guestCheckoutCancel = searchParams.get('guest_checkout') === 'cancel';

  return (
    <div className="w-full max-w-7xl mx-auto space-y-10">
      {guestCheckoutSuccess ? (
        <div
          role="status"
          className="mx-auto max-w-2xl rounded-xl border border-emerald-600/35 bg-emerald-500/10 px-4 py-3 text-sm text-foreground dark:border-emerald-500/40"
        >
          <p className="font-semibold text-emerald-950 dark:text-emerald-100">Test checkout completed</p>
          <p className="mt-1 text-foreground-secondary">
            Stripe accepted the test payment. This did not attach a subscription to an app account.{' '}
            <Link to={ROUTES.ONBOARDING} className="font-semibold text-primary underline-offset-4 hover:underline">
              Continue to sign-up
            </Link>
            .
          </p>
        </div>
      ) : null}
      {guestCheckoutCancel ? (
        <div
          role="status"
          className="mx-auto max-w-2xl rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground"
        >
          <p className="font-semibold">Checkout cancelled</p>
          <p className="mt-1 text-foreground-secondary">You can change seats or billing above and try again.</p>
        </div>
      ) : null}
      {LANDING_GUEST_CHECKOUT_ENABLED ? (
        <div
          role="status"
          className="mx-auto max-w-2xl rounded-xl border border-amber-600/35 bg-amber-500/10 px-4 py-3 text-sm text-foreground dark:border-amber-500/40"
        >
          <p className="font-semibold text-amber-950 dark:text-amber-100">Test mode: Stripe before sign-up</p>
          <p className="mt-1 text-foreground-secondary">
            “Get started” / “Start gym trial” opens hosted Checkout for the seats you selected (same prices as the live
            app). Requires <span className="font-medium text-foreground">ENABLE_LANDING_GUEST_CHECKOUT</span> and{' '}
            <span className="font-medium text-foreground">STRIPE_MODE=test</span> on Cloud Functions, and{' '}
            <span className="font-medium text-foreground">APP_URL</span> matching this site (e.g. your dev server URL).
            Remove <span className="font-medium text-foreground">VITE_ENABLE_LANDING_GUEST_CHECKOUT</span> from{' '}
            <span className="font-medium text-foreground">.env.local</span> to restore the normal onboarding CTA.
          </p>
        </div>
      ) : null}
      {LANDING_CHECKOUT_TEST_ENABLED && STRIPE_CONFIG.isEnabled ? (
        <div
          role="status"
          className="mx-auto max-w-2xl rounded-xl border border-amber-600/35 bg-amber-500/10 px-4 py-3 text-sm text-foreground dark:border-amber-500/40"
        >
          <p className="font-semibold text-amber-950 dark:text-amber-100">Stripe checkout test (dev only)</p>
          <p className="mt-1 text-foreground-secondary">
            {profile?.organizationId
              ? 'Use “Test Stripe checkout (dev)” on Solo or Gym for the seats and billing toggle above. Uses your real org in Stripe test mode (works if your account is comped).'
              : 'Sign in, open this page from /pricing, then use the test button on a paid plan. Set VITE_ENABLE_LANDING_CHECKOUT_TEST=true in .env.local.'}
          </p>
        </div>
      ) : null}

      <div className="flex flex-col items-center gap-3">
        <p className="text-sm font-semibold text-foreground-secondary">UK pricing (GBP)</p>
        <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setBillingPeriod('monthly')}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-bold transition-apple',
              billingPeriod === 'monthly'
                ? 'bg-foreground text-primary-foreground shadow-sm'
                : 'text-foreground-secondary hover:text-foreground',
            )}
          >
            Bill monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingPeriod('annual')}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-bold transition-apple',
              billingPeriod === 'annual'
                ? 'bg-foreground text-primary-foreground shadow-sm'
                : 'text-foreground-secondary hover:text-foreground',
            )}
          >
            Bill annually (~20% off)
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-8 items-start">
        <GlassCard className="p-10 bg-card/70 hover:shadow-xl transition-apple">
          <h3 className="text-xl font-bold mb-2 text-foreground">Free</h3>
          <p className="text-sm text-foreground-secondary mb-8 font-medium">
            Up to {FREE_TIER_CLIENT_LIMIT} clients — no card
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

      <p className="text-center text-sm text-foreground-secondary max-w-xl mx-auto">
        Need more than 100 clients on Solo or more than 250 on Gym?{' '}
        <Link to={ROUTES.CONTACT} className="font-semibold text-primary underline-offset-4 hover:underline">
          Contact sales
        </Link>
        .
      </p>
    </div>
  );
}
