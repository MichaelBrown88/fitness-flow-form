import React from 'react';
import { cn } from '@/lib/utils';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';

export interface ReportPriorityItem {
  text: string;
}

interface ReportPriorityChipsProps {
  strengths: ReportPriorityItem[];
  focusAreas: ReportPriorityItem[];
  className?: string;
  /** Side-by-side groups (hero strip). Default stacks vertically. */
  layout?: 'stack' | 'split';
}

/**
 * Hero priority strip — up to 2 wins and 1 focus from cross-pillar rollup.
 */
export function ReportPriorityChips({
  strengths,
  focusAreas,
  className,
  layout = 'stack',
}: ReportPriorityChipsProps) {
  const wins = strengths.slice(0, 2);
  const focus = focusAreas.slice(0, 1);

  if (wins.length === 0 && focus.length === 0) return null;

  return (
    <div
      className={cn(
        layout === 'split' ? 'grid gap-3 sm:grid-cols-2' : 'flex flex-col gap-3',
        className,
      )}
    >
      {wins.length > 0 ? (
        <PriorityGroup label={CLIENT_REPORT_COPY.goingWell} items={wins} variant="strength" />
      ) : null}
      {focus.length > 0 ? (
        <PriorityGroup label={CLIENT_REPORT_COPY.focusNext} items={focus} variant="focus" />
      ) : null}
    </div>
  );
}

function PriorityGroup({
  label,
  items,
  variant,
}: {
  label: string;
  items: ReportPriorityItem[];
  variant: 'strength' | 'focus';
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <ul className="mt-1.5 flex flex-wrap gap-2">
        {items.map((item, i) => (
          <li
            key={`${variant}-${i}`}
            className={cn(
              'rounded-full px-3 py-1 text-[12px] font-medium leading-snug',
              variant === 'strength'
                ? 'bg-score-green-light text-score-green-fg'
                : 'bg-score-amber-light text-score-amber-fg',
            )}
          >
            {item.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
