/**
 * Health bands for metrics — drives maintain / nudge / push / intervene targeting.
 */

import type { PillarRole } from './goalContext';

export type HealthBand = 'critical' | 'weak' | 'adequate' | 'strong';

export type TargetMode = 'maintain' | 'nudge' | 'goal_push' | 'intervene';

export function resolveTargetMode(role: PillarRole, band: HealthBand): TargetMode {
  const onPath = role === 'primary' || role === 'secondary';

  if (band === 'critical') {
    return onPath ? 'intervene' : 'intervene';
  }
  if (band === 'weak') {
    return onPath ? 'goal_push' : 'nudge';
  }
  if (band === 'adequate') {
    if (role === 'primary') return 'goal_push';
    if (role === 'secondary') return 'nudge';
    return role === 'supporting' ? 'maintain' : 'nudge';
  }
  // strong
  if (role === 'primary') return 'nudge';
  return 'maintain';
}

export function classifyVo2(vo2: number, gender: 'male' | 'female', age: number): HealthBand {
  if (vo2 <= 0) return 'weak';
  const isFemale = gender === 'female';
  const ageBand = age < 30 ? 0 : age < 40 ? 1 : age < 50 ? 2 : 3;
  const weakBelow = isFemale ? [24, 23, 22, 21][ageBand] : [32, 31, 30, 29][ageBand];
  const adequateBelow = isFemale ? [34, 33, 32, 31][ageBand] : [42, 41, 40, 39][ageBand];
  const strongAbove = isFemale ? [44, 42, 40, 38][ageBand] : [52, 50, 48, 46][ageBand];
  if (vo2 < weakBelow) return 'critical';
  if (vo2 < adequateBelow) return 'weak';
  if (vo2 >= strongAbove) return 'strong';
  return 'adequate';
}

export function classifyRhr(rhr: number): HealthBand {
  if (rhr <= 0) return 'weak';
  if (rhr >= 90) return 'critical';
  if (rhr >= 82) return 'weak';
  if (rhr <= 62) return 'strong';
  if (rhr <= 72) return 'adequate';
  return 'weak';
}

export function classifyHrrDrop(recoveryBpm: number): HealthBand {
  if (recoveryBpm <= 0) return 'weak';
  if (recoveryBpm < 12) return 'critical';
  if (recoveryBpm < 15) return 'weak';
  if (recoveryBpm >= 28) return 'strong';
  if (recoveryBpm >= 18) return 'adequate';
  return 'weak';
}

export function classifyBodyFatPct(bf: number, gender: 'male' | 'female'): HealthBand {
  if (bf <= 0) return 'weak';
  if (gender === 'male') {
    if (bf >= 30) return 'critical';
    if (bf >= 25) return 'weak';
    if (bf <= 15) return 'strong';
    if (bf <= 20) return 'adequate';
    return 'weak';
  }
  if (bf >= 38) return 'critical';
  if (bf >= 32) return 'weak';
  if (bf <= 22) return 'strong';
  if (bf <= 28) return 'adequate';
  return 'weak';
}

export function classifyFunctionalTotalReps(
  total: number,
  gender: 'male' | 'female',
): HealthBand {
  if (total <= 0) return 'weak';
  const gold = gender === 'male' ? 75 : 50;
  if (total < gold * 0.4) return 'critical';
  if (total < gold * 0.65) return 'weak';
  if (total >= gold * 0.95) return 'strong';
  if (total >= gold * 0.75) return 'adequate';
  return 'weak';
}

export function classifyPlankSeconds(seconds: number): HealthBand {
  if (seconds <= 0) return 'weak';
  if (seconds < 30) return 'critical';
  if (seconds < 45) return 'weak';
  if (seconds >= 120) return 'strong';
  if (seconds >= 60) return 'adequate';
  return 'weak';
}
