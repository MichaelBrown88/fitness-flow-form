/**
 * Derives the data needed to render a pillar share card.
 *
 * Rules:
 * - A card is only generated when the pillar score improved overall.
 * - Sub-metrics are always shown (including any that went down — honest, not cherry-picked).
 * - First assessment: show all metrics as their current values (no delta).
 * - Subsequent assessments: show current score, delta from previous, and per-metric deltas.
 */

import type { ScoreSummary, ScoreCategory, ScoreDetail } from '@/lib/scoring/types';

export type CardAssessmentLabel =
  | 'First Assessment'
  | `Assessment ${number}`
  | `${string} Check-In #${number}`
  | string;

export interface PillarMetricRow {
  id: string;
  label: string;
  score: number;
  /** null on first assessment */
  delta: number | null;
}

export interface PillarCardData {
  /** Category id */
  pillarId: string;
  /** Display title e.g. "Fitness" */
  pillarTitle: string;
  /** Client first name */
  clientFirstName: string;
  /** Current pillar score */
  score: number;
  /** null on first assessment */
  scoreDelta: number | null;
  /** Previous score, null on first assessment */
  previousScore: number | null;
  /** Up to 4 sub-metrics */
  metrics: PillarMetricRow[];
  /** Contextual label e.g. "First Assessment", "Strength Check-In #2" */
  assessmentLabel: CardAssessmentLabel;
  /** True when this is the first ever assessment (no previous data) */
  isFirstAssessment: boolean;
  coachLogoUrl?: string | null;
  coachName?: string | null;
}

/** Build a label like "First Assessment", "Assessment 2", "Strength Check-In #2" */
export function buildAssessmentLabel(params: {
  snapshotCount: number;
  pillarId: string;
  pillarTitle: string;
  snapshotTypes?: string[];
}): CardAssessmentLabel {
  const { snapshotCount, pillarId, pillarTitle, snapshotTypes = [] } = params;
  const isFirst = snapshotCount <= 1;
  if (isFirst) return 'First Assessment';

  // Count how many snapshots are for this specific pillar type
  const pillarTypeKey = pillarId.toLowerCase();
  const pillarSpecificCount = snapshotTypes.filter((t) =>
    t.toLowerCase().includes(pillarTypeKey),
  ).length;

  if (pillarSpecificCount >= 2) {
    return `${pillarTitle} Check-In #${pillarSpecificCount}`;
  }

  // Fall back to overall assessment count
  return `Assessment ${snapshotCount}`;
}

/**
 * Returns card data for every pillar that improved, or all pillars for a first assessment.
 * Filters out pillars that weren't assessed.
 */
export function buildPillarCards(params: {
  scores: ScoreSummary;
  previousScores: ScoreSummary | null;
  clientName: string;
  snapshotCount: number;
  snapshotTypes?: string[];
  coachLogoUrl?: string | null;
  coachName?: string | null;
}): PillarCardData[] {
  const {
    scores,
    previousScores,
    clientName,
    snapshotCount,
    snapshotTypes,
    coachLogoUrl,
    coachName,
  } = params;

  const isFirst = !previousScores || snapshotCount <= 1;
  const firstName = clientName.split(' ')[0] || clientName;
  const cards: PillarCardData[] = [];

  for (const cat of scores.categories) {
    if (!cat.assessed || cat.details.length === 0) continue;

    const prevCat: ScoreCategory | undefined = previousScores?.categories.find(
      (c) => c.id === cat.id,
    );

    const scoreDelta = prevCat != null ? Math.round(cat.score - prevCat.score) : null;
    const previousScore = prevCat != null ? Math.round(prevCat.score) : null;

    // Only generate a card when the pillar improved (or it's the first assessment)
    if (!isFirst && (scoreDelta === null || scoreDelta <= 0)) continue;

    const metrics: PillarMetricRow[] = cat.details
      .slice(0, 4)
      .map((detail: ScoreDetail) => {
        const prevDetail = prevCat?.details.find((d) => d.id === detail.id);
        const delta =
          prevDetail != null ? Math.round(detail.score - prevDetail.score) : null;
        return {
          id: detail.id,
          label: detail.label,
          score: Math.round(detail.score),
          delta,
        };
      });

    const assessmentLabel = buildAssessmentLabel({
      snapshotCount,
      pillarId: cat.id,
      pillarTitle: cat.title,
      snapshotTypes,
    });

    cards.push({
      pillarId: cat.id,
      pillarTitle: cat.title,
      clientFirstName: firstName,
      score: Math.round(cat.score),
      scoreDelta,
      previousScore,
      metrics,
      assessmentLabel,
      isFirstAssessment: isFirst,
      coachLogoUrl,
      coachName,
    });
  }

  return cards;
}
