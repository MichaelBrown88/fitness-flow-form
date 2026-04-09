import { describe, it, expect } from 'vitest';
import { clamp, calculateAge, lookupNormativeScore } from './scoringUtils';
import { scoreBodyComp } from './bodyCompositionScoring';
import { computeScores } from './computeScores';
import { initialFormData } from '@/types/assessmentForm';
import type { FormData } from '@/types/assessmentForm';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a FormData with all inBody analyzer fields populated for a male aged 30. */
function makeAnalyzerForm(overrides: Partial<FormData> = {}): FormData {
  return {
    ...initialFormData,
    fullName: 'Test User',
    dateOfBirth: '1994-01-01', // ~30 years old relative to fixed tests
    gender: 'male',
    inbodyWeightKg: '80',
    heightCm: '178',
    inbodyBodyFatPct: '18',
    skeletalMuscleMassKg: '36',
    visceralFatLevel: '8',
    waistHipRatio: '0.82',
    ...overrides,
  };
}

/** Minimal measurement-only form (no InBody device data). */
function makeMeasurementForm(overrides: Partial<FormData> = {}): FormData {
  return {
    ...initialFormData,
    fullName: 'Test User',
    dateOfBirth: '1989-06-15',
    gender: 'male',
    inbodyWeightKg: '85',
    heightCm: '180',
    waistCm: '88',
    neckCm: '40',
    hipsCm: '100',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// clamp
// ---------------------------------------------------------------------------

describe('clamp', () => {
  it('returns value within range unchanged', () => {
    expect(clamp(50)).toBe(50);
  });

  it('clamps below minimum to 0', () => {
    expect(clamp(-10)).toBe(0);
  });

  it('clamps above maximum to 100', () => {
    expect(clamp(150)).toBe(100);
  });

  it('respects custom min/max', () => {
    expect(clamp(5, 10, 90)).toBe(10);
    expect(clamp(95, 10, 90)).toBe(90);
    expect(clamp(50, 10, 90)).toBe(50);
  });

  it('handles boundary values exactly', () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// calculateAge
// ---------------------------------------------------------------------------

describe('calculateAge', () => {
  it('returns 0 for empty string', () => {
    expect(calculateAge('')).toBe(0);
  });

  it('returns 0 for invalid date', () => {
    expect(calculateAge('not-a-date')).toBe(0);
  });

  it('returns a positive integer for a valid past date', () => {
    const age = calculateAge('1990-01-01');
    expect(age).toBeGreaterThan(30);
    expect(Number.isInteger(age)).toBe(true);
  });

  it('handles birthday on today correctly (no off-by-one)', () => {
    const today = new Date();
    const dob = `${today.getFullYear() - 25}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(calculateAge(dob)).toBe(25);
  });
});

// ---------------------------------------------------------------------------
// lookupNormativeScore
// ---------------------------------------------------------------------------

describe('lookupNormativeScore', () => {
  it('returns 0 when test name not found in DB', () => {
    expect(lookupNormativeScore('nonexistent_test', 'male', 30, 50)).toBe(0);
  });

  it('returns 100 for excellent Push-up value (higher is better)', () => {
    // Male 30-39 excellent threshold = 39 reps
    const score = lookupNormativeScore('Push-up', 'male', 35, 50);
    expect(score).toBe(100);
  });

  it('returns low score for poor Push-up value', () => {
    // Male 30-39 poor threshold = 11 reps
    const score = lookupNormativeScore('Push-up', 'male', 35, 5);
    expect(score).toBeLessThanOrEqual(10);
  });

  it('scores Recovery HR lower-is-better correctly', () => {
    // Male 26-35: excellent = 73 BPM, poor = 119 BPM
    const excellent = lookupNormativeScore('Recovery HR', 'male', 30, 68);
    const poor = lookupNormativeScore('Recovery HR', 'male', 30, 125);
    expect(excellent).toBeGreaterThan(poor);
  });
});

// ---------------------------------------------------------------------------
// scoreBodyComp
// ---------------------------------------------------------------------------

describe('scoreBodyComp', () => {
  it('returns assessed=true when analyzer data is present', () => {
    const result = scoreBodyComp(makeAnalyzerForm(), 30, 'male');
    expect(result.assessed).toBe(true);
  });

  it('returns assessed=true when only body measurements are provided', () => {
    const result = scoreBodyComp(makeMeasurementForm(), 35, 'male');
    expect(result.assessed).toBe(true);
  });

  it('returns assessed=false when no body data is provided', () => {
    const result = scoreBodyComp(initialFormData, 30, 'male');
    expect(result.assessed).toBe(false);
  });

  it('score is clamped to 0-100', () => {
    const result = scoreBodyComp(makeAnalyzerForm(), 30, 'male');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('healthy body fat returns a high sub-score', () => {
    // 18% body fat male → should be in a good range
    const result = scoreBodyComp(makeAnalyzerForm({ inbodyBodyFatPct: '18' }), 30, 'male');
    expect(result.score).toBeGreaterThan(50);
  });

  it('very high body fat returns a lower score than healthy', () => {
    const healthy = scoreBodyComp(makeAnalyzerForm({ inbodyBodyFatPct: '15' }), 30, 'male');
    const obese = scoreBodyComp(makeAnalyzerForm({ inbodyBodyFatPct: '40' }), 30, 'male');
    expect(healthy.score).toBeGreaterThan(obese.score);
  });

  it('id is bodyComp', () => {
    expect(scoreBodyComp(makeAnalyzerForm(), 30, 'male').id).toBe('bodyComp');
  });
});

// ---------------------------------------------------------------------------
// computeScores
// ---------------------------------------------------------------------------

describe('computeScores', () => {
  it('overall is 0 when no data is provided', () => {
    const result = computeScores(initialFormData);
    expect(result.overall).toBe(0);
  });

  it('overall is between 0 and 100', () => {
    const result = computeScores(makeAnalyzerForm());
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
  });

  it('fullProfileScore is null when not all five pillars are assessed', () => {
    // Only body comp data present
    const result = computeScores(makeAnalyzerForm());
    expect(result.fullProfileScore).toBeNull();
  });

  it('returns 5 categories', () => {
    const result = computeScores(makeAnalyzerForm());
    expect(result.categories).toHaveLength(5);
  });

  it('categories contain all pillar ids', () => {
    const result = computeScores(makeAnalyzerForm());
    const ids = result.categories.map((c) => c.id);
    expect(ids).toContain('bodyComp');
    expect(ids).toContain('cardio');
    expect(ids).toContain('strength');
    expect(ids).toContain('movementQuality');
    expect(ids).toContain('lifestyle');
  });

  it('overall equals mean of assessed pillar scores (rounded)', () => {
    const result = computeScores(makeAnalyzerForm());
    const assessed = result.categories.filter((c) => c.assessed);
    if (assessed.length === 0) return;
    const mean = assessed.reduce((acc, c) => acc + c.score, 0) / assessed.length;
    expect(result.overall).toBe(Math.round(mean));
  });

  it('a better profile scores higher than a worse profile', () => {
    const good = computeScores(
      makeAnalyzerForm({
        inbodyBodyFatPct: '12',
        skeletalMuscleMassKg: '42',
        visceralFatLevel: '4',
        waistHipRatio: '0.78',
      }),
    );
    const poor = computeScores(
      makeAnalyzerForm({
        inbodyBodyFatPct: '38',
        skeletalMuscleMassKg: '24',
        visceralFatLevel: '16',
        waistHipRatio: '1.05',
      }),
    );
    expect(good.overall).toBeGreaterThan(poor.overall);
  });
});
