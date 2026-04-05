/**
 * Package Selection (Plan step)
 *
 * 1) Choose package line: Solo Coach or Gym / Studio
 * 2) Dropdown to pick exact client-seat tier (scoped to that line), then checkout
 */

import { useState, useEffect } from 'react';
import { CheckCircle, CreditCard, Building2, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  REGION_TO_CURRENCY,
  DEFAULT_REGION,
  CUSTOM_BRANDING_PRICE_GBP,
  type Region,
  type BillingPeriod,
} from '@/constants/pricing';
import { formatPrice } from '@/lib/utils/currency';
import type { BrandingConfig, BusinessType } from '@/types/onboarding';
import {
  type PlanPackageTrack,
  PLAN_PACKAGE_TRACK_COPY,
  businessTypeToTrack,
  defaultTierPosition,
  tierPositionForClientTarget,
  tierIndicesForTrack,
  DEFAULT_PLAN_CLIENT_COUNT,
} from '@/lib/pricing/planPackageTracks';
import { useCheckout } from '@/hooks/useCheckout';
import { useAuth } from '@/hooks/useAuth';
import { usePackageSelectionPricing } from '@/hooks/usePackageSelectionPricing';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface PackageSelectionStepProps {
  data?: Partial<BrandingConfig>;
  businessType?: BusinessType;
  region?: Region;
  onNext: (payload: Pick<BrandingConfig, 'clientSeats' | 'packageTrack' | 'gradientId'>) => void;
  onBack: () => void;
  /** Shown when `completeOnboarding` fails (e.g. Firestore permissions). */
  completionError?: string | null;
  /** True while final org/profile writes are in flight. */
  completingSetup?: boolean;
}

export type { PlanPackageTrack } from '@/lib/pricing/planPackageTracks';

const PACKAGE_TRACKS: {
  id: PlanPackageTrack;
  title: string;
  subtitle: string;
  icon: typeof UserRound;
}[] = (
  [
    ['solo', UserRound],
    ['gym', Building2],
  ] as const
).map(([id, icon]) => ({
  id,
  ...PLAN_PACKAGE_TRACK_COPY[id],
  icon,
}));

export function PackageSelectionStep({
  data,
  region = DEFAULT_REGION,
  businessType,
  onNext,
  onBack,
  completionError = null,
  completingSetup = false,
}: PackageSelectionStepProps) {
  const clientCountFromData = data?.clientSeats ?? DEFAULT_PLAN_CLIENT_COUNT;
  const recommendedTrack = businessTypeToTrack(businessType);

  const [phase, setPhase] = useState<'pick' | 'tier'>('pick');
  const [track, setTrack] = useState<PlanPackageTrack>(recommendedTrack);
  const [tierPosition, setTierPosition] = useState(() =>
    defaultTierPosition(region, recommendedTrack),
  );

  useEffect(() => {
    setTierPosition((p) => {
      const max = Math.max(0, tierIndicesForTrack(region, track).length - 1);
      return Math.min(Math.max(0, p), max);
    });
  }, [region, track]);

  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');

  const { startCheckout, loading: checkoutLoading, error: checkoutError, isStripeEnabled } = useCheckout();
  const { profile } = useAuth();

  const {
    clientCount,
    currency,
    locale,
    tierRow,
    displayPrice,
    seatOptions,
    isSoloFreeOnboarding,
  } = usePackageSelectionPricing({
    region,
    track,
    tierPosition,
    businessType,
    billingPeriod,
  });

  const handleSelectTrack = (t: PlanPackageTrack) => {
    setTrack(t);
    setTierPosition(tierPositionForClientTarget(region, t, clientCountFromData));
    setPhase('tier');
  };

  const handleChangePackage = () => {
    setPhase('pick');
  };

  const finishPlan = () => {
    onNext({
      clientSeats: clientCount,
      packageTrack: track,
      gradientId: data?.gradientId ?? 'volt',
    });
  };

  const handleContinue = async () => {
    if (completingSetup) return;

    const useStripe =
      !isSoloFreeOnboarding &&
      isStripeEnabled &&
      profile?.organizationId &&
      (businessType === 'gym' || businessType === 'gym_chain');

    if (useStripe) {
      const { redirected } = await startCheckout(
        profile.organizationId,
        region,
        clientCount,
        region === 'GB' ? billingPeriod : 'monthly',
        region === 'GB' ? track : undefined,
      );
      if (!redirected) {
        finishPlan();
      }
    } else {
      finishPlan();
    }
  };

  return (
    <div className="space-y-6">
      {phase === 'pick' ? (
        <>
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">Choose your package</h2>
            <p className="text-sm text-foreground-secondary">
              Pick the option that best describes you. Next, you&apos;ll set exact client capacity and billing.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-1">
            {PACKAGE_TRACKS.map(({ id, title, subtitle, icon: Icon }) => {
              const isRecommended = id === recommendedTrack;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleSelectTrack(id)}
                  className={cn(
                    'flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-apple',
                    'border-border bg-card hover:border-primary/40 hover:bg-muted/30',
                    isRecommended && 'ring-2 ring-primary/30 border-primary/40',
                  )}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-on-brand-tint">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-foreground">{title}</span>
                      {isRecommended && (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-on-brand-tint">
                          Suggested
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-foreground-secondary">{subtitle}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onBack}
            className="w-full text-center text-xs font-medium text-foreground-tertiary hover:text-foreground-secondary transition-apple"
          >
            Go back
          </button>
        </>
      ) : (
        <>
          <div>
            <button
              type="button"
              onClick={handleChangePackage}
              className="mb-3 text-xs font-semibold text-primary hover:underline"
            >
              Change package type
            </button>
            <h2 className="text-2xl font-bold text-foreground mb-1">Choose your capacity</h2>
            <p className="text-sm text-foreground-secondary">
              Select how many client seats you need. You can upgrade anytime.
            </p>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border space-y-6">
            {region === 'GB' && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBillingPeriod('monthly')}
                  className={cn(
                    'flex-1 h-10 rounded-xl text-xs font-bold transition-apple',
                    billingPeriod === 'monthly'
                      ? 'bg-foreground text-primary-foreground'
                      : 'bg-muted text-foreground-secondary',
                  )}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingPeriod('annual')}
                  className={cn(
                    'flex-1 h-10 rounded-xl text-xs font-bold transition-apple',
                    billingPeriod === 'annual'
                      ? 'bg-foreground text-primary-foreground'
                      : 'bg-muted text-foreground-secondary',
                  )}
                >
                  Annual (save ~20%)
                </button>
              </div>
            )}

            <div>
              <div className="flex justify-between items-baseline mb-4">
                <span className="text-xs font-bold text-foreground-secondary uppercase tracking-wider">
                  Your plan
                </span>
                <div className="text-right">
                  <span className="text-2xl font-bold text-foreground">
                    {formatPrice(displayPrice, currency, locale)}
                  </span>
                  <span className="text-xs text-foreground-tertiary"> /mo</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="onboarding-seat-tier" className="text-xs font-bold text-foreground-secondary uppercase tracking-wider">
                  Client seats
                </Label>
                <Select
                  value={String(tierPosition)}
                  onValueChange={(v) => setTierPosition(Number(v))}
                >
                  <SelectTrigger
                    id="onboarding-seat-tier"
                    className="h-11 rounded-xl border-border bg-background text-left text-sm font-medium"
                  >
                    <SelectValue placeholder="Select seat count" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border max-h-[min(60vh,20rem)]">
                    {seatOptions.map((opt) => (
                      <SelectItem
                        key={opt.position}
                        value={String(opt.position)}
                        className="rounded-lg"
                      >
                        <span className="font-medium">
                          {formatPrice(opt.displayMonthly, currency, locale)}/mo — up to {opt.clients}{' '}
                          clients ({formatPrice(opt.perClient, currency, locale)} / client)
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-4 rounded-lg bg-muted/50 px-4 py-3 text-sm">
                {region === 'GB' && tierRow ? (
                  <>
                    <p className="font-bold text-foreground">
                      Up to {tierRow.clientLimit} clients
                    </p>
                    <p className="text-xs text-foreground-secondary mt-1">
                      {tierRow.monthlyAiCredits} AI scans/mo · {tierRow.label}
                    </p>
                    {billingPeriod === 'annual' && (
                      <p className="text-[10px] text-foreground-tertiary mt-2">
                        {formatPrice(tierRow.annualPriceGbp, currency, locale)} billed yearly
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-bold text-foreground">Up to {clientCount} clients</p>
                    <p className="text-xs text-foreground-secondary mt-1">
                      Regional pricing ({REGION_TO_CURRENCY[region]})
                    </p>
                  </>
                )}
              </div>

              {region === 'GB' && (
                <p className="text-xs text-foreground-secondary mt-3">
                  Need more than {track === 'solo' ? '100' : '250'} clients?{' '}
                  <Link to="/contact" className="font-semibold text-primary underline">
                    Contact sales
                  </Link>{' '}
                  for custom pricing.
                </p>
              )}
            </div>

            <div className="space-y-2">
              {[
                'Unlimited manual assessments; AI scans use monthly credits',
                `Custom branding add-on from £${CUSTOM_BRANDING_PRICE_GBP} one-time (purchase separately; not included during free tier)`,
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

          {(checkoutError || completionError) && (
            <div className="rounded-lg border border-score-red-muted bg-score-red-light px-3 py-2 text-sm text-score-red-fg">
              {completionError || checkoutError}
            </div>
          )}

          <div className="space-y-3 pt-2">
            <Link
              to="/contact?interest=custom-branding"
              className="flex w-full h-11 items-center justify-center rounded-xl border border-border bg-background text-sm font-semibold text-foreground hover:bg-muted/50 transition-apple"
            >
              Add custom branding (£{CUSTOM_BRANDING_PRICE_GBP} one-time — billed when you purchase)
            </Link>
            <button
              type="button"
              onClick={handleContinue}
              disabled={checkoutLoading || completingSetup}
              className="w-full h-12 rounded-xl bg-foreground text-primary-foreground font-bold text-sm hover:opacity-90 transition-apple disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {checkoutLoading ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Processing...
                </>
              ) : completingSetup ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Saving setup…
                </>
              ) : isSoloFreeOnboarding ? (
                'Continue on free plan'
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
              disabled={checkoutLoading || completingSetup}
              className="w-full text-center text-xs font-medium text-foreground-tertiary hover:text-foreground-secondary transition-apple disabled:opacity-50"
            >
              Go back
            </button>
          </div>
        </>
      )}
    </div>
  );
}
