import type { CoachPlan } from './types';
import type { CoachPlanNarrativeContext } from './coachPlanContext';
import { COACH_PLAN } from './coachPlanConstants';

type InternalNotes = CoachPlan['internalNotes'];

export function buildInternalNotes(ctx: CoachPlanNarrativeContext): InternalNotes {
  const {
    hasBodyCompData,
    bodyCompScore,
    hasMovementData,
    movementScore,
    lifestyleScore,
    hasStrengthData,
    strengthScore,
    hasCardioData,
    cardioScore,
  } = ctx;
  const t = COACH_PLAN;

  const internalNotes: InternalNotes = { doingWell: [], needsAttention: [] };

  if (hasBodyCompData && bodyCompScore > t.BODY_COMP_NOTE_HIGH) {
    internalNotes.doingWell.push('Excellent metabolic baseline.');
  }
  if (hasMovementData && movementScore > t.MOVEMENT_NOTE_HIGH) {
    internalNotes.doingWell.push('Very high movement integrity.');
  }
  const hasLifestyleData = lifestyleScore > 0;
  if (hasLifestyleData && lifestyleScore > t.LIFESTYLE_NOTE_HIGH) {
    internalNotes.doingWell.push('Elite-level recovery habits.');
  }
  if (hasStrengthData && strengthScore > t.STRENGTH_NOTE_HIGH) {
    internalNotes.doingWell.push('Strong foundational strength base.');
  }
  if (hasCardioData && cardioScore > t.CARDIO_NOTE_HIGH) {
    internalNotes.doingWell.push('Good cardiovascular recovery and capacity.');
  }

  if (hasLifestyleData && lifestyleScore < t.LIFESTYLE_NOTE_LOW) {
    internalNotes.needsAttention.push('Lifestyle habits (sleep/stress) are a major recovery bottleneck.');
  }
  if (hasStrengthData && strengthScore < t.STRENGTH_NOTE_LOW) {
    internalNotes.needsAttention.push('Critical lack of foundational strength endurance.');
  }
  if (hasCardioData && cardioScore < t.CARDIO_NOTE_LOW) {
    internalNotes.needsAttention.push('Low cardiovascular base - will impact session density and recovery.');
  }

  return internalNotes;
}
