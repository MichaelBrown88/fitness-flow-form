import React from 'react';
import type { GapAnalysisData } from '../../useGapAnalysisData';
import { CLIENT_METRIC_LABELS, CLIENT_REPORT_COPY } from '@/constants/clientReport';
import {
  ReportTargetRowGrid,
  type ReportTargetRowData,
} from './ReportTargetRowGrid';

interface PillarGapRowsProps {
  pillar: 'body-comp' | 'strength' | 'cardio';
  gap?: GapAnalysisData;
}

/**
 * Lean current → target rows for one pillar (Body / Strength / Cardio).
 */
export const PillarGapRows: React.FC<PillarGapRowsProps> = ({ pillar, gap }) => {
  const rows = buildRows(pillar, gap);
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{CLIENT_REPORT_COPY.targetsUnavailable}</p>
    );
  }
  return <ReportTargetRowGrid rows={rows} />;
};

function buildRows(
  pillar: PillarGapRowsProps['pillar'],
  gap?: GapAnalysisData,
): ReportTargetRowData[] {
  if (!gap) return [];

  if (pillar === 'body-comp' && gap.bodyCompGaps) {
    const g = gap.bodyCompGaps;
    return [
      row(metricLabel('bodyWeight'), g.weight.current, g.weight.target, 'kg', gap.deltas?.weight),
      row(metricLabel('muscleMass'), g.muscle.current, g.muscle.target, 'kg', gap.deltas?.muscle),
      row(metricLabel('bodyFat'), g.fat.current, g.fat.target, '%', gap.deltas?.fat),
    ];
  }
  if (pillar === 'strength' && gap.functionalGaps) {
    const g = gap.functionalGaps;
    const out: ReportTargetRowData[] = [
      row(metricLabel('endurance'), g.endurance.current, g.endurance.target, 'reps', gap.deltas?.endurance, 0),
      row(metricLabel('core'), g.core.current, g.core.target, 'sec', gap.deltas?.core, 0),
    ];
    if (g.strength) {
      out.push(
        row(metricLabel('grip'), g.strength.current, g.strength.target, 'kg', gap.deltas?.strength, 1),
      );
    }
    return out;
  }
  if (pillar === 'cardio' && gap.cardioGaps) {
    const g = gap.cardioGaps;
    return [
      row(metricLabel('vo2'), g.vo2.current, g.vo2.target, 'ml/kg/min', gap.deltas?.vo2, 1),
      row(metricLabel('rhr'), g.rhr.current, g.rhr.target, 'bpm', gap.deltas?.rhr, 0, true),
      row(metricLabel('hrr'), g.recovery.current, g.recovery.target, 'bpm', gap.deltas?.recovery, 0),
    ];
  }
  return [];
}

function metricLabel(key: keyof typeof CLIENT_METRIC_LABELS): string {
  return CLIENT_METRIC_LABELS[key]?.short ?? key;
}

function row(
  name: string,
  current: number | undefined,
  target: number | undefined,
  unit: string,
  delta?: number,
  decimals = 1,
  invertDelta = false,
): ReportTargetRowData {
  return {
    name,
    current: fmt(current, decimals),
    target: fmt(target, decimals),
    unit,
    delta,
    invertDelta,
  };
}

function fmt(n: number | undefined, decimals: number): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toFixed(decimals);
}
