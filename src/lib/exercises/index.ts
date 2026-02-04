/**
 * Exercise Database
 *
 * Comprehensive exercise database organized by category.
 * Re-exports all types and exercise arrays.
 */

// Types
export type {
  SessionType,
  BodyPart,
  GoalType,
  GenderSuitability,
  ImpactLevel,
  Equipment,
  Exercise,
} from './types';

// Exercise collections
export { WARMUP_EXERCISES } from './warmupExercises';
export { WORKOUT_EXERCISES } from './workoutExercises';
export { CARDIO_EXERCISES } from './cardioExercises';

// Combined collection
import { WARMUP_EXERCISES } from './warmupExercises';
import { WORKOUT_EXERCISES } from './workoutExercises';
import { CARDIO_EXERCISES } from './cardioExercises';

export const ALL_EXERCISES = [...WARMUP_EXERCISES, ...WORKOUT_EXERCISES, ...CARDIO_EXERCISES];
