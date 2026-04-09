/**
 * Visual tier selection grid — replaces the dropdown + slider.
 * Used in BillingStripeSubscribeCard and Subscribe paywall.
 */

import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { BillingPeriod, CapacityTier } from '@/constants/pricing';
import { annualSavingsVsMonthly } from '@/constants/pricing';
import { formatPrice } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';

interface CapacityTierGridProps {
  tiers: CapacityTier[];
  selectedClientLimit: number;
  billingPeriod: BillingPeriod;
  /** Client limit of the org's current active subscription, to show "Current plan" badge. */
  currentClientLimit?: number;
  disabled?: boolean;
  onSelect: (clientLimit: number) => void;
}

function annualSavingsPct(tier: CapacityTier): number {
  const full = tier.monthlyPriceGbp * 12;
  if (full <= 0) return 0;
  const saving = annualSavingsVsMonthly(tier);
  return Math.max(0, Math.round((saving / full) * 100));
}

export function CapacityTierGrid({
  tiers,
  selectedClientLimit,
  billingPeriod,
  currentClientLimit,
  disabled = false,
  onSelect,
}: CapacityTierGridProps) {
  if (tiers.length === 0) return null;

  const savingsPct = tiers[0] ? annualSavingsPct(tiers[0]) : 0;

  return (
    <div className="space-y-3">
      {/* Annual savings nudge — always visible when on monthly */}
      {billingPeriod === 'monthly' && savingsPct > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" aria-hidden />
          Switch to annual and save ~{savingsPct}% per year.
        </p>
      )}
      {billingPeriod === 'annual' && savingsPct > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Annual billing saves you ~{savingsPct}% compared to monthly.
        </p>
      )}

      <div
        className="grid grid-cols-2 sm:grid-cols-3 gap-2"
        role="radiogroup"
        aria-label="Client capacity"
      >
        {tiers.map((tier) => {
          const isSelected = tier.clientLimit === selectedClientLimit;
          const isCurrent = tier.clientLimit === currentClientLimit;
          const price =
            billingPeriod === 'monthly' ? tier.monthlyPriceGbp : tier.annualPriceGbp / 12;
          const priceFormatted = formatPrice(Math.round(price), 'GBP', 'en-GB');
          const aiLabel =
            tier.monthlyAiCredits === -1
              ? 'Unlimited AI'
              : `${tier.monthlyAiCredits} AI/mo`;

          return (
            <button
              key={tier.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onSelect(tier.clientLimit)}
              className={cn(
                'relative flex flex-col items-start rounded-xl border p-3 sm:p-4 text-left transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                isSelected
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20 dark:bg-primary/10'
                  : 'border-border bg-background hover:border-primary/40 hover:bg-muted/30',
              )}
            >
              {isCurrent && (
                <span className="mb-1.5 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                  Current
                </span>
              )}
              <span className="text-xl sm:text-2xl font-bold tabular-nums text-foreground leading-none">
                {tier.clientLimit}
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5 mb-3">
                clients
              </span>
              <span className="text-sm sm:text-base font-bold tabular-nums text-foreground">
                {priceFormatted}
                <span className="text-xs font-medium text-muted-foreground">/mo</span>
              </span>
              {billingPeriod === 'annual' && (
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  billed {formatPrice(tier.annualPriceGbp, 'GBP', 'en-GB')}/yr
                </span>
              )}
              <span className="mt-2 text-[11px] text-muted-foreground">{aiLabel}</span>

              {isSelected && (
                <span
                  className="absolute right-2 top-2 h-4 w-4 rounded-full bg-primary flex items-center justify-center"
                  aria-hidden
                >
                  <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 fill-none stroke-white stroke-2">
                    <polyline points="1,4 3.5,6.5 9,1" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>

    </div>
  );
}

/** Standalone badge used in the billing period toggle */
export function AnnualSavingsBadge({ pct }: { pct: number }) {
  if (pct <= 0) return null;
  return (
    <Badge variant="secondary" className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50">
      Save ~{pct}%
    </Badge>
  );
}
