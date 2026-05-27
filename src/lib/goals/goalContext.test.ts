import { describe, expect, it } from 'vitest';
import { parseClientGoals, resolvePillarRole } from './goalContext';

describe('goalContext', () => {
  it('prioritises body comp for weight-loss primary', () => {
    const ctx = parseClientGoals(null, ['weight-loss', 'build-muscle']);
    expect(resolvePillarRole('bodyComp', ctx)).toBe('primary');
    expect(resolvePillarRole('cardio', ctx)).toBe('supporting');
  });

  it('prioritises cardio for improve-fitness primary', () => {
    const ctx = parseClientGoals(null, ['improve-fitness']);
    expect(resolvePillarRole('cardio', ctx)).toBe('primary');
  });

  it('treats strength as secondary when build-muscle is primary', () => {
    const ctx = parseClientGoals(null, ['build-muscle', 'weight-loss']);
    expect(resolvePillarRole('bodyComp', ctx)).toBe('primary');
    expect(resolvePillarRole('strength', ctx)).toBe('secondary');
    expect(resolvePillarRole('cardio', ctx)).toBe('off-path');
  });
});
