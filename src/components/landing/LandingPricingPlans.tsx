import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { Check } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  FREE_TIER_CLIENT_LIMIT,
  FREE_TIER_MONTHLY_AI_CREDITS,
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

const PAID_TRACK_ORDER: PlanPackageTrack[] = ['solo', 'gym'];

interface PricingFeature {
  text: string;
  included: boolean;
}

const FREE_FEATURES: PricingFeature[] = [
  { text: `${FREE_TIER_MONTHLY_AI_CREDITS} AI scans per month`, included: true },
  { text: 'Clinical Logic Engine', included: true },
  { text: 'Client assessments & reports', included: true },
  { text: 'Upgrade when you need more clients', included: true },
  { text: 'Custom branding add-on', included: false },
  { text: 'Priority support', included: false },
];

const TRACK_FEATURES: Record<PlanPackageTrack, PricingFeature[]> = {
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

function FeatureList({ features }: { features: PricingFeature[] }) {
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

interface PaidPlanCardProps {
  track: PlanPackageTrack;
  billingPeriod: BillingPeriod;
  highlighted?: boolean;
}

function PaidPlanCard({ track, billingPeriod, highlighted = false }: PaidPlanCardProps) {
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

  const tierRow = getPaidTierByClientCount(clientCount, track);
  const displayPrice =
    billingPeriod === 'annual' ? tierRow.annualPriceGbp / 12 : tierRow.monthlyPriceGbp;

  const startsAtPrice = minDisplayMonthlyInTrack(region, track, billingPeriod);
  const startsAtLabel = formatPrice(startsAtPrice, currency, locale);

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

      <Link
        to={ROUTES.ONBOARDING}
        className={cn(
          'w-full py-4 rounded-xl font-bold mb-8 shadow-xl block text-center transition-apple',
          highlighted
            ? 'bg-foreground text-primary-foreground hover:opacity-90'
            : 'bg-background border border-border text-foreground hover:bg-secondary shadow-sm',
        )}
      >
        {track === 'gym' ? 'Start gym trial' : 'Get started'}
      </Link>

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

export function LandingPricingPlans() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');

  return (
    <div className="w-full max-w-7xl mx-auto space-y-10">
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
          <PaidPlanCard key={track} track={track} billingPeriod={billingPeriod} highlighted={track === 'solo'} />
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
