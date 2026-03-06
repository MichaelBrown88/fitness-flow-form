import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from './types';
import { calculateAge } from './scoringUtils';
import { scoreBodyComp } from './bodyCompositionScoring';
import { scoreCardio } from './cardioScoring';
import { scoreStrength } from './strengthScoring';
import { scoreMovementQuality } from './movementQualityScoring';
import { scoreLifestyle } from './lifestyleScoring';
import { generateSynthesis } from './synthesisGenerator';

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
  const filledCategories = categories.filter(c => c.score > 0);
  const overall =
    filledCategories.length > 0
      ? Math.round(
          filledCategories.reduce((acc, c) => acc + c.score, 0) / filledCategories.length
        )
      : 0;

  const synthesis = generateSynthesis(categories, form);

  return { overall, categories, synthesis };
}

/**
 * Lightweight summary of scores for analytics and dashboard views
 * without needing to load the full FormData.
 */
export function summarizeScores(form: FormData) {
  const scores = computeScores(form);
  return {
    overall: scores.overall,
    categories: scores.categories.map(c => ({
      id: c.id,
      score: c.score,
      weaknesses: c.weaknesses
    }))
  };
}
