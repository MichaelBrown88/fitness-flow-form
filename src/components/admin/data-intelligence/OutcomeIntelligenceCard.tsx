/**
 * OutcomeIntelligenceCard — Section 2 of the Data Intelligence tab
 *
 * Visualises two signals M&A analysts care most about:
 *  1. Outcome Funnel — does more engagement → better results?
 *  2. Score Velocity by Cohort — the platform's "improvement curve"
 *
 * Both use Recharts bar charts backed by server-computed fields.
 */

import { TrendingUp, Users } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts';
import type { OutcomeFunnel, EngagementCohort } from '@/types/analytics';

// ── Outcome Funnel chart ─────────────────────────────────────────────────────

interface FunnelChartDatum {
  bracket: string;
  improved: number;
  stable: number;
  declined: number;
  total: number;
}

function buildFunnelData(funnel: OutcomeFunnel): FunnelChartDatum[] {
  const brackets: { key: '2-3' | '4-6' | '7+'; label: string }[] = [
    { key: '2-3', label: '2–3 sessions' },
    { key: '4-6', label: '4–6 sessions' },
    { key: '7+',  label: '7+ sessions'  },
  ];
  return brackets
    .map(({ key, label }) => {
      const b = funnel.byEngagement[key];
      return {
        bracket: label,
        improved: b.total > 0 ? Math.round((b.improved / b.total) * 100) : 0,
        stable:   b.total > 0 ? Math.round((b.stable   / b.total) * 100) : 0,
        declined: b.total > 0 ? Math.round((b.declined / b.total) * 100) : 0,
        total:    b.total,
      };
    })
    .filter(d => d.total > 0);
}

// ── Cohort velocity chart ─────────────────────────────────────────────────────

function buildCohortData(cohorts: EngagementCohort[]) {
  return cohorts.filter(c => c.count > 0).map(c => ({
    label: c.label,
    avgScore: c.avgScore,
    avgImprovement: c.avgImprovement ?? 0,
    count: c.count,
  }));
}

// ── Tooltip helpers ──────────────────────────────────────────────────────────

interface CustomTooltipProps {
  active?: boolean;
  payload?: { name: string; value: number; fill: string }[];
  label?: string;
}

function FunnelTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-admin-border bg-admin-card px-4 py-3 text-xs shadow-xl">
      <p className="font-semibold text-admin-fg mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.fill }} className="tabular-nums">
          {p.name}: {p.value}%
        </p>
      ))}
    </div>
  );
}

function CohortTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const scoreEntry = payload.find(p => p.name === 'Avg Score');
  const impEntry   = payload.find(p => p.name === 'Avg Improvement');
  return (
    <div className="rounded-xl border border-admin-border bg-admin-card px-4 py-3 text-xs shadow-xl">
      <p className="font-semibold text-admin-fg mb-1">{label}</p>
      {scoreEntry && (
        <p style={{ color: scoreEntry.fill }} className="tabular-nums">
          Avg Score: {scoreEntry.value}
        </p>
      )}
      {impEntry && impEntry.value !== 0 && (
        <p style={{ color: impEntry.fill }} className="tabular-nums">
          Avg Improvement: +{impEntry.value} pts
        </p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  outcomeFunnel: OutcomeFunnel;
  engagementCohorts: EngagementCohort[];
}

export function OutcomeIntelligenceCard({ outcomeFunnel, engagementCohorts }: Props) {
  const funnelData  = buildFunnelData(outcomeFunnel);
  const cohortData  = buildCohortData(engagementCohorts);
  const overall     = outcomeFunnel.overall;
  const hasData     = overall.total > 0;

  if (!hasData) {
    return (
      <div className="bg-admin-card/50 border border-admin-border rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-admin-fg flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          Outcome Intelligence
        </h3>
        <p className="text-xs text-admin-fg-muted mt-3">
          Requires at least 2 clients with 2+ sessions each. Run the analytics computation once more clients have completed follow-up assessments.
        </p>
      </div>
    );
  }

  const overallImprovedPct = Math.round((overall.improved / overall.total) * 100);

  return (
    <div className="bg-admin-card/50 border border-admin-border rounded-2xl p-5 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-admin-fg flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            Outcome Intelligence
          </h3>
          <p className="text-xs text-admin-fg-muted mt-0.5">
            Does engagement drive improvement? — {overall.total} clients with 2+ sessions
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold text-emerald-400 tabular-nums">{overallImprovedPct}%</p>
          <p className="text-[11px] text-admin-fg-muted">improved overall</p>
        </div>
      </div>

      {/* Funnel chart */}
      {funnelData.length > 0 && (
        <div>
          <p className="text-xs font-medium text-admin-fg-muted uppercase tracking-wider mb-3">
            Outcome by Engagement Depth (% of clients)
          </p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="bracket" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis unit="%" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={32} />
                <Tooltip content={<FunnelTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
                <Bar dataKey="improved" name="Improved" stackId="a" fill="#34d399" radius={[0,0,0,0]} />
                <Bar dataKey="stable"   name="Stable"   stackId="a" fill="#6b7280" radius={[0,0,0,0]} />
                <Bar dataKey="declined" name="Declined"  stackId="a" fill="#f87171" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-admin-fg-muted/60 mt-1">
            The more sessions a client completes, the higher their improvement rate.
          </p>
        </div>
      )}

      {/* Score velocity chart */}
      {cohortData.length > 0 && (
        <div>
          <p className="text-xs font-medium text-admin-fg-muted uppercase tracking-wider mb-3">
            Average Score by Engagement Tier
          </p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cohortData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} domain={[0, 100]} width={28} />
                <Tooltip content={<CohortTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
                <Bar dataKey="avgScore" name="Avg Score" radius={[4,4,0,0]}>
                  {cohortData.map((_, i) => (
                    <Cell key={i} fill={`hsl(${210 + i * 20}, 70%, ${50 + i * 5}%)`} />
                  ))}
                </Bar>
                <Bar dataKey="avgImprovement" name="Avg Improvement" fill="#34d399" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-admin-fg-muted/60 mt-1">
            n shown per bracket:
            {cohortData.map(c => (
              <span key={c.label} className="ml-2 inline-flex items-center gap-1">
                <Users className="w-2.5 h-2.5 inline" />
                {c.label}: {c.count}
              </span>
            ))}
          </p>
        </div>
      )}
    </div>
  );
}
