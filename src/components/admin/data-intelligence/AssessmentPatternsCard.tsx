/**
 * @deprecated Replaced by EngagementDepthCard (Section 5 of the Data Intelligence tab).
 * Kept for reference only — no longer rendered in the UI.
 *
 * Assessment Patterns Card
 *
 * Surfaces engagement behaviour from snapshot type data:
 * full vs partial breakdown, which pillars coaches update most,
 * average sessions per client, and average days between sessions.
 */

import type { PopulationAnalytics } from '@/types/analytics';

const PILLAR_LABELS: Record<string, string> = {
  bodycomp: 'Body Comp',
  posture: 'Posture',
  fitness: 'Fitness',
  strength: 'Strength',
  lifestyle: 'Lifestyle',
};

interface Props {
  patterns: NonNullable<PopulationAnalytics['assessmentPatterns']>;
  scoredSessions: number;
}

function StatChip({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-admin-bg/40 rounded-xl p-3 space-y-1">
      <p className="text-xs text-admin-fg-muted">{label}</p>
      <p className="text-xl font-semibold text-admin-fg">{value}</p>
      {sub && <p className="text-xs text-admin-fg-muted">{sub}</p>}
    </div>
  );
}

export function AssessmentPatternsCard({ patterns, scoredSessions }: Props) {
  const { fullCount, partialCount, totalSnapshotCount, partialByPillar, uniqueClientCount, avgSessionsPerClient, avgDaysBetweenSessions } = patterns;

  const total = totalSnapshotCount > 0 ? totalSnapshotCount : fullCount + partialCount;
  const fullPct = total > 0 ? Math.round((fullCount / total) * 100) : 0;
  const partialPct = total > 0 ? Math.round((partialCount / total) * 100) : 0;

  const topPartialPillars = Object.entries(partialByPillar)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <div className="bg-admin-card/50 border border-admin-border rounded-2xl p-5 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-admin-fg">Assessment Patterns</h3>
        <p className="text-xs text-admin-fg-muted mt-0.5">
          {total} total sessions across {uniqueClientCount} clients · {scoredSessions} with complete scores
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatChip
          label="Full Assessments"
          value={`${fullCount}`}
          sub={`${fullPct}% of sessions`}
        />
        <StatChip
          label="Partial Updates"
          value={`${partialCount}`}
          sub={`${partialPct}% of sessions`}
        />
        <StatChip
          label="Avg Sessions / Client"
          value={`${avgSessionsPerClient}`}
          sub="all time"
        />
        <StatChip
          label="Avg Days Between Sessions"
          value={avgDaysBetweenSessions !== null ? `${avgDaysBetweenSessions}d` : '—'}
          sub={avgDaysBetweenSessions !== null ? 'avg gap per client' : 'needs 2+ sessions per client'}
        />
      </div>

      {/* Partial pillar breakdown */}
      {topPartialPillars.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-admin-fg-muted uppercase tracking-wider">Most Updated Pillars (partial)</p>
          <div className="space-y-1.5">
            {topPartialPillars.map(([pillar, count]) => {
              const pct = partialCount > 0 ? Math.round((count / partialCount) * 100) : 0;
              return (
                <div key={pillar} className="flex items-center gap-3">
                  <span className="text-xs text-admin-fg-muted w-20 shrink-0">
                    {PILLAR_LABELS[pillar] ?? pillar}
                  </span>
                  <div className="flex-1 h-1.5 bg-admin-bg rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-admin-fg-muted w-12 text-right">{count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-admin-fg-muted pt-1">
            This shows which pillars coaches return to update most often between full assessments.
          </p>
        </div>
      )}
    </div>
  );
}
