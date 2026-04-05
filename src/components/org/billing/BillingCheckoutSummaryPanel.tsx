import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { CHECKOUT_FLOW_COPY } from '@/constants/checkoutFlowCopy';
import type { BillingPeriod, CapacityTier } from '@/constants/pricing';
import { formatPrice } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';

export type AnnualComparisonSummary = {
  twelveMonthAtMonthly: number;
  annualOnePayment: number;
  savingVsMonthly: number;
  showSaving: boolean;
};

export interface BillingCheckoutSummaryPanelProps {
  selectedTier: CapacityTier | null;
  billingPeriod: BillingPeriod;
  annualComparison: AnnualComparisonSummary | null;
  loading: boolean;
  checkoutLocked: boolean;
  confirmLoading?: boolean;
  error: string | null;
  onContinue: () => void;
  offerBrandingAddOn?: boolean;
  includeBrandingAddOn: boolean;
  onIncludeBrandingChange: (value: boolean) => void;
  brandingPriceGbp: number;
}

function cadenceSuffix(period: BillingPeriod): string {
  return period === 'monthly' ? '/month' : '/year';
}

export function BillingCheckoutSummaryPanel({
  selectedTier,
  billingPeriod,
  annualComparison,
  loading,
  checkoutLocked,
  confirmLoading = false,
  error,
  onContinue,
  offerBrandingAddOn = false,
  includeBrandingAddOn,
  onIncludeBrandingChange,
  brandingPriceGbp,
}: BillingCheckoutSummaryPanelProps) {
  const subAmount =
    selectedTier && billingPeriod === 'monthly'
      ? selectedTier.monthlyPriceGbp
      : selectedTier
        ? selectedTier.annualPriceGbp
        : 0;
  const oneTimeTotal = includeBrandingAddOn ? brandingPriceGbp : 0;
  const estimatedDueAtCheckout = subAmount + oneTimeTotal;
  const brandingSelectable = offerBrandingAddOn && !checkoutLocked;
  const brandingLockedNote = offerBrandingAddOn && checkoutLocked;
  const brandingPriceFormatted = formatPrice(brandingPriceGbp, 'GBP', 'en-GB');
  const primaryDisabled = !selectedTier || (checkoutLocked ? confirmLoading : loading);
  const showAnnualCompare = Boolean(annualComparison && billingPeriod === 'annual');

  return (
    <Card className="h-fit rounded-lg border border-border/70 bg-background shadow-none lg:sticky lg:top-20">
      <CardHeader className="space-y-0.5 pb-3 pt-4 px-4 sm:px-5">
        <CardTitle className="text-base font-semibold text-foreground tracking-tight">
          {CHECKOUT_FLOW_COPY.checkoutPlanSummaryTitle}
        </CardTitle>
        <p className="text-[11px] text-muted-foreground font-normal leading-snug">
          {checkoutLocked
            ? CHECKOUT_FLOW_COPY.checkoutSummaryPanelSubLocked
            : CHECKOUT_FLOW_COPY.checkoutSummaryPanelSub}
        </p>
      </CardHeader>
      <CardContent className="space-y-3 px-4 sm:px-5 pb-4 sm:pb-5 pt-0">
        {selectedTier ? (
          <>
            {brandingSelectable ? (
              <label
                htmlFor="checkout-branding-addon"
                className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5 cursor-pointer"
              >
                <Checkbox
                  id="checkout-branding-addon"
                  checked={includeBrandingAddOn}
                  onCheckedChange={(v) => onIncludeBrandingChange(v === true)}
                  disabled={loading || confirmLoading}
                  className="mt-0.5"
                />
                <span className="min-w-0 text-sm leading-snug">
                  <span className="font-medium text-foreground">
                    {CHECKOUT_FLOW_COPY.checkoutSummaryIncludeBrandingLabel}
                  </span>{' '}
                  <span className="tabular-nums text-muted-foreground">({brandingPriceFormatted})</span>
                  <span className="block text-[11px] text-muted-foreground mt-0.5">
                    {CHECKOUT_FLOW_COPY.checkoutSummaryIncludeBrandingHint}
                  </span>
                </span>
              </label>
            ) : null}

            {brandingLockedNote ? (
              <div
                className="rounded-lg border border-dashed border-border bg-muted/15 px-3 py-2 text-xs text-muted-foreground leading-relaxed"
                role="status"
              >
                <span className="font-medium text-foreground">
                  {CHECKOUT_FLOW_COPY.checkoutSummaryIncludeBrandingLockedTitle}
                </span>{' '}
                {CHECKOUT_FLOW_COPY.checkoutSummaryIncludeBrandingLockedBody.replace(
                  '{price}',
                  brandingPriceFormatted,
                )}
              </div>
            ) : null}

            <ul className="space-y-2 text-sm border-b border-border/60 pb-3" aria-label="Selected plan lines">
              <li className="flex justify-between gap-3 items-baseline">
                <span className="font-medium text-foreground truncate min-w-0">{selectedTier.label}</span>
                <span className="shrink-0 font-semibold tabular-nums text-foreground">
                  {formatPrice(
                    billingPeriod === 'monthly' ? selectedTier.monthlyPriceGbp : selectedTier.annualPriceGbp,
                    'GBP',
                    'en-GB',
                  )}
                  <span className="text-muted-foreground font-medium text-xs">
                    {' '}
                    {cadenceSuffix(billingPeriod)}
                  </span>
                </span>
              </li>
              {includeBrandingAddOn ? (
                <li className="flex justify-between gap-3 items-baseline text-sm">
                  <span className="text-foreground">{CHECKOUT_FLOW_COPY.checkoutSummaryBrandingAddonLabel}</span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {formatPrice(brandingPriceGbp, 'GBP', 'en-GB')}
                    <span className="text-muted-foreground font-medium text-xs"> once</span>
                  </span>
                </li>
              ) : null}
            </ul>

            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {checkoutLocked
                  ? CHECKOUT_FLOW_COPY.checkoutSummaryDueAtCheckoutHeadingIllustrative
                  : CHECKOUT_FLOW_COPY.checkoutSummaryDueAtCheckoutHeading}
              </p>
              <p className="text-xl font-bold text-foreground tabular-nums tracking-tight">
                {formatPrice(estimatedDueAtCheckout, 'GBP', 'en-GB')}
              </p>
              <p className="text-[11px] text-muted-foreground leading-snug">
                {checkoutLocked
                  ? CHECKOUT_FLOW_COPY.checkoutSummaryDueAtCheckoutSubIllustrative
                  : CHECKOUT_FLOW_COPY.checkoutSummaryDueAtCheckoutSub}
              </p>
            </div>

            <p className="text-[11px] text-muted-foreground">{CHECKOUT_FLOW_COPY.checkoutSummaryStripeAmountsNote}</p>

            {showAnnualCompare && annualComparison ? (
              <div className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2 space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {CHECKOUT_FLOW_COPY.checkoutSummaryCompareHeading}
                </p>
                <div className="space-y-1 text-[11px] tabular-nums">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{CHECKOUT_FLOW_COPY.checkoutSummaryTwelveMonthlyTotal}</span>
                    <span className="font-medium text-foreground">
                      {formatPrice(annualComparison.twelveMonthAtMonthly, 'GBP', 'en-GB')}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{CHECKOUT_FLOW_COPY.checkoutSummaryAnnualOnePayment}</span>
                    <span className="font-medium text-foreground">
                      {formatPrice(annualComparison.annualOnePayment, 'GBP', 'en-GB')}
                    </span>
                  </div>
                  {annualComparison.showSaving ? (
                    <div className="flex justify-between gap-2 pt-1 border-t border-border/60 text-score-green-bold font-semibold">
                      <span>{CHECKOUT_FLOW_COPY.checkoutSummaryEstimatedSaving}</span>
                      <span>{formatPrice(annualComparison.savingVsMonthly, 'GBP', 'en-GB')}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <p className="text-[11px] text-muted-foreground">
              {checkoutLocked
                ? CHECKOUT_FLOW_COPY.checkoutSummaryNextStepLocked
                : CHECKOUT_FLOW_COPY.checkoutSummaryNextStep}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{CHECKOUT_FLOW_COPY.checkoutSummaryNoTier}</p>
        )}
        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          >
            <p className="font-medium text-foreground">{error}</p>
            <p className="mt-1 text-xs text-muted-foreground leading-snug">
              {CHECKOUT_FLOW_COPY.checkoutErrorAlertHint}
            </p>
          </div>
        ) : null}
        <Button
          type="button"
          className={cn('w-full rounded-xl font-semibold h-10 text-sm')}
          onClick={onContinue}
          disabled={primaryDisabled}
        >
          {checkoutLocked ? (
            confirmLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" aria-hidden />
                {CHECKOUT_FLOW_COPY.billingSubscribeOpening}
              </>
            ) : (
              CHECKOUT_FLOW_COPY.billingSubscribeConfirmPlanChange
            )
          ) : loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" aria-hidden />
              {CHECKOUT_FLOW_COPY.billingSubscribeOpening}
            </>
          ) : (
            CHECKOUT_FLOW_COPY.billingSubscribeContinue
          )}
        </Button>
        <p className="text-[10px] text-center text-muted-foreground">
          {CHECKOUT_FLOW_COPY.checkoutAllPricesGbpNote} · {CHECKOUT_FLOW_COPY.checkoutPoweredByStripeNote}
        </p>
      </CardContent>
    </Card>
  );
}
