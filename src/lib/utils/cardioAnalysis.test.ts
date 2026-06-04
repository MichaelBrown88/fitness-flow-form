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
  it('does not inflate VO2 when peak HR is low (submax test)', () => {
    const result = calculateCardioAnalysis(
      40,
      'male',
      mapFitnessGoalLevel('active'),
      77,
      112,
      91,
      undefined,
      { pillarRole: 'supporting' },
    );

    expect(result.vo2.current).toBeGreaterThan(15);
    expect(result.vo2.current).toBeLessThan(28);
  });

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
    expect(result.vo2.current).toBeLessThanOrEqual(50);
    expect(result.vo2.target).toBeLessThanOrEqual(52);
    expect(result.vo2.gap).toBeLessThan(12);
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
    expect(result.vo2.target).toBeGreaterThan(result.vo2.current);
    expect(result.vo2.gap).toBeGreaterThan(0);
  });
});
