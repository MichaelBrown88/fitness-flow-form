/**
 * Recommendation Types
 *
 * Type definitions for coach plans and body composition interpretations.
 */

import type { ExerciseGroup, SessionGroup } from '../exercisePrioritization';

export type CoachPlan = {
  keyIssues: string[];
  clientScript: {
    findings: string[];
    whyItMatters: string[];
    actionPlan: string[];
    threeMonthOutlook: string[];
    clientCommitment: string[];
  };
  internalNotes: {
    doingWell: string[];
    needsAttention: string[];
  };
  programmingStrategies: {
    title: string;
    exercises: string[];
    strategy: string;
  }[];
  movementBlocks: {
    title: string;
    objectives: string[];
    exercises: { name: string; setsReps?: string; notes?: string }[];
  }[];
  segmentalGuidance?: string[];
  prioritizedExercises?: {
    groups: ExerciseGroup[];
    bySession: SessionGroup[];
    criticalIssues: string[];
    goalExercises: string[];
    importantIssues: string[];
    minorIssues: string[];
  };
  // New unified workout structure for client
  clientWorkout?: {
    warmUp: Array<{ name: string; setsReps?: string; time?: string; addresses?: string }>;
    exercises: Array<{ name: string; setsReps?: string; notes?: string; addresses?: string; type: string }>;
    finisher?: { name: string; time?: string; setsReps?: string; addresses?: string };
  };
  // New comprehensive exercise guidance for coach
  coachExerciseLists?: {
    priorities: {
      equipment: string;
      focus: string;
      keyIssues: string[];
    };
    byMovementPattern: {
      squat: Array<{ name: string; setsReps?: string; notes?: string; addresses?: string }>;
      hinge: Array<{ name: string; setsReps?: string; notes?: string; addresses?: string }>;
      push: Array<{ name: string; setsReps?: string; notes?: string; addresses?: string }>;
      pull: Array<{ name: string; setsReps?: string; notes?: string; addresses?: string }>;
      lunge: Array<{ name: string; setsReps?: string; notes?: string; addresses?: string }>;
      core: Array<{ name: string; setsReps?: string; notes?: string; addresses?: string }>;
    };
    issueSpecific: {
      postural: Array<{ name: string; setsReps?: string; notes?: string; addresses: string }>;
      mobility: Array<{ name: string; setsReps?: string; notes?: string; addresses: string }>;
      asymmetry: Array<{ name: string; setsReps?: string; notes?: string; addresses: string }>;
    };
    warmUp: Array<{ name: string; setsReps?: string; time?: string; notes?: string; addresses?: string }>;
    cardio: Array<{ name: string; time?: string; notes?: string; addresses?: string }>;
  };
};

export type BodyCompInterpretation = {
  healthPriority: string[];
  trainingFocus: { primary: string; secondary?: string[]; corrective?: string[]; unilateralVolume?: string };
  nutrition: { calorieRange?: string; proteinTarget?: string; hydration?: string; carbTiming?: string };
  lifestyle: { sleep?: string; stress?: string; dailyMovement?: string; inflammationReduction?: string };
  timeframeWeeks: string; // e.g., "8–14 weeks"
};
