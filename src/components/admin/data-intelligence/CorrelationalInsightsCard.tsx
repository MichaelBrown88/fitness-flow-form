/**
 * Correlational Insights Card
 *
 * Surfaces the strongest statistical relationships in the dataset as plain-English
 * findings. Each finding states what the relationship is, how strong it is, and a
 * concrete group-mean comparison.
 *
 * The previous tier-lock gate has been removed — the card shows whatever signals
 * exist, or a neutral placeholder if there's not yet enough data.
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { CorrelationFinding } from '@/types/analytics';

const STRENGTH_COLORS = {
  strong:   { badge: 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30', dot: 'bg-indigo-400' },
  moderate: { badge: 'bg-amber-500/15  text-amber-300  border border-amber-500/30',  dot: 'bg-amber-400'  },
  weak:     { badge: 'bg-slate-500/15  text-slate-400  border border-slate-500/30',  dot: 'bg-slate-500'  },
};

function buildInsight(f: CorrelationFinding): string {
  const absDiff = Math.abs(f.diffPct);
  const higher  = f.direction === 'positive' ? 'higher' : 'lower';
  const lowerLbl = f.labelA.replace(' Score', '').toLowerCase();
  const upperLbl = f.labelB.replace(' Score', '').toLowerCase();

  if (absDiff >= 5) {
    return `Clients with higher ${lowerLbl} score ${absDiff}% ${higher} on ${upperLbl} on average (${f.highGroupMeanB.toFixed(0)} vs ${f.lowGroupMeanB.toFixed(0)}).`;
  }
  const dirWord = f.direction === 'positive' ? 'increases' : 'decreases';
  return `As ${lowerLbl} ${dirWord}, ${upperLbl} tends to follow — r = ${f.r.toFixed(2)}, n = ${f.n}.`;
}

interface FindingRowProps {
  finding: CorrelationFinding;
  rank: number;
}

function FindingRow({ finding: f, rank }: FindingRowProps) {
  const colors = STRENGTH_COLORS[f.strength];
  const Icon = f.direction === 'positive' ? TrendingUp : f.direction === 'negative' ? TrendingDown : Minus;
  const iconColor = f.direction === 'positive' ? 'text-emerald-400' : 'text-rose-400';

  return (
    <div className="flex gap-3 py-3 border-b border-admin-border/50 last:border-0">
      <span className="text-xs text-admin-fg-muted w-4 shrink-0 mt-0.5 font-mono">{rank}.</span>
      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-admin-fg">{f.labelA}</span>
          <span className="text-xs text-admin-fg-muted">↔</span>
          <span className="text-xs font-medium text-admin-fg">{f.labelB}</span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${colors.badge}`}>
            {f.strength} · r = {f.r.toFixed(2)} · n = {f.n}
          </span>
        </div>
        <p className="text-xs text-admin-fg-muted leading-relaxed">{buildInsight(f)}</p>
      </div>
    </div>
  );
}

interface Props {
  findings: CorrelationFinding[];
  totalScoredSessions: number;
}

export function CorrelationalInsightsCard({ findings, totalScoredSessions }: Props) {
  if (findings.length === 0) {
    return (
      <div className="bg-admin-card/50 border border-admin-border rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-admin-fg">Cross-Domain Correlations</h3>
        <p className="text-xs text-admin-fg-muted">
          Pearson correlations across 40+ lifestyle and pillar variable pairs will surface here
          once there is enough data to meet the minimum n = 20 threshold per pair.
          Run the analytics computation again as more clients complete assessments.
        </p>
      </div>
    );
  }

  const strongFindings  = findings.filter(f => f.strength === 'strong');
  const otherFindings   = findings.filter(f => f.strength !== 'strong');

  return (
    <div className="bg-admin-card/50 border border-admin-border rounded-2xl p-5 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-admin-fg">Cross-Domain Correlations</h3>
        <p className="text-xs text-admin-fg-muted mt-0.5">
          Statistical relationships across {totalScoredSessions} scored sessions · strongest signals first
        </p>
      </div>

      {/* Methodology note */}
      <div className="bg-admin-bg/40 rounded-xl p-3 flex gap-2">
        <span className="text-xs text-admin-fg-muted leading-relaxed">
          <span className="font-medium text-admin-fg">How to read this</span> — each finding shows a Pearson correlation (r) between two variables.
          Strong (|r| ≥ 0.5) means a meaningful relationship. Moderate (|r| ≥ 0.3) is worth watching.
          These are correlations, not causes. Group means compare the upper vs lower half of each variable.
        </span>
      </div>

      {/* Strong findings — primary section */}
      {strongFindings.length > 0 && (
        <div>
          <p className="text-xs font-medium text-admin-fg-muted uppercase tracking-wider mb-2">Strongest Signals</p>
          <div className="divide-y divide-admin-border/50">
            {strongFindings.map((f, i) => (
              <FindingRow key={`${f.varA}-${f.varB}`} finding={f} rank={i + 1} />
            ))}
          </div>
        </div>
      )}

      {/* Moderate/weak findings */}
      {otherFindings.length > 0 && (
        <div>
          <p className="text-xs font-medium text-admin-fg-muted uppercase tracking-wider mb-2">
            {strongFindings.length > 0 ? 'Additional Relationships' : 'All Findings'}
          </p>
          <div className="divide-y divide-admin-border/50">
            {otherFindings.map((f, i) => (
              <FindingRow key={`${f.varA}-${f.varB}`} finding={f} rank={strongFindings.length + i + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
