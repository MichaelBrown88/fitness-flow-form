/**
 * Exercise Prioritization Module
 *
 * Re-exports all prioritization-related functionality.
 */

// Types
export type {
  ExercisePriority,
  PrioritizedExercise,
  ExerciseGroup,
  SessionGroup,
  PrioritizationResult,
  PrioritizationContext
} from './types';

// Main function
export { prioritizeExercises } from './prioritizeExercises';

// Individual filters (for advanced usage)
export { detectCriticalIssues } from './criticalHealthFilter';
export { generateGoalExercises } from './goalBasedFilter';
export { detectBodyCompIssues } from './bodyCompFilter';
export { detectImportantMinorIssues } from './importantMinorFilter';
export { groupBySession, createPriorityGroups } from './sessionGrouping';
