/**
 * Organisation Breakdown Card
 *
 * Compact table showing per-organisation stats derived from the population doc.
 * Visible only when there are 2+ organisations with data — useful for platform-level
 * management: which orgs are active, which are stagnant, where improvement is strongest.
 */

import { Building2 } from 'lucide-react';
import type { OrgBreakdownEntry } from '@/types/analytics';

interface Props {
  orgBreakdown: Record<string, OrgBreakdownEntry>;
}

function ImprovementBadge({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-admin-fg-muted text-xs">—</span>;
  }
  const sign = value >= 0 ? '+' : '';
  const color = value >= 3 ? 'text-emerald-400' : value <= -3 ? 'text-red-400' : 'text-admin-fg-muted';
  return <span className={`text-sm font-medium ${color}`}>{sign}{value.toFixed(1)} pts</span>;
}

export function OrgBreakdownCard({ orgBreakdown }: Props) {
  const entries = Object.entries(orgBreakdown).sort((a, b) => b[1].clientCount - a[1].clientCount);

  if (entries.length < 2) return null;

  return (
    <div className="bg-admin-card/50 border border-admin-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-4 h-4 text-indigo-400" />
        <h3 className="text-sm font-semibold text-admin-fg">Organisation Breakdown</h3>
        <span className="text-xs text-admin-fg-muted ml-auto">{entries.length} organisations</span>
      </div>

      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-admin-border">
              <th className="text-left text-xs font-medium text-admin-fg-muted pb-2 pl-1">Organisation</th>
              <th className="text-right text-xs font-medium text-admin-fg-muted pb-2 pr-1">Clients</th>
              <th className="text-right text-xs font-medium text-admin-fg-muted pb-2 pr-1">Avg Score</th>
              <th className="text-right text-xs font-medium text-admin-fg-muted pb-2 pr-1">Sessions</th>
              <th className="text-right text-xs font-medium text-admin-fg-muted pb-2 pr-1">Avg Improvement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-admin-border/50">
            {entries.map(([orgId, stats]) => (
              <tr key={orgId} className="hover:bg-admin-card/30 transition-colors">
                <td className="py-2.5 pl-1">
                  <span className="text-admin-fg font-medium truncate max-w-[160px] block">{stats.name}</span>
                </td>
                <td className="py-2.5 pr-1 text-right text-admin-fg">{stats.clientCount}</td>
                <td className="py-2.5 pr-1 text-right">
                  <span className={`font-medium ${stats.avgScore >= 70 ? 'text-emerald-400' : stats.avgScore >= 50 ? 'text-admin-fg' : 'text-amber-400'}`}>
                    {stats.avgScore > 0 ? stats.avgScore.toFixed(1) : '—'}
                  </span>
                </td>
                <td className="py-2.5 pr-1 text-right text-admin-fg-muted">{stats.totalSessions}</td>
                <td className="py-2.5 pr-1 text-right">
                  <ImprovementBadge value={stats.avgImprovement} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
