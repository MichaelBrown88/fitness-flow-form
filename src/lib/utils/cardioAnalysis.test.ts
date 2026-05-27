import { describe, expect, it } from 'vitest';
import { resolveCardioPillarRole, parseClientGoals } from '@/lib/goals/goalContext';
import { calculateCardioAnalysis, mapFitnessGoalLevel } from './cardioAnalysis';

/** Salem-like profile: late-20s male, build-muscle goal, submax treadmill-style HRs. */
const SALEM_AGE = 27;
const SALEM_GENDER = 'male' as const;
const SALEM_RHR = 76;
const SALEM_PEAK = 147;
const SALEM_RECOVERY_HR = 127;

describe('resolveCardioPillarRole', () => {
  it('keeps cardio off-path when hypertrophy is the main focus', () => {
    const ctx = parseClientGoals(null, ['build-muscle', 'weight-loss']);
    expect(resolveCardioPillarRole(ctx)).toBe('off-path');
  });

  it('uses primary when improve-fitness is selected', () => {
    const ctx = parseClientGoals(null, ['improve-fitness']);
    expect(resolveCardioPillarRole(ctx)).toBe('primary');
  });
});

describe('calculateCardioAnalysis', () => {
  it('does not assign elite VO2 target for build-muscle maintenance profile', () => {
    const result = calculateCardioAnalysis(
      SALEM_AGE,
      SALEM_GENDER,
      mapFitnessGoalLevel('active'),
      SALEM_RHR,
      SALEM_PEAK,
      SALEM_RECOVERY_HR,
      undefined,
      { pillarRole: 'supporting' },
    );

    expect(result.maintenanceMode).toBe(true);
    expect(result.vo2.current).toBeGreaterThan(38);
    expect(result.vo2.current).toBeLessThan(45);
    expect(result.vo2.target).toBeLessThan(50);
    expect(result.vo2.gap).toBeLessThan(8);
  });

  it('still allows ambitious VO2 gap when fitness is a primary goal', () => {
    const result = calculateCardioAnalysis(
      SALEM_AGE,
      SALEM_GENDER,
      mapFitnessGoalLevel('active'),
      SALEM_RHR,
      SALEM_PEAK,
      SALEM_RECOVERY_HR,
      undefined,
      { pillarRole: 'primary' },
    );

    expect(result.maintenanceMode).toBeUndefined();
    expect(result.vo2.target).toBeGreaterThan(50);
    expect(result.vo2.gap).toBeGreaterThan(10);
  });
});
