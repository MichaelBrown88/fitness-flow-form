import { Loader2, RefreshCw, TrendingUp, TrendingDown, Sparkles, Palette, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CHECKOUT_FLOW_COPY } from '@/constants/checkoutFlowCopy';
import { annualSavingsVsMonthly } from '@/constants/pricing';
import type { CapacityTier, BillingPeriod } from '@/constants/pricing';
import type { DraftSubscription, CurrentSubscription } from '@/types/billingLevers';
import { formatPrice } from '@/lib/utils/currency';
import { getCustomBrandingPrice } from '@/lib/pricing/config';
import { cn } from '@/lib/utils';

interface PlanChangeSummaryProps {
  current: CurrentSubscription;
  draft: DraftSubscription;
  currentTier: CapacityTier;
  draftTier: CapacityTier;
  hasChanges: boolean;
  isCrossTrack: boolean;
  subscriptionStatus: string;
  loading: boolean;
  error: string | null;
  onConfirm: () => void;
  onReset: () => void;
}

type DiffBullet = {
  key: string;
  icon: typeof RefreshCw;
  text: string;
  green: boolean;
};

function buildDiffBullets(
  current: CurrentSubscription,
  draft: DraftSubscription,
  currentTier: CapacityTier,
  draftTier: CapacityTier,
): DiffBullet[] {
  const bullets: DiffBullet[] = [];

  // Track switch
  if (draft.track !== current.track) {
    const from = current.track === 'solo' ? 'Solo' : 'Gym';
    const to = draft.track === 'solo' ? 'Solo' : 'Gym / studio';
    bullets.push({
      key: 'track',
      icon: RefreshCw,
      text: CHECKOUT_FLOW_COPY.summaryTrackSwitchBullet(from, to),
      green: true,
    });
  }

  // Capacity change
  if (draftTier.clientLimit !== currentTier.clientLimit) {
    const up = draftTier.clientLimit > currentTier.clientLimit;
    bullets.push({
      key: 'capacity',
      icon: up ? TrendingUp : TrendingDown,
      text: up
        ? CHECKOUT_FLOW_COPY.summaryCapacityUpBullet(currentTier.clientLimit, draftTier.clientLimit)
        : CHECKOUT_FLOW_COPY.summaryCapacityDownBullet(currentTier.clientLimit, draftTier.clientLimit),
      green: up,
    });
  }

  // Period change
  if (draft.period !== current.period && draft.period === 'annual') {
    const savings = annualSavingsVsMonthly(draftTier);
    if (savings > 0) {
      bullets.push({
        key: 'period',
        icon: Sparkles,
        text: CHECKOUT_FLOW_COPY.summarySwitchAnnualBullet(formatPrice(savings, 'GBP', 'en-GB')),
        green: true,
      });
    }
  }

  // Branding add-on
  if (draft.branding && !current.customBrandingEnabled) {
    const price = getCustomBrandingPrice('GB');
    bullets.push({
      key: 'branding',
      icon: Palette,
      text: CHECKOUT_FLOW_COPY.summaryBrandingBullet(formatPrice(price, 'GBP', 'en-GB')),
      green: false,
    });
  }

  return bullets;
}

function computeTotals(
  draft: DraftSubscription,
  draftTier: CapacityTier,
  current: CurrentSubscription,
) {
  const recurringAmount = draft.period === 'annual'
    ? draftTier.annualPriceGbp
    : draftTier.monthlyPriceGbp;
  const oneTimeAmount = draft.branding && !current.customBrandingEnabled
    ? getCustomBrandingPrice('GB')
    : 0;
  const cadenceLabel = draft.period === 'annual'
    ? CHECKOUT_FLOW_COPY.summaryThenAnnually
    : CHECKOUT_FLOW_COPY.summaryThenMonthly;

  return { recurringAmount, oneTimeAmount, cadenceLabel };
}

export function PlanChangeSummary({
  current,
  draft,
  currentTier,
  draftTier,
  hasChanges,
  isCrossTrack,
  subscriptionStatus,
  loading,
  error,
  onConfirm,
  onReset,
}: PlanChangeSummaryProps) {
  const checkoutLocked = subscriptionStatus === 'active';
  const bullets = hasChanges ? buildDiffBullets(current, draft, currentTier, draftTier) : [];
  const { recurringAmount, oneTimeAmount, cadenceLabel } = computeTotals(draft, draftTier, current);

  const ctaLabel = checkoutLocked
    ? CHECKOUT_FLOW_COPY.billingSubscribeConfirmPlanChange
    : subscriptionStatus === 'cancelled'
      ? CHECKOUT_FLOW_COPY.overviewResubscribeCta
      : CHECKOUT_FLOW_COPY.billingSubscribeContinue;

  return (
    <Card className={cn(
      'h-fit rounded-xl border bg-background shadow-none transition-all duration-300',
      'lg:sticky lg:top-20',
      hasChanges
        ? 'border-primary/30 ring-1 ring-primary/10'
        : 'border-border/70',
    )}>
      <CardHeader className="pb-3 pt-4 px-4 sm:px-5 space-y-0">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-secondary">
            {hasChanges ? CHECKOUT_FLOW_COPY.summaryWhatWillChange : CHECKOUT_FLOW_COPY.summaryNoChangesYet}
          </span>
          {hasChanges && (
            <button
              type="button"
              onClick={onReset}
              className="text-xs text-foreground-secondary hover:text-foreground underline underline-offset-2 transition-colors"
            >
              {CHECKOUT_FLOW_COPY.summaryResetLink}
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0 space-y-4">
        {hasChanges ? (
          <>
            {/* Diff bullets */}
            <div className="space-y-2.5">
              {bullets.map((bullet) => {
                const Icon = bullet.icon;
                return (
                  <div
                    key={bullet.key}
                    className="flex items-start gap-2.5 animate-in fade-in slide-in-from-bottom-1 duration-200"
                  >
                    <div className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-md mt-0.5',
                      bullet.green
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : 'bg-muted text-foreground-secondary',
                    )}>
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-foreground leading-snug">{bullet.text}</p>
                      {bullet.key === 'track' && isCrossTrack && (
                        <p className="text-xs text-foreground-secondary mt-0.5">
                          {CHECKOUT_FLOW_COPY.summaryTrackSwitchNote}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="border-t border-border/60 pt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-secondary">
                    {CHECKOUT_FLOW_COPY.summaryDueToday}
                  </span>
                  <p className="text-lg font-bold tabular-nums text-foreground mt-0.5">
                    {formatPrice(recurringAmount + oneTimeAmount, 'GBP', 'en-GB')}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-secondary">
                    {cadenceLabel}
                  </span>
                  <p className="text-lg font-bold tabular-nums text-foreground mt-0.5">
                    {formatPrice(recurringAmount, 'GBP', 'en-GB')}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-foreground-secondary">
                {checkoutLocked
                  ? CHECKOUT_FLOW_COPY.checkoutSummaryDueAtCheckoutSubIllustrative
                  : CHECKOUT_FLOW_COPY.checkoutSummaryStripeAmountsNote}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
              >
                <p className="font-medium text-foreground">{error}</p>
                <p className="mt-1 text-xs text-foreground-secondary leading-snug">
                  {CHECKOUT_FLOW_COPY.checkoutErrorAlertHint}
                </p>
              </div>
            )}

            {/* CTA */}
            <Button
              type="button"
              className="w-full rounded-xl font-semibold h-11 text-sm"
              onClick={onConfirm}
              disabled={loading || !hasChanges}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" aria-hidden />
                  {CHECKOUT_FLOW_COPY.billingSubscribeOpening}
                </>
              ) : (
                ctaLabel
              )}
            </Button>

            <p className="text-[10px] text-center text-foreground-secondary">
              {CHECKOUT_FLOW_COPY.summaryStripeTrustLine}
            </p>
          </>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <SlidersHorizontal className="h-5 w-5 text-foreground-secondary" aria-hidden />
            </div>
            <p className="text-sm text-foreground-secondary max-w-[200px] leading-relaxed">
              {CHECKOUT_FLOW_COPY.summaryEmptyHint}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
