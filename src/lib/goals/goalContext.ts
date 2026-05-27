/**
 * Client goal context — which pillars matter vs stay supportive.
 * Intake collects goals only (no ambition tiers); the system derives targets.
 */

import type { FormData } from '@/contexts/FormContext';

export const GOAL_WEIGHT_LOSS = 'weight-loss';
export const GOAL_BUILD_MUSCLE = 'build-muscle';
export const GOAL_BODY_RECOMP = 'body-recomposition';
export const GOAL_BUILD_STRENGTH = 'build-strength';
export const GOAL_IMPROVE_FITNESS = 'improve-fitness';
export const GOAL_GENERAL_HEALTH = 'general-health';

export type ClientGoalId =
  | typeof GOAL_WEIGHT_LOSS
  | typeof GOAL_BUILD_MUSCLE
  | typeof GOAL_BODY_RECOMP
  | typeof GOAL_BUILD_STRENGTH
  | typeof GOAL_IMPROVE_FITNESS
  | typeof GOAL_GENERAL_HEALTH;

export type PillarId = 'bodyComp' | 'strength' | 'cardio' | 'movementQuality' | 'lifestyle';

/** How much a pillar should drive report targets and copy. */
export type PillarRole = 'primary' | 'secondary' | 'supporting' | 'off-path';

export interface ClientGoalContext {
  primaryGoal: ClientGoalId;
  allGoals: ClientGoalId[];
  hasWeightLoss: boolean;
  hasBuildMuscle: boolean;
  hasBodyRecomp: boolean;
  hasBuildStrength: boolean;
  hasImproveFitness: boolean;
  hasGeneralHealth: boolean;
}

export function parseClientGoals(formData?: FormData | null, goalsOverride?: string[]): ClientGoalContext {
  const raw = goalsOverride ?? formData?.clientGoals ?? [];
  const allGoals = raw.filter((g): g is ClientGoalId =>
    [
      GOAL_WEIGHT_LOSS,
      GOAL_BUILD_MUSCLE,
      GOAL_BODY_RECOMP,
      GOAL_BUILD_STRENGTH,
      GOAL_IMPROVE_FITNESS,
      GOAL_GENERAL_HEALTH,
    ].includes(g as ClientGoalId),
  );
  const primaryGoal = (allGoals[0] ?? GOAL_GENERAL_HEALTH) as ClientGoalId;

  return {
    primaryGoal,
    allGoals,
    hasWeightLoss: allGoals.includes(GOAL_WEIGHT_LOSS),
    hasBuildMuscle: allGoals.includes(GOAL_BUILD_MUSCLE),
    hasBodyRecomp: allGoals.includes(GOAL_BODY_RECOMP),
    hasBuildStrength: allGoals.includes(GOAL_BUILD_STRENGTH),
    hasImproveFitness: allGoals.includes(GOAL_IMPROVE_FITNESS),
    hasGeneralHealth: allGoals.includes(GOAL_GENERAL_HEALTH),
  };
}

/** Primary pillar each goal optimises first in reports and ARC. */
const PRIMARY_PILLAR_BY_GOAL: Record<ClientGoalId, PillarId> = {
  [GOAL_WEIGHT_LOSS]: 'bodyComp',
  [GOAL_BUILD_MUSCLE]: 'bodyComp',
  [GOAL_BODY_RECOMP]: 'bodyComp',
  [GOAL_BUILD_STRENGTH]: 'strength',
  [GOAL_IMPROVE_FITNESS]: 'cardio',
  [GOAL_GENERAL_HEALTH]: 'lifestyle',
};

/** Secondary pillars when a non-primary goal is also selected. */
const SECONDARY_PILLARS: Partial<Record<ClientGoalId, PillarId[]>> = {
  [GOAL_WEIGHT_LOSS]: ['strength'],
  [GOAL_BUILD_MUSCLE]: ['strength'],
  [GOAL_BODY_RECOMP]: ['strength', 'cardio'],
  [GOAL_BUILD_STRENGTH]: ['bodyComp'],
  [GOAL_IMPROVE_FITNESS]: ['strength'],
  [GOAL_GENERAL_HEALTH]: ['cardio', 'movementQuality'],
};

function pillarLinkedToGoal(pillar: PillarId, goal: ClientGoalId): boolean {
  if (PRIMARY_PILLAR_BY_GOAL[goal] === pillar) return true;
  return SECONDARY_PILLARS[goal]?.includes(pillar) ?? false;
}

/**
 * Pillar role for targeting: primary goal pillar first, other selected goals secondary,
 * everything else supportive unless a metric is critically off (handled in targetStrategy).
 */
export function resolvePillarRole(pillar: PillarId, ctx: ClientGoalContext): PillarRole {
  const primaryPillar = PRIMARY_PILLAR_BY_GOAL[ctx.primaryGoal];
  if (pillar === primaryPillar) return 'primary';

  const secondaryFromPrimary = SECONDARY_PILLARS[ctx.primaryGoal] ?? [];
  if (secondaryFromPrimary.includes(pillar)) return 'secondary';

  for (const g of ctx.allGoals) {
    if (g === ctx.primaryGoal) continue;
    if (PRIMARY_PILLAR_BY_GOAL[g] === pillar) return 'secondary';
    if (pillar === 'cardio' && g === GOAL_IMPROVE_FITNESS) return 'secondary';
    if (pillar !== 'cardio' && SECONDARY_PILLARS[g]?.includes(pillar)) return 'secondary';
  }

  if (pillar === 'movementQuality' || pillar === 'lifestyle') return 'supporting';

  if (pillar === 'cardio') {
    if (ctx.primaryGoal === GOAL_IMPROVE_FITNESS) return 'primary';
    if (ctx.hasImproveFitness) return 'secondary';
    if (ctx.primaryGoal === GOAL_BUILD_MUSCLE || ctx.primaryGoal === GOAL_BUILD_STRENGTH) {
      return 'off-path';
    }
    return 'supporting';
  }

  if (pillarLinkedToGoal(pillar, ctx.primaryGoal)) return 'secondary';

  return 'off-path';
}

/** Cardio uses the same role model as other pillars (replaces legacy cardio-only flag). */
export function resolveCardioPillarRole(ctx: ClientGoalContext): PillarRole {
  return resolvePillarRole('cardio', ctx);
}

export function isFitnessFocusedGoal(ctx: ClientGoalContext): boolean {
  return ctx.primaryGoal === GOAL_IMPROVE_FITNESS ||
    (ctx.primaryGoal === GOAL_GENERAL_HEALTH && !ctx.hasBuildMuscle && !ctx.hasWeightLoss);
}
