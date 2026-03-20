/**
 * Achievable landmarks: effective goal ambition when not collected from the client.
 * Use formData values when present (backwards compatibility); otherwise return system-defined achievable defaults.
 */

import type { FormData } from '@/contexts/FormContext';

/** Goal value keys matching ASSESSMENT_OPTIONS.clientGoals[].value */
const GOAL_WEIGHT_LOSS = 'weight-loss';
const GOAL_BUILD_MUSCLE = 'build-muscle';
const GOAL_BODY_RECOMP = 'body-recomposition';
const GOAL_BUILD_STRENGTH = 'build-strength';
const GOAL_IMPROVE_FITNESS = 'improve-fitness';
const GOAL_GENERAL_HEALTH = 'general-health';

export interface EffectiveGoalLevels {
  goalLevelWeightLoss: string;
  goalLevelMuscle: string;
  goalLevelBodyRecomp: string;
  goalLevelStrength: string;
  goalLevelFitness: string;
}

const DEFAULTS_BY_GOAL: Record<string, EffectiveGoalLevels> = {
  [GOAL_WEIGHT_LOSS]: {
    goalLevelWeightLoss: '10',
    goalLevelMuscle: '6',
    goalLevelBodyRecomp: 'athletic',
    goalLevelStrength: '30',
    goalLevelFitness: 'active',
  },
  [GOAL_BUILD_MUSCLE]: {
    goalLevelWeightLoss: '10',
    goalLevelMuscle: '6',
    goalLevelBodyRecomp: 'athletic',
    goalLevelStrength: '30',
    goalLevelFitness: 'active',
  },
  [GOAL_BODY_RECOMP]: {
    goalLevelWeightLoss: '10',
    goalLevelMuscle: '6',
    goalLevelBodyRecomp: 'athletic',
    goalLevelStrength: '30',
    goalLevelFitness: 'active',
  },
  [GOAL_BUILD_STRENGTH]: {
    goalLevelWeightLoss: '10',
    goalLevelMuscle: '6',
    goalLevelBodyRecomp: 'athletic',
    goalLevelStrength: '30',
    goalLevelFitness: 'active',
  },
  [GOAL_IMPROVE_FITNESS]: {
    goalLevelWeightLoss: '10',
    goalLevelMuscle: '6',
    goalLevelBodyRecomp: 'athletic',
    goalLevelStrength: '30',
    goalLevelFitness: 'active',
  },
  [GOAL_GENERAL_HEALTH]: {
    goalLevelWeightLoss: '10',
    goalLevelMuscle: '6',
    goalLevelBodyRecomp: 'athletic',
    goalLevelStrength: '30',
    goalLevelFitness: 'active',
  },
};

const DEFAULT_LEVELS: EffectiveGoalLevels = DEFAULTS_BY_GOAL[GOAL_GENERAL_HEALTH];

function getDefaultLevels(primaryGoal: string): EffectiveGoalLevels {
  return DEFAULTS_BY_GOAL[primaryGoal] ?? DEFAULT_LEVELS;
}

/**
 * Returns effective goal levels: formData values when non-empty, else achievable defaults for primary goal.
 */
export function getEffectiveGoalLevels(
  primaryGoal: string,
  formData?: FormData | null
): EffectiveGoalLevels {
  const defaults = getDefaultLevels(primaryGoal);
  if (!formData) return defaults;
  return {
    goalLevelWeightLoss: formData.goalLevelWeightLoss?.trim() || defaults.goalLevelWeightLoss,
    goalLevelMuscle: formData.goalLevelMuscle?.trim() || defaults.goalLevelMuscle,
    goalLevelBodyRecomp: formData.goalLevelBodyRecomp?.trim() || defaults.goalLevelBodyRecomp,
    goalLevelStrength: formData.goalLevelStrength?.trim() || defaults.goalLevelStrength,
    goalLevelFitness: formData.goalLevelFitness?.trim() || defaults.goalLevelFitness,
  };
}

/**
 * Returns the single ambition string for the primary goal (for coachPlanGenerator and similar).
 */
export function getEffectiveGoalAmbition(
  primaryGoal: string,
  formData?: FormData | null
): string {
  const levels = getEffectiveGoalLevels(primaryGoal, formData);
  switch (primaryGoal) {
    case GOAL_WEIGHT_LOSS:
      return levels.goalLevelWeightLoss;
    case GOAL_BUILD_MUSCLE:
      return levels.goalLevelMuscle;
    case GOAL_BODY_RECOMP:
      return levels.goalLevelBodyRecomp;
    case GOAL_BUILD_STRENGTH:
      return levels.goalLevelStrength;
    case GOAL_IMPROVE_FITNESS:
      return levels.goalLevelFitness;
    default:
      return levels.goalLevelFitness;
  }
}

/** Sessions per week for expectation copy */
export type SessionsPerWeek = 3 | 4 | 5;

/**
 * Returns a short expectation line for the primary goal at the given sessions per week.
 * Used in client report and roadmap for "With X sessions per week and consistency you can expect …".
 */
export function getSessionBasedExpectation(
  primaryGoal: string,
  sessionsPerWeek: SessionsPerWeek
): string {
  const weeksBySessions: Record<SessionsPerWeek, Record<string, string>> = {
    3: {
      [GOAL_WEIGHT_LOSS]: 'modest fat loss and improved body composition in 12–16 weeks',
      [GOAL_BUILD_MUSCLE]: 'noticeable muscle gain and strength in 16–24 weeks',
      [GOAL_BODY_RECOMP]: 'visible body recomposition (fat loss + muscle) in 16–20 weeks',
      [GOAL_BUILD_STRENGTH]: 'meaningful strength gains across main lifts in 12–16 weeks',
      [GOAL_IMPROVE_FITNESS]: 'better endurance and recovery in 8–12 weeks',
      [GOAL_GENERAL_HEALTH]: 'improved overall fitness and energy in 8–12 weeks',
    },
    4: {
      [GOAL_WEIGHT_LOSS]: 'steady fat loss and improved body composition in 10–14 weeks',
      [GOAL_BUILD_MUSCLE]: 'solid muscle gain and strength in 12–18 weeks',
      [GOAL_BODY_RECOMP]: 'visible body recomposition in 12–16 weeks',
      [GOAL_BUILD_STRENGTH]: 'meaningful strength gains in 10–14 weeks',
      [GOAL_IMPROVE_FITNESS]: 'better endurance and recovery in 6–10 weeks',
      [GOAL_GENERAL_HEALTH]: 'improved overall fitness in 6–10 weeks',
    },
    5: {
      [GOAL_WEIGHT_LOSS]: 'strong fat loss and body composition change in 8–12 weeks',
      [GOAL_BUILD_MUSCLE]: 'noticeable muscle gain in 10–16 weeks',
      [GOAL_BODY_RECOMP]: 'visible body recomposition in 10–14 weeks',
      [GOAL_BUILD_STRENGTH]: 'meaningful strength gains in 8–12 weeks',
      [GOAL_IMPROVE_FITNESS]: 'clear cardio and recovery gains in 4–8 weeks',
      [GOAL_GENERAL_HEALTH]: 'improved overall fitness in 4–8 weeks',
    },
  };
  const byGoal = weeksBySessions[sessionsPerWeek];
  return byGoal[primaryGoal] ?? byGoal[GOAL_GENERAL_HEALTH];
}
