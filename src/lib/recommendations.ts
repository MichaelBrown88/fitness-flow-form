/**
 * Recommendations Module (re-export wrapper)
 *
 * This file re-exports from the refactored recommendations module
 * for backwards compatibility.
 */

export type { CoachPlan, BodyCompInterpretation } from './recommendations/types';
export { EXERCISES } from './recommendations/exercisePresets';
export { generateCoachPlan } from './recommendations/coachPlanGenerator';
export { generateBodyCompInterpretation } from './recommendations/bodyCompInterpretation';
