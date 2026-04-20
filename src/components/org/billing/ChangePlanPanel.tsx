import { useReducer, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  Info,
  CreditCard,
  Mail,
  AlertCircle,
  Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PlanBadge } from '@/components/org/billing/PlanBadge';
import { PackageTrackLever } from '@/components/org/billing/levers/PackageTrackLever';
import { CapacitySlider } from '@/components/org/billing/levers/CapacitySlider';
import { BillingPeriodLever } from '@/components/org/billing/levers/BillingPeriodLever';
import { AddOnLever } from '@/components/org/billing/levers/AddOnLever';
import { PlanChangeSummary } from '@/components/org/billing/PlanChangeSummary';
import { useCheckout } from '@/hooks/useCheckout';
import { useToast } from '@/hooks/use-toast';
import { CHECKOUT_FLOW_COPY } from '@/constants/checkoutFlowCopy';
import { ROUTES } from '@/constants/routes';
import {
  getActivePaidTiersForTrack,
  annualSavingsVsMonthly,
  getPaidTierById,
  isPaidCapacityTierId,
} from '@/constants/pricing';
import type { Region, PackageTrack, PaidCapacityTierId, BillingPeriod } from '@/constants/pricing';
import { formatPrice } from '@/lib/utils/currency';
import { getCustomBrandingPrice } from '@/lib/pricing/config';
import { draftReducer, draftEquals } from '@/types/billingLevers';
import type { DraftSubscription, CurrentSubscription } from '@/types/billingLevers';
import { cn } from '@/lib/utils';

export interface ChangePlanPanelProps {
  organizationId: string;
  region: Region;
  subscriptionStatus: string;
  stripeSubscriptionId?: string;
  currentTrack: PackageTrack;
  currentClientLimit: number;
  currentTierId?: string;
  hasStripeCustomer: boolean;
  statsClientCount: number;
  /** Monthly amount in main currency unit (pounds, not pence) */
  monthlyAmount: number;
  /** AI credits remaining this month */
  assessmentCredits?: number;
  /** Total monthly AI credits on the plan */
  monthlyAiCredits?: number;
  subscriptionPlanHeadline: string;
  offerBrandingAddOn: boolean;
  userEmail?: string;
  onBack: () => void;
  onSubscriptionUpdated: () => void;
  onManagePayment: () => Promise<void>;
  onCancelSubscription: () => void;
}

function resolveInitialTierId(
  currentTierId: string | undefined,
  track: PackageTrack,
  clientLimit: number,
): PaidCapacityTierId {
  if (currentTierId && isPaidCapacityTierId(currentTierId)) {
    return currentTierId;
  }
  const tiers = getActivePaidTiersForTrack(track);
  const sorted = [...tiers].sort((a, b) => a.clientLimit - b.clientLimit);
  const match = sorted.find(t => t.clientLimit >= clientLimit);
  return (match ?? sorted[sorted.length - 1] ?? sorted[0]).id;
}

function annualSavingsPct(monthlyPrice: number, annualPrice: number): number {
  const full = monthlyPrice * 12;
  if (full <= 0) return 0;
  return Math.max(0, Math.round(((full - annualPrice) / full) * 100));
}

// ── Usage bar sub-component ────────────────────────────

function UsageBar({ label, value, max }: { label: string; value: number; max: number | null }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground-secondary">{label}</span>
        <span className="tabular-nums font-medium text-foreground">
          {value}{max ? ` / ${max}` : ''}
        </span>
      </div>
      {max && (
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              pct > 95 ? 'bg-red-500' : pct > 85 ? 'bg-amber-500' : 'bg-primary',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────

export function ChangePlanPanel({
  organizationId,
  region,
  subscriptionStatus,
  stripeSubscriptionId,
  currentTrack,
  currentClientLimit,
  currentTierId,
  hasStripeCustomer,
  statsClientCount,
  monthlyAmount,
  assessmentCredits,
  monthlyAiCredits,
  subscriptionPlanHeadline,
  offerBrandingAddOn,
  userEmail,
  onBack,
  onSubscriptionUpdated,
  onManagePayment,
  onCancelSubscription,
}: ChangePlanPanelProps) {
  const { toast } = useToast();
  const { startCheckout, updateSubscriptionPlan, loading, planUpdateLoading, error } = useCheckout();

  const checkoutLocked =
    subscriptionStatus === 'active' && Boolean(stripeSubscriptionId?.trim());

  const resolvedTierId = resolveInitialTierId(currentTierId, currentTrack, currentClientLimit);

  const initialDraft: DraftSubscription = {
    track: currentTrack,
    tierId: resolvedTierId,
    period: 'monthly' as BillingPeriod,
    branding: false,
  };

  const currentSub: CurrentSubscription = {
    track: currentTrack,
    tierId: resolvedTierId,
    period: 'monthly' as BillingPeriod,
    customBrandingEnabled: !offerBrandingAddOn,
  };

  const [draft, dispatch] = useReducer(draftReducer, initialDraft);
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);

  const hasChanges = !draftEquals(draft, initialDraft);
  const isCrossTrack = draft.track !== currentTrack;

  const draftTiers = useMemo(
    () => getActivePaidTiersForTrack(draft.track).sort((a, b) => a.clientLimit - b.clientLimit),
    [draft.track],
  );

  const currentTierObj = useMemo(
    () => getPaidTierById(resolvedTierId) ?? getActivePaidTiersForTrack(currentTrack)[0],
    [resolvedTierId, currentTrack],
  );

  const draftTierObj = useMemo(
    () => draftTiers.find(t => t.id === draft.tierId) ?? draftTiers[0],
    [draftTiers, draft.tierId],
  );

  // Non-GB: show contact section
  if (region !== 'GB') {
    return (
      <div className="mx-auto max-w-5xl space-y-6 pb-20 px-1 sm:px-0">
        <Button type="button" variant="ghost" size="sm" onClick={onBack} className="gap-1.5 -ml-2">
          <ArrowLeft className="h-4 w-4" />
          {CHECKOUT_FLOW_COPY.changePlanBackToOverview}
        </Button>
        <section className="rounded-xl border border-border/70 bg-background p-6 sm:p-8 space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            {CHECKOUT_FLOW_COPY.billingSubscribeSectionLabel}
          </p>
          <h2 className="text-base font-semibold text-foreground">{CHECKOUT_FLOW_COPY.billingNonGbSectionTitle}</h2>
          <p className="text-sm text-foreground-secondary mt-1.5 max-w-xl leading-relaxed">
            {CHECKOUT_FLOW_COPY.billingNonGbSectionLead}
          </p>
          {checkoutLocked && (
            <p className="text-sm text-foreground-secondary border border-border/70 rounded-lg p-4 bg-muted/20">
              {CHECKOUT_FLOW_COPY.billingNonGbActiveSubHint}
            </p>
          )}
          <Button type="button" className="rounded-lg font-semibold" asChild>
            <Link to={ROUTES.CONTACT}>{CHECKOUT_FLOW_COPY.billingNonGbContactCta}</Link>
          </Button>
        </section>
      </div>
    );
  }

  if (!currentTierObj || !draftTierObj) return null;

  const savingsPct = annualSavingsPct(draftTierObj.monthlyPriceGbp, draftTierObj.annualPriceGbp);
  const brandingPrice = getCustomBrandingPrice(region);
  const brandingPriceFormatted = formatPrice(brandingPrice, 'GBP', 'en-GB');
  const currentMonthlyFormatted = formatPrice(
    monthlyAmount > 0 ? monthlyAmount : currentTierObj.monthlyPriceGbp,
    'GBP',
    'en-GB',
  );

  const aiScansUsed =
    monthlyAiCredits != null && assessmentCredits != null
      ? monthlyAiCredits - assessmentCredits
      : null;

  const handleConfirm = () => {
    if (isCrossTrack && draft.track === 'solo' && statsClientCount > draftTierObj.clientLimit) {
      setShowDowngradeDialog(true);
      return;
    }
    void performConfirm();
  };

  const performConfirm = async () => {
    // Branding selected → always go through checkout (updateSubscriptionPlan doesn't support add-ons)
    if (draft.branding && offerBrandingAddOn) {
      const { redirected, errorMessage } = await startCheckout(
        organizationId, region, draftTierObj.clientLimit, draft.period, draft.track, true,
      );
      if (!redirected && errorMessage) {
        toast({ variant: 'destructive', title: CHECKOUT_FLOW_COPY.checkoutCallableFailedToastTitle, description: errorMessage });
      }
      return;
    }

    if (checkoutLocked) {
      try {
        const data = await updateSubscriptionPlan(organizationId, region, draftTierObj.clientLimit, draft.period, draft.track);
        if (data.unchanged) {
          toast({ title: 'Already on this plan', description: 'Choose a different capacity or billing period to make a change.' });
        } else if (isCrossTrack) {
          toast({
            title: draft.track === 'gym' ? 'Switched to Gym plan' : 'Switched to Solo plan',
            description: 'Your plan type and capacity have been updated. Changes will apply within a minute.',
          });
        } else {
          toast({ title: 'Plan updated', description: 'Your plan was updated. Limits and credits will refresh shortly.' });
        }
        onSubscriptionUpdated();
        onBack();
      } catch (e: unknown) {
        const description = e && typeof e === 'object' && 'message' in e && typeof (e as { message: string }).message === 'string'
          ? (e as { message: string }).message
          : 'Please try again or contact support.';
        toast({ variant: 'destructive', title: 'Could not update plan', description });
      }
    } else {
      const { redirected, errorMessage } = await startCheckout(organizationId, region, draftTierObj.clientLimit, draft.period, draft.track);
      if (!redirected && errorMessage) {
        toast({ variant: 'destructive', title: CHECKOUT_FLOW_COPY.checkoutCallableFailedToastTitle, description: errorMessage });
      }
    }
  };

  const isLoading = checkoutLocked ? planUpdateLoading : loading;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-20 sm:pb-28 px-1 sm:px-0">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Button type="button" variant="ghost" size="sm" onClick={onBack} className="gap-1.5 -ml-2 mb-2">
            <ArrowLeft className="h-4 w-4" />
            {CHECKOUT_FLOW_COPY.changePlanBackToOverview}
          </Button>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground-secondary">
            {CHECKOUT_FLOW_COPY.changePlanBreadcrumb}
          </p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight mt-1">
            {CHECKOUT_FLOW_COPY.changePlanLead}
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {subscriptionStatus === 'past_due' && (
            <Button type="button" variant="destructive" size="sm" onClick={() => void onManagePayment()}>
              <AlertTriangle className="h-4 w-4 mr-1.5" /> Resolve payment
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => void onManagePayment()}>
            <Receipt className="h-4 w-4 mr-1.5" /> Invoices
          </Button>
        </div>
      </header>

      {/* Status banners */}
      {subscriptionStatus === 'past_due' && (
        <div className="flex items-start gap-3 rounded-lg border border-score-red-muted bg-score-red-light/50 dark:bg-score-red-muted/10 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-score-red-bold mt-0.5" aria-hidden />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{CHECKOUT_FLOW_COPY.pastDueBannerTitle}</p>
            <p className="text-xs text-foreground-secondary">{CHECKOUT_FLOW_COPY.pastDueBannerBody}</p>
          </div>
          <Button type="button" variant="destructive" size="sm" onClick={() => void onManagePayment()}>Update card</Button>
        </div>
      )}
      {subscriptionStatus === 'cancelled' && (
        <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <Info className="h-5 w-5 shrink-0 text-primary mt-0.5" aria-hidden />
          <p className="text-sm text-foreground">
            Your plan is cancelled. Make changes below and confirm to reactivate.
          </p>
        </div>
      )}

      {/* ── Two-column cockpit ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,1.4fr] gap-6 lg:gap-8">
        {/* ── LEFT: Current status ── */}
        <div className="space-y-4">
          {/* Current plan card */}
          <div className="rounded-xl border border-border/70 bg-background p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-secondary">Current</span>
              <PlanBadge status={subscriptionStatus} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {subscriptionPlanHeadline}
                <span className="text-foreground-secondary font-normal"> \u00b7 </span>
                <span className="text-foreground-secondary font-normal text-base">{currentClientLimit} clients</span>
              </h2>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-bold tabular-nums text-foreground">{currentMonthlyFormatted}</span>
                <span className="text-sm text-foreground-secondary">/ month</span>
              </div>
            </div>
          </div>

          {/* Usage card */}
          <div className="rounded-xl border border-border/70 bg-background p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-secondary">
                Usage
              </span>
            </div>
            <UsageBar label="Clients" value={statsClientCount} max={currentClientLimit} />
            {aiScansUsed != null && monthlyAiCredits != null && (
              <UsageBar label="AI scans" value={aiScansUsed} max={monthlyAiCredits} />
            )}
          </div>

          {/* Admin card */}
          {hasStripeCustomer && (
            <div className="rounded-xl border border-border/70 bg-muted/15 p-5 space-y-2">
              <h4 className="text-xs font-semibold text-foreground mb-3">Admin</h4>
              <button
                type="button"
                onClick={() => void onManagePayment()}
                className="w-full flex items-center gap-3 py-2 text-left text-sm hover:text-foreground transition-colors text-foreground-secondary"
              >
                <CreditCard className="h-4 w-4 shrink-0" /> Payment method
                <span className="ml-auto text-xs">Update</span>
              </button>
              <button
                type="button"
                onClick={() => void onManagePayment()}
                className="w-full flex items-center gap-3 py-2 text-left text-sm hover:text-foreground transition-colors text-foreground-secondary"
              >
                <Mail className="h-4 w-4 shrink-0" /> {userEmail ?? '\u2014'}
                <span className="ml-auto text-xs">Change</span>
              </button>
              {subscriptionStatus === 'active' && (
                <button
                  type="button"
                  onClick={onCancelSubscription}
                  className="w-full flex items-center gap-3 py-2 text-left text-sm text-score-red-bold hover:text-red-700 transition-colors"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" /> Cancel plan
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT: Levers + Summary ── */}
        <div className="space-y-4">
          {/* Levers card */}
          <div className="rounded-xl border border-border/70 bg-background p-5 sm:p-6 space-y-8">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-secondary">
                  Make a change
                </span>
                {hasChanges && (
                  <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Unsaved
                  </span>
                )}
              </div>
              <h3 className="text-sm text-foreground-secondary">
                {CHECKOUT_FLOW_COPY.changePlanLead}
              </h3>
            </div>

            <PackageTrackLever
              track={draft.track}
              currentTrack={currentTrack}
              disabled={isLoading}
              onChange={(t) => dispatch({ type: 'SET_TRACK', track: t })}
            />

            <CapacitySlider
              tiers={draftTiers}
              selectedTierId={draft.tierId}
              currentTierId={isCrossTrack ? undefined : resolvedTierId}
              billingPeriod={draft.period}
              disabled={isLoading}
              onChange={(id) => dispatch({ type: 'SET_TIER', tierId: id })}
            />

            <BillingPeriodLever
              period={draft.period}
              savingsPct={savingsPct}
              monthlyPrice={draftTierObj.monthlyPriceGbp}
              annualPrice={draftTierObj.annualPriceGbp}
              disabled={isLoading}
              onChange={(p) => dispatch({ type: 'SET_PERIOD', period: p })}
            />

            {offerBrandingAddOn && (
              <AddOnLever
                branding={draft.branding}
                brandingPriceFormatted={brandingPriceFormatted}
                disabled={isLoading}
                onChange={(v) => dispatch({ type: 'SET_BRANDING', branding: v })}
              />
            )}
          </div>

          {/* Summary panel */}
          <PlanChangeSummary
            current={currentSub}
            draft={draft}
            currentTier={currentTierObj}
            draftTier={draftTierObj}
            hasChanges={hasChanges}
            isCrossTrack={isCrossTrack}
            subscriptionStatus={subscriptionStatus}
            loading={isLoading}
            error={error}
            onConfirm={handleConfirm}
            onReset={() => dispatch({ type: 'RESET', initial: initialDraft })}
          />
        </div>
      </div>

      {/* Mobile fixed bottom CTA */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background p-4 lg:hidden">
          <div className="flex items-center justify-between gap-3 max-w-5xl mx-auto">
            <div className="min-w-0">
              <p className="text-xs text-foreground-secondary">{CHECKOUT_FLOW_COPY.summaryDueToday}</p>
              <p className="text-lg font-bold tabular-nums text-foreground">
                {formatPrice(
                  (draft.period === 'annual' ? draftTierObj.annualPriceGbp : draftTierObj.monthlyPriceGbp) +
                  (draft.branding && offerBrandingAddOn ? brandingPrice : 0),
                  'GBP', 'en-GB',
                )}
              </p>
            </div>
            <Button type="button" className="rounded-xl font-semibold h-11 px-6" onClick={handleConfirm} disabled={isLoading}>
              {checkoutLocked ? CHECKOUT_FLOW_COPY.billingSubscribeConfirmPlanChange : CHECKOUT_FLOW_COPY.billingSubscribeContinue}
            </Button>
          </div>
        </div>
      )}

      {/* Downgrade guard dialog */}
      <AlertDialog open={showDowngradeDialog} onOpenChange={setShowDowngradeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{CHECKOUT_FLOW_COPY.trackSwitchToSoloBlockTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {CHECKOUT_FLOW_COPY.trackSwitchToSoloBlockBody(statsClientCount, draftTierObj.clientLimit)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => setShowDowngradeDialog(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
