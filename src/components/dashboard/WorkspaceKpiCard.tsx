import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WorkspaceKpiCardProps {
  /** 11px uppercase label (e.g. "Active clients", "Assessments · 30d"). */
  label: string;
  /** Big numeric value, or "—" placeholder when data is missing. */
  value: string;
  /** Optional trend pill below the value. Use sparingly. */
  trend?: { dir: 'up' | 'down'; label: string };
  className?: string;
}

/**
 * One Assess UI Kit "stat" card — used across every workspace page (Today,
 * Clients, etc.). Kit spec:
 * - rounded 20px, 1px border, padding 16px 18px
 * - label 11px uppercase tracking 0.08em
 * - value 28px / 700 / line 1.1 / -0.015em
 * - trend 12px semibold inline-flex with arrow
 *
 * Trend colour follows score semantics: green = good signal, amber = needs
 * attention. Don't use for unrelated colour cues.
 */
export function WorkspaceKpiCard({ label, value, trend, className }: WorkspaceKpiCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 rounded-[20px] border border-border bg-card px-[18px] py-4',
        className,
      )}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div className="text-[28px] font-bold leading-[1.1] tracking-[-0.015em] text-foreground tabular-nums">
        {value}
      </div>
      {trend ? (
        <div
          className={cn(
            'flex items-center gap-1 text-xs font-semibold',
            trend.dir === 'up' ? 'text-score-green-fg' : 'text-score-amber-fg',
          )}
        >
          {trend.dir === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {trend.label}
        </div>
      ) : (
        <div className="h-[18px]" />
      )}
    </div>
  );
}
