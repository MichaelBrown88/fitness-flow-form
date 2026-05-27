import { getPillarLabel, type ScoringPillarId } from '@/constants/pillars';

/** Canonical five-pillar order for radar / mini-radar score arrays. */
export const PILLAR_SCORE_ORDER: readonly ScoringPillarId[] = [
  'bodyComp',
  'strength',
  'cardio',
  'movementQuality',
  'lifestyle',
] as const;

export type PillarKey = ScoringPillarId;

export interface RadarData {
  name: string;
  value: number;
  fullLabel: string;
  /** Legacy — pillar colour is derived from label / index in charts. */
  color: string;
}

export function pillarScoresFromCategories(
  categories: { id: string; score: number }[] | undefined,
): number[] {
  return PILLAR_SCORE_ORDER.map(
    (id) => categories?.find((c) => c.id === id)?.score ?? 0,
  );
}

export function buildRadarDataFromScores(scores: number[]): RadarData[] {
  return PILLAR_SCORE_ORDER.map((id, i) => ({
    name: getPillarLabel(id, 'short'),
    fullLabel: getPillarLabel(id, 'full'),
    value: scores[i] ?? 0,
    color: '#3b82f6',
  }));
}
