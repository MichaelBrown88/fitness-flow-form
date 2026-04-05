import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from './types';
import { calculateAge } from './scoringUtils';
import { scoreBodyComp } from './bodyCompositionScoring';
import { scoreCardio } from './cardioScoring';
import { scoreStrength } from './strengthScoring';
import { scoreMovementQuality } from './movementQualityScoring';
import { scoreLifestyle } from './lifestyleScoring';
import { generateSynthesis } from './synthesisGenerator';

const PILLAR_IDS = ['bodyComp', 'cardio', 'strength', 'movementQuality', 'lifestyle'] as const;

export function computeScores(form: FormData): ScoreSummary {
  const age = calculateAge(form.dateOfBirth);
  const gender = (form.gender || 'any').toLowerCase();

  const categories = [
    scoreBodyComp(form, age, gender),
    scoreCardio(form, age, gender),
    scoreStrength(form, age, gender),
    scoreMovementQuality(form, age, gender),
    scoreLifestyle(form, age, gender),
  ];

  const assessedCategories = categories.filter((c) => c.assessed);
  const overallRaw =
    assessedCategories.length > 0
      ? assessedCategories.reduce((acc, c) => acc + c.score, 0) / assessedCategories.length
      : 0;
  const overall = Number.isFinite(overallRaw)
    ? Math.round(Math.max(0, Math.min(100, overallRaw)))
    : 0;

  const allFiveAssessed = PILLAR_IDS.every((id) => categories.find((c) => c.id === id)?.assessed);
  const fullProfileScore = allFiveAssessed ? overall : null;

  const synthesis = generateSynthesis(categories, form);

  return { overall, fullProfileScore, categories, synthesis };
}

/**
 * Lightweight summary of scores for analytics and dashboard views
 * without needing to load the full FormData.
 */
export function summarizeScores(form: FormData) {
  const scores = computeScores(form);
  return {
    overall: scores.overall,
    fullProfileScore: scores.fullProfileScore,
    categories: scores.categories.map((c) => ({
      id: c.id,
      score: c.score,
      assessed: c.assessed,
      weaknesses: c.weaknesses,
    })),
  };
}
