import { describe, it, expect } from 'vitest';
import { computeScores, summarizeScores } from '../computeScores';
import type { FormData } from '@/contexts/FormContext';

/**
 * Minimal mock FormData that satisfies the scoring pipeline.
 * Only the fields actually read by the scoring functions are populated.
 */
function createMockFormData(overrides: Partial<FormData> = {}): FormData {
  return {
    dateOfBirth: '1990-06-15',
    gender: 'male',
    // Body composition fields
    weightKg: '80',
    heightCm: '180',
    bodyFatPercentage: '18',
    // Cardio fields
    cardioTestType: 'ymca-step',
    cardioPost1MinHr: '100',
    cardioPeakHr: '160',
    // Strength fields
    pushUpCount: '25',
    squatCount: '30',
    plankSeconds: '60',
    gripLeftKg: '40',
    gripRightKg: '42',
    // Movement quality / posture
    ohsKneeAlignment: 'neutral',
    mobilityHip: 'normal',
    mobilityShoulder: 'normal',
    // Lifestyle
    sleepHours: '7',
    stressLevel: 'moderate',
    ...overrides,
  } as FormData;
}

describe('computeScores', () => {
  it('returns a valid ScoreSummary with all 5 categories', () => {
    const form = createMockFormData();
    const result = computeScores(form);

    expect(result).toBeDefined();
    expect(result.categories).toHaveLength(5);
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
  });

  it('includes the expected category IDs', () => {
    const form = createMockFormData();
    const result = computeScores(form);
    const ids = result.categories.map(c => c.id);

    expect(ids).toContain('bodyComp');
    expect(ids).toContain('cardio');
    expect(ids).toContain('strength');
    expect(ids).toContain('movementQuality');
    expect(ids).toContain('lifestyle');
  });

  it('produces individual scores between 0 and 100', () => {
    const form = createMockFormData();
    const result = computeScores(form);

    for (const category of result.categories) {
      expect(category.score).toBeGreaterThanOrEqual(0);
      expect(category.score).toBeLessThanOrEqual(100);
    }
  });

  it('overall score equals the average of category scores', () => {
    const form = createMockFormData();
    const result = computeScores(form);

    const expectedOverall = Math.round(
      result.categories.reduce((sum, c) => sum + c.score, 0) / result.categories.length
    );
    expect(result.overall).toBe(expectedOverall);
  });

  it('handles missing data gracefully without crashing', () => {
    // Minimal data — most fields empty
    const form = createMockFormData({
      dateOfBirth: '',
      weightKg: '',
      heightCm: '',
    });

    expect(() => computeScores(form)).not.toThrow();
  });
});

describe('summarizeScores', () => {
  it('returns a lightweight summary with overall and category IDs', () => {
    const form = createMockFormData();
    const summary = summarizeScores(form);

    expect(summary.overall).toBeGreaterThanOrEqual(0);
    expect(summary.categories).toHaveLength(5);
    expect(summary.categories[0]).toHaveProperty('id');
    expect(summary.categories[0]).toHaveProperty('score');
    expect(summary.categories[0]).toHaveProperty('weaknesses');
  });
});
