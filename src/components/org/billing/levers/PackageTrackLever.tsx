import { User, Users, Info } from 'lucide-react';
import { CHECKOUT_FLOW_COPY } from '@/constants/checkoutFlowCopy';
import { getActivePaidTiersForTrack } from '@/constants/pricing';
import { formatPrice } from '@/lib/utils/currency';
import type { PackageTrack } from '@/constants/pricing';
import { cn } from '@/lib/utils';

interface PackageTrackLeverProps {
  track: PackageTrack;
  currentTrack: PackageTrack;
  disabled?: boolean;
  onChange: (track: PackageTrack) => void;
}

export function PackageTrackLever({ track, currentTrack, disabled, onChange }: PackageTrackLeverProps) {
  const isCrossTrack = track !== currentTrack;

  const soloTiers = getActivePaidTiersForTrack('solo');
  const gymTiers = getActivePaidTiersForTrack('gym');
  const soloMinPrice = soloTiers.length > 0
    ? formatPrice(Math.min(...soloTiers.map(t => t.monthlyPriceGbp)), 'GBP', 'en-GB')
    : '£39';
  const gymMinPrice = gymTiers.length > 0
    ? formatPrice(Math.min(...gymTiers.map(t => t.monthlyPriceGbp)), 'GBP', 'en-GB')
    : '£129';

  const options: { value: PackageTrack; icon: typeof User; title: string; sub: string }[] = [
    {
      value: 'solo',
      icon: User,
      title: CHECKOUT_FLOW_COPY.leverSoloTitle,
      sub: CHECKOUT_FLOW_COPY.leverSoloSub(soloMinPrice),
    },
    {
      value: 'gym',
      icon: Users,
      title: CHECKOUT_FLOW_COPY.leverGymTitle,
      sub: CHECKOUT_FLOW_COPY.leverGymSub(gymMinPrice),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-secondary">
          {CHECKOUT_FLOW_COPY.leverPackageLabel}
        </span>
        {isCrossTrack && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Switching
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Package track">
        {options.map(({ value, icon: Icon, title, sub }) => {
          const selected = track === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(value)}
              className={cn(
                'relative flex items-start gap-3 rounded-xl border p-4 text-left transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                selected
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20 dark:bg-primary/10'
                  : 'border-border bg-background hover:border-primary/40 hover:bg-muted/30',
              )}
            >
              <div className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                selected ? 'bg-primary/10 text-primary' : 'bg-muted text-foreground-secondary',
              )}>
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-foreground-secondary">{sub}</p>
              </div>
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

      {/* Migration note on cross-track switch */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-out',
          isCrossTrack ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" aria-hidden />
          <p className="text-xs text-foreground leading-relaxed">
            {track === 'gym'
              ? CHECKOUT_FLOW_COPY.trackSwitchToGymNote
              : CHECKOUT_FLOW_COPY.trackSwitchToSoloNote}
          </p>
        </div>
      </div>
    </div>
  );
}
