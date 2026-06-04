import React from 'react';
import type { ClientReportProgressionRow } from '@/lib/reports/clientProgressionRows';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { cn } from '@/lib/utils';

const PROGRESSION_GRID =
  'grid grid-cols-[minmax(0,1.15fr)_4.5rem_4.5rem_4.5rem] items-center gap-x-3 sm:grid-cols-[minmax(0,1.25fr)_5.25rem_5.25rem_5.25rem] sm:gap-x-4';

interface ClientProgressionTableProps {
  rows: ClientReportProgressionRow[];
  className?: string;
}

export function ClientProgressionTable({ rows, className }: ClientProgressionTableProps) {
  if (rows.length === 0) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">{CLIENT_REPORT_COPY.targetsUnavailable}</p>
    );
  }

  return (
    <div className={cn('mt-4 overflow-hidden border border-border', className)}>
      <div
        className={cn(
          PROGRESSION_GRID,
          'bg-muted/50 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground sm:px-4',
        )}
      >
        <span>{CLIENT_REPORT_COPY.progressionMetricCol}</span>
        <span className="text-right">{CLIENT_REPORT_COPY.progressionNowCol}</span>
        <span className="text-right">{CLIENT_REPORT_COPY.progressionFourMonthCol}</span>
        <span className="text-right">{CLIENT_REPORT_COPY.progressionOneYearCol}</span>
      </div>
      {rows.map((row, index) => (
        <div
          key={row.name}
          className={cn(
            PROGRESSION_GRID,
            'border-t border-border px-3 py-3 sm:px-4',
            index % 2 === 1 && 'bg-muted/15',
          )}
        >
          <span className="truncate pr-2 text-sm font-medium text-foreground">{row.name}</span>
          <ProgressionCell value={row.current} unit={row.unit} />
          <ProgressionCell value={row.fourMonths} unit={row.unit} emphasis />
          <ProgressionCell value={row.oneYear} unit={row.unit} emphasis />
        </div>
      ))}
    </div>
  );
}

function ProgressionCell({
  value,
  unit,
  emphasis = false,
}: {
  value: string;
  unit?: string;
  emphasis?: boolean;
}) {
  const hasUnit = Boolean(unit?.trim());
  return (
    <div className="flex min-h-[2rem] flex-col items-end justify-center text-right tabular-nums">
      <span
        className={cn(
          'text-[14px] font-semibold leading-tight tracking-[-0.02em]',
          emphasis ? 'text-foreground' : 'text-foreground-secondary',
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
