import React, { Suspense, lazy } from 'react';
import type { AssistantChartVisual } from '@/types/coachAssistant';
import { cn } from '@/lib/utils';

// Lazy-load the recharts-heavy chart components so the assistant tab
// doesn't pull ~100KB of charting code into the initial bundle
const AssistantCharts = lazy(() => import('./AssistantCharts'));

function StatCardsBlock({ visual }: { visual: Extract<AssistantChartVisual, { type: 'stat_cards' }> }) {
  return (
    <div className="space-y-2 pt-1">
      <p className="text-xs font-semibold text-foreground">{visual.title}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {visual.data.cards.map((c, i) => (
          <div
            key={`${c.label}-${i}`}
            className="rounded-lg border border-border/60 bg-card/80 px-3 py-2 shadow-sm dark:bg-card/40"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{c.label}</p>
            <p className="text-lg font-semibold tabular-nums text-foreground">{c.value}</p>
            <p className="text-[11px] text-muted-foreground leading-snug">{c.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AssistantVisualBlock({
  visual,
  className,
}: {
  visual: AssistantChartVisual;
  className?: string;
}) {
  if (visual.type === 'data_table') {
    const { columns, rows } = visual.data;
    return (
      <div className={cn('rounded-lg border border-border/50 bg-background/60 p-3 dark:bg-background/20', className)}>
        <p className="text-xs font-semibold text-foreground">{visual.title}</p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[280px] border-collapse text-left text-[11px]">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col}
                    scope="col"
                    className="whitespace-nowrap border-b border-border/60 px-2 py-2 font-bold uppercase tracking-wide text-muted-foreground"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="border-b border-border/35 last:border-b-0">
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={cn(
                        'max-w-[12rem] px-2 py-2 text-foreground',
                        typeof cell === 'number' && 'tabular-nums',
                        ci === 0 && 'font-medium',
                      )}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (visual.type === 'stat_cards') {
    return (
      <div className={cn('rounded-lg border border-border/50 bg-background/60 p-3 dark:bg-background/20', className)}>
        <StatCardsBlock visual={visual} />
      </div>
    );
  }

  // Defer recharts (~100KB) until a chart is actually needed
  return (
    <Suspense fallback={<div className={cn('rounded-lg border border-border/50 bg-background/60 p-2 dark:bg-background/20', className)} style={{ height: 236 }} />}>
      <AssistantCharts visual={visual} className={className} />
    </Suspense>
  );
}
