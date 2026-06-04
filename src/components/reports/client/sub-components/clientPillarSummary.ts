import type { ScoreCategory, ScoreSummary } from '@/lib/scoring';
import { getPillarLabel } from '@/constants/pillars';

const PILLAR_LABEL_SHORT: Record<ScoreCategory['id'], string> = {
  bodyComp: 'body composition',
  strength: 'strength',
  cardio: 'cardio',
  movementQuality: 'movement quality',
  lifestyle: 'lifestyle',
};

/**
 * Client-facing per-pillar summary — plain language, no coach band jargon.
 * Score delta is shown only in the header chip, not in prose.
 */
export function buildClientPillarSummary(
  category: ScoreCategory,
  previousScore: number | null | undefined,
): string {
  const score = Math.round(category.score ?? 0);
  const label =
    PILLAR_LABEL_SHORT[category.id] ?? getPillarLabel(category.id, 'full').toLowerCase();

  if (!category.assessed) {
    return `${capitalise(label)} wasn't part of this assessment. Your coach can add it in a follow-up session.`;
  }

  const topStrength = category.strengths?.[0];
  const topFocus = category.weaknesses?.[0];
  const improved =
    previousScore != null && Math.round(score) > Math.round(previousScore);
  const declined =
    previousScore != null && Math.round(score) < Math.round(previousScore);
  const trendBit = improved
    ? ' You improved since your last assessment.'
    : declined
      ? ' This dipped slightly since your last assessment.'
      : '';

  if (score >= 75) {
    if (topFocus) {
      return `${capitalise(label)} is in a strong place.${trendBit} ${topStrength ? `${capitalise(topStrength)}. ` : ''}One area to keep an eye on: ${decapitalise(topFocus)}.`;
    }
    return `${capitalise(label)} is in a strong place.${trendBit} ${topStrength ? capitalise(topStrength) + '. ' : ''}Keep doing what's working.`;
  }

  if (score >= 50) {
    if (topFocus) {
      return `${capitalise(label)} has room to grow.${trendBit} ${topStrength ? `${capitalise(topStrength)}. ` : ''}The clearest next step: ${decapitalise(topFocus)}.`;
    }
    return `${capitalise(label)} is mixed — some positives, some gaps.${trendBit} Pick one habit to improve first.`;
  }

  if (topFocus) {
    return `${capitalise(label)} is a priority right now.${trendBit} ${capitalise(topFocus)}${topStrength ? ` — even with strengths like ${decapitalise(topStrength)}` : ''}.`;
  }
  return `${capitalise(label)} needs attention.${trendBit} Build a steady baseline before pushing harder elsewhere.`;
}

/**
 * Hero synthesis for clients — uses risk-pattern copy when present;
 * otherwise a plain-language rollup (no "amber band" / coach jargon).
 */
export function buildClientOverallSummary(
  scores: ScoreSummary,
  previousOverall: number | null | undefined,
): string {
  const synthesis = scores.synthesis ?? [];
  const ranked = [...synthesis].sort(
    (a, b) => severityRank(b.severity) - severityRank(a.severity),
  );
  const top = ranked[0];
  if (top?.description) return top.description;

  const overall = Math.round(scores.overall ?? 0);
  const cats = scores.categories ?? [];
  const assessed = cats.filter((c) => c.assessed);
  const total = assessed.length;

  const lowest = assessed.slice().sort((a, b) => a.score - b.score)[0];
  const focusBit = lowest
    ? ` Your lowest pillar is ${PILLAR_LABEL_SHORT[lowest.id] ?? lowest.title.toLowerCase()} at ${Math.round(lowest.score)} — a good place to focus first.`
    : '';

  const prev = previousOverall;
  const trendBit =
    prev != null && overall > Math.round(prev)
      ? ' You are up since your last assessment.'
      : prev != null && overall < Math.round(prev)
        ? ' You are down slightly since your last assessment.'
        : '';

  if (total === 0) {
    return `This assessment is still incomplete.${trendBit} Finish the remaining sections with your coach for a full picture.`;
  }

  const strong = assessed.filter((c) => c.score >= 75).length;
  const mid = assessed.filter((c) => c.score >= 50 && c.score < 75).length;
  const low = assessed.filter((c) => c.score < 50).length;

  const scoreLine = `Your AXIS Score is ${overall} out of 100.`;

  if (overall >= 75) {
    return `${scoreLine} You are in a healthy range overall.${trendBit} ${strong} of ${total} pillars are strong — keep building on that.${focusBit}`;
  }
  if (overall >= 50) {
    return `${scoreLine} You have a solid base with clear upside.${trendBit} ${strong} pillars are strong, ${mid} have room to grow${low > 0 ? `, and ${low} need more attention` : ''}.${focusBit}`;
  }
  return `${scoreLine} Several areas need focused work right now.${trendBit} ${low} of ${total} pillars are below where we want them.${focusBit}`;
}

/** Plain-language strength/focus lines when category bullets are sparse. */
export function buildClientPriorityFallbacks(
  scores: ScoreSummary,
): { strengths: string[]; focusAreas: string[] } {
  const assessed = (scores.categories ?? []).filter((c) => c.assessed);
  if (assessed.length === 0) {
    return { strengths: [], focusAreas: [] };
  }

  const ranked = [...assessed].sort((a, b) => b.score - a.score);
  const top = ranked[0];
  const bottom = ranked[ranked.length - 1];
  const strengths: string[] = [];
  const focusAreas: string[] = [];

  if (top && top.score >= 55) {
    const label = PILLAR_LABEL_SHORT[top.id] ?? top.title.toLowerCase();
    const detail = top.strengths?.[0];
    strengths.push(
      detail
        ? `${capitalise(label)} (${Math.round(top.score)}): ${decapitalise(detail)}`
        : `${capitalise(label)} is your strongest pillar at ${Math.round(top.score)}.`,
    );
  }

  if (bottom && bottom.score < 75) {
    const label = PILLAR_LABEL_SHORT[bottom.id] ?? bottom.title.toLowerCase();
    const detail = bottom.weaknesses?.[0];
    focusAreas.push(
      detail
        ? `${capitalise(label)} (${Math.round(bottom.score)}): ${decapitalise(detail)}`
        : `${capitalise(label)} is the best place to focus next (${Math.round(bottom.score)}).`,
    );
  }

  return { strengths, focusAreas };
}

function severityRank(severity: 'low' | 'medium' | 'high'): number {
  if (severity === 'high') return 3;
  if (severity === 'medium') return 2;
  return 1;
}

function capitalise(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function decapitalise(s: string): string {
  if (!s) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}
