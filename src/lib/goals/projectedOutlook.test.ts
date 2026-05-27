import { describe, it, expect } from 'vitest';
import type { FormData } from '@/contexts/FormContext';
import { buildProjectedOutlook } from './projectedOutlook';
import type { ScoreSummary } from '@/lib/scoring/types';

const minimalScores: ScoreSummary = {
  overall: 55,
  fullProfileScore: 55,
  categories: [],
  synthesis: [],
};

describe('buildProjectedOutlook', () => {
  it('returns outlook for weight-loss goal', () => {
    const formData = {
      inbodyWeightKg: '80',
      trainingHistory: 'beginner',
    } as FormData;
    const out = buildProjectedOutlook(formData, minimalScores, ['weight-loss']);
    expect(out).not.toBeNull();
    expect(out?.bullets.length).toBeGreaterThan(0);
    expect(out?.horizonWeeks).toBeGreaterThan(0);
  });

  it('returns outlook for improve-fitness goal', () => {
    const out = buildProjectedOutlook(
      { trainingHistory: 'intermediate' } as FormData,
      minimalScores,
      ['improve-fitness'],
    );
    expect(out?.horizons?.some((h) => h.months === 1 || h.months === 4 || h.months === 12)).toBe(true);
  });

  it('returns null without scores', () => {
    expect(buildProjectedOutlook({} as FormData, undefined, ['build-muscle'])).toBeNull();
  });
});
