/**
 * Platform Dashboard – Data Intelligence Tab
 *
 * Narrative structure (not a card grid):
 *   ① Hero — 4 numbers that define the asset
 *   ② Proof — does the product work?
 *   ③ Population — who are the clients?
 *   ④ Full Analysis — deep-dive (collapsed by default)
 */

import { useState } from 'react';
import {
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Database,
  AlertTriangle,
  CloudUpload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlatformDataIntelligence } from '@/hooks/usePlatformDataIntelligence';
import {
  TIER_DEFINITIONS,
  type OutcomeFunnel,
  type PopulationAnalytics,
  type DataCompleteness,
  type EngagementCohort,
  type MilestoneProgress,
  type CorrelationFinding,
} from '@/types/analytics';

// ---------------------------------------------------------------------------
// ① Hero — 4 numbers that define the asset
// ---------------------------------------------------------------------------

function Hero({
  populationData,
  efficacyPct,
  dataCompleteness,
}: {
  populationData: PopulationAnalytics;
  efficacyPct: number | null;
  dataCompleteness: DataCompleteness | undefined;
}) {
  const sessions = populationData.totalScoredAssessments;
  const clients =
    populationData.uniqueClientCount ??
    populationData.assessmentPatterns?.uniqueClientCount ??
    0;
  const returnRate = dataCompleteness?.returnRate ?? null;
  const longitudinalClients =
    returnRate !== null ? Math.round((returnRate / 100) * clients) : null;

  const spanLabel = (() => {
    const earliest = populationData.earliestSessionDate;
    if (!earliest) return null;
    const start = new Date(earliest);
    const now = new Date();
    const months =
      (now.getFullYear() - start.getFullYear()) * 12 +
      (now.getMonth() - start.getMonth());
    if (months < 1) return '<1 month';
    if (months < 12) return `${months}mo`;
    const y = Math.floor(months / 12);
    const m = months % 12;
    return m > 0 ? `${y}y ${m}mo` : `${y}y`;
  })();

  const stats: { value: string; label: string; highlight?: boolean }[] = [
    { value: sessions.toLocaleString(), label: 'assessment sessions' },
    { value: clients.toLocaleString(), label: 'clients assessed' },
    ...(longitudinalClients !== null
      ? [{ value: String(longitudinalClients), label: 'returned for 2+ sessions', highlight: true }]
      : []),
    ...(spanLabel ? [{ value: spanLabel, label: 'of data collected' }] : []),
  ];

  return (
    <div className="space-y-5">
      {/* Stat strip */}
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        {stats.map(s => (
          <div key={s.label}>
            <p className={`text-4xl font-bold tabular-nums leading-none ${
              s.highlight ? 'text-indigo-300' : 'text-white'
            }`}>
              {s.value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Efficacy proof sentence */}
      {efficacyPct !== null && (
        <div className="border-l-2 border-emerald-500 pl-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="text-emerald-400 font-semibold text-base">{efficacyPct}%</span>
            {' '}of clients who return for a second assessment show a measurable improvement in AXIS Score™.
            No competitor captures all five health domains in one structured record.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ② Proof — outcome bars + engagement depth
// ---------------------------------------------------------------------------

function OutcomeProof({
  outcomeFunnel,
  populationData,
  dataCompleteness,
}: {
  outcomeFunnel: OutcomeFunnel | undefined;
  populationData: PopulationAnalytics;
  dataCompleteness: DataCompleteness | undefined;
}) {
  const overall = outcomeFunnel?.overall;
  const patterns = populationData.assessmentPatterns;
  const avgDays = patterns?.avgDaysBetweenSessions;
  const returnRate = dataCompleteness?.returnRate;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Outcome bars */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Outcome — clients with 2+ sessions
        </p>

        {overall && overall.total > 0 ? (
          <div className="space-y-2.5">
            {(
              [
                { key: 'improved', label: 'Improved', color: 'bg-emerald-500', n: overall.improved },
                { key: 'stable', label: 'Stable', color: 'bg-slate-500', n: overall.stable },
                { key: 'declined', label: 'Declined', color: 'bg-red-500', n: overall.declined },
              ] as const
            ).map((row) => {
              const pct = Math.round((row.n / overall.total) * 100);
              return (
                <div key={row.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">{row.label}</span>
                    <span className="tabular-nums text-slate-400">
                      {pct}% <span className="text-slate-500">({row.n})</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-700/90">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${row.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Engagement depth breakdown */}
            {outcomeFunnel && (
              <div className="pt-2 border-t border-admin-border/50 space-y-1.5">
                <p className="text-[10px] text-foreground-secondary uppercase tracking-wider">By engagement depth</p>
                {(
                  [
                    { key: '2-3' as const, label: '2–3 sessions' },
                    { key: '4-6' as const, label: '4–6 sessions' },
                    { key: '7+'  as const, label: '7+ sessions'  },
                  ]
                ).map(({ key, label }) => {
                  const b = outcomeFunnel.byEngagement[key];
                  if (b.total === 0) return null;
                  const pct = Math.round((b.improved / b.total) * 100);
                  const pctClass = pct > 0 ? 'text-emerald-400' : 'text-slate-400';
                  return (
                    <div key={key} className="flex items-center justify-between text-xs text-slate-300">
                      <span>{label}</span>
                      <span className="tabular-nums">
                        <span className={pctClass}>{pct}%</span> improved
                        <span className="ml-1 text-slate-500">n={b.total}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-foreground-secondary">
            Requires 2+ clients with 2+ sessions. Click "Recompute" once more follow-up assessments are complete.
          </p>
        )}
      </div>

      {/* Engagement stats */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Engagement
        </p>

        <div className="space-y-4">
          {returnRate !== undefined && (
            <div>
              <p className="text-3xl font-bold text-white tabular-nums">{returnRate}%</p>
              <p className="text-xs text-muted-foreground mt-0.5">client return rate (2nd session)</p>
            </div>
          )}
          {avgDays !== null && avgDays !== undefined && (
            <div>
              <p className="text-3xl font-bold text-white tabular-nums">{avgDays}</p>
              <p className="text-xs text-muted-foreground mt-0.5">avg days between sessions</p>
            </div>
          )}
          {patterns && (
            <div>
              <p className="text-3xl font-bold text-white tabular-nums">
                {patterns.avgSessionsPerClient}×
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">avg sessions per client</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ③ Population snapshot — score overview + top goals
// ---------------------------------------------------------------------------

function PopulationSnapshot({
  populationData,
  goalChartData,
  patternChartData,
  uniqueClientCount,
}: {
  populationData: PopulationAnalytics;
  goalChartData: { name: string; value: number }[];
  patternChartData: { pattern: string; count: number; pct: number }[];
  uniqueClientCount: number;
}) {
  const scoreDistributions = populationData.scoreDistributions;
  const pillarOrder = ['overall', 'bodyComp', 'cardio', 'strength', 'movementQuality', 'lifestyle'] as const;
  const pillarLabels: Record<string, string> = {
    overall: 'Overall',
    bodyComp: 'Body Comp',
    cardio: 'Cardio',
    strength: 'Strength',
    movementQuality: 'Movement',
    lifestyle: 'Lifestyle',
  };

  const avgScores: { pillar: string; label: string; avg: number }[] = pillarOrder
    .filter(p => scoreDistributions[p])
    .map(p => {
      const buckets = scoreDistributions[p];
      const midpoints: Record<string, number> = {
        '0-20': 10, '20-40': 30, '40-60': 50, '60-80': 70, '80-100': 90,
      };
      const total = buckets.reduce((s, b) => s + b.count, 0);
      const weighted = buckets.reduce((s, b) => s + b.count * (midpoints[b.range] ?? 50), 0);
      return {
        pillar: p,
        label: pillarLabels[p] ?? p,
        avg: total > 0 ? Math.round(weighted / total) : 0,
      };
    });

  const topGoals = goalChartData.slice(0, 4);
  const totalGoalVotes = topGoals.reduce((s, g) => s + g.value, 0);
  const topPatterns = patternChartData.slice(0, 3);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Average scores per pillar */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Average scores — {uniqueClientCount} client{uniqueClientCount !== 1 ? 's' : ''}
        </p>
        <div className="space-y-2.5">
          {avgScores.map(({ pillar, label, avg }) => (
            <div key={pillar} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="tabular-nums font-semibold text-muted-foreground">{avg}</span>
              </div>
              <div className="h-1.5 bg-admin-bg rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    avg >= 70 ? 'bg-emerald-500' : avg >= 50 ? 'bg-amber-500' : 'bg-red-500/70'
                  }`}
                  style={{ width: `${avg}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Goals + clinical patterns */}
      <div className="space-y-5">
        {topGoals.length > 0 && (
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Top client goals
            </p>
            {topGoals.map(g => {
              const pct = totalGoalVotes > 0 ? Math.round((g.value / totalGoalVotes) * 100) : 0;
              return (
                <div key={g.name} className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="truncate mr-3">{g.name}</span>
                  <span className="tabular-nums text-muted-foreground shrink-0">{pct}%</span>
                </div>
              );
            })}
          </div>
        )}

        {topPatterns.length > 0 && (
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Clinical risk signals
            </p>
            {topPatterns.map(p => (
              <div key={p.pattern} className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="truncate mr-3">{p.pattern}</span>
                <span className="tabular-nums text-muted-foreground shrink-0">{p.pct}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ④-A Platform Growth — monthly volume bars with score overlay
// ---------------------------------------------------------------------------

function GrowthTrend({
  volumeData,
  scoreData,
}: {
  volumeData: Record<string, number>;
  scoreData?: Record<string, number>;
}) {
  const months = Object.keys(volumeData).sort().slice(-12);
  if (!months.length) return null;
  const maxVol = Math.max(...months.map(m => volumeData[m] ?? 0), 1);

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
        Platform growth
      </p>
      <div className="flex items-end gap-1.5" style={{ height: 72 }}>
        {months.map(m => {
          const vol = volumeData[m] ?? 0;
          const heightPct = Math.max(Math.round((vol / maxVol) * 100), vol > 0 ? 4 : 0);
          const score = scoreData?.[m];
          const monthLabel = m.slice(5);
          return (
            <div key={m} className="flex-1 flex flex-col items-center gap-0.5 h-full">
              <p className="text-[9px] text-foreground-secondary tabular-nums leading-none h-3 flex items-center">
                {score !== undefined ? Math.round(score) : ''}
              </p>
              <div className="flex-1 w-full flex items-end">
                <div
                  className="w-full rounded-sm bg-indigo-500/50 hover:bg-indigo-500/70 transition-colors"
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <p className="text-[9px] text-foreground-secondary leading-none h-3 flex items-center">{monthLabel}</p>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-foreground-secondary mt-2">
        Sessions per month · numbers above bars = avg score that month
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ④-B Engagement Ladder — more sessions = higher scores
// ---------------------------------------------------------------------------

function EngagementLadder({ cohorts }: { cohorts: EngagementCohort[] }) {
  const order = ['1', '2-3', '4-6', '7+'];
  const sorted = [...cohorts].sort((a, b) => order.indexOf(a.bracket) - order.indexOf(b.bracket));

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        Engagement ladder
      </p>
      <p className="text-xs text-foreground-secondary mb-4">
        The more sessions a client completes, the higher they score — the platform's compounding value proposition.
      </p>
      <div className="space-y-3">
        {sorted.map(c => (
          <div key={c.bracket} className="flex items-center gap-3">
            <p className="w-16 text-xs text-muted-foreground shrink-0">{c.label}</p>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-700/85">
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{ width: `${Math.min(100, c.avgScore)}%` }}
              />
            </div>
            <p className="w-8 text-xs text-white tabular-nums text-right">{c.avgScore}</p>
            {c.avgImprovement !== null && (
              <p className={`w-14 text-xs tabular-nums text-right shrink-0 ${
                c.avgImprovement >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {c.avgImprovement >= 0 ? '+' : ''}{c.avgImprovement.toFixed(1)} pts
              </p>
            )}
            <p className="w-14 text-[10px] text-foreground-secondary text-right shrink-0">{c.count} clients</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ④-C Pillar Gains — where the platform moves the needle most
// ---------------------------------------------------------------------------

const PILLAR_GAIN_LABELS: Record<string, string> = {
  bodyComp: 'Body Composition',
  cardio: 'Cardio',
  strength: 'Strength',
  movementQuality: 'Movement Quality',
  lifestyle: 'Lifestyle',
};

function PillarGains({ improvements }: { improvements: Record<string, number> }) {
  const items = Object.entries(improvements)
    .map(([key, delta]) => ({ key, label: PILLAR_GAIN_LABELS[key] ?? key, delta }))
    .filter(i => i.delta !== 0)
    .sort((a, b) => b.delta - a.delta);

  if (!items.length) return null;
  const maxAbs = Math.max(...items.map(i => Math.abs(i.delta)), 1);

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        Where the platform moves the needle
      </p>
      <p className="text-xs text-foreground-secondary mb-4">
        Average score change per domain across all clients with 2+ sessions.
      </p>
      <div className="space-y-2.5">
        {items.map(i => {
          const barPct = Math.round((Math.abs(i.delta) / maxAbs) * 100);
          return (
            <div key={i.key} className="flex items-center gap-3">
              <p className="w-36 text-xs text-muted-foreground shrink-0">{i.label}</p>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-700/85">
                <div
                  className={`h-full rounded-full ${i.delta >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                  style={{ width: `${barPct}%` }}
                />
              </div>
              <p className={`w-16 text-xs tabular-nums text-right shrink-0 ${
                i.delta >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {i.delta >= 0 ? '+' : ''}{i.delta.toFixed(1)} pts
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ④-D Lifestyle Risk Intelligence
// ---------------------------------------------------------------------------

function toLifestyleColor(key: string, domain: string): string {
  const num = parseInt(key);
  if (!isNaN(num)) {
    if (domain === 'sleep') return num <= 4 ? 'bg-red-500/70' : num <= 6 ? 'bg-amber-500/60' : 'bg-emerald-500/60';
    if (domain === 'stress') return num >= 7 ? 'bg-red-500/70' : num >= 5 ? 'bg-amber-500/60' : 'bg-emerald-500/60';
  }
  const k = key.toLowerCase();
  if (['poor', 'high', 'very-high', 'daily'].includes(k)) return 'bg-red-500/70';
  if (['fair', 'moderate', 'lightly-active', 'occasionally', 'weekly'].includes(k)) return 'bg-amber-500/60';
  if (['good', 'excellent', 'low', 'very-low', 'moderately-active', 'very-active', 'extremely-active', 'never'].includes(k)) return 'bg-emerald-500/60';
  return 'bg-muted-foreground';
}

function LifestyleRisk({
  lifestyleProfile,
}: {
  lifestyleProfile: PopulationAnalytics['lifestyleProfile'];
}) {
  const sections = [
    { label: 'Sleep quality', domain: 'sleep', data: lifestyleProfile.sleep },
    { label: 'Stress level', domain: 'stress', data: lifestyleProfile.stress },
    { label: 'Nutrition', domain: 'nutrition', data: lifestyleProfile.nutrition },
    { label: 'Hydration', domain: 'hydration', data: lifestyleProfile.hydration },
  ];
  const valid = sections.filter(s => s.data && Object.values(s.data).some(n => n > 0));
  if (!valid.length) return null;

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        Lifestyle risk intelligence
      </p>
      <p className="text-xs text-foreground-secondary mb-4">
        Distribution of key lifestyle risk factors across the client population.
        <span className="text-foreground-secondary ml-1">Red = risk · Amber = moderate · Green = healthy</span>
      </p>
      <div className="space-y-4">
        {valid.map(section => {
          const data = section.data!;
          const sortedKeys = Object.keys(data)
            .filter(k => (data[k] ?? 0) > 0)
            .sort((a, b) => {
              const na = parseInt(a), nb = parseInt(b);
              return !isNaN(na) && !isNaN(nb) ? na - nb : a.localeCompare(b);
            });
          const total = sortedKeys.reduce((s, k) => s + (data[k] ?? 0), 0);
          if (total === 0) return null;
          return (
            <div key={section.label}>
              <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide">{section.label}</p>
              <div className="flex gap-0.5 h-3 rounded-full overflow-hidden">
                {sortedKeys.map(k => {
                  const pct = Math.round(((data[k] ?? 0) / total) * 100);
                  if (pct === 0) return null;
                  return (
                    <div
                      key={k}
                      className={`${toLifestyleColor(k, section.domain)} h-full`}
                      style={{ width: `${pct}%` }}
                      title={`${k}: ${pct}%`}
                    />
                  );
                })}
              </div>
              <div className="flex gap-3 mt-1 flex-wrap">
                {sortedKeys.map(k => (
                  <span key={k} className="text-[9px] text-muted-foreground capitalize">
                    {k}: {total > 0 ? Math.round(((data[k] ?? 0) / total) * 100) : 0}%
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ④-E Cross-Domain Intelligence — correlation findings as plain English
// ---------------------------------------------------------------------------

function CorrelationIntelligence({ findings }: { findings: CorrelationFinding[] }) {
  const top = [...findings]
    .sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
    .slice(0, 6);

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        Cross-domain intelligence
      </p>
      <p className="text-xs text-foreground-secondary mb-4">
        Pearson correlations across lifestyle, clinical, and performance domains.
        Only a platform capturing all five pillars can surface findings like these.
      </p>
      <div className="space-y-3">
        {top.map((f, i) => {
          const dirWord = f.direction === 'positive' ? 'higher' : 'lower';
          const strengthColor =
            f.strength === 'strong'
              ? 'text-indigo-400'
              : f.strength === 'moderate'
              ? 'text-muted-foreground'
              : 'text-muted-foreground';
          return (
            <div key={i} className="flex items-start gap-3">
              <span className={`text-[10px] font-mono tabular-nums shrink-0 mt-0.5 ${strengthColor}`}>
                r={f.r >= 0 ? '+' : ''}{f.r.toFixed(2)}
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Clients with higher{' '}
                <span className="text-muted-foreground">{f.labelA}</span>
                {' '}tend to score {dirWord} in{' '}
                <span className="text-muted-foreground">{f.labelB}</span>
                {' '}({f.diffPct}% difference, n={f.n})
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ④-F Analytics Capabilities — what's unlocked, what's next
// ---------------------------------------------------------------------------

function AnalyticsCapabilities({ milestoneProgress }: { milestoneProgress: MilestoneProgress }) {
  const { unlockedTiers, currentCount } = milestoneProgress;

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        Analytics capabilities
      </p>
      <p className="text-xs text-foreground-secondary mb-4">
        Capabilities unlock automatically as the dataset grows. Each threshold represents a qualitative leap in what the data can reveal.
      </p>
      <div className="space-y-3">
        {TIER_DEFINITIONS.map(t => {
          const unlocked = t.threshold === 0 || unlockedTiers.includes(t.tier);
          const progress =
            !unlocked && t.threshold > 0
              ? Math.min(100, Math.round((currentCount / t.threshold) * 100))
              : null;
          return (
            <div key={t.tier} className="flex items-start gap-3">
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                unlocked ? 'bg-indigo-500 border-indigo-500' : 'border-border'
              }`}>
                {unlocked && (
                  <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium ${unlocked ? 'text-white' : 'text-muted-foreground'}`}>
                  {t.label}
                </p>
                <p className="text-[10px] text-foreground-secondary mt-0.5 leading-relaxed">
                  {unlocked
                    ? t.description
                    : `${t.preview} (${t.threshold - currentCount} more sessions needed)`}
                </p>
                {progress !== null && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-0.5 flex-1 overflow-hidden rounded-full bg-slate-700/85">
                      <div
                        className="h-full rounded-full bg-indigo-600"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-foreground-secondary">{currentCount}/{t.threshold}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ④ Full analysis — collapsed by default
// ---------------------------------------------------------------------------

function FullAnalysis({
  populationData,
  engagementCohorts,
  uniqueClientCount,
  milestoneProgress,
}: {
  populationData: PopulationAnalytics;
  engagementCohorts: EngagementCohort[] | undefined;
  uniqueClientCount: number;
  milestoneProgress: MilestoneProgress | null;
}) {
  const divider = <div className="border-t border-admin-border/30" />;
  const hasGrowth = Object.keys(populationData.monthlyAssessmentVolume ?? {}).length > 0;
  const hasEngagement = (engagementCohorts?.length ?? 0) > 0;
  const hasPillarGains =
    populationData.longitudinalInsights?.pillarImprovements &&
    Object.values(populationData.longitudinalInsights.pillarImprovements).some(v => v !== 0);
  const hasCorrelations = (populationData.correlationFindings?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      {hasGrowth && (
        <>
          <GrowthTrend
            volumeData={populationData.monthlyAssessmentVolume}
            scoreData={populationData.monthlyAverageScores}
          />
          {divider}
        </>
      )}

      {hasEngagement && (
        <>
          <EngagementLadder cohorts={engagementCohorts!} />
          {divider}
        </>
      )}

      {hasPillarGains && (
        <>
          <PillarGains improvements={populationData.longitudinalInsights!.pillarImprovements} />
          {divider}
        </>
      )}

      <LifestyleRisk
        lifestyleProfile={populationData.lifestyleProfile}
      />

      {hasCorrelations && (
        <>
          {divider}
          <CorrelationIntelligence findings={populationData.correlationFindings!} />
        </>
      )}

      {milestoneProgress && (
        <>
          {divider}
          <AnalyticsCapabilities milestoneProgress={milestoneProgress} />
        </>
      )}
    </div>
  );
}

function apexSkippedUserMessage(reason?: string): string {
  if (reason === 'http_401') {
    return (
      'APEX OS: skipped (401). Cloud Functions secret must exactly match Vercel ' +
      'PRODUCT_ANALYTICS_INGEST_SECRET for production (os.one-assess.com). Update functions/.env, then firebase deploy --only functions.'
    );
  }
  if (reason === 'secret_placeholder') {
    return 'APEX OS: skipped — replace the placeholder in APEX_PRODUCT_ANALYTICS_SECRET and redeploy functions.';
  }
  if (reason === 'no_secret') {
    return 'APEX OS: skipped — set APEX_PRODUCT_ANALYTICS_SECRET in functions/.env and redeploy functions.';
  }
  if (reason === 'no_global_metrics') {
    return 'APEX OS: skipped — Firestore system_stats/global_metrics does not exist yet.';
  }
  return `APEX OS: skipped${reason ? ` (${reason})` : ''}. Check functions env secret and global_metrics.`;
}

// ---------------------------------------------------------------------------
// Main tab
// ---------------------------------------------------------------------------

export function PlatformDashboardDataIntelligenceTab() {
  const {
    loading,
    computing,
    populationData,
    uniqueClientCount,
    goalChartData,
    patternChartData,
    milestoneProgress,
    outcomeFunnel,
    engagementCohorts,
    dataCompleteness,
    efficacyPct,
    triggerCompute,
    triggerPushApexProductMetrics,
    pushingApexProductMetrics,
    lastComputedLabel,
  } = usePlatformDataIntelligence();

  const [computeError, setComputeError] = useState<string | null>(null);
  const [apexPushError, setApexPushError] = useState<string | null>(null);
  const [apexPushMessage, setApexPushMessage] = useState<string | null>(null);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);

  async function handleCompute() {
    setComputeError(null);
    try {
      await triggerCompute();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isCors =
        msg.toLowerCase().includes('cors') || msg.toLowerCase().includes('failed to fetch');
      setComputeError(
        isCors
          ? 'Function not reachable. Run: firebase deploy --only functions:computePopulationAnalyticsNow'
          : `Computation failed: ${msg}`,
      );
    }
  }

  async function handlePushApexProductMetrics() {
    setApexPushError(null);
    setApexPushMessage(null);
    try {
      const data = await triggerPushApexProductMetrics();
      if (data.pushed) {
        setApexPushMessage(
          `APEX OS: sent ${data.metricsCount ?? 0} metrics (HTTP ${data.status ?? '—'}).`,
        );
      } else {
        setApexPushMessage(apexSkippedUserMessage(data.reason));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isCors =
        msg.toLowerCase().includes('cors') || msg.toLowerCase().includes('failed to fetch');
      setApexPushError(
        isCors
          ? 'Function not reachable. Run: firebase deploy --only functions:pushApexProductMetricsNow'
          : `APEX push failed: ${msg}`,
      );
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  // Empty state
  if (!populationData) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-admin-border bg-admin-surface-inset">
          <Database className="h-7 w-7 text-admin-fg-muted" />
        </div>
        <div className="max-w-sm space-y-1.5">
          <h3 className="text-white font-semibold">No data yet</h3>
          <p className="text-muted-foreground text-sm">
            The nightly job runs at 02:00 UTC. Click below to compute now.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            onClick={handleCompute}
            disabled={computing}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {computing && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
            {computing ? 'Computing…' : 'Compute Now'}
          </Button>
          <Button
            variant="outline"
            onClick={handlePushApexProductMetrics}
            disabled={pushingApexProductMetrics || computing}
          >
            {pushingApexProductMetrics && (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            )}
            {!pushingApexProductMetrics && (
              <CloudUpload className="w-4 h-4 mr-2" />
            )}
            {pushingApexProductMetrics ? 'Pushing…' : 'Push to APEX'}
          </Button>
        </div>
        {apexPushError && (
          <p className="text-xs text-red-400 max-w-sm">{apexPushError}</p>
        )}
        {apexPushMessage && !apexPushError && (
          <p className="text-xs text-muted-foreground max-w-sm">{apexPushMessage}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-8">

      {/* Page bar */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-foreground-secondary">
          {lastComputedLabel ? `Last computed ${lastComputedLabel}` : 'Data Intelligence'}
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCompute}
            disabled={computing}
            className="text-muted-foreground hover:text-foreground-secondary text-xs h-7 px-2"
          >
            {computing
              ? <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
              : <RefreshCw className="w-3 h-3 mr-1.5" />}
            Recompute
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePushApexProductMetrics}
            disabled={pushingApexProductMetrics || computing}
            className="text-muted-foreground hover:text-foreground-secondary text-xs h-7 px-2"
          >
            {pushingApexProductMetrics
              ? <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
              : <CloudUpload className="w-3 h-3 mr-1.5" />}
            Push to APEX
          </Button>
        </div>
      </div>

      {computeError && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-xs text-red-400">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {computeError}
        </div>
      )}

      {apexPushError && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-xs text-red-400">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {apexPushError}
        </div>
      )}

      {apexPushMessage && !apexPushError && (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          {apexPushMessage}
        </div>
      )}

      {/* ① Hero */}
      <Hero
        populationData={populationData}
        efficacyPct={efficacyPct}
        dataCompleteness={dataCompleteness}
      />

      {/* Divider */}
      <div className="border-t border-admin-border/40" />

      {/* ② Proof */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Does the product work?
        </p>
        <OutcomeProof
          outcomeFunnel={outcomeFunnel}
          populationData={populationData}
          dataCompleteness={dataCompleteness}
        />
      </div>

      {/* Divider */}
      <div className="border-t border-admin-border/40" />

      {/* ③ Population snapshot */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Who are the clients?
        </p>
        <PopulationSnapshot
          populationData={populationData}
          goalChartData={goalChartData}
          patternChartData={patternChartData}
          uniqueClientCount={uniqueClientCount}
        />
      </div>

      {/* Divider */}
      <div className="border-t border-admin-border/40" />

      {/* ④ Full analysis — collapsed by default */}
      <div className="space-y-5">
        <button
          type="button"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground-secondary transition-colors"
          onClick={() => setShowFullAnalysis(v => !v)}
        >
          {showFullAnalysis
            ? <ChevronUp className="w-3.5 h-3.5" />
            : <ChevronDown className="w-3.5 h-3.5" />}
          {showFullAnalysis ? 'Hide full analysis' : 'View full analysis'}
          <span className="text-foreground-secondary">— growth, engagement ladder, pillar gains, lifestyle risks, correlations, capabilities</span>
        </button>

        {showFullAnalysis && (
          <FullAnalysis
            populationData={populationData}
            engagementCohorts={engagementCohorts}
            uniqueClientCount={uniqueClientCount}
            milestoneProgress={milestoneProgress}
          />
        )}
      </div>
    </div>
  );
}
