/**
 * System-derived goal magnitudes (no client-facing ambition tiers).
 * Coaches may still override via legacy goalLevel* fields when present.
 */

import type { FormData } from '@/contexts/FormContext';
import { buildClientProfile } from '@/lib/physiology/profile';
import { monthlyMuscleGainKg } from '@/lib/physiology/rates';
import type { ScoreSummary } from '@/lib/scoring/types';
import {
  GOAL_BODY_RECOMP,
  GOAL_BUILD_MUSCLE,
  GOAL_BUILD_STRENGTH,
  GOAL_GENERAL_HEALTH,
  GOAL_IMPROVE_FITNESS,
  GOAL_WEIGHT_LOSS,
  parseClientGoals,
  type ClientGoalContext,
} from './goalContext';
import type { EffectiveGoalLevels } from './achievableLandmarks';

const HORIZON_WEEKS_MEDIUM = 16;
const HORIZON_WEEKS_LONG = 48;

function weightLossLevel(ctx: ClientGoalContext, weightKg: number, bfPct?: number): string {
  const isPrimary = ctx.primaryGoal === GOAL_WEIGHT_LOSS;
  const pct = isPrimary ? 10 : 8;
  if (weightKg <= 0) return String(pct);
  const targetKg = (weightKg * pct) / 100;
  if (bfPct != null && bfPct >= 28 && isPrimary) return '15';
  if (targetKg >= 12) return '10kg';
  if (targetKg >= 8) return '10';
  return '5';
}

function muscleGainKg(ctx: ClientGoalContext, profile: ReturnType<typeof buildClientProfile>): string {
  const monthsMedium = HORIZON_WEEKS_MEDIUM / 4;
  const rate = monthlyMuscleGainKg(profile, {
    concurrentFatLoss: ctx.hasWeightLoss || ctx.hasBodyRecomp,
  });
  const projected = Math.max(2, Math.min(8, Math.round(rate.rate * monthsMedium)));
  if (ctx.primaryGoal === GOAL_BUILD_MUSCLE) {
    return String(Math.min(8, projected + 1));
  }
  return String(Math.max(2, projected));
}

function bodyRecompTier(ctx: ClientGoalContext): string {
  if (ctx.primaryGoal === GOAL_BODY_RECOMP) return 'athletic';
  if (ctx.hasBodyRecomp) return 'fit';
  return 'healthy';
}

function strengthLevel(ctx: ClientGoalContext): string {
  if (ctx.primaryGoal === GOAL_BUILD_STRENGTH) return 'ambitious-30-40';
  if (ctx.hasBuildStrength) return 'modest-10-15';
  if (ctx.hasBuildMuscle) return 'modest-10-15';
  return 'foundation';
}

/** Maps to legacy strength % keys used in gap analysis (10/20/30/40). */
export function strengthLevelToLegacyPercent(level: string): string {
  const map: Record<string, string> = {
    foundation: '10',
    'modest-10-15': '20',
    'solid-20-25': '30',
    'ambitious-30-40': '30',
    'aggressive-50': '40',
    maximize: '40',
  };
  return map[level] ?? '20';
}

function fitnessTier(ctx: ClientGoalContext): string {
  if (ctx.primaryGoal === GOAL_IMPROVE_FITNESS) return 'active';
  if (ctx.primaryGoal === GOAL_GENERAL_HEALTH && ctx.allGoals.length <= 1) return 'active';
  return 'health';
}

export function deriveSystemGoalLevels(
  ctx: ClientGoalContext,
  formData?: FormData | null,
  scores?: ScoreSummary,
): EffectiveGoalLevels {
  const profile = buildClientProfile(formData ?? ({} as FormData), scores);
  const weightKg = profile.bodyWeightKg;
  const bf = profile.bodyFatPct;

  return {
    goalLevelWeightLoss: weightLossLevel(ctx, weightKg, bf),
    goalLevelMuscle: muscleGainKg(ctx, profile),
    goalLevelBodyRecomp: bodyRecompTier(ctx),
    goalLevelStrength: strengthLevel(ctx),
    goalLevelFitness: fitnessTier(ctx),
  };
}

export function getSystemGoalLevels(
  formData?: FormData | null,
  goalsOverride?: string[],
  scores?: ScoreSummary,
): EffectiveGoalLevels {
  const ctx = parseClientGoals(formData, goalsOverride);
  return deriveSystemGoalLevels(ctx, formData, scores);
}

/**
 * Effective levels: coach overrides when set, else system-derived achievable targets.
 */
export function mergeEffectiveGoalLevels(
  formData?: FormData | null,
  goalsOverride?: string[],
  scores?: ScoreSummary,
): { levels: EffectiveGoalLevels; context: ClientGoalContext } {
  const context = parseClientGoals(formData, goalsOverride);
  const system = deriveSystemGoalLevels(context, formData, scores);
  if (!formData) {
    return { levels: system, context };
  }
  return {
    context,
    levels: {
      goalLevelWeightLoss: formData.goalLevelWeightLoss?.trim() || system.goalLevelWeightLoss,
      goalLevelMuscle: formData.goalLevelMuscle?.trim() || system.goalLevelMuscle,
      goalLevelBodyRecomp: formData.goalLevelBodyRecomp?.trim() || system.goalLevelBodyRecomp,
      goalLevelStrength: formData.goalLevelStrength?.trim() || system.goalLevelStrength,
      goalLevelFitness: formData.goalLevelFitness?.trim() || system.goalLevelFitness,
    },
  };
}

export { HORIZON_WEEKS_MEDIUM, HORIZON_WEEKS_LONG };
