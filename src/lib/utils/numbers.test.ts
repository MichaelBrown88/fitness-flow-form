import { describe, expect, it } from 'vitest';
import { safeParse } from '@/lib/utils/numbers';

describe('safeParse', () => {
  it('returns fallback for nullish', () => {
    expect(safeParse(undefined, 5)).toBe(5);
    expect(safeParse(null, 5)).toBe(5);
  });

  it('parses numeric strings', () => {
    expect(safeParse('12.5')).toBe(12.5);
    expect(safeParse('-3', 0)).toBe(-3);
  });

  it('returns number values as-is when finite', () => {
    expect(safeParse(42)).toBe(42);
  });

  it('returns fallback for NaN number or non-numeric string', () => {
    expect(safeParse(Number.NaN, 9)).toBe(9);
    expect(safeParse('not-a-number', 1)).toBe(1);
  });
});
