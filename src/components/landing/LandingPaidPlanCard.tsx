import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { Check } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { useCheckout } from '@/hooks/useCheckout';
import { LANDING_GUEST_CHECKOUT_ENABLED } from '@/constants/platform';
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
  tierIndicesForTrack,
} from '@/lib/pricing/planPackageTracks';
import { cn } from '@/lib/utils';

export interface PricingFeature {
  text: string;
  included: boolean;
}

export const TRACK_FEATURES: Record<PlanPackageTrack, PricingFeature[]> = {
  solo: [
    { text: 'Clinical Logic Engine & professional reports', included: true },
    { text: 'AI scan credits scale with seats', included: true },
    { text: `Custom branding from £${CUSTOM_BRANDING_PRICE_GBP} one-time`, included: false },
  ],
  gym: [
    { text: 'Everything in Solo, scaled for teams', included: true },
    { text: '14-day trial', included: true },
    { text: `Custom branding from £${CUSTOM_BRANDING_PRICE_GBP} one-time`, included: false },
  ],
};

export function FeatureList({ features }: { features: PricingFeature[] }) {
  return (
    <ul className="space-y-3 text-sm text-foreground-secondary font-medium">
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
  const navigate = useNavigate();
  const {
    startLandingGuestCheckout,
    loading: checkoutLoading,
    error: checkoutError,
  } = useCheckout();

  const region = DEFAULT_REGION;
  const currency = DEFAULT_CURRENCY;
  const locale = 'en-GB';
  const { title, subtitle } = PLAN_PACKAGE_TRACK_COPY[track];

  /** Landing always starts at the entry paid tier (lowest seats in the track). */
  const [tierPosition, setTierPosition] = useState(0);

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

  const handleGuestGetStarted = useCallback(async () => {
    const { redirected } = await startLandingGuestCheckout(region, clientCount, billingPeriod, track);
    if (!redirected) {
      navigate(ROUTES.TRY, { replace: false });
    }
  }, [startLandingGuestCheckout, region, clientCount, billingPeriod, track, navigate]);

  const tierRow = getPaidTierByClientCount(clientCount, track);
  const displayPrice =
    billingPeriod === 'annual' ? tierRow.annualPriceGbp / 12 : tierRow.monthlyPriceGbp;

  const primaryCtaClassName = cn(
    'block w-full rounded-lg py-4 text-center font-bold shadow-sm transition-apple',
    highlighted
      ? 'bg-foreground text-primary-foreground hover:opacity-90'
      : 'bg-background border border-border text-foreground hover:bg-secondary shadow-sm',
  );

  const cardBody = (
    <>
      <h3 className="text-xl font-bold mb-1 text-foreground">{title}</h3>
      <p className="text-sm text-foreground-secondary mb-5 font-medium">{subtitle}</p>

      <div
        className={cn(
          'flex items-baseline gap-1',
          billingPeriod === 'annual' ? 'mb-1' : 'mb-5',
        )}
      >
        <span className="text-4xl sm:text-5xl font-bold text-foreground">
          {formatPrice(displayPrice, currency, locale)}
        </span>
        <span className="text-foreground-tertiary font-medium">/month</span>
      </div>
      {billingPeriod === 'annual' ? (
        <p className="text-xs text-foreground-tertiary mb-5">
          {formatPrice(tierRow.annualPriceGbp, currency, locale)} billed yearly
        </p>
      ) : null}

      <div className="space-y-1.5 mb-6">
        <Label
          htmlFor={`landing-seats-${track}`}
          className="text-xs font-semibold text-foreground-secondary"
        >
          Client seats
        </Label>
        <Select value={String(tierPosition)} onValueChange={(v) => setTierPosition(Number(v))}>
          <SelectTrigger
            id={`landing-seats-${track}`}
            className="h-11 rounded-lg border-border bg-background text-left text-sm font-medium"
          >
            <SelectValue placeholder="Select seats" />
          </SelectTrigger>
          <SelectContent className="max-h-[min(60vh,20rem)] rounded-lg border-border">
            {seatOptions.map((opt) => (
              <SelectItem key={opt.position} value={String(opt.position)} className="rounded-lg">
                <span className="font-medium">
                  Up to {opt.clients} clients · {formatPrice(opt.displayMonthly, currency, locale)}/mo
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 mb-6">
        {LANDING_GUEST_CHECKOUT_ENABLED ? (
          <>
            <Button
              type="button"
              className={cn(primaryCtaClassName, 'h-auto')}
              disabled={checkoutLoading}
              onClick={() => void handleGuestGetStarted()}
            >
              {checkoutLoading ? 'Opening checkout…' : track === 'gym' ? 'Start gym trial' : 'Get started'}
            </Button>
            {checkoutError ? (
              <p className="text-center text-xs text-destructive">{checkoutError}</p>
            ) : null}
          </>
        ) : (
          <Link to={ROUTES.TRY} className={primaryCtaClassName}>
            {track === 'gym' ? 'Start gym trial' : 'Get started'}
          </Link>
        )}
      </div>

      <FeatureList features={TRACK_FEATURES[track]} />
    </>
  );

  if (highlighted) {
    return (
      <div className="relative transform md:-translate-y-4">
        <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-gradient-from to-gradient-to opacity-20 blur-sm" />
        <GlassCard className="relative border border-brand-medium bg-card p-8 shadow-md sm:p-10">
          <div className="absolute right-0 top-0 rounded-bl-lg rounded-tr-lg bg-gradient-to-l from-gradient-from to-gradient-to px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-primary-foreground">
            Most Popular
          </div>
          {cardBody}
        </GlassCard>
      </div>
    );
  }

  return (
    <GlassCard className="bg-card/70 p-8 transition-apple hover:shadow-md sm:p-10">{cardBody}</GlassCard>
  );
}
