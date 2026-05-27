/**
 * Goal- and band-aware body composition targets for report gap rows.
 * Does not expose client-entered kg/% ambition — system-derived magnitudes only.
 */

import type { FormData } from '@/contexts/FormContext';
import {
  GOAL_BODY_RECOMP,
  GOAL_BUILD_MUSCLE,
  GOAL_WEIGHT_LOSS,
  parseClientGoals,
  resolvePillarRole,
  type ClientGoalContext,
  type PillarRole,
} from './goalContext';
import { classifyBodyFatPct } from './metricBands';
import { computeLowerIsBetterTarget } from './targetStrategy';
import { getTargetBodyFatFromLevel, calculateBodyRecomposition } from '@/lib/utils/bodyRecomposition';
import { deriveSystemGoalLevels } from './systemGoalTargets';
import type { ScoreSummary } from '@/lib/scoring/types';

export interface BodyCompTargetResult {
  targetBF: number;
  targetWeightKg: number;
  targetMuscleKg: number;
  targetLabel: string;
  bodyCompGaps: {
    weight: { current: number; target: number; gap: number };
    muscle: { current: number; target: number; gap: number };
    fat: { current: number; target: number; gap: number };
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function minBf(gender: 'male' | 'female'): number {
  return gender === 'male' ? 8 : 15;
}

/** Goal-appropriate body-fat anchor (not client-entered). */
function goalAnchorBf(gender: 'male' | 'female', ctx: ClientGoalContext): number {
  if (ctx.primaryGoal === GOAL_WEIGHT_LOSS) {
    return gender === 'male' ? 16 : 24;
  }
  if (ctx.primaryGoal === GOAL_BUILD_MUSCLE) {
    return gender === 'male' ? 14 : 22;
  }
  if (ctx.primaryGoal === GOAL_BODY_RECOMP) {
    return getTargetBodyFatFromLevel('athletic', gender);
  }
  return gender === 'male' ? 18 : 26;
}

function targetLabelForGoal(ctx: ClientGoalContext, targetBF: number): string {
  if (ctx.primaryGoal === GOAL_WEIGHT_LOSS) {
    return `Leaner composition (~${round1(targetBF)}% body fat)`;
  }
  if (ctx.primaryGoal === GOAL_BUILD_MUSCLE) {
    return `Support muscle gain (~${round1(targetBF)}% body fat)`;
  }
  if (ctx.primaryGoal === GOAL_BODY_RECOMP) {
    return `Recomposition range (~${round1(targetBF)}% body fat)`;
  }
  return `Healthier range (~${round1(targetBF)}% body fat)`;
}

function deriveWeightAndMuscle(
  weightKg: number,
  currentBF: number,
  targetBF: number,
  currentMuscleKg: number,
  ctx: ClientGoalContext,
  role: PillarRole,
  gender: 'male' | 'female',
  systemMuscleKg: number,
  systemFatLossKg: number,
): { targetWeightKg: number; targetMuscleKg: number } {
  if (weightKg <= 0) {
    return { targetWeightKg: 0, targetMuscleKg: currentMuscleKg };
  }

  const currentFatKg = (weightKg * currentBF) / 100;
  const currentLeanKg = weightKg - currentFatKg;

  let targetBFClamped = Math.max(minBf(gender), Math.min(currentBF, targetBF));

  const onPath = role === 'primary' || role === 'secondary';
  const hasMuscleGoal =
    ctx.hasBuildMuscle || ctx.primaryGoal === GOAL_BUILD_MUSCLE || ctx.hasBodyRecomp;
  const hasLossGoal = ctx.hasWeightLoss || ctx.primaryGoal === GOAL_WEIGHT_LOSS;

  let targetWeight = weightKg;
  let targetMuscle = currentMuscleKg;

  if (onPath && hasLossGoal && !hasMuscleGoal) {
    const fatLossKg = Math.min(systemFatLossKg, currentFatKg * 0.35);
    const targetFatKg = Math.max(2, currentFatKg - fatLossKg);
    targetWeight = currentLeanKg + targetFatKg;
    targetMuscle = currentMuscleKg * 0.99;
  } else if (onPath && hasMuscleGoal && hasLossGoal) {
    const fatLossKg = Math.min(systemFatLossKg * 0.85, currentFatKg * 0.3);
    const muscleGainKg = Math.min(systemMuscleKg, 4);
    const targetFatKg = Math.max(2, currentFatKg - fatLossKg);
    targetWeight = weightKg - fatLossKg + muscleGainKg;
    targetMuscle = currentMuscleKg + muscleGainKg;
    if (targetWeight > 0) {
      targetBFClamped = (targetFatKg / targetWeight) * 100;
    }
  } else if (onPath && hasMuscleGoal) {
    const muscleGainKg = Math.min(systemMuscleKg, 6);
    targetMuscle = currentMuscleKg + muscleGainKg;
    const targetFatKg = (weightKg * targetBFClamped) / 100;
    targetWeight = currentLeanKg + muscleGainKg + targetFatKg;
    if (targetWeight <= weightKg && currentBF > targetBFClamped) {
      targetWeight = weightKg + muscleGainKg * 0.6;
    }
  } else if (onPath) {
    const targetFatKg = (weightKg * targetBFClamped) / 100;
    targetWeight = currentLeanKg + targetFatKg;
    targetMuscle = currentMuscleKg;
  } else {
    targetWeight = weightKg;
    targetMuscle = currentMuscleKg;
    if (currentBF > targetBFClamped + 0.5) {
      const targetFatKg = (weightKg * targetBFClamped) / 100;
      targetWeight = currentLeanKg + targetFatKg;
    }
  }

  return {
    targetWeightKg: round1(Math.max(0, targetWeight)),
    targetMuscleKg: round1(Math.max(0, targetMuscle)),
  };
}

export function computeBodyCompTargets(
  formData: FormData | undefined,
  scores?: ScoreSummary,
  goalsOverride?: string[],
): BodyCompTargetResult | null {
  if (!formData) return null;

  const bf = parseFloat(formData.inbodyBodyFatPct || '0');
  const weightKg = parseFloat(formData.inbodyWeightKg || '0');
  const currentMuscleKg = parseFloat(formData.skeletalMuscleMassKg || '0');
  const genderRaw = (formData.gender || 'male').toLowerCase();
  const gender: 'male' | 'female' = genderRaw === 'female' ? 'female' : 'male';

  if (bf <= 0) return null;

  const ctx = parseClientGoals(formData, goalsOverride);
  const role = resolvePillarRole('bodyComp', ctx);
  const band = classifyBodyFatPct(bf, gender);
  const anchor = goalAnchorBf(gender, ctx);
  const floor = minBf(gender);

  const bfLower = computeLowerIsBetterTarget(bf, role, band, {
    floor,
    pushDrop: role === 'primary' ? 0.1 : 0.06,
    interveneDrop: 0.14,
    minStep: 0.5,
  });

  let targetBF = bfLower.target;
  if (role === 'primary' || role === 'secondary') {
    targetBF = Math.min(bf, Math.max(anchor, bfLower.target));
  } else if (band === 'strong') {
    targetBF = bf;
  } else {
    targetBF = Math.min(bf, Math.max(floor, bfLower.target));
  }

  if (ctx.primaryGoal === GOAL_BODY_RECOMP && weightKg > 0) {
    const tier = deriveSystemGoalLevels(ctx, formData, scores).goalLevelBodyRecomp as
      | 'healthy'
      | 'fit'
      | 'athletic'
      | 'shredded';
    const recompBf = getTargetBodyFatFromLevel(tier, gender);
    const recomp = calculateBodyRecomposition(
      weightKg,
      bf,
      recompBf,
      gender,
      currentMuscleKg > 0 ? currentMuscleKg : undefined,
    );
    targetBF = recompBf;
    return {
      targetBF: round1(targetBF),
      targetWeightKg: round1(recomp.targetWeight),
      targetMuscleKg: round1(recomp.targetMuscleMass),
      targetLabel: targetLabelForGoal(ctx, targetBF),
      bodyCompGaps: {
        weight: {
          current: weightKg,
          target: round1(recomp.targetWeight),
          gap: round1(recomp.targetWeight - weightKg),
        },
        muscle: {
          current: currentMuscleKg,
          target: round1(recomp.targetMuscleMass),
          gap: round1(recomp.targetMuscleMass - currentMuscleKg),
        },
        fat: {
          current: bf,
          target: round1(targetBF),
          gap: round1(targetBF - bf),
        },
      },
    };
  }

  const system = deriveSystemGoalLevels(ctx, formData, scores);
  let systemFatLossKg = 5;
  if (system.goalLevelWeightLoss.includes('kg')) {
    systemFatLossKg = parseFloat(system.goalLevelWeightLoss.replace('kg', '')) || 5;
  } else {
    const pct = parseFloat(system.goalLevelWeightLoss) || 10;
    systemFatLossKg = weightKg > 0 ? (weightKg * pct) / 100 : 5;
  }
  const systemMuscleKg = parseFloat(system.goalLevelMuscle) || 3;

  const { targetWeightKg, targetMuscleKg } = deriveWeightAndMuscle(
    weightKg,
    bf,
    targetBF,
    currentMuscleKg,
    ctx,
    role,
    gender,
    systemMuscleKg,
    systemFatLossKg,
  );

  if (targetWeightKg > 0) {
    const fatKg = (targetWeightKg * targetBF) / 100;
    const impliedBf = (fatKg / targetWeightKg) * 100;
    targetBF = round1(impliedBf);
  } else {
    targetBF = round1(targetBF);
  }

  return {
    targetBF,
    targetWeightKg,
    targetMuscleKg,
    targetLabel: targetLabelForGoal(ctx, targetBF),
    bodyCompGaps: {
      weight: {
        current: weightKg,
        target: targetWeightKg,
        gap: round1(targetWeightKg - weightKg),
      },
      muscle: {
        current: currentMuscleKg,
        target: targetMuscleKg,
        gap: round1(targetMuscleKg - currentMuscleKg),
      },
      fat: {
        current: bf,
        target: targetBF,
        gap: round1(targetBF - bf),
      },
    },
  };
}
