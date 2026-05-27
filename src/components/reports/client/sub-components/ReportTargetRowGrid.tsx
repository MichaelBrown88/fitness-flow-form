import React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Shared column template — label | current | → | target | delta */
const TARGET_ROW_GRID =
  'grid grid-cols-[minmax(0,1fr)_4.75rem_1rem_4.75rem_3rem] items-center gap-x-2 sm:grid-cols-[minmax(0,1fr)_5.5rem_1.25rem_5.5rem_3.25rem]';

export interface ReportTargetRowData {
  name: string;
  current: string;
  target: string;
  /** Shown under the number in the value cells (e.g. kg, bpm). Omit for text-only cells. */
  unit?: string;
  delta?: number;
  /** When true, lower delta is improvement (e.g. resting HR). */
  invertDelta?: boolean;
}

interface ReportTargetRowGridProps {
  rows: ReportTargetRowData[];
  className?: string;
}

/**
 * Uniform current → target rows with aligned numeric columns on both axes.
 */
export function ReportTargetRowGrid({ rows, className }: ReportTargetRowGridProps) {
  if (rows.length === 0) return null;

  return (
    <div className={cn('flex flex-col', className)}>
      {rows.map((row) => (
        <div
          key={row.name}
          className={cn(TARGET_ROW_GRID, 'border-b border-border/40 py-2.5 last:border-b-0')}
        >
          <span className="truncate pr-2 text-sm font-semibold tracking-[-0.005em] text-foreground">
            {row.name}
          </span>
          <ValueCell value={row.current} unit={row.unit} />
          <span className="text-center text-[13px] text-muted-foreground/70" aria-hidden>
            →
          </span>
          <ValueCell value={row.target} unit={row.unit} muted />
          <DeltaCell delta={row.delta} invert={row.invertDelta} />
        </div>
      ))}
    </div>
  );
}

function ValueCell({
  value,
  unit,
  muted = false,
}: {
  value: string;
  unit?: string;
  muted?: boolean;
}) {
  const hasUnit = Boolean(unit?.trim());
  return (
    <div className="flex min-h-[2.25rem] flex-col items-end justify-center text-right tabular-nums">
      <span
        className={cn(
          'text-[13px] font-bold leading-tight tracking-[-0.02em]',
          muted ? 'text-foreground-secondary' : 'text-foreground',
        )}
      >
        {value}
      </span>
      {hasUnit ? (
        <span className="mt-0.5 text-[10px] font-medium leading-none text-muted-foreground">
          {unit!.trim()}
        </span>
      ) : (
        <span className="mt-0.5 block h-[14px]" aria-hidden />
      )}
    </div>
  );
}

function DeltaCell({ delta, invert = false }: { delta?: number; invert?: boolean }) {
  if (delta == null || delta === 0) {
    return (
      <span className="flex h-[2.25rem] items-center justify-end text-[11px] text-muted-foreground">
        —
      </span>
    );
  }
  const improved = invert ? delta < 0 : delta > 0;
  const cls = improved
    ? 'bg-score-green-light text-score-green-fg'
    : 'bg-score-amber-light text-score-amber-fg';
  const Icon = improved ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        'inline-flex h-[2.25rem] w-full items-center justify-end gap-0.5 rounded-full px-1.5 text-[11px] font-bold tabular-nums',
        cls,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {delta > 0 ? '+' : ''}
      {formatDelta(Math.abs(delta))}
    </span>
  );
}

function formatDelta(n: number): string {
  if (Number.isNaN(n)) return '—';
  return n % 1 === 0 ? String(Math.round(n)) : n.toFixed(1);
}
