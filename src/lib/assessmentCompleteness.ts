/**
 * Assessment completeness rules.
 * Single source of truth for whether an assessment is complete enough to update the live report.
 */

import type { FormData } from '@/contexts/FormContext';
import { calculateAge } from './scoring/scoringUtils';
import { scoreBodyComp } from './scoring/bodyCompositionScoring';
import { scoreCardio } from './scoring/cardioScoring';
import { scoreStrength } from './scoring/strengthScoring';
import { scoreMovementQuality } from './scoring/movementQualityScoring';
import { scoreLifestyle } from './scoring/lifestyleScoring';

export type AssessmentMode = 'full' | 'partial';

export type PartialCategory = 'bodycomp' | 'posture' | 'fitness' | 'strength' | 'lifestyle';

const SCORE_CATEGORY_IDS: Record<PartialCategory, string> = {
  bodycomp: 'bodyComp',
  posture: 'movementQuality',
  fitness: 'cardio',
  strength: 'strength',
  lifestyle: 'lifestyle',
};

function hasClientName(form: FormData): boolean {
  const name = (form.fullName ?? '').trim();
  return name.length > 0;
}

function getPillarScore(
  form: FormData,
  categoryId: string,
  age: number,
  gender: string
): number {
  switch (categoryId) {
    case 'bodyComp':
      return scoreBodyComp(form, age, gender).score;
    case 'cardio':
      return scoreCardio(form, age, gender).score;
    case 'strength':
      return scoreStrength(form, age, gender).score;
    case 'movementQuality':
      return scoreMovementQuality(form, age, gender).score;
    case 'lifestyle':
      return scoreLifestyle(form, age, gender).score;
    default:
      return 0;
  }
}

/**
 * Returns true if the assessment has enough data to finalize (update live report).
 * - full: at least one pillar has data (score > 0) and client name is set.
 * - partial: the given category has data and client name is set.
 */
export function isAssessmentComplete(
  formData: FormData,
  mode: AssessmentMode,
  partialCategory?: PartialCategory
): boolean {
  if (!hasClientName(formData)) return false;

  const age = calculateAge(formData.dateOfBirth);
  const gender = (formData.gender || 'any').toLowerCase();

  if (mode === 'partial' && partialCategory) {
    const categoryId = SCORE_CATEGORY_IDS[partialCategory];
    const score = getPillarScore(formData, categoryId, age, gender);
    return score > 0;
  }

  if (mode === 'full') {
    const ids: PartialCategory[] = ['bodycomp', 'posture', 'fitness', 'strength', 'lifestyle'];
    const hasAnyPillar = ids.some((cat) => {
      const id = SCORE_CATEGORY_IDS[cat];
      return getPillarScore(formData, id, age, gender) > 0;
    });
    return hasAnyPillar;
  }

  return false;
}
