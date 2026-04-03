import { TrendingUp, TrendingDown, Minus, Users, BarChart2 } from 'lucide-react';
import type { LongitudinalInsights } from '@/types/analytics';
import { PILLAR_IMPROVEMENT_LABELS } from '@/hooks/usePlatformDataIntelligence';

interface Props {
  insights: LongitudinalInsights;
}

function DeltaBadge({ value }: { value: number }) {
  if (value > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
        <TrendingUp className="h-3.5 w-3.5" />
        +{value.toFixed(1)} pts
      </span>
    );
  }
  if (value < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-red-400 font-semibold">
        <TrendingDown className="h-3.5 w-3.5" />
        {value.toFixed(1)} pts
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground font-semibold">
      <Minus className="h-3.5 w-3.5" />
      0 pts
    </span>
  );
}

export function LongitudinalInsightsCard({ insights }: Props) {
  const { clientCount, avgScoreImprovement, clientsImproved, clientsStable, clientsDeclined, pillarImprovements } = insights;

  const total = clientsImproved + clientsStable + clientsDeclined;
  const improvedPct  = total > 0 ? Math.round((clientsImproved  / total) * 100) : 0;
  const stablePct    = total > 0 ? Math.round((clientsStable    / total) * 100) : 0;
  const declinedPct  = total > 0 ? Math.round((clientsDeclined  / total) * 100) : 0;

  const sortedPillars = Object.entries(pillarImprovements)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

  const isEarlyData = clientCount < 20;

  return (
    <div className="bg-admin-card/50 border border-admin-border rounded-2xl p-5 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-admin-fg flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-violet-400" />
            Longitudinal Progress
          </h3>
          <p className="text-xs text-admin-fg-muted mt-0.5">
            Score change from first to most recent assessment per client
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-admin-border px-3 py-1 text-xs text-admin-fg-muted">
          <Users className="h-3 w-3" />
          n = {clientCount} client{clientCount !== 1 ? 's' : ''}
        </div>
      </div>

      {isEarlyData && (
        <p className="text-xs text-amber-400/80 bg-amber-400/5 border border-amber-400/20 rounded-lg px-4 py-2">
          Early data — averages will stabilise as more clients complete follow-up assessments.
        </p>
      )}

      {/* Average overall improvement */}
      <div className="rounded-lg bg-admin-card px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-admin-fg-muted uppercase tracking-wide">Average overall improvement</p>
          <div className="mt-1">
            <DeltaBadge value={avgScoreImprovement} />
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-admin-fg-muted">Across {clientCount} multi-session client{clientCount !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Outcome breakdown */}
      <div>
        <p className="text-xs font-medium text-admin-fg-muted mb-3">Outcome breakdown (±5 pt threshold)</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-center">
            <p className="text-lg font-bold text-emerald-400">{improvedPct}%</p>
            <p className="text-xs text-admin-fg-muted mt-0.5">Improved</p>
            <p className="text-[10px] text-admin-fg-muted">{clientsImproved} client{clientsImproved !== 1 ? 's' : ''}</p>
          </div>
          <div className="rounded-lg bg-admin-card border border-admin-border px-4 py-3 text-center">
            <p className="text-lg font-bold text-admin-fg">{stablePct}%</p>
            <p className="text-xs text-admin-fg-muted mt-0.5">Stable</p>
            <p className="text-[10px] text-admin-fg-muted">{clientsStable} client{clientsStable !== 1 ? 's' : ''}</p>
          </div>
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-center">
            <p className="text-lg font-bold text-red-400">{declinedPct}%</p>
            <p className="text-xs text-admin-fg-muted mt-0.5">Declined</p>
            <p className="text-[10px] text-admin-fg-muted">{clientsDeclined} client{clientsDeclined !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* Per-pillar breakdown */}
      {sortedPillars.length > 0 && (
        <div>
          <p className="text-xs font-medium text-admin-fg-muted mb-3">Per-pillar average improvement</p>
          <div className="space-y-2">
            {sortedPillars.map(([pillarId, delta]) => (
              <div key={pillarId} className="flex items-center justify-between">
                <span className="text-sm text-admin-fg">
                  {PILLAR_IMPROVEMENT_LABELS[pillarId] ?? pillarId}
                </span>
                <DeltaBadge value={delta} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
