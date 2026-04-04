/**
 * Checkout prep: pick capacity tier + period, then redirect to Stripe Checkout (step 2).
 */

import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BillingCheckoutSummaryPanel } from '@/components/org/billing/BillingCheckoutSummaryPanel';
import { useCheckout } from '@/hooks/useCheckout';
import { useToast } from '@/hooks/use-toast';
import { STRIPE_CONFIG } from '@/constants/platform';
import { CHECKOUT_FLOW_COPY } from '@/constants/checkoutFlowCopy';
import {
  GYM_TRIAL_CLIENT_CAP,
  getActivePaidTiersForTrack,
  annualSavingsVsMonthly,
} from '@/constants/pricing';
import type { Region, BillingPeriod, PackageTrack, CapacityTier } from '@/constants/pricing';
import { ROUTES } from '@/constants/routes';
import { formatPrice } from '@/lib/utils/currency';
import { getCustomBrandingPrice } from '@/lib/pricing/config';
import { cn } from '@/lib/utils';

export interface BillingStripeSubscribeCardProps {
  organizationId: string;
  region: Region;
  clientTarget: number;
  subscriptionStatus: string;
  stripeSubscriptionId?: string;
  orgType?: string;
  packageTrack?: string;
  hasStripeCustomer?: boolean;
  statsClientCount?: number;
  /** GB: offer custom branding on Checkout when org does not already have paid branding enabled. */
  offerBrandingAddOn?: boolean;
  onSubscriptionUpdated?: () => void;
}

function snapToTierAtLeast(minClients: number, tiers: CapacityTier[]): number {
  const sorted = [...tiers].sort((a, b) => a.clientLimit - b.clientLimit);
  if (sorted.length === 0) return Math.max(1, Math.min(300, minClients));
  const n = Math.max(1, Math.min(300, Math.floor(minClients)));
  const match = sorted.find((t) => t.clientLimit >= n);
  return (match ?? sorted[sorted.length - 1]).clientLimit;
}

function equivMonthlyFromAnnual(tier: CapacityTier): string {
  const avg = tier.annualPriceGbp / 12;
  return formatPrice(avg, 'GBP', 'en-GB');
}

function annualSavingsPercent(tier: CapacityTier): number {
  const full = tier.monthlyPriceGbp * 12;
  if (full <= 0) return 0;
  return Math.max(0, Math.round((annualSavingsVsMonthly(tier) / full) * 100));
}

function buildAnnualComparison(tier: CapacityTier | null) {
  if (!tier) return null;
  const twelveMonthAtMonthly = tier.monthlyPriceGbp * 12;
  const annualOnePayment = tier.annualPriceGbp;
  const savingVsMonthly = twelveMonthAtMonthly - annualOnePayment;
  return {
    twelveMonthAtMonthly,
    annualOnePayment,
    savingVsMonthly: savingVsMonthly > 0 ? savingVsMonthly : 0,
    showSaving: savingVsMonthly > 0,
  };
}

function capacityOptionLabel(tier: CapacityTier, billingPeriod: BillingPeriod): string {
  const price =
    billingPeriod === 'monthly'
      ? `${formatPrice(tier.monthlyPriceGbp, 'GBP', 'en-GB')}/mo`
      : `${formatPrice(tier.annualPriceGbp, 'GBP', 'en-GB')}/yr`;
  const ai = tier.monthlyAiCredits === -1 ? '∞' : String(tier.monthlyAiCredits);
  return CHECKOUT_FLOW_COPY.billingSubscribeCapacityOption
    .replace('{clients}', String(tier.clientLimit))
    .replace('{price}', price)
    .replace('{ai}', ai);
}

export function BillingStripeSubscribeCard({
  organizationId,
  region,
  clientTarget,
  subscriptionStatus,
  stripeSubscriptionId,
  orgType,
  packageTrack,
  statsClientCount,
  offerBrandingAddOn = false,
  onSubscriptionUpdated,
}: BillingStripeSubscribeCardProps) {
  const { toast } = useToast();
  const { startCheckout, updateSubscriptionPlan, loading, planUpdateLoading, error } = useCheckout();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [includeBrandingAddOn, setIncludeBrandingAddOn] = useState(false);

  const isGymOrg =
    orgType === 'gym' || orgType === 'gym_chain' || packageTrack === 'gym';
  const isSoloOrg = orgType === 'solo_coach' || packageTrack === 'solo';
  const trackEligible = isGymOrg || isSoloOrg;
  const packageTrackCheckout: PackageTrack = isGymOrg ? 'gym' : 'solo';
  const defaultSeats = isGymOrg ? GYM_TRIAL_CLIENT_CAP : 10;
  const suggestedMin = Math.max(1, Math.min(300, Math.floor(clientTarget || defaultSeats)));

  const tiers = useMemo(() => {
    if (!trackEligible) return [];
    return getActivePaidTiersForTrack(packageTrackCheckout).sort((a, b) => a.clientLimit - b.clientLimit);
  }, [trackEligible, packageTrackCheckout]);

  const checkoutLocked =
    subscriptionStatus === 'active' && Boolean(stripeSubscriptionId?.trim());

  const [selectedClientLimit, setSelectedClientLimit] = useState<number>(defaultSeats);

  useEffect(() => {
    if (tiers.length === 0) return;
    setSelectedClientLimit(snapToTierAtLeast(suggestedMin, tiers));
  }, [suggestedMin, tiers]);

  if (!STRIPE_CONFIG.isEnabled || !trackEligible) {
    return null;
  }

  if (region !== 'GB') {
    return (
      <section
        id="billing-checkout-prep"
        className="scroll-mt-24 rounded-2xl border border-dashed border-border/90 bg-muted/20 p-6 sm:p-8 space-y-4"
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          {CHECKOUT_FLOW_COPY.billingSubscribeSectionLabel}
        </p>
        <div>
          <h2 className="text-lg font-semibold text-foreground">{CHECKOUT_FLOW_COPY.billingNonGbSectionTitle}</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
            {CHECKOUT_FLOW_COPY.billingNonGbSectionLead}
          </p>
        </div>
        {checkoutLocked ? (
          <p className="text-sm text-muted-foreground border border-border rounded-xl p-4 bg-card/80">
            {CHECKOUT_FLOW_COPY.billingNonGbActiveSubHint}
          </p>
        ) : null}
        <Button type="button" className="rounded-xl font-semibold" asChild>
          <Link to={ROUTES.CONTACT}>{CHECKOUT_FLOW_COPY.billingNonGbContactCta}</Link>
        </Button>
      </section>
    );
  }

  const selectedTier =
    tiers.find((t) => t.clientLimit === selectedClientLimit) ?? tiers[0] ?? null;

  const tierSliderRaw = selectedTier
    ? tiers.findIndex((t) => t.clientLimit === selectedTier.clientLimit)
    : 0;
  const tierSliderIndex = tierSliderRaw >= 0 ? tierSliderRaw : 0;

  const brandingPriceGbp = region === 'GB' ? getCustomBrandingPrice(region) : 0;

  const handleSubscribe = () => {
    void startCheckout(
      organizationId,
      region,
      selectedClientLimit,
      billingPeriod,
      packageTrackCheckout,
      offerBrandingAddOn && !checkoutLocked && includeBrandingAddOn ? true : undefined,
    );
  };

  const handleConfirmPlanChange = () => {
    void (async () => {
      try {
        const data = await updateSubscriptionPlan(
          organizationId,
          region,
          selectedClientLimit,
          billingPeriod,
          packageTrackCheckout,
        );
        if (data.unchanged) {
          toast({
            title: 'Already on this package',
            description: 'Choose a different capacity or billing period if you want to change.',
          });
        } else {
          toast({
            title: 'Plan updated',
            description:
              'Your subscription was updated in Stripe. Limits and credits refresh shortly; check your email for any invoice.',
          });
        }
        onSubscriptionUpdated?.();
      } catch (e: unknown) {
        const description =
          e && typeof e === 'object' && 'message' in e && typeof (e as { message: string }).message === 'string'
            ? (e as { message: string }).message
            : 'Please try again or contact support.';
        toast({
          variant: 'destructive',
          title: 'Could not update plan',
          description,
        });
      }
    })();
  };

  const title = checkoutLocked
    ? CHECKOUT_FLOW_COPY.billingSubscribeTitleCompare
    : CHECKOUT_FLOW_COPY.billingSubscribeTitle;
  const lead = checkoutLocked
    ? CHECKOUT_FLOW_COPY.billingSubscribeLeadCompare
    : CHECKOUT_FLOW_COPY.billingSubscribeLeadCheckout;

  const savingsPct = selectedTier ? annualSavingsPercent(selectedTier) : 0;
  const annualComparison = buildAnnualComparison(selectedTier);

  const tierPicker = (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-foreground shrink-0">
          {CHECKOUT_FLOW_COPY.billingSubscribePeriodLabel}
        </span>
        <div
          className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5"
          role="group"
          aria-label={CHECKOUT_FLOW_COPY.billingSubscribePeriodLabel}
        >
          {(['monthly', 'annual'] as const).map((p) => {
            const active = billingPeriod === p;
            return (
              <button
                key={p}
                type="button"
                disabled={loading}
                onClick={() => setBillingPeriod(p)}
                aria-pressed={active}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-semibold transition-apple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {p === 'monthly'
                  ? CHECKOUT_FLOW_COPY.billingSubscribePeriodMonthly
                  : CHECKOUT_FLOW_COPY.billingSubscribePeriodAnnual}
              </button>
            );
          })}
        </div>
        {billingPeriod === 'annual' && savingsPct > 0 ? (
          <Badge variant="secondary" className="text-xs font-semibold">
            ~{savingsPct}% vs monthly
          </Badge>
        ) : null}
      </div>

      <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Label htmlFor="capacity-select" className="text-sm font-medium text-foreground shrink-0">
            {CHECKOUT_FLOW_COPY.billingSubscribeCapacityLabel}
          </Label>
          <Select
            value={String(selectedClientLimit)}
            onValueChange={(v) => setSelectedClientLimit(Number(v))}
            disabled={loading || tiers.length === 0}
          >
            <SelectTrigger id="capacity-select" className="h-9 w-full sm:w-[min(100%,320px)] rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[min(24rem,70vh)]">
              {tiers.map((tier) => (
                <SelectItem key={tier.id} value={String(tier.clientLimit)}>
                  {capacityOptionLabel(tier, billingPeriod)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <input
            id="capacity-slider"
            type="range"
            min={0}
            max={Math.max(0, tiers.length - 1)}
            step={1}
            value={tierSliderIndex}
            disabled={loading || tiers.length === 0}
            onChange={(e) => {
              const i = Number(e.target.value);
              const t = tiers[i];
              if (t) setSelectedClientLimit(t.clientLimit);
            }}
            aria-valuemin={0}
            aria-valuemax={Math.max(0, tiers.length - 1)}
            aria-valuenow={tierSliderIndex}
            aria-label={CHECKOUT_FLOW_COPY.billingSubscribeCapacityLabel}
            className="w-full h-2 rounded-full bg-muted accent-primary cursor-pointer disabled:opacity-50"
          />
          {tiers.length > 1 ? (
            <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums px-0.5">
              <span>{tiers[0]?.clientLimit}</span>
              <span>{tiers[tiers.length - 1]?.clientLimit}</span>
            </div>
          ) : null}
        </div>

        {selectedTier ? (
          <p className="text-sm text-muted-foreground tabular-nums">
            {formatPrice(
              billingPeriod === 'monthly' ? selectedTier.monthlyPriceGbp : selectedTier.annualPriceGbp,
              'GBP',
              'en-GB',
            )}
            {billingPeriod === 'monthly'
              ? CHECKOUT_FLOW_COPY.billingSubscribePerMonthShort
              : CHECKOUT_FLOW_COPY.billingSubscribePerYearShort}
            {billingPeriod === 'annual' ? (
              <span className="text-xs ml-2">
                (
                {CHECKOUT_FLOW_COPY.billingSubscribeEquivMonthly.replace(
                  '{amount}',
                  equivMonthlyFromAnnual(selectedTier),
                )}
                )
              </span>
            ) : null}
            <span className="mx-2 text-border">·</span>
            {selectedTier.monthlyAiCredits === -1
              ? 'Unlimited AI/mo'
              : `${selectedTier.monthlyAiCredits} AI credits/mo`}
          </p>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        {checkoutLocked
          ? CHECKOUT_FLOW_COPY.billingSubscribePackageHintActiveSub
          : CHECKOUT_FLOW_COPY.billingSubscribePackageHint}{' '}
        <span className="text-muted-foreground/80">{CHECKOUT_FLOW_COPY.billingSubscribeGbpCatalogNote}</span>
      </p>
    </div>
  );

  const summaryPanel = (
    <BillingCheckoutSummaryPanel
      selectedTier={selectedTier}
      billingPeriod={billingPeriod}
      annualComparison={annualComparison}
      loading={loading}
      checkoutLocked={checkoutLocked}
      confirmLoading={checkoutLocked ? planUpdateLoading : loading}
      error={error}
      onContinue={checkoutLocked ? handleConfirmPlanChange : handleSubscribe}
      offerBrandingAddOn={offerBrandingAddOn}
      includeBrandingAddOn={includeBrandingAddOn}
      onIncludeBrandingChange={setIncludeBrandingAddOn}
      brandingPriceGbp={brandingPriceGbp}
    />
  );

  return (
    <section
      id="billing-checkout-prep"
      className="scroll-mt-24 rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm"
    >
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {CHECKOUT_FLOW_COPY.billingSubscribeSectionLabel}
        </p>
        <h2 className="text-base font-semibold text-foreground tracking-tight">{title}</h2>
        <p className="text-xs text-muted-foreground leading-snug max-w-xl">{lead}</p>
        {statsClientCount != null ? (
          <p className="text-xs text-muted-foreground pt-1">
            {CHECKOUT_FLOW_COPY.checkoutClientsInOrg.replace('{count}', String(statsClientCount))}
          </p>
        ) : null}
      </div>

      <div className="mt-6 lg:hidden">{summaryPanel}</div>

      <div className="mt-6 grid gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-7 xl:col-span-8">{tierPicker}</div>
        <div className="hidden lg:block lg:col-span-5 xl:col-span-4">{summaryPanel}</div>
      </div>
    </section>
  );
}
