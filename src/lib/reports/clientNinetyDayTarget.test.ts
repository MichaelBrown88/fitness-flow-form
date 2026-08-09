import { describe, expect, it } from 'vitest';
import { buildClientNinetyDayTarget } from './clientNinetyDayTarget';
import { parseClientGoals } from '@/lib/goals/goalContext';
import type { FormData } from '@/contexts/FormContext';

const weightLossCtx = parseClientGoals(undefined, ['weight-loss']);
const muscleCtx = parseClientGoals(undefined, ['build-muscle']);
const generalCtx = parseClientGoals(undefined, ['general-health']);

function form(overrides: Partial<FormData>): FormData {
  return {
    inbodyWeightKg: '90',
    heightCm: '180',
    dateOfBirth: '1990-01-01',
    gender: 'male',
    trainingFrequency: '3',
    ...overrides,
  } as FormData;
}

describe('buildClientNinetyDayTarget', () => {
  it('returns null without a body weight', () => {
    expect(
      buildClientNinetyDayTarget({ heightCm: '180' } as FormData, undefined, weightLossCtx),
    ).toBeNull();
  });

  it('projects a realistic downward weight target for weight loss', () => {
    const target = buildClientNinetyDayTarget(form({}), undefined, weightLossCtx);
    expect(target).not.toBeNull();
    expect(target!.direction).toBe('lose');
    expect(target!.targetWeightKg!).toBeLessThan(90);
    // Should not vaporise more than ~10% of bodyweight in 90 days.
    expect(target!.targetWeightKg!).toBeGreaterThan(81);
  });

  it('computes daily calories and macros from height + age', () => {
    const target = buildClientNinetyDayTarget(form({}), undefined, weightLossCtx);
    expect(target!.calories).toBeGreaterThan(1200);
    expect(target!.proteinG).toBeGreaterThan(0);
    expect(target!.carbsG).toBeGreaterThan(0);
    expect(target!.fatG).toBeGreaterThan(0);
    // Weight-loss calories sit below a rough maintenance estimate.
    expect(target!.calories!).toBeLessThan(3200);
  });

  it('projects upward for muscle building', () => {
    const target = buildClientNinetyDayTarget(form({}), undefined, muscleCtx);
    expect(target!.direction).toBe('gain');
    expect(target!.targetWeightKg!).toBeGreaterThan(90);
  });

  it('omits macros when height is missing but still returns a weight target', () => {
    const target = buildClientNinetyDayTarget(
      form({ heightCm: '' }),
      undefined,
      weightLossCtx,
    );
    expect(target!.calories).toBeNull();
    expect(target!.targetWeightKg).not.toBeNull();
  });

  it('holds steady for a general-health client with no directional goal', () => {
    const target = buildClientNinetyDayTarget(form({}), undefined, generalCtx);
    expect(target!.direction).toBe('maintain');
  });
});
