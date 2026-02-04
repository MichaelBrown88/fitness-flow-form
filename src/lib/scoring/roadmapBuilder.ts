import type { FormData } from '@/contexts/FormContext';
import { GOAL_TIMELINE_DB } from '../clinical-data';
import { safeParse } from '../utils/numbers';
import type { ScoreSummary, RoadmapPhase } from './types';
import { calculateAge } from './scoringUtils';

export function buildRoadmap(scores: ScoreSummary, formData?: FormData): RoadmapPhase[] {
  const phases: RoadmapPhase[] = [];

  const gender = (formData?.gender || 'any').toLowerCase();
  const age = calculateAge(formData?.dateOfBirth || '');
  const weight = safeParse(formData?.inbodyWeightKg);
  const bf = safeParse(formData?.inbodyBodyFatPct);
  const smm = safeParse(formData?.skeletalMuscleMassKg);
  const h = (safeParse(formData?.heightCm)) / 100;

  const goals = formData?.clientGoals || [];
  const primaryGoal = goals[0] || 'general-health';

  // 1. FAT LOSS REALITY
  let fatLossWeeks = 0;
  let weightToLose = 0;

  const fatLossBenchmark = GOAL_TIMELINE_DB.find(b =>
    b.goalType === 'fat_loss' &&
    (b.gender === 'any' || b.gender === gender) &&
    (b.ageBracket.includes('+') ? age >= safeParse(b.ageBracket) :
     age >= safeParse(b.ageBracket.split('-')[0]) && age <= safeParse(b.ageBracket.split('-')[1]))
  );

  const isWeightLossGoal = goals.includes('weight-loss');
  const isMuscleGoal = goals.includes('build-muscle');

  if (weight > 0 && isWeightLossGoal) {
    const weightLossGoal = formData?.goalLevelWeightLoss || '15';
    if (weightLossGoal.includes('kg')) {
      weightToLose = safeParse(weightLossGoal.replace('kg', '')) || 5;
    } else {
      const weightLossPct = safeParse(weightLossGoal) || 15;
      weightToLose = (weight * weightLossPct) / 100;
    }

    const maxWeeklyRatePct = safeParse(fatLossBenchmark?.maxWeeklyRate || '1') / 100;
    const weeklyLossKg = weight * maxWeeklyRatePct;
    fatLossWeeks = Math.ceil(weightToLose / (weeklyLossKg || 0.5));
  }

  // 2. MUSCLE GAIN REALITY
  let muscleGainWeeks = 0;
  let muscleToGain = 0;

  const muscleBenchmark = GOAL_TIMELINE_DB.find(b =>
    b.goalType === 'muscle_gain' &&
    (b.gender === 'any' || b.gender === gender) &&
    (b.ageBracket.includes('+') ? age >= safeParse(b.ageBracket) :
     age >= safeParse(b.ageBracket.split('-')[0]) && age <= safeParse(b.ageBracket.split('-')[1]))
  );

  if (smm > 0 && isMuscleGoal) {
    const muscleGainGoal = formData?.goalLevelMuscle || '6';
    muscleToGain = safeParse(muscleGainGoal) || 2;

    const history = formData?.trainingHistory || 'beginner';
    let weeklyGainKg = 0.25;
    if (history === 'intermediate') weeklyGainKg = 0.125;
    if (history === 'advanced') weeklyGainKg = 0.05;

    muscleGainWeeks = Math.ceil(muscleToGain / weeklyGainKg);
  }

  // Posture improvement calculations
  let postureWeeks = 0;
  const postureIssues: string[] = [];
  const headPos = Array.isArray(formData?.postureHeadOverall) ? formData?.postureHeadOverall : [formData?.postureHeadOverall];
  const shoulderPos = Array.isArray(formData?.postureShouldersOverall) ? formData?.postureShouldersOverall : [formData?.postureShouldersOverall];

  if (headPos.includes('forward-head')) {
    postureWeeks = Math.max(postureWeeks, 8);
    postureIssues.push('Forward head posture');
  }
  if (shoulderPos.includes('rounded')) {
    postureWeeks = Math.max(postureWeeks, 8);
    postureIssues.push('Rounded shoulders');
  }
  if (formData?.ohsKneeAlignment === 'valgus') {
    postureWeeks = Math.max(postureWeeks, 12);
    postureIssues.push('Knee valgus');
  }

  // Build phases based on priority

  // Phase 1: Foundation / Fat Loss
  if (fatLossWeeks > 0) {
    phases.push({
      title: 'Metabolic & Fat Loss Foundation',
      weeks: Math.min(fatLossWeeks, 12),
      focus: ['Caloric deficit via Zone 2 activity', 'Establishing nutritional consistency', 'Aerobic base building'],
      rationale: `Based on your age (${age}) and current body fat (${bf}%), a controlled loss rate of ~${fatLossBenchmark?.maxWeeklyRate} per week is recommended for long-term health.`,
      expectedDelta: 15
    });
  }

  // Phase 2: Movement Quality
  if (postureWeeks > 0) {
    phases.push({
      title: 'Movement Quality & Correction',
      weeks: Math.min(postureWeeks, 8),
      focus: postureIssues.slice(0, 3),
      rationale: 'Correcting identified postural deviations before adding significant external load to reduce injury risk.',
      expectedDelta: 20
    });
  }

  // Phase 3: Strength & Muscle
  if (muscleGainWeeks > 0) {
    phases.push({
      title: 'Structural Strength & Hypertrophy',
      weeks: Math.min(muscleGainWeeks, 12),
      focus: ['Progressive resistance training', 'Increased protein availability', 'Compound movement proficiency'],
      rationale: `Focusing on gaining ~${muscleToGain.toFixed(1)}kg of muscle mass. Rate is adjusted for ${muscleBenchmark?.metabolicLogic || 'biological reality'}.`,
      expectedDelta: 10
    });
  }

  // If no phases created, add generic ones
  if (phases.length === 0) {
    phases.push({
      title: 'Foundation Phase',
      weeks: 6,
      focus: ['Movement consistency', 'Baseline fitness', 'Habit formation'],
      rationale: 'Establishing a solid foundation for future progress.',
      expectedDelta: 10
    });
  }

  // Final check - ensure at least 2 phases
  if (phases.length === 1 && (fatLossWeeks > 0 || muscleGainWeeks > 0)) {
    phases.push({
      title: 'Performance & Maintenance',
      weeks: 4,
      focus: ['Integrate gains', 'Maintain consistency', 'Prepare for re-assessment'],
      rationale: 'Consolidating improvements and preparing for the next block of training.',
      expectedDelta: 5
    });
  }

  return phases.slice(0, 4);
}
