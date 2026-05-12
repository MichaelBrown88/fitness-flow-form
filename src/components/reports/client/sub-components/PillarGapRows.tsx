import React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { GapAnalysisData } from '../../useGapAnalysisData';

interface PillarGapRowsProps {
  pillar: 'body-comp' | 'strength' | 'cardio';
  gap?: GapAnalysisData;
}

interface RowSpec {
  name: string;
  current: string;
  target: string;
  unit: string;
  delta?: number;
  /** When true, lower current is "better" (e.g., resting HR) — flips delta tone. */
  invert?: boolean;
}

/**
 * Lean current → target rows for one pillar (Body / Strength / Cardio).
 * Single-line format — `85.4kg → 84.3kg` — with the delta chip pinned
 * to the right. Designed to live inside PillarCard's children slot.
 */
export const PillarGapRows: React.FC<PillarGapRowsProps> = ({ pillar, gap }) => {
  const rows = buildRows(pillar, gap);
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No gap-analysis data captured for this pillar in this assessment.
      </p>
    );
  }
  return (
    <div className="flex flex-col">
      {rows.map((r) => (
        <Row key={r.name} {...r} />
      ))}
    </div>
  );
};

function buildRows(
  pillar: PillarGapRowsProps['pillar'],
  gap?: GapAnalysisData,
): RowSpec[] {
  if (!gap) return [];

  if (pillar === 'body-comp' && gap.bodyCompGaps) {
    const g = gap.bodyCompGaps;
    return [
      { name: 'Body Weight', current: fmt(g.weight.current, 1), target: fmt(g.weight.target, 1), unit: 'kg', delta: gap.deltas?.weight },
      { name: 'Muscle Mass', current: fmt(g.muscle.current, 1), target: fmt(g.muscle.target, 1), unit: 'kg', delta: gap.deltas?.muscle },
      { name: 'Body Fat', current: fmt(g.fat.current, 1), target: fmt(g.fat.target, 1), unit: '%', delta: gap.deltas?.fat },
    ];
  }
  if (pillar === 'strength' && gap.functionalGaps) {
    const g = gap.functionalGaps;
    const out: RowSpec[] = [
      { name: 'Muscular Endurance', current: fmt(g.endurance.current, 0), target: fmt(g.endurance.target, 0), unit: ' reps', delta: gap.deltas?.endurance },
      { name: 'Core Stability', current: fmt(g.core.current, 0), target: fmt(g.core.target, 0), unit: 's', delta: gap.deltas?.core },
    ];
    if (g.strength) {
      out.push({ name: 'Grip / Pull Strength', current: fmt(g.strength.current, 1), target: fmt(g.strength.target, 1), unit: 'kg', delta: gap.deltas?.strength });
    }
    return out;
  }
  if (pillar === 'cardio' && gap.cardioGaps) {
    const g = gap.cardioGaps;
    return [
      { name: 'VO₂max', current: fmt(g.vo2.current, 1), target: fmt(g.vo2.target, 1), unit: ' ml/kg/min', delta: gap.deltas?.vo2 },
      { name: 'Resting HR', current: fmt(g.rhr.current, 0), target: fmt(g.rhr.target, 0), unit: ' bpm', delta: gap.deltas?.rhr, invert: true },
      { name: 'Recovery (1m)', current: fmt(g.recovery.current, 0), target: fmt(g.recovery.target, 0), unit: ' bpm', delta: gap.deltas?.recovery },
    ];
  }
  return [];
}

function fmt(n: number | undefined, decimals: number): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toFixed(decimals);
}

function Row({ name, current, target, unit, delta, invert = false }: RowSpec) {
  return (
    <div className="grid grid-cols-[minmax(0,1.1fr)_auto_auto] items-baseline gap-4 border-b border-border py-2.5 last:border-b-0">
      <span className="truncate text-sm font-semibold tracking-[-0.005em] text-foreground">
        {name}
      </span>
      <span className="inline-flex items-baseline gap-2 text-[13px] tabular-nums tracking-[-0.005em]">
        <span className="font-bold text-foreground">
          {current}
          <span className="ml-0.5 text-[11px] font-medium text-muted-foreground">{unit}</span>
        </span>
        <span className="text-muted-foreground/60">→</span>
        <span className="font-semibold text-foreground-secondary">
          {target}
          <span className="ml-0.5 text-[11px] font-medium text-muted-foreground">{unit}</span>
        </span>
      </span>
      <DeltaPill delta={delta} invert={invert} />
    </div>
  );
}

function DeltaPill({ delta, invert }: { delta?: number; invert?: boolean }) {
  if (delta == null || delta === 0) {
    return <span className="justify-self-end text-[11px] text-muted-foreground">—</span>;
  }
  const improved = invert ? delta < 0 : delta > 0;
  const cls = improved
    ? 'bg-score-green-light text-score-green-fg'
    : 'bg-score-amber-light text-score-amber-fg';
  const Icon = improved ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 justify-self-end rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${cls}`}>
      <Icon className="h-3 w-3" />
      {delta > 0 ? '+' : ''}
      {fmt(Math.abs(delta), 1)}
    </span>
  );
}
