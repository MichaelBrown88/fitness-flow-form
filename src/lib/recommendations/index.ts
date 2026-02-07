/**
 * Recommendations Module
 *
 * Re-exports all recommendation-related functionality.
 */

// Types
export type { CoachPlan, BodyCompInterpretation } from './types';

// Exercise presets
export { EXERCISES } from './exercisePresets';

// Main generators
export { generateCoachPlan } from './coachPlanGenerator';
export { generateBodyCompInterpretation } from './bodyCompInterpretation';

// Cadence recommendation engine
export { 
  generateCadenceRecommendations,
  getEffectiveInterval,
  getEffectiveReason,
  getEffectivePriority,
  type CadenceRecommendationResult,
  type CadenceWarning,
} from './cadenceEngine';
