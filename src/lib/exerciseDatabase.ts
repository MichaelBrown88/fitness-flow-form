/**
 * Comprehensive Exercise Database
 *
 * This file re-exports the refactored exercise module for backwards compatibility.
 * The actual implementation has been split into smaller, focused modules in ./exercises/
 */

export type {
  SessionType,
  BodyPart,
  GoalType,
  GenderSuitability,
  ImpactLevel,
  Equipment,
  Exercise,
} from './exercises/types';

export { WARMUP_EXERCISES } from './exercises/warmupExercises';
export { WORKOUT_EXERCISES } from './exercises/workoutExercises';
export { CARDIO_EXERCISES } from './exercises/cardioExercises';
export { ALL_EXERCISES } from './exercises';
