import type { ScoreSummary } from '@/lib/scoring';
import { getPillarLabel } from '@/constants/pillars';

const PILLAR_SHORT: Record<string, string> = {
  bodyComp: 'body composition',
  strength: 'strength',
  cardio: 'cardio',
  movementQuality: 'movement',
  lifestyle: 'lifestyle',
};

/**
 * Client-facing headline derived from scores — replaces fantasy archetype labels.
 */
export function buildClientScoreHeadline(scores: ScoreSummary): string | null {
  const assessed = (scores.categories ?? []).filter((c) => c.assessed);
  if (assessed.length === 0) return null;

  const ranked = [...assessed].sort((a, b) => b.score - a.score);
  const top = ranked[0];
  const bottom = ranked[ranked.length - 1];

  const topLabel =
    PILLAR_SHORT[top.id] ?? getPillarLabel(top.id, 'full').toLowerCase();
  const bottomLabel =
    PILLAR_SHORT[bottom.id] ?? getPillarLabel(bottom.id, 'full').toLowerCase();

  if (top.id === bottom.id) {
    return `Focus on ${topLabel} — your main lever this block.`;
  }

  if (bottom.score < 55) {
    return `Strong ${topLabel}; ${bottomLabel} is the priority now.`;
  }

  if (top.score >= 75 && bottom.score >= 60) {
    return `Solid ${topLabel} and ${bottomLabel} still has room to grow.`;
  }

  return `Leading in ${topLabel}; next gains come from ${bottomLabel}.`;
}
