/**
 * Cardiovascular fitness analysis — goal-aware VO₂, RHR, and recovery targets.
 */

import type { PillarRole } from '@/lib/goals/goalContext';
import { resolveCardioPillarRole, parseClientGoals, type ClientGoalContext } from '@/lib/goals/goalContext';
import { classifyHrrDrop, classifyRhr, classifyVo2 } from '@/lib/goals/metricBands';
import {
  computeHigherIsBetterTarget,
  computeLowerIsBetterTarget,
} from '@/lib/goals/targetStrategy';

export interface CardioGapsResult {
  vo2: { current: number; target: number; gap: number };
  rhr: { current: number; target: number; gap: number };
  recovery: { current: number; target: number; gap: number };
  safetyNotice?: string;
  maintenanceMode?: boolean;
  maintenanceNote?: string;
}

export type FitnessAmbitionLevel = 'health' | 'active' | 'athletic' | 'elite';

export interface CardioAnalysisOptions {
  /** Pillar role from client goals (preferred). */
  pillarRole?: PillarRole;
  /** @deprecated Use pillarRole — `maintenance` maps to supporting/off-path. */
  cardioPriority?: 'primary' | 'maintenance';
  clientGoals?: string[];
  primaryGoal?: string;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function mapFitnessGoalLevel(goalLevel: string): FitnessAmbitionLevel {
  if (goalLevel === 'health' || goalLevel === 'active' || goalLevel === 'athletic' || goalLevel === 'elite') {
    return goalLevel;
  }
  return 'active';
}

/** @deprecated Use resolveCardioPillarRole from goalContext */
export function resolveCardioPriority(
  clientGoals: string[] | undefined,
  primaryGoal: string,
): 'primary' | 'maintenance' {
  const role = resolveCardioPillarRole(parseClientGoals(null, clientGoals));
  return role === 'primary' || role === 'secondary' ? 'primary' : 'maintenance';
}

function resolveRole(options: CardioAnalysisOptions | undefined, ctx: ClientGoalContext): PillarRole {
  if (options?.pillarRole) return options.pillarRole;
  if (options?.cardioPriority === 'primary') return 'primary';
  if (options?.cardioPriority === 'maintenance') return 'supporting';
  return resolveCardioPillarRole(ctx);
}

function maintenanceNote(role: PillarRole, vo2Band: string, rhrBand: string, recBand: string): string {
  const ok =
    (vo2Band === 'adequate' || vo2Band === 'strong') &&
    (rhrBand === 'adequate' || rhrBand === 'strong') &&
    (recBand === 'adequate' || recBand === 'strong');
  if (role === 'primary' || role === 'secondary') {
    return 'Your cardio markers guide the programme — we will build capacity in line with your goals.';
  }
  if (ok) {
    return 'Your heart and lungs are in a healthy range for your goals — cardio stays supportive, not the main focus.';
  }
  return 'Light conditioning will support recovery and energy while you focus on your main goals.';
}

function fitnessPercentileTarget(
  ambition: FitnessAmbitionLevel,
  gender: 'male' | 'female',
  age: number,
): number {
  const targets = {
    health: 0.5,
    active: 0.75,
    athletic: 0.85,
    elite: 0.95,
  };
  const percentile = targets[ambition] ?? 0.5;
  let base = gender === 'male' ? 40 : 32;
  const ageAdjust = age > 20 ? (age - 20) * 0.3 : 0;
  base -= ageAdjust;
  const percentileMultiplier = 1 + (percentile - 0.5) * 2;
  return base * percentileMultiplier;
}

export function calculateCardioAnalysis(
  age: number,
  gender: 'male' | 'female',
  ambitionLevel: FitnessAmbitionLevel,
  restingHR: number,
  peakHR: number,
  recoveryHR: number,
  recentActivity?: string,
  options?: CardioAnalysisOptions,
): CardioGapsResult {
  const ctx = parseClientGoals(null, options?.clientGoals);
  if (options?.primaryGoal) {
    ctx.primaryGoal = options.primaryGoal as ClientGoalContext['primaryGoal'];
  }
  const role = resolveRole(options, ctx);
  const maintenanceMode = role !== 'primary' && role !== 'secondary';

  const currentRecovery = peakHR > 0 && recoveryHR > 0 ? peakHR - recoveryHR : 0;

  let currentVO2 = 0;
  if (peakHR > 0 && restingHR > 0 && age > 0) {
    const maxHREstimate = 208 - 0.7 * age;
    const hrReserve = maxHREstimate - restingHR;
    if (hrReserve > 0) {
      const effortUsed = (peakHR - restingHR) / hrReserve;
      if (effortUsed > 0) {
        currentVO2 = (26.8 - 3.5) / effortUsed + 3.5;
        currentVO2 = Math.max(15, Math.min(85, currentVO2));
      }
    }
  }

  const vo2Band = classifyVo2(currentVO2, gender, age);
  const rhrBand = classifyRhr(restingHR);
  const recBand = classifyHrrDrop(currentRecovery);

  let vo2Target: number;
  let rhrTarget: number;
  let recoveryTarget: number;

  if (role === 'primary') {
    const percentileTarget = fitnessPercentileTarget(ambitionLevel, gender, age);
    const vo2Push = computeHigherIsBetterTarget(currentVO2, role, vo2Band, {
      pushUplift: 0.12,
      maxCap: 95,
    });
    vo2Target = Math.max(vo2Push.target, percentileTarget);
    if (currentVO2 >= percentileTarget) {
      vo2Target = round1(currentVO2 * 1.04);
    }

    const rhrResult = computeLowerIsBetterTarget(restingHR, role, rhrBand, { floor: 50 });
    rhrTarget = rhrResult.target;
    const recResult = computeHigherIsBetterTarget(currentRecovery, role, recBand, { maxCap: 55 });
    recoveryTarget = recResult.target;
  } else {
    const vo2Result = computeHigherIsBetterTarget(currentVO2, role, vo2Band, {
      maxMaintenanceUplift: 0.04,
      nudgeUplift: 0.06,
      maxCap: 85,
    });
    vo2Target = round1(vo2Result.target);

    const rhrResult = computeLowerIsBetterTarget(restingHR, role, rhrBand, {
      maxMaintenanceDrop: 0,
      floor: 58,
    });
    rhrTarget = rhrResult.target;

    const recResult = computeHigherIsBetterTarget(currentRecovery, role, recBand, {
      maxMaintenanceUplift: 0,
      nudgeUplift: 0.08,
      maxCap: 40,
    });
    recoveryTarget = recResult.target;
  }

  let safetyNotice = '';
  if (recentActivity === 'stopped-6-months') {
    safetyNotice =
      'Tendon and joint durability may be low after a prolonged break. Caps on high-impact volume are recommended for weeks 1-4.';
  } else if (recentActivity === 'stopped-3-months') {
    safetyNotice = 'Gradual re-introduction of high-intensity work is advised.';
  }

  const note = maintenanceNote(role, vo2Band, rhrBand, recBand);

  return {
    vo2: {
      current: currentVO2,
      target: vo2Target,
      gap: Math.max(0, vo2Target - currentVO2),
    },
    rhr: {
      current: restingHR,
      target: rhrTarget,
      gap: Math.max(0, restingHR - rhrTarget),
    },
    recovery: {
      current: currentRecovery,
      target: recoveryTarget,
      gap: Math.max(0, recoveryTarget - currentRecovery),
    },
    ...(maintenanceMode ? { maintenanceMode: true, maintenanceNote: note } : { maintenanceNote: note }),
    ...(safetyNotice && { safetyNotice }),
  };
}
