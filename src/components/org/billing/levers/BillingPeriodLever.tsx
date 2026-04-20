import { CHECKOUT_FLOW_COPY } from '@/constants/checkoutFlowCopy';
import { formatPrice } from '@/lib/utils/currency';
import type { BillingPeriod } from '@/constants/pricing';
import { cn } from '@/lib/utils';

interface BillingPeriodLeverProps {
  period: BillingPeriod;
  savingsPct: number;
  monthlyPrice: number;
  annualPrice: number;
  disabled?: boolean;
  onChange: (period: BillingPeriod) => void;
}

export function BillingPeriodLever({
  period,
  savingsPct,
  monthlyPrice,
  annualPrice,
  disabled,
  onChange,
}: BillingPeriodLeverProps) {
  const monthlyFormatted = formatPrice(monthlyPrice, 'GBP', 'en-GB');
  const annualMonthlyEquiv = formatPrice(Math.round(annualPrice / 12), 'GBP', 'en-GB');

  const options: { value: BillingPeriod; title: string; sub: string; badge?: string }[] = [
    {
      value: 'monthly',
      title: CHECKOUT_FLOW_COPY.billingSubscribePeriodMonthly,
      sub: `${monthlyFormatted}/mo`,
    },
    {
      value: 'annual',
      title: CHECKOUT_FLOW_COPY.billingSubscribePeriodAnnual,
      sub: `${annualMonthlyEquiv}/mo billed yearly`,
      badge: savingsPct > 0 ? `Save ${savingsPct}%` : undefined,
    },
  ];

  return (
    <div className="space-y-3">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-secondary">
        {CHECKOUT_FLOW_COPY.leverPeriodLabel}
      </span>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Billing period">
        {options.map(({ value, title, sub, badge }) => {
          const selected = period === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(value)}
              className={cn(
                'relative flex flex-col items-start rounded-xl border p-4 text-left transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                selected
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20 dark:bg-primary/10'
                  : 'border-border bg-background hover:border-primary/40 hover:bg-muted/30',
              )}
            >
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                {badge && (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50 px-1.5 py-0.5 rounded-full">
                    {badge}
                  </span>
                )}
              </div>
              <p className="text-xs tabular-nums text-foreground-secondary mt-1">{sub}</p>
              {selected && (
                <span
                  className="absolute right-3 top-3 h-4 w-4 rounded-full bg-primary flex items-center justify-center"
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
