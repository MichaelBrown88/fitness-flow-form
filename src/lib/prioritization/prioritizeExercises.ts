/**
 * Exercise Prioritization Orchestrator
 *
 * Main function that coordinates all prioritization filters.
 *
 * Priority order:
 * 1. Critical: Health risks, high injury risk (obesity, severe postural issues)
 * 2. Goal-focused: Exercises directly supporting client goals
 * 3. Important: Significant issues that need attention but aren't urgent
 * 4. Minor: Small corrections and optimizations
 */

import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '../scoring';
import type { CoachPlan } from '../recommendations';
import type { PrioritizationResult, PrioritizationContext } from './types';
import { safeParse } from '../utils/numbers';
import { detectCriticalIssues } from './criticalHealthFilter';
import { generateGoalExercises } from './goalBasedFilter';
import { detectBodyCompIssues } from './bodyCompFilter';
import { detectImportantMinorIssues } from './importantMinorFilter';
import { groupBySession, createPriorityGroups } from './sessionGrouping';

export function prioritizeExercises(
  form: FormData,
  scores: ScoreSummary,
  _plan: CoachPlan
): PrioritizationResult {
  // Build context object with all extracted data
  const gender = (form.gender || 'male').toLowerCase();
  const bf = safeParse(form.inbodyBodyFatPct);
  const visceral = safeParse(form.visceralFatLevel);
  const weight = safeParse(form.inbodyWeightKg);
  const height = (safeParse(form.heightCm)) / 100;
  const healthyMax = height > 0 ? 25 * height * height : 0;
  const bmi = height > 0 ? weight / (height * height) : 0;

  const goals = Array.isArray(form.clientGoals) ? form.clientGoals : [];
  const primaryGoal = goals[0] || 'general-health';

  const bodyCompScore = scores.categories.find(c => c.id === 'bodyComp')?.score || 0;
  const movementScore = scores.categories.find(c => c.id === 'movementQuality')?.score || 0;
  const strengthScore = scores.categories.find(c => c.id === 'strength')?.score || 0;
  const cardioScore = scores.categories.find(c => c.id === 'cardio')?.score || 0;

  const ctx: PrioritizationContext = {
    form,
    scores,
    gender,
    bf,
    visceral,
    weight,
    height,
    bmi,
    healthyMax,
    goals,
    primaryGoal,
    bodyCompScore,
    movementScore,
    strengthScore,
    cardioScore
  };

  // Priority 1: Critical health/injury risks
  const criticalResult = detectCriticalIssues(ctx);

  // Priority 2: Goal-focused exercises
  const goalResult = generateGoalExercises(ctx);

  // Priority 3/4 from body comp analysis
  const bodyCompResult = detectBodyCompIssues(ctx);

  // Priority 3/4 from general fitness analysis
  const fitnessResult = detectImportantMinorIssues(ctx);

  // Combine important and minor from both sources
  const allImportant = [...bodyCompResult.important, ...fitnessResult.important];
  const allMinor = [...bodyCompResult.minor, ...fitnessResult.minor];
  const allImportantIssues = [...bodyCompResult.importantIssues, ...fitnessResult.importantIssues];
  const allMinorIssues = [...bodyCompResult.minorIssues, ...fitnessResult.minorIssues];

  // Group by session type
  const bySession = groupBySession(
    criticalResult.exercises,
    goalResult.exercises,
    allImportant,
    allMinor
  );

  // Create priority groups
  const groups = createPriorityGroups(
    criticalResult.exercises,
    goalResult.exercises,
    allImportant,
    allMinor
  );

  return {
    groups,
    bySession,
    criticalIssues: criticalResult.issues,
    goalExercises: goalResult.goalLabels,
    importantIssues: allImportantIssues,
    minorIssues: allMinorIssues
  };
}
