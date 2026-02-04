/**
 * Exercise Prioritization Types
 *
 * Type definitions for the exercise prioritization system.
 */

export type ExercisePriority = 'critical' | 'goal-focused' | 'important' | 'minor';

export type PrioritizedExercise = {
  name: string;
  setsReps?: string;
  notes?: string;
  priority: ExercisePriority;
  reason: string; // Why this exercise is needed
  sessionTypes: string[]; // Which session types this fits: 'pull', 'push', 'legs', 'upper-body', 'lower-body', 'full-body'
  addresses: string[]; // What issues this addresses
};

export type ExerciseGroup = {
  priority: ExercisePriority;
  title: string;
  description: string;
  exercises: PrioritizedExercise[];
  urgency: 'urgent' | 'important' | 'moderate' | 'low';
};

export type SessionGroup = {
  sessionType: string; // 'pull', 'push', 'legs', 'upper-body', 'lower-body', 'full-body'
  exercises: PrioritizedExercise[];
};

export type PrioritizationResult = {
  groups: ExerciseGroup[];
  bySession: SessionGroup[];
  criticalIssues: string[];
  goalExercises: string[];
  importantIssues: string[];
  minorIssues: string[];
};

export type PrioritizationContext = {
  form: import('@/contexts/FormContext').FormData;
  scores: import('../scoring').ScoreSummary;
  gender: string;
  bf: number;
  visceral: number;
  weight: number;
  height: number;
  bmi: number;
  healthyMax: number;
  goals: string[];
  primaryGoal: string;
  bodyCompScore: number;
  movementScore: number;
  strengthScore: number;
  cardioScore: number;
};
