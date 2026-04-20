import { CHECKOUT_FLOW_COPY } from '@/constants/checkoutFlowCopy';
import type { CapacityTier, PaidCapacityTierId, BillingPeriod } from '@/constants/pricing';
import { formatPrice } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';

interface CapacitySliderProps {
  tiers: CapacityTier[];
  selectedTierId: PaidCapacityTierId;
  currentTierId?: PaidCapacityTierId;
  billingPeriod: BillingPeriod;
  disabled?: boolean;
  onChange: (tierId: PaidCapacityTierId) => void;
}

export function CapacitySlider({
  tiers,
  selectedTierId,
  currentTierId,
  billingPeriod,
  disabled,
  onChange,
}: CapacitySliderProps) {
  if (tiers.length === 0) return null;

  const sorted = [...tiers].sort((a, b) => a.clientLimit - b.clientLimit);
  const selectedIdx = Math.max(0, sorted.findIndex(t => t.id === selectedTierId));
  const currentIdx = currentTierId ? sorted.findIndex(t => t.id === currentTierId) : -1;
  const max = sorted.length - 1;
  const selectedTier = sorted[selectedIdx];

  const price = billingPeriod === 'monthly'
    ? selectedTier.monthlyPriceGbp
    : Math.round(selectedTier.annualPriceGbp / 12);
  const priceFormatted = formatPrice(price, 'GBP', 'en-GB');

  const aiLabel = selectedTier.monthlyAiCredits === -1
    ? 'Unlimited AI scans'
    : `${selectedTier.monthlyAiCredits} AI scans included`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-secondary">
          {CHECKOUT_FLOW_COPY.leverCapacityLabel}
        </span>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {selectedTier.clientLimit} <span className="text-xs font-normal text-foreground-secondary">clients</span>
        </span>
      </div>

      {/* Range slider */}
      <div className="relative pt-1 pb-8">
        <input
          type="range"
          min={0}
          max={max}
          value={selectedIdx}
          disabled={disabled}
          onChange={(e) => {
            const idx = Number(e.target.value);
            if (sorted[idx]) onChange(sorted[idx].id);
          }}
          className={cn(
            'w-full h-2 rounded-full appearance-none cursor-pointer bg-muted',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5',
            '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary',
            '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white',
            '[&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer',
            '[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150',
            '[&::-webkit-slider-thumb]:hover:scale-110',
            '[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5',
            '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary',
            '[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white',
            '[&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer',
          )}
          style={{
            background: max > 0
              ? `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${(selectedIdx / max) * 100}%, hsl(var(--muted)) ${(selectedIdx / max) * 100}%, hsl(var(--muted)) 100%)`
              : undefined,
          }}
        />

        {/* Tick marks */}
        <div className="absolute left-0 right-0 bottom-0 h-6">
          {sorted.map((tier, i) => {
            const pct = max === 0 ? 50 : (i / max) * 100;
            const isSelected = i === selectedIdx;
            const isCurrent = i === currentIdx;
            return (
              <button
                key={tier.id}
                type="button"
                disabled={disabled}
                onClick={() => onChange(tier.id)}
                className={cn(
                  'absolute -translate-x-1/2 flex flex-col items-center gap-0.5',
                  'text-[10px] tabular-nums transition-colors duration-150',
                  'disabled:cursor-not-allowed',
                  isSelected ? 'text-primary font-bold' : 'text-foreground-secondary hover:text-foreground',
                )}
                style={{ left: `${pct}%` }}
                title={`${tier.clientLimit} clients \u00b7 ${formatPrice(tier.monthlyPriceGbp, 'GBP', 'en-GB')}/mo`}
              >
                <span>{tier.clientLimit}</span>
                {isCurrent && (
                  <span className="text-[8px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 rounded-full">
                    Now
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price readout */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold tabular-nums text-foreground">{priceFormatted}</span>
        <span className="text-sm text-foreground-secondary">
          /mo {billingPeriod === 'annual' ? 'billed yearly' : ''} \u00b7 {aiLabel}
        </span>
      </div>
    </div>
  );
}
