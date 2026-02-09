import { describe, it, expect } from 'vitest';
import {
  generateCadenceRecommendations,
  getEffectiveInterval,
  getEffectiveReason,
  getEffectivePriority,
} from '../cadenceEngine';
import { BASE_CADENCE_INTERVALS } from '@/types/client';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary, ScoreCategory } from '@/lib/scoring/types';
import type { PillarCadence } from '@/types/client';

/**
 * Helper: create a minimal ScoreCategory
 */
function mockCategory(
  id: ScoreCategory['id'],
  score: number,
  title = ''
): ScoreCategory {
  return {
    id,
    title: title || id,
    score,
    details: [],
    strengths: [],
    weaknesses: [],
  };
}

/**
 * Helper: create a minimal ScoreSummary
 */
function mockScores(overrides: Partial<Record<ScoreCategory['id'], number>> = {}): ScoreSummary {
  const scores = {
    bodyComp: 65,
    cardio: 65,
    strength: 65,
    movementQuality: 65,
    lifestyle: 65,
    ...overrides,
  };
  const categories = Object.entries(scores).map(([id, score]) =>
    mockCategory(id as ScoreCategory['id'], score)
  );
  const overall = Math.round(categories.reduce((s, c) => s + c.score, 0) / categories.length);
  return { overall, categories, synthesis: [] };
}

/**
 * Helper: create minimal FormData
 */
function mockFormData(overrides: Partial<FormData> = {}): FormData {
  return {
    gender: 'male',
    dateOfBirth: '1990-01-01',
    ...overrides,
  } as FormData;
}

// ---------------------------------------------------------------------------
// Base cadence tests
// ---------------------------------------------------------------------------
describe('generateCadenceRecommendations — base intervals', () => {
  it('returns clinical baselines when scores are neutral and no goals', () => {
    const result = generateCadenceRecommendations(mockFormData(), mockScores());

    expect(result.schedule.inbody.intervalDays).toBe(BASE_CADENCE_INTERVALS.inbody);
    expect(result.schedule.posture.intervalDays).toBe(BASE_CADENCE_INTERVALS.posture);
    expect(result.schedule.fitness.intervalDays).toBe(BASE_CADENCE_INTERVALS.fitness);
    expect(result.schedule.strength.intervalDays).toBe(BASE_CADENCE_INTERVALS.strength);
    expect(result.warnings).toHaveLength(0);
  });

  it('returns medium priority by default', () => {
    const result = generateCadenceRecommendations(mockFormData(), mockScores());

    expect(result.schedule.inbody.priority).toBe('medium');
    expect(result.schedule.posture.priority).toBe('medium');
  });
});

// ---------------------------------------------------------------------------
// Score-based modifier tests
// ---------------------------------------------------------------------------
describe('generateCadenceRecommendations — score-based modifiers', () => {
  it('reduces interval by 50% for critical scores (< 40)', () => {
    const scores = mockScores({ bodyComp: 30 });
    const result = generateCadenceRecommendations(mockFormData(), scores);

    expect(result.schedule.inbody.intervalDays).toBe(
      Math.round(BASE_CADENCE_INTERVALS.inbody * 0.5)
    );
    expect(result.schedule.inbody.priority).toBe('high');
  });

  it('reduces interval by 25% for needsWork scores (40-59)', () => {
    const scores = mockScores({ strength: 50 });
    const result = generateCadenceRecommendations(mockFormData(), scores);

    expect(result.schedule.strength.intervalDays).toBe(
      Math.round(BASE_CADENCE_INTERVALS.strength * 0.75)
    );
    expect(result.schedule.strength.priority).toBe('medium');
  });

  it('extends interval by 25% for strong scores (>= 80)', () => {
    const scores = mockScores({ cardio: 85 });
    const result = generateCadenceRecommendations(mockFormData(), scores);

    expect(result.schedule.fitness.intervalDays).toBe(
      Math.round(BASE_CADENCE_INTERVALS.fitness * 1.25)
    );
    expect(result.schedule.fitness.priority).toBe('low');
  });
});

// ---------------------------------------------------------------------------
// Visceral fat override tests
// ---------------------------------------------------------------------------
describe('generateCadenceRecommendations — visceral fat override', () => {
  it('sets inbody to 14 days when visceral fat > 10', () => {
    const form = mockFormData({ visceralFatLevel: '15' });
    const result = generateCadenceRecommendations(form, mockScores());

    expect(result.schedule.inbody.intervalDays).toBe(14);
    expect(result.schedule.inbody.priority).toBe('high');
    expect(result.schedule.inbody.reason).toContain('visceral fat');
  });

  it('adds a critical_finding warning for elevated visceral fat', () => {
    const form = mockFormData({ visceralFatLevel: '12' });
    const result = generateCadenceRecommendations(form, mockScores());

    const warning = result.warnings.find(
      w => w.pillar === 'inbody' && w.type === 'critical_finding'
    );
    expect(warning).toBeDefined();
    expect(warning?.message).toContain('12');
  });

  it('does not override inbody when visceral fat <= 10', () => {
    const form = mockFormData({ visceralFatLevel: '8' });
    const result = generateCadenceRecommendations(form, mockScores());

    expect(result.schedule.inbody.intervalDays).toBe(BASE_CADENCE_INTERVALS.inbody);
  });
});

// ---------------------------------------------------------------------------
// Knee valgus override tests
// ---------------------------------------------------------------------------
describe('generateCadenceRecommendations — knee valgus override', () => {
  it('sets posture to 28 days when knee valgus detected', () => {
    const form = mockFormData({ ohsKneeAlignment: 'valgus' });
    const result = generateCadenceRecommendations(form, mockScores());

    expect(result.schedule.posture.intervalDays).toBe(28);
    expect(result.schedule.posture.priority).toBe('high');
  });

  it('adds a critical_finding warning for knee valgus', () => {
    const form = mockFormData({ ohsKneeAlignment: 'valgus' });
    const result = generateCadenceRecommendations(form, mockScores());

    const warning = result.warnings.find(
      w => w.pillar === 'posture' && w.type === 'critical_finding'
    );
    expect(warning).toBeDefined();
    expect(warning?.message).toContain('valgus');
  });

  it('does not override posture when knee alignment is neutral', () => {
    const form = mockFormData({ ohsKneeAlignment: 'neutral' });
    const result = generateCadenceRecommendations(form, mockScores());

    // Should remain at base interval (or score-modified, not finding-overridden)
    expect(result.schedule.posture.intervalDays).toBe(BASE_CADENCE_INTERVALS.posture);
  });
});

// ---------------------------------------------------------------------------
// Goal-based modifier tests
// ---------------------------------------------------------------------------
describe('generateCadenceRecommendations — goal-based modifiers', () => {
  it('sets inbody to 14 days for weight-loss goal with hydration warning', () => {
    const form = mockFormData({ clientGoals: ['weight-loss'] });
    const result = generateCadenceRecommendations(form, mockScores());

    expect(result.schedule.inbody.intervalDays).toBe(14);
    expect(result.warnings.some(w => w.type === 'hydration')).toBe(true);
  });

  it('sets inbody to 21 days for build-muscle goal', () => {
    const form = mockFormData({ clientGoals: ['build-muscle'] });
    const result = generateCadenceRecommendations(form, mockScores());

    expect(result.schedule.inbody.intervalDays).toBe(21);
  });
});

// ---------------------------------------------------------------------------
// getEffectiveInterval tests
// ---------------------------------------------------------------------------
describe('getEffectiveInterval', () => {
  const recommended: PillarCadence = {
    inbody: { intervalDays: 14, priority: 'high', reason: 'test' },
    posture: { intervalDays: 45, priority: 'medium', reason: 'test' },
    fitness: { intervalDays: 30, priority: 'medium', reason: 'test' },
    strength: { intervalDays: 60, priority: 'low', reason: 'test' },
  };

  it('returns recommended interval when no custom override', () => {
    expect(getEffectiveInterval(recommended, undefined, 'inbody')).toBe(14);
    expect(getEffectiveInterval(recommended, {}, 'inbody')).toBe(14);
  });

  it('returns custom interval when override exists', () => {
    const custom: Partial<PillarCadence> = {
      inbody: { intervalDays: 30, priority: 'medium', reason: 'coach override' },
    };
    expect(getEffectiveInterval(recommended, custom, 'inbody')).toBe(30);
  });

  it('returns base fallback when both recommended and custom are undefined', () => {
    expect(getEffectiveInterval(undefined, undefined, 'strength')).toBe(
      BASE_CADENCE_INTERVALS.strength
    );
  });
});

// ---------------------------------------------------------------------------
// getEffectiveReason / getEffectivePriority tests
// ---------------------------------------------------------------------------
describe('getEffectiveReason', () => {
  it('returns custom reason over recommended', () => {
    const recommended: PillarCadence = {
      inbody: { intervalDays: 14, priority: 'high', reason: 'auto reason' },
      posture: { intervalDays: 45, priority: 'medium', reason: 'auto' },
      fitness: { intervalDays: 45, priority: 'medium', reason: 'auto' },
      strength: { intervalDays: 60, priority: 'low', reason: 'auto' },
    };
    const custom: Partial<PillarCadence> = {
      inbody: { intervalDays: 30, priority: 'medium', reason: 'coach said so' },
    };
    expect(getEffectiveReason(recommended, custom, 'inbody')).toBe('coach said so');
  });

  it('returns fallback when nothing is set', () => {
    expect(getEffectiveReason(undefined, undefined, 'posture')).toBe('Scheduled retest');
  });
});

describe('getEffectivePriority', () => {
  it('returns custom priority over recommended', () => {
    const recommended: PillarCadence = {
      inbody: { intervalDays: 14, priority: 'high', reason: 'test' },
      posture: { intervalDays: 45, priority: 'medium', reason: 'test' },
      fitness: { intervalDays: 45, priority: 'medium', reason: 'test' },
      strength: { intervalDays: 60, priority: 'low', reason: 'test' },
    };
    const custom: Partial<PillarCadence> = {
      inbody: { intervalDays: 30, priority: 'low', reason: 'downgraded' },
    };
    expect(getEffectivePriority(recommended, custom, 'inbody')).toBe('low');
  });

  it('returns medium as fallback', () => {
    expect(getEffectivePriority(undefined, undefined, 'fitness')).toBe('medium');
  });
});
