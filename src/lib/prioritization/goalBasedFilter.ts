/**
 * Goal-Based Filter
 *
 * Generates exercises that directly support client goals.
 * Priority 2 in the exercise prioritization system.
 */

import type { PrioritizedExercise, PrioritizationContext } from './types';
import { safeParse } from '../utils/numbers';

export function generateGoalExercises(ctx: PrioritizationContext): {
  exercises: PrioritizedExercise[];
  goalLabels: string[];
} {
  const { form, goals } = ctx;
  const goalFocused: PrioritizedExercise[] = [];
  const goalLabels: string[] = [];

  goals.forEach(goal => {
    if (goal === 'weight-loss') {
      goalLabels.push('Weight loss');
      goalFocused.push({
        name: 'Metabolic Circuit Training',
        setsReps: '3-4 rounds, 30-45s work / 15s rest',
        notes: 'Supersets to maximize calorie burn',
        priority: 'goal-focused',
        reason: 'Directly supports weight loss goal through increased calorie expenditure',
        sessionTypes: ['full-body', 'cardio'],
        addresses: ['weight loss', 'calorie burn']
      });
      goalFocused.push({
        name: 'Zone 2 Cardio',
        setsReps: '30-45 min, 3-4x/week',
        notes: 'Builds aerobic base for fat loss',
        priority: 'goal-focused',
        reason: 'Essential for sustainable fat loss',
        sessionTypes: ['cardio', 'full-body'],
        addresses: ['weight loss', 'fat loss']
      });
    }

    if (goal === 'build-muscle' || goal === 'build-strength') {
      const isMuscle = goal === 'build-muscle';
      goalLabels.push(isMuscle ? 'Muscle building' : 'Strength building');

      // Personalized based on body comp SMM
      const smm = safeParse(form.skeletalMuscleMassKg);
      const weight = safeParse(form.inbodyWeightKg);
      const smmPct = weight > 0 ? (smm / weight) * 100 : 0;

      goalFocused.push({
        name: isMuscle ? 'Hypertrophy-Focused Compound Lifts' : 'Absolute Strength Compound Lifts',
        setsReps: isMuscle ? `3-4 x 8-12` : `4-5 x 3-6`,
        notes: `Focus on ${isMuscle ? 'time under tension' : 'explosive concentric'} for ${isMuscle ? 'growth' : 'neuromuscular drive'}.`,
        priority: 'goal-focused',
        reason: `${isMuscle ? 'Hypertrophy' : 'Strength'} protocols tailored to your current muscle mass profile (${smmPct.toFixed(1)}% SMM).`,
        sessionTypes: ['full-body', 'legs', 'push', 'pull', 'strength'],
        addresses: [isMuscle ? 'muscle growth' : 'strength']
      });

      // Add specific lift variations based on goals
      if (isMuscle) {
        goalFocused.push({
          name: 'Mechanical Tension Isolation',
          setsReps: '3 x 12-15',
          notes: 'Target specific lagging muscle groups',
          priority: 'goal-focused',
          reason: 'Accessory work to drive local hypertrophy in addition to main lifts.',
          sessionTypes: ['upper-body', 'lower-body', 'push', 'pull'],
          addresses: ['muscle growth']
        });
      } else {
        goalFocused.push({
          name: 'Heavy Primary Lift Variation',
          setsReps: '3 x 5',
          notes: 'Focus on perfect technique under 80%+ 1RM load',
          priority: 'goal-focused',
          reason: 'Strength development requires specific heavy loading phases.',
          sessionTypes: ['strength', 'full-body'],
          addresses: ['strength']
        });
      }
    }

    if (goal === 'improve-fitness') {
      goalLabels.push('Fitness improvement');
      goalFocused.push({
        name: 'High Intensity Interval Training (HIIT)',
        setsReps: '6-8 x 2-4 min intervals',
        notes: 'Mix of Zone 2 and higher intensity',
        priority: 'goal-focused',
        reason: 'Improves cardiovascular fitness and VO2 max to move you toward "Elite" status.',
        sessionTypes: ['cardio', 'full-body'],
        addresses: ['fitness', 'cardio capacity']
      });
    }

    if (goal === 'improve-mobility') {
      goalLabels.push('Mobility improvement');
      goalFocused.push({
        name: 'Dynamic Joint Mobilization',
        setsReps: '2 x 10-12 reps',
        notes: 'Controlled Articular Rotations (CARs) for major joints',
        priority: 'goal-focused',
        reason: 'Systematic mobility work to improve active range of motion.',
        sessionTypes: ['full-body', 'upper-body', 'lower-body'],
        addresses: ['mobility', 'joint health']
      });
    }
  });

  return { exercises: goalFocused, goalLabels };
}
