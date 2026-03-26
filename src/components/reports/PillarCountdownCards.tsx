import React from 'react';
import { TrendingUp, TrendingDown, ArrowRight, Minus, Sparkles } from 'lucide-react';
import { PILLAR_ACCENT, type CountdownTrend } from '@/constants/goalCountdown';
import type { PillarCountdown, GoalCountdownData } from '@/hooks/useGoalCountdown';
import type { ScoringPillarId } from '@/constants/pillars';

// ── Trend icon map ──────────────────────────────────────────────────

function TrendIcon({ trend }: { trend: CountdownTrend }) {
  switch (trend) {
    case 'accelerating':
      return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
    case 'slowing':
      return <TrendingDown className="w-3.5 h-3.5 text-amber-500" />;
    case 'near-goal':
      return <Sparkles className="w-3.5 h-3.5 text-emerald-500" />;
    case 'first-assessment':
      return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
    default:
      return <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />;
  }
}

function trendLabel(trend: CountdownTrend): string {
  switch (trend) {
    case 'accelerating': return 'Ahead of schedule';
    case 'on-track':     return 'On track';
    case 'slowing':      return 'Needs attention';
    case 'near-goal':    return 'Nearly there';
    case 'first-assessment': return 'Starting point';
  }
}

// ── Single pillar card ──────────────────────────────────────────────

function PillarCard({ data }: { data: PillarCountdown }) {
  const accent = PILLAR_ACCENT[data.pillarId as ScoringPillarId] ?? PILLAR_ACCENT.bodyComp;

  return (
    <div className="rounded-xl bg-card border border-border p-3 sm:p-4 flex flex-col gap-2.5 sm:gap-3">
      {/* Header row: dot + label + trend badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`h-2 w-2 rounded-full shrink-0 ${accent.dot}`} />
          <span className="text-xs sm:text-sm font-bold text-foreground truncate">{data.label}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <TrendIcon trend={data.trend} />
          <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground">{trendLabel(data.trend)}</span>
        </div>
      </div>

      {/* Big number: weeks to goal */}
      <div className="flex items-baseline gap-1.5">
        <span className={`text-2xl sm:text-3xl font-bold tracking-tight ${accent.text}`}>
          {data.weeksToGoal}
        </span>
        <span className="text-xs font-semibold text-muted-foreground">weeks to goal</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${accent.bar}`}
          style={{ width: `${data.progressPct}%` }}
        />
      </div>

      {/* Coaching text */}
      <p className="text-xs sm:text-xs text-muted-foreground leading-relaxed">
        {data.coachingText}
      </p>
    </div>
  );
}

// ── Frequency summary strip ─────────────────────────────────────────

function FrequencyStrip({ data }: { data: GoalCountdownData }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-1">
      <FreqBox label="3x / week" weeks={data.avgWeeks3x} />
      <FreqBox label="4x / week" weeks={data.avgWeeks4x} highlight />
      <FreqBox label="5x / week" weeks={data.avgWeeks5x} />
    </div>
  );
}

function FreqBox({ label, weeks, highlight }: { label: string; weeks: number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-2 sm:p-3 text-center ${
      highlight ? 'bg-gradient-light ring-1 ring-gradient-medium' : 'bg-muted/50'
    }`}>
      <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em]">{label}</div>
      <div className={`text-sm sm:text-lg font-bold ${highlight ? 'text-foreground' : 'text-foreground-secondary'}`}>
        ~{weeks} wks
      </div>
    </div>
  );
}

// ── Exported composite component ────────────────────────────────────

interface PillarCountdownCardsProps {
  data: GoalCountdownData;
}

export function PillarCountdownCards({ data }: PillarCountdownCardsProps) {
  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
        {data.pillars.map((p) => (
          <PillarCard key={p.pillarId} data={p} />
        ))}
      </div>
      <FrequencyStrip data={data} />
    </div>
  );
}
