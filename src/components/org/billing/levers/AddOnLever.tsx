import { Palette, Check } from 'lucide-react';
import { CHECKOUT_FLOW_COPY } from '@/constants/checkoutFlowCopy';
import { cn } from '@/lib/utils';

interface AddOnLeverProps {
  branding: boolean;
  brandingPriceFormatted: string;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

export function AddOnLever({ branding, brandingPriceFormatted, disabled, onChange }: AddOnLeverProps) {
  return (
    <div className="space-y-3">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-secondary">
        {CHECKOUT_FLOW_COPY.leverAddOnsLabel}
      </span>

      <label
        className={cn(
          'flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-all duration-150',
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
          branding
            ? 'border-primary bg-primary/5 ring-2 ring-primary/20 dark:bg-primary/10'
            : 'border-border bg-background hover:border-primary/40 hover:bg-muted/30',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <input
          type="checkbox"
          checked={branding}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors mt-0.5',
          branding
            ? 'bg-primary border-primary text-primary-foreground'
            : 'border-border bg-background',
        )}>
          {branding && <Check className="h-3 w-3" aria-hidden />}
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-foreground-secondary shrink-0" aria-hidden />
            <span className="text-sm font-semibold text-foreground">
              {CHECKOUT_FLOW_COPY.brandingAddOnTitle}
            </span>
          </div>
          <p className="text-xs text-foreground-secondary leading-snug">
            {CHECKOUT_FLOW_COPY.brandingAddOnDesc} {'\u00b7'} one-time
          </p>
        </div>
        <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">
          {brandingPriceFormatted}
        </span>
      </label>
    </div>
  );
}
