/**
 * Plan picker: billing period toggle → tier card grid → custom branding add-on → summary panel.
 */

import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Palette } from 'lucide-react';
import { BillingCheckoutSummaryPanel } from '@/components/org/billing/BillingCheckoutSummaryPanel';
import { CapacityTierGrid, AnnualSavingsBadge } from '@/components/org/billing/CapacityTierGrid';
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
  /** Client limit of the current active subscription (to highlight "Current plan" on a tier card). */
  currentSubscriptionClientLimit?: number;
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

function buildAnnualComparison(tier: CapacityTier | null) {
  if (!tier) return null;
  const twelveMonthAtMonthly = tier.monthlyPriceGbp * 12;
  const annualOnePayment = tier.annualPriceGbp;
  const savingVsMonthly = annualSavingsVsMonthly(tier);
  return {
    twelveMonthAtMonthly,
    annualOnePayment,
    savingVsMonthly: savingVsMonthly > 0 ? savingVsMonthly : 0,
    showSaving: savingVsMonthly > 0,
  };
}

function annualSavingsPct(tier: CapacityTier): number {
  const full = tier.monthlyPriceGbp * 12;
  if (full <= 0) return 0;
  return Math.max(0, Math.round((annualSavingsVsMonthly(tier) / full) * 100));
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
  currentSubscriptionClientLimit,
  offerBrandingAddOn = false,
  onSubscriptionUpdated,
}: BillingStripeSubscribeCardProps) {
  const { toast } = useToast();
  const { startCheckout, updateSubscriptionPlan, loading, planUpdateLoading, error } = useCheckout();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [includeBrandingAddOn, setIncludeBrandingAddOn] = useState(false);

  const isGymOrg = orgType === 'gym' || orgType === 'gym_chain' || packageTrack === 'gym';
  const isSoloOrg = orgType === 'solo_coach' || packageTrack === 'solo';
  const trackEligible = isGymOrg || isSoloOrg;
  const currentTrack: PackageTrack = isGymOrg ? 'gym' : 'solo';
  const defaultSeats = isGymOrg ? GYM_TRIAL_CLIENT_CAP : 10;
  const suggestedMin = Math.max(1, Math.min(300, Math.floor(clientTarget || defaultSeats)));

  const checkoutLocked =
    subscriptionStatus === 'active' && Boolean(stripeSubscriptionId?.trim());

  // Active subscribers can switch between solo and gym tracks in-app.
  // New subscribers stay on their org's current track.
  const [selectedTrack, setSelectedTrack] = useState<PackageTrack>(currentTrack);
  const isCrossTrackSwitch = checkoutLocked && selectedTrack !== currentTrack;

  const tiers = useMemo(() => {
    if (!trackEligible) return [];
    return getActivePaidTiersForTrack(selectedTrack).sort((a, b) => a.clientLimit - b.clientLimit);
  }, [trackEligible, selectedTrack]);

  const [selectedClientLimit, setSelectedClientLimit] = useState<number>(defaultSeats);

  useEffect(() => {
    if (tiers.length === 0) return;
    setSelectedClientLimit(snapToTierAtLeast(suggestedMin, tiers));
  }, [suggestedMin, tiers]);

  if (!STRIPE_CONFIG.isEnabled || !trackEligible) return null;

  // Non-GB region: simplified contact section
  if (region !== 'GB') {
    return (
      <section
        id="billing-checkout-prep"
        className="scroll-mt-24 rounded-xl border border-border/70 bg-background p-6 sm:p-8 space-y-4"
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
          {CHECKOUT_FLOW_COPY.billingSubscribeSectionLabel}
        </p>
        <div>
          <h2 className="text-base font-semibold text-foreground">{CHECKOUT_FLOW_COPY.billingNonGbSectionTitle}</h2>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-xl leading-relaxed">
            {CHECKOUT_FLOW_COPY.billingNonGbSectionLead}
          </p>
        </div>
        {checkoutLocked ? (
          <p className="text-sm text-muted-foreground border border-border/70 rounded-lg p-4 bg-muted/20">
            {CHECKOUT_FLOW_COPY.billingNonGbActiveSubHint}
          </p>
        ) : null}
        <Button type="button" className="rounded-lg font-semibold" asChild>
          <Link to={ROUTES.CONTACT}>{CHECKOUT_FLOW_COPY.billingNonGbContactCta}</Link>
        </Button>
      </section>
    );
  }

  const selectedTier = tiers.find((t) => t.clientLimit === selectedClientLimit) ?? tiers[0] ?? null;
  const brandingPriceGbp = region === 'GB' ? getCustomBrandingPrice(region) : 0;
  const brandingPriceFormatted = formatPrice(brandingPriceGbp, 'GBP', 'en-GB');
  const annualComparison = buildAnnualComparison(selectedTier);
  const savingsPct = selectedTier ? annualSavingsPct(selectedTier) : 0;

  // Branding: selectable on new checkout; locked note for active subs; hidden if already enabled
  const showBrandingSection = offerBrandingAddOn || (checkoutLocked && brandingPriceGbp > 0 && region === 'GB');
  const brandingSelectable = offerBrandingAddOn && !checkoutLocked;

  const handleSubscribe = async () => {
    const { redirected, errorMessage } = await startCheckout(
      organizationId,
      region,
      selectedClientLimit,
      billingPeriod,
      selectedTrack,
      brandingSelectable && includeBrandingAddOn ? true : undefined,
    );
    if (!redirected && errorMessage) {
      toast({
        variant: 'destructive',
        title: CHECKOUT_FLOW_COPY.checkoutCallableFailedToastTitle,
        description: errorMessage,
      });
    }
  };

  const handleConfirmPlanChange = () => {
    void (async () => {
      try {
        const data = await updateSubscriptionPlan(
          organizationId,
          region,
          selectedClientLimit,
          billingPeriod,
          selectedTrack,
        );
        if (data.unchanged) {
          toast({
            title: 'Already on this plan',
            description: 'Choose a different capacity or billing period to make a change.',
          });
        } else if (isCrossTrackSwitch) {
          toast({
            title: selectedTrack === 'gym' ? 'Switched to Gym plan' : 'Switched to Solo plan',
            description: 'Your plan type and capacity have been updated. Changes will apply within a minute.',
          });
        } else {
          toast({
            title: 'Plan updated',
            description: 'Your plan was updated. Limits and credits will refresh shortly.',
          });
        }
        onSubscriptionUpdated?.();
      } catch (e: unknown) {
        const description =
          e && typeof e === 'object' && 'message' in e && typeof (e as { message: string }).message === 'string'
            ? (e as { message: string }).message
            : 'Please try again or contact support.';
        toast({ variant: 'destructive', title: 'Could not update plan', description });
      }
    })();
  };

  const title = checkoutLocked
    ? CHECKOUT_FLOW_COPY.billingSubscribeTitleCompare
    : CHECKOUT_FLOW_COPY.billingSubscribeTitle;
  const lead = checkoutLocked
    ? CHECKOUT_FLOW_COPY.billingSubscribeLeadCompare
    : CHECKOUT_FLOW_COPY.billingSubscribeLeadCheckout;

  return (
    <section
      id="billing-checkout-prep"
      className="scroll-mt-24 rounded-xl border border-border/70 bg-background p-5 sm:p-6 shadow-none space-y-6"
    >
      {/* Section header */}
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {CHECKOUT_FLOW_COPY.billingSubscribeSectionLabel}
        </p>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground leading-snug max-w-xl">{lead}</p>
        {statsClientCount != null ? (
          <p className="text-xs text-muted-foreground pt-0.5">
            {CHECKOUT_FLOW_COPY.checkoutClientsInOrg.replace('{count}', String(statsClientCount))}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        {/* Left: picker + add-ons */}
        <div className="order-2 min-w-0 lg:order-1 lg:col-span-7 xl:col-span-8 space-y-6">

          {/* Billing period toggle */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-foreground shrink-0">
              {CHECKOUT_FLOW_COPY.billingSubscribePeriodLabel}
            </span>
            <div
              className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5"
              role="group"
              aria-label="Billing period"
            >
              {(['monthly', 'annual'] as const).map((p) => {
                const active = billingPeriod === p;
                return (
                  <button
                    key={p}
                    type="button"
                    disabled={loading || planUpdateLoading}
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
            {checkoutLocked
              ? <span className="text-xs text-muted-foreground">View prices only — period changes require the billing portal.</span>
              : <AnnualSavingsBadge pct={savingsPct} />
            }
          </div>

          {/* Tier cards */}
          <CapacityTierGrid
            tiers={tiers}
            selectedClientLimit={selectedClientLimit}
            billingPeriod={billingPeriod}
            currentClientLimit={currentSubscriptionClientLimit}
            disabled={loading || planUpdateLoading}
            onSelect={setSelectedClientLimit}
          />

          <p className="text-xs text-muted-foreground">
            {checkoutLocked
              ? CHECKOUT_FLOW_COPY.billingSubscribePackageHintActiveSub
              : CHECKOUT_FLOW_COPY.billingSubscribePackageHint}{' '}
            <span className="text-muted-foreground/70">{CHECKOUT_FLOW_COPY.billingSubscribeGbpCatalogNote}</span>
          </p>

          {/* Plan type selector — only shown for active subscribers */}
          {checkoutLocked && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-foreground shrink-0">Plan type</span>
                <div
                  className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5"
                  role="group"
                  aria-label="Plan type"
                >
                  {(['solo', 'gym'] as const).map((t) => {
                    const active = selectedTrack === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        disabled={loading || planUpdateLoading}
                        onClick={() => setSelectedTrack(t)}
                        aria-pressed={active}
                        className={cn(
                          'rounded-md px-3 py-1.5 text-sm font-semibold transition-apple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                          active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {t === 'solo' ? 'Solo' : 'Team'}
                      </button>
                    );
                  })}
                </div>
                {isCrossTrackSwitch && (
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    Switching plan type
                  </span>
                )}
              </div>
              {isCrossTrackSwitch && selectedTrack === 'solo' && (
                <p className="text-xs text-muted-foreground leading-snug">
                  Switching to Solo removes multi-coach access. Make sure you have only one coach and your active clients fit the selected capacity — the confirmation will tell you if anything needs resolving first.
                </p>
              )}
              {isCrossTrackSwitch && selectedTrack === 'gym' && (
                <p className="text-xs text-muted-foreground leading-snug">
                  Switching to a Team plan lets you invite additional coaches, each with their own login and client list. Your existing clients and data stay intact.
                </p>
              )}
            </div>
          )}

          {/* Custom branding add-on */}
          {showBrandingSection && (
            <div className="rounded-xl border border-border/70 bg-muted/15 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Palette className="h-4 w-4 text-foreground-secondary" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {CHECKOUT_FLOW_COPY.brandingAddOnTitle}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                      {CHECKOUT_FLOW_COPY.brandingAddOnDesc}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">
                  {CHECKOUT_FLOW_COPY.brandingAddOnPrice(brandingPriceFormatted)}
                </span>
              </div>

              {brandingSelectable ? (
                <label
                  htmlFor="checkout-branding-addon"
                  className="flex items-center gap-2.5 cursor-pointer"
                >
                  <Checkbox
                    id="checkout-branding-addon"
                    checked={includeBrandingAddOn}
                    onCheckedChange={(v) => setIncludeBrandingAddOn(v === true)}
                    disabled={loading || planUpdateLoading}
                  />
                  <span className="text-sm font-medium text-foreground">
                    {CHECKOUT_FLOW_COPY.brandingAddOnCheckboxLabel}
                  </span>
                </label>
              ) : checkoutLocked ? (
                <p className="text-xs text-muted-foreground">
                  {CHECKOUT_FLOW_COPY.brandingAddOnActiveSubNote}{' '}
                  <Link to={ROUTES.CONTACT} className="underline underline-offset-2 hover:text-foreground">
                    Contact us
                  </Link>
                </p>
              ) : null}
            </div>
          )}
        </div>

        {/* Right: summary panel */}
        <div className="order-1 min-w-0 lg:order-2 lg:col-span-5 xl:col-span-4">
          <BillingCheckoutSummaryPanel
            selectedTier={selectedTier}
            billingPeriod={billingPeriod}
            annualComparison={annualComparison}
            loading={loading}
            checkoutLocked={checkoutLocked}
            confirmLoading={checkoutLocked ? planUpdateLoading : loading}
            error={error}
            onContinue={checkoutLocked ? handleConfirmPlanChange : handleSubscribe}
            includeBrandingAddOn={brandingSelectable && includeBrandingAddOn}
            brandingPriceGbp={brandingPriceGbp}
          />
        </div>
      </div>
    </section>
  );
}
