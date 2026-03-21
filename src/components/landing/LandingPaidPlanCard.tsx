import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { Check } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCheckout } from '@/hooks/useCheckout';
import {
  LANDING_CHECKOUT_TEST_ENABLED,
  LANDING_GUEST_CHECKOUT_ENABLED,
} from '@/constants/platform';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  DEFAULT_REGION,
  DEFAULT_CURRENCY,
  CUSTOM_BRANDING_PRICE_GBP,
  getPaidTierByClientCount,
  type BillingPeriod,
} from '@/constants/pricing';
import { formatPrice } from '@/lib/utils/currency';
import {
  type PlanPackageTrack,
  PLAN_PACKAGE_TRACK_COPY,
  buildSeatDropdownOptions,
  clientCountFromPosition,
  defaultTierPosition,
  tierIndicesForTrack,
  minDisplayMonthlyInTrack,
} from '@/lib/pricing/planPackageTracks';
import { cn } from '@/lib/utils';

export interface PricingFeature {
  text: string;
  included: boolean;
}

export const TRACK_FEATURES: Record<PlanPackageTrack, PricingFeature[]> = {
  solo: [
    { text: 'Independent coach — pick seats below', included: true },
    { text: 'Clinical Logic Engine & professional reports', included: true },
    { text: 'AI scan credits scale with your tier', included: true },
    { text: 'Free forever for up to 2 clients — no card', included: true },
    { text: 'Annual billing ~20% off at checkout on paid tiers', included: true },
    { text: `Custom branding add-on from £${CUSTOM_BRANDING_PRICE_GBP} one-time`, included: false },
  ],
  gym: [
    { text: 'Studios, multi-coach teams & gym chains', included: true },
    { text: 'Seat options up to 250 clients; above that — contact sales', included: true },
    { text: 'Everything in Solo, scaled for more clients', included: true },
    { text: '14-day gym trial · soft cap 100 clients during trial', included: true },
    { text: 'Credit top-ups in app', included: true },
    { text: `Custom branding add-on from £${CUSTOM_BRANDING_PRICE_GBP} one-time`, included: false },
  ],
};

export function FeatureList({ features }: { features: PricingFeature[] }) {
  return (
    <ul className="space-y-4 text-sm text-foreground-secondary font-medium">
      {features.map((feature, i) => (
        <li key={i} className="flex items-center gap-3">
          {feature.included ? (
            <>
              <Check size={18} className="text-primary shrink-0" />
              <span>{feature.text}</span>
            </>
          ) : (
            <>
              <div className="w-[18px] h-[18px] rounded-full bg-muted flex shrink-0 items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-border" />
              </div>
              <span className="text-foreground-tertiary line-through">{feature.text}</span>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

export interface LandingPaidPlanCardProps {
  track: PlanPackageTrack;
  billingPeriod: BillingPeriod;
  highlighted?: boolean;
}

export function LandingPaidPlanCard({
  track,
  billingPeriod,
  highlighted = false,
}: LandingPaidPlanCardProps) {
  const { profile } = useAuth();
  const {
    startCheckout,
    startLandingGuestCheckout,
    loading: checkoutLoading,
    error: checkoutError,
    isStripeEnabled,
  } = useCheckout();

  const region = DEFAULT_REGION;
  const currency = DEFAULT_CURRENCY;
  const locale = 'en-GB';
  const { title, subtitle } = PLAN_PACKAGE_TRACK_COPY[track];

  const [tierPosition, setTierPosition] = useState(() => defaultTierPosition(region, track));

  useEffect(() => {
    setTierPosition((p) => {
      const max = Math.max(0, tierIndicesForTrack(region, track).length - 1);
      return Math.min(Math.max(0, p), max);
    });
  }, [region, track]);

  const seatOptions = useMemo(
    () => buildSeatDropdownOptions(region, track, billingPeriod),
    [region, track, billingPeriod],
  );

  const clientCount = useMemo(
    () => clientCountFromPosition(region, track, tierPosition),
    [region, track, tierPosition],
  );

  const handleTestCheckout = useCallback(async () => {
    const orgId = profile?.organizationId;
    if (!orgId) return;
    await startCheckout(orgId, region, clientCount, billingPeriod, track);
  }, [profile?.organizationId, startCheckout, region, clientCount, billingPeriod, track]);

  const handleGuestGetStarted = useCallback(async () => {
    await startLandingGuestCheckout(region, clientCount, billingPeriod, track);
  }, [startLandingGuestCheckout, region, clientCount, billingPeriod, track]);

  const tierRow = getPaidTierByClientCount(clientCount, track);
  const displayPrice =
    billingPeriod === 'annual' ? tierRow.annualPriceGbp / 12 : tierRow.monthlyPriceGbp;

  const startsAtPrice = minDisplayMonthlyInTrack(region, track, billingPeriod);
  const startsAtLabel = formatPrice(startsAtPrice, currency, locale);

  const primaryCtaClassName = cn(
    'w-full py-4 rounded-xl font-bold shadow-xl block text-center transition-apple',
    highlighted
      ? 'bg-foreground text-primary-foreground hover:opacity-90'
      : 'bg-background border border-border text-foreground hover:bg-secondary shadow-sm',
  );

  const cardBody = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-foreground-tertiary mb-1">
        From {startsAtLabel}/mo
      </p>
      <h3 className="text-xl font-bold mb-2 text-foreground">{title}</h3>
      <p className="text-sm text-foreground-secondary mb-6 font-medium">{subtitle}</p>

      <div className="flex items-baseline gap-1 mb-4">
        <span className="text-5xl font-bold text-foreground">
          {formatPrice(displayPrice, currency, locale)}
        </span>
        <span className="text-foreground-tertiary font-medium">/month</span>
      </div>
      {billingPeriod === 'annual' && (
        <p className="text-[11px] text-foreground-tertiary mb-4">
          {formatPrice(tierRow.annualPriceGbp, currency, locale)} billed yearly (~20% vs monthly)
        </p>
      )}

      <div className="space-y-2 mb-6">
        <Label
          htmlFor={`landing-seats-${track}`}
          className="text-xs font-bold text-foreground-secondary uppercase tracking-wider"
        >
          Client seats
        </Label>
        <Select value={String(tierPosition)} onValueChange={(v) => setTierPosition(Number(v))}>
          <SelectTrigger
            id={`landing-seats-${track}`}
            className="h-11 rounded-xl border-border bg-background text-left text-sm font-medium"
          >
            <SelectValue placeholder="Select seat count" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border max-h-[min(60vh,20rem)]">
            {seatOptions.map((opt) => (
              <SelectItem key={opt.position} value={String(opt.position)} className="rounded-lg">
                <span className="font-medium">
                  {formatPrice(opt.displayMonthly, currency, locale)}/mo — up to {opt.clients} clients (
                  {formatPrice(opt.perClient, currency, locale)} / client)
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-foreground-secondary mb-6">
        Up to {tierRow.clientLimit} clients · {tierRow.monthlyAiCredits} AI scans/mo · {tierRow.label}
      </p>

      <div className="space-y-2 mb-8">
        {LANDING_GUEST_CHECKOUT_ENABLED ? (
          <>
            <Button
              type="button"
              className={cn(primaryCtaClassName, 'h-auto')}
              disabled={checkoutLoading}
              onClick={() => void handleGuestGetStarted()}
            >
              {checkoutLoading ? 'Opening Stripe…' : track === 'gym' ? 'Start gym trial' : 'Get started'}
            </Button>
            <Link
              to={ROUTES.ONBOARDING}
              className="block w-full text-center text-sm font-semibold text-primary underline-offset-4 hover:underline py-1"
            >
              Sign up without paying (onboarding)
            </Link>
            {checkoutError ? (
              <p className="text-center text-xs text-destructive">{checkoutError}</p>
            ) : null}
          </>
        ) : (
          <Link to={ROUTES.ONBOARDING} className={primaryCtaClassName}>
            {track === 'gym' ? 'Start gym trial' : 'Get started'}
          </Link>
        )}

        {LANDING_CHECKOUT_TEST_ENABLED && isStripeEnabled && profile?.organizationId && (
          <div className="space-y-1">
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl border-dashed border-amber-600/50 text-amber-950 dark:border-amber-500/50 dark:text-amber-50"
              disabled={checkoutLoading}
              onClick={() => void handleTestCheckout()}
            >
              {checkoutLoading ? 'Opening Stripe…' : 'Test Stripe checkout (dev)'}
            </Button>
            {checkoutError ? (
              <p className="text-center text-xs text-destructive">{checkoutError}</p>
            ) : null}
          </div>
        )}
      </div>

      <FeatureList features={TRACK_FEATURES[track]} />
    </>
  );

  if (highlighted) {
    return (
      <div className="relative transform md:-translate-y-4">
        <div className="absolute inset-0 bg-gradient-to-b from-gradient-from to-gradient-to rounded-3xl blur-sm opacity-20" />
        <GlassCard className="p-10 relative bg-card border border-brand-medium shadow-2xl">
          <div className="absolute top-0 right-0 bg-gradient-to-l from-gradient-from to-gradient-to text-primary-foreground text-[10px] font-bold uppercase tracking-[0.15em] px-4 py-2 rounded-bl-2xl rounded-tr-2xl">
            Most Popular
          </div>
          {cardBody}
        </GlassCard>
      </div>
    );
  }

  return <GlassCard className="p-10 bg-card/70 hover:shadow-xl transition-apple">{cardBody}</GlassCard>;
}
