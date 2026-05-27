/**
 * Apply goal role + health band → numeric target (higher-is-better or lower-is-better).
 */

import type { PillarRole } from './goalContext';
import { resolveTargetMode, type HealthBand } from './metricBands';

export interface NumericTargetResult {
  target: number;
  gap: number;
  mode: ReturnType<typeof resolveTargetMode>;
}

export interface HigherIsBetterOptions {
  /** Max uplift for maintain/nudge on non-primary pillars (fraction). */
  maxMaintenanceUplift?: number;
  nudgeUplift?: number;
  pushUplift?: number;
  interveneUplift?: number;
  minStep?: number;
  maxCap?: number;
}

export function computeHigherIsBetterTarget(
  current: number,
  role: PillarRole,
  band: HealthBand,
  opts: HigherIsBetterOptions = {},
): NumericTargetResult {
  const mode = resolveTargetMode(role, band);
  const {
    maxMaintenanceUplift = 0.03,
    nudgeUplift = 0.06,
    pushUplift = 0.15,
    interveneUplift = 0.25,
    minStep = 1,
    maxCap = 9999,
  } = opts;

  if (current <= 0) {
    return { target: 0, gap: 0, mode };
  }

  let target = current;
  switch (mode) {
    case 'maintain':
      target = current;
      break;
    case 'nudge':
      target = current * (1 + (role === 'primary' ? nudgeUplift : maxMaintenanceUplift));
      target = Math.max(current + minStep * 0.5, target);
      break;
    case 'goal_push':
      target = current * (1 + pushUplift);
      target = Math.max(current + minStep, target);
      break;
    case 'intervene':
      target = current * (1 + interveneUplift);
      target = Math.max(current + minStep * 2, target);
      break;
  }

  target = Math.min(maxCap, target);
  const gap = Math.max(0, target - current);
  return { target, gap, mode };
}

export interface LowerIsBetterOptions {
  maxMaintenanceDrop?: number;
  nudgeDrop?: number;
  pushDrop?: number;
  interveneDrop?: number;
  minStep?: number;
  floor?: number;
}

export function computeLowerIsBetterTarget(
  current: number,
  role: PillarRole,
  band: HealthBand,
  opts: LowerIsBetterOptions = {},
): NumericTargetResult {
  const mode = resolveTargetMode(role, band);
  const {
    maxMaintenanceDrop = 0,
    nudgeDrop = 0.04,
    pushDrop = 0.08,
    interveneDrop = 0.12,
    minStep = 2,
    floor = 0,
  } = opts;

  if (current <= 0) {
    return { target: 0, gap: 0, mode };
  }

  let target = current;
  switch (mode) {
    case 'maintain':
      target = current;
      break;
    case 'nudge':
      target = current * (1 - (role === 'primary' ? nudgeDrop : maxMaintenanceDrop));
      target = Math.min(current - minStep * 0.5, target);
      break;
    case 'goal_push':
      target = current * (1 - pushDrop);
      target = Math.min(current - minStep, target);
      break;
    case 'intervene':
      target = current * (1 - interveneDrop);
      target = Math.min(current - minStep * 2, target);
      break;
  }

  target = Math.max(floor, target);
  const gap = Math.max(0, current - target);
  return { target, gap, mode };
}
