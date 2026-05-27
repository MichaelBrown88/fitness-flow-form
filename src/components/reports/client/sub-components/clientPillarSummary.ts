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

  if (overall >= 75) {
    return `Your overall AXIS Score is in a healthy range.${trendBit} ${strong} of ${total} pillars are strong.${focusBit}`;
  }
  if (overall >= 50) {
    return `Your overall AXIS Score shows a solid base with clear upside.${trendBit} ${strong} pillars strong, ${mid} with room to grow${low > 0 ? `, ${low} need more attention` : ''}.${focusBit}`;
  }
  return `Your overall AXIS Score shows several areas to prioritise.${trendBit} ${low} of ${total} pillars need focused work.${focusBit}`;
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
