import { describe, expect, it } from 'vitest';
import type { FormData } from '@/contexts/FormContext';
import { deriveMobilityFromPatterns, resolveMobilityForScoring } from './deriveMobilityFromPatterns';

const emptyForm = {} as FormData;

describe('deriveMobilityFromPatterns', () => {
  it('returns good shoulder and hip when OHS looks clean', () => {
    const derived = deriveMobilityFromPatterns({
      ...emptyForm,
      ohsShoulderMobility: 'full-range',
      ohsSquatDepth: 'full-depth',
      ohsTorsoLean: 'upright',
      ohsFeetPosition: 'stable',
      ohsKneeAlignment: 'stable',
      hingeDepth: 'good',
      hingeBackRounding: 'none',
    });
    expect(derived.shoulder).toBe('good');
    expect(derived.hip).toBe('good');
  });

  it('worst-of rules flag poor hip from limited squat depth', () => {
    const derived = deriveMobilityFromPatterns({
      ...emptyForm,
      ohsSquatDepth: 'no-depth',
      hingeDepth: 'good',
    });
    expect(derived.hip).toBe('poor');
  });

  it('uses worse ankle side from lunge knee alignment', () => {
    const derived = deriveMobilityFromPatterns({
      ...emptyForm,
      ohsSquatDepth: 'full-depth',
      ohsFeetPosition: 'stable',
      lungeLeftKneeAlignment: 'tracks-straight',
      lungeRightKneeAlignment: 'caves-inward',
    });
    expect(derived.ankleLeft).toBe('good');
    expect(derived.ankleRight).toBe('poor');
  });
});

describe('resolveMobilityForScoring', () => {
  it('prefers explicit legacy mobility fields when present', () => {
    const resolved = resolveMobilityForScoring({
      ...emptyForm,
      mobilityHip: 'fair',
      mobilityShoulder: 'good',
      mobilityAnkleLeft: 'poor',
      ohsSquatDepth: 'no-depth',
    });
    expect(resolved.inferred).toBe(false);
    expect(resolved.hip).toBe('fair');
    expect(resolved.ankleLeft).toBe('poor');
  });

  it('falls back to derived values when mobility fields empty', () => {
    const resolved = resolveMobilityForScoring({
      ...emptyForm,
      ohsShoulderMobility: 'limited',
    });
    expect(resolved.inferred).toBe(true);
    expect(resolved.shoulder).toBe('poor');
  });
});
