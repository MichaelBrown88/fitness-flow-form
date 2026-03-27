/**
 * Coach Plan Generator — orchestrates recommendations (client script, strategies, movement blocks).
 */

import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring';
import { prioritizeExercises } from '@/lib/exercisePrioritization';
import { generateClientWorkout, generateCoachExerciseLists } from '@/lib/recommendationGenerator';
import { safeParse } from '@/lib/utils/numbers';
import type { CoachPlan } from './types';
import { buildCoachPlanNarrativeContext } from './coachPlanContext';
import { applyInitialClientScriptNarrative, applyStorytellingClientScript } from './coachPlanClientScript';
import { buildProgrammingStrategies } from './coachPlanProgrammingStrategies';
import { buildInternalNotes } from './coachPlanInternalNotes';
import { buildMovementBlocksAndIssues } from './coachPlanMovementBlocks';

export async function generateCoachPlan(form: FormData, scores: ScoreSummary): Promise<CoachPlan> {
  const hasAnyData =
    !!(form.inbodyWeightKg && safeParse(form.inbodyWeightKg) > 0) ||
    !!(form.pushupMaxReps && safeParse(form.pushupMaxReps) > 0) ||
    !!(form.pushupsOneMinuteReps && safeParse(form.pushupsOneMinuteReps) > 0) ||
    !!(form.cardioRestingHr && safeParse(form.cardioRestingHr) > 0) ||
    !!(form.postureAiResults || form.postureHeadOverall || form.postureShouldersOverall) ||
    !!(form.sleepQuality || form.stressLevel || form.hydrationHabits || form.nutritionHabits);

  if (!hasAnyData) {
    return {
      keyIssues: [],
      clientScript: {
        findings: [],
        whyItMatters: [],
        actionPlan: [],
        threeMonthOutlook: [],
        clientCommitment: [],
      },
      internalNotes: { doingWell: [], needsAttention: [] },
      programmingStrategies: [],
      movementBlocks: [],
      segmentalGuidance: [],
    };
  }

  const ctx = buildCoachPlanNarrativeContext(form, scores, hasAnyData);

  const clientScript: CoachPlan['clientScript'] = {
    findings: [],
    whyItMatters: [],
    actionPlan: [],
    threeMonthOutlook: [],
    clientCommitment: [],
  };

  applyInitialClientScriptNarrative(ctx, clientScript);

  const programmingStrategies = buildProgrammingStrategies(
    form,
    ctx.primaryGoalRaw,
    ctx.goalAmbition,
    ctx.levelText,
  );

  applyStorytellingClientScript(ctx, clientScript);

  const internalNotes = buildInternalNotes(ctx);

  const { issues, blocks, segmentalGuidance } = buildMovementBlocksAndIssues(
    ctx,
    clientScript,
    internalNotes,
  );

  const prioritizedExercises = prioritizeExercises(form, scores, {
    keyIssues: issues,
    clientScript,
    internalNotes,
    programmingStrategies,
    movementBlocks: blocks,
    segmentalGuidance,
  });

  const [clientWorkout, coachExerciseLists] = await Promise.all([
    generateClientWorkout(form, scores),
    generateCoachExerciseLists(form, scores),
  ]);

  return {
    keyIssues: issues,
    clientScript,
    internalNotes,
    programmingStrategies,
    movementBlocks: blocks,
    segmentalGuidance,
    prioritizedExercises,
    clientWorkout,
    coachExerciseLists,
  };
}
