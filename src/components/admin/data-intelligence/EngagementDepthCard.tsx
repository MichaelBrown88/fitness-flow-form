/**
 * EngagementDepthCard — Section 5 of the Data Intelligence tab
 *
 * Replaces AssessmentPatternsCard with richer signals:
 *  - Return assessment rate (SaaS retention proxy)
 *  - Avg days between sessions
 *  - Full vs pillar-specific split
 *  - Coach productivity hint
 */

import { Activity, RefreshCw, Clock, BarChart2 } from 'lucide-react';
import type { DataCompleteness, PopulationAnalytics } from '@/types/analytics';

interface StatRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}

function StatRow({ icon, label, value, sub, highlight }: StatRowProps) {
  return (
    <div className="flex items-start justify-between gap-3 py-3 border-b border-admin-border/50 last:border-0">
      <div className="flex items-start gap-2.5">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
          highlight ? 'bg-indigo-600/20 text-indigo-400' : 'bg-admin-border/60 text-admin-fg-muted'
        }`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-admin-fg">{label}</p>
          {sub && <p className="text-xs text-admin-fg-muted mt-0.5">{sub}</p>}
        </div>
      </div>
      <p className={`text-sm font-semibold tabular-nums shrink-0 ${
        highlight ? 'text-indigo-300' : 'text-admin-fg'
      }`}>
        {value}
      </p>
    </div>
  );
}

interface Props {
  populationData: PopulationAnalytics;
  dataCompleteness: DataCompleteness | undefined;
}

export function EngagementDepthCard({ populationData, dataCompleteness }: Props) {
  const patterns = populationData.assessmentPatterns;
  const returnRate = dataCompleteness?.returnRate;
  const avgDays = patterns?.avgDaysBetweenSessions;
  const fullCount = patterns?.fullCount ?? 0;
  const partialCount = patterns?.partialCount ?? 0;
  const totalSnaps = patterns?.totalSnapshotCount ?? fullCount + partialCount;
  const avgSessions = patterns?.avgSessionsPerClient;

  const fullPct    = totalSnaps > 0 ? Math.round((fullCount    / totalSnaps) * 100) : null;
  const partialPct = totalSnaps > 0 ? Math.round((partialCount / totalSnaps) * 100) : null;

  // Top partial pillars
  const topPillars = Object.entries(patterns?.partialByPillar ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="bg-admin-card/50 border border-admin-border rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-admin-fg flex items-center gap-2">
          <Activity className="h-4 w-4 text-violet-400" />
          Engagement Intelligence
        </h3>
        <p className="text-xs text-admin-fg-muted mt-0.5">
          How coaches and clients are using the platform
        </p>
      </div>

      {/* Stats */}
      <div className="divide-y divide-admin-border/50">
        {returnRate !== undefined && (
          <StatRow
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            label="Return Assessment Rate"
            value={`${returnRate}%`}
            sub="Clients who completed a 2nd session — SaaS retention proxy"
            highlight
          />
        )}
        {avgDays !== null && avgDays !== undefined && (
          <StatRow
            icon={<Clock className="w-3.5 h-3.5" />}
            label="Avg Days Between Sessions"
            value={`${avgDays} days`}
            sub="Across all multi-session clients"
          />
        )}
        {avgSessions !== undefined && (
          <StatRow
            icon={<BarChart2 className="w-3.5 h-3.5" />}
            label="Avg Sessions per Client"
            value={String(avgSessions)}
            sub="All-time platform average"
          />
        )}
      </div>

      {/* Assessment type split */}
      {(fullPct !== null || partialPct !== null) && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-admin-fg-muted uppercase tracking-wider">Assessment Depth</p>

          <div className="flex items-center gap-3">
            {fullPct !== null && (
              <div className="flex-1 rounded-lg bg-indigo-600/10 border border-indigo-500/20 px-3 py-2.5 text-center">
                <p className="text-lg font-bold text-indigo-400 tabular-nums">{fullPct}%</p>
                <p className="text-[11px] text-admin-fg-muted">Full Assessment</p>
                <p className="text-[10px] text-muted-foreground">{fullCount} sessions</p>
              </div>
            )}
            {partialPct !== null && (
              <div className="flex-1 rounded-lg bg-admin-card border border-admin-border px-3 py-2.5 text-center">
                <p className="text-lg font-bold text-admin-fg tabular-nums">{partialPct}%</p>
                <p className="text-[11px] text-admin-fg-muted">Pillar-Specific</p>
                <p className="text-[10px] text-muted-foreground">{partialCount} sessions</p>
              </div>
            )}
          </div>

          {topPillars.length > 0 && (
            <div>
              <p className="text-[11px] text-admin-fg-muted mt-2 mb-1.5">Most re-assessed pillars:</p>
              <div className="flex flex-wrap gap-2">
                {topPillars.map(([pillar, count]) => (
                  <span
                    key={pillar}
                    className="text-[11px] rounded-full border border-admin-border bg-admin-bg px-2.5 py-0.5 text-admin-fg-muted"
                  >
                    {pillar} · {count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
