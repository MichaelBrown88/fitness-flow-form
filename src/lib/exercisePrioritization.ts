/**
 * Exercise Prioritization Module (re-export wrapper)
 *
 * This file re-exports from the refactored prioritization module
 * for backwards compatibility.
 */

export type {
  ExercisePriority,
  PrioritizedExercise,
  ExerciseGroup,
  SessionGroup
} from './prioritization/types';

export { prioritizeExercises } from './prioritization/prioritizeExercises';
