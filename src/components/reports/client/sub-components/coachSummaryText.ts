import type { ScoreCategory, ScoreSummary } from '@/lib/scoring';

const PILLAR_LABEL_SHORT: Record<ScoreCategory['id'], string> = {
  bodyComp: 'body composition',
  strength: 'strength',
  cardio: 'cardio',
  movementQuality: 'movement quality',
  lifestyle: 'lifestyle',
};

/**
 * Per-pillar coach summary — a deterministic 1-2 sentence directional
 * read of the category. Always returns something (never null) so the
 * pillar card always has copy.
 */
export function buildPillarSummary(category: ScoreCategory, previousScore: number | null | undefined): string {
  const score = Math.round(category.score ?? 0);
  const label = PILLAR_LABEL_SHORT[category.id] ?? category.title.toLowerCase();
  const trendBit = trendPhrase(score, previousScore);

  if (!category.assessed) {
    return `${capitalise(label)} wasn't fully assessed in this session. Capture the missing inputs to unlock a directional read.`;
  }

  const topStrength = category.strengths?.[0];
  const topFocus = category.weaknesses?.[0];

  if (score >= 75) {
    if (topFocus) {
      return `${capitalise(label)} is in the green${trendBit}. ${topStrength ? `${capitalise(topStrength)}. ` : ''}The one thread to follow: ${decapitalise(topFocus)}.`;
    }
    return `${capitalise(label)} is in the green${trendBit}. ${topStrength ? capitalise(topStrength) + '. ' : ''}Hold the line — current pattern is working.`;
  }

  if (score >= 50) {
    if (topFocus) {
      return `${capitalise(label)} sits in the amber band${trendBit}. ${topStrength ? `${capitalise(topStrength)}. ` : ''}The clearest lever: ${decapitalise(topFocus)}.`;
    }
    return `${capitalise(label)} sits in the amber band${trendBit}. Mixed inputs — pick one focus area and ramp it.`;
  }

  if (topFocus) {
    return `${capitalise(label)} is the primary focus this block${trendBit}. ${capitalise(topFocus)}${topStrength ? ` — even with strengths in ${decapitalise(topStrength)}` : ''}.`;
  }
  return `${capitalise(label)} is the primary focus this block${trendBit}. Build a baseline before chasing other gains.`;
}

/**
 * Hero "Coach Summary" — prefer the highest-severity synthesis item
 * (the risk-pattern detector copy), else fall back to a generated
 * sentence so the block is never empty.
 */
export function buildOverallSummary(scores: ScoreSummary, previousOverall: number | null | undefined): string {
  const synthesis = scores.synthesis ?? [];
  // Severity rank: high → medium → low. Pick the most severe; ties → first.
  const ranked = [...synthesis].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
  const top = ranked[0];
  if (top?.description) return top.description;

  // Fallback — synthesise from the categories themselves.
  const overall = Math.round(scores.overall ?? 0);
  const trendBit = trendPhrase(overall, previousOverall);
  const cats = scores.categories ?? [];
  const green = cats.filter((c) => c.assessed && c.score >= 75).length;
  const amber = cats.filter((c) => c.assessed && c.score >= 50 && c.score < 75).length;
  const red = cats.filter((c) => c.assessed && c.score < 50).length;
  const total = green + amber + red;

  const lowestAssessed = cats
    .filter((c) => c.assessed)
    .slice()
    .sort((a, b) => a.score - b.score)[0];
  const focusBit = lowestAssessed
    ? ` The lowest pillar is ${PILLAR_LABEL_SHORT[lowestAssessed.id] ?? lowestAssessed.title.toLowerCase()} at ${Math.round(lowestAssessed.score)} — that's the leverage point.`
    : '';

  if (total === 0) {
    return `Assessment is incomplete${trendBit}. Capture the missing pillar inputs to unlock a directional summary.`;
  }
  if (overall >= 75) {
    return `Overall AXIS is in the green${trendBit}, with ${green} of ${total} pillars healthy.${focusBit}`;
  }
  if (overall >= 50) {
    return `Overall AXIS sits in the amber band${trendBit} — ${green} pillars green, ${amber} amber, ${red} red.${focusBit}`;
  }
  return `Overall AXIS is in the red${trendBit} — ${red} of ${total} pillars below 50.${focusBit} Build a baseline here before chasing optimisation elsewhere.`;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function trendPhrase(score: number, prev: number | null | undefined): string {
  if (prev == null) return '';
  const diff = Math.round(score) - Math.round(prev);
  if (diff > 0) return ` (▲ +${diff})`;
  if (diff < 0) return ` (▼ ${diff})`;
  return '';
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
