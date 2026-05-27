import { describe, expect, it } from 'vitest';
import type { FormData } from '@/contexts/FormContext';
import { computeBodyCompTargets } from './bodyCompTargets';

function baseForm(overrides: Partial<FormData> = {}): FormData {
  return {
    gender: 'male',
    inbodyBodyFatPct: '28',
    inbodyWeightKg: '90',
    skeletalMuscleMassKg: '38',
    clientGoals: ['weight-loss'],
    trainingFrequency: '3',
    ...overrides,
  } as FormData;
}

describe('computeBodyCompTargets', () => {
  it('weight-loss primary with elevated BF targets meaningful but bounded fat loss', () => {
    const result = computeBodyCompTargets(
      baseForm({ clientGoals: ['weight-loss', 'build-muscle'] }),
    );
    expect(result).not.toBeNull();
    expect(result!.targetBF).toBeLessThan(28);
    expect(result!.targetBF).toBeGreaterThan(8);
    expect(result!.targetLabel).toMatch(/leaner composition/i);
    expect(result!.targetLabel).not.toMatch(/lose \d+ kg/i);
  });

  it('build-muscle primary does not push elite-cut BF for Salem-like profile', () => {
    const result = computeBodyCompTargets(
      baseForm({
        clientGoals: ['build-muscle', 'weight-loss'],
        inbodyBodyFatPct: '22',
        inbodyWeightKg: '82',
        skeletalMuscleMassKg: '36',
      }),
    );
    expect(result).not.toBeNull();
    expect(result!.targetBF).toBeGreaterThanOrEqual(12);
    expect(result!.bodyCompGaps.fat.gap).toBeLessThanOrEqual(0);
  });

  it('fitness primary keeps body comp in supporting role with smaller nudge when BF is moderate', () => {
    const result = computeBodyCompTargets(
      baseForm({
        clientGoals: ['improve-fitness'],
        inbodyBodyFatPct: '19',
      }),
    );
    expect(result).not.toBeNull();
    const gap = result!.bodyCompGaps.fat.gap;
    expect(Math.abs(gap)).toBeLessThan(6);
  });

  it('off-path general health intervenes only when BF is critical', () => {
    const strong = computeBodyCompTargets(
      baseForm({
        clientGoals: ['general-health'],
        inbodyBodyFatPct: '14',
      }),
    );
    expect(strong).not.toBeNull();
    expect(strong!.bodyCompGaps.fat.gap).toBe(0);

    const critical = computeBodyCompTargets(
      baseForm({
        clientGoals: ['general-health'],
        inbodyBodyFatPct: '32',
      }),
    );
    expect(critical).not.toBeNull();
    expect(critical!.bodyCompGaps.fat.gap).toBeLessThan(0);
  });
});
