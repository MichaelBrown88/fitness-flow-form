import { describe, it, expect } from 'vitest';
import { clamp, calculateAge } from '../scoringUtils';

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(50)).toBe(50);
  });

  it('clamps to minimum', () => {
    expect(clamp(-10)).toBe(0);
    expect(clamp(-1, 0, 100)).toBe(0);
  });

  it('clamps to maximum', () => {
    expect(clamp(150)).toBe(100);
    expect(clamp(101, 0, 100)).toBe(100);
  });

  it('respects custom min/max', () => {
    expect(clamp(5, 10, 20)).toBe(10);
    expect(clamp(25, 10, 20)).toBe(20);
    expect(clamp(15, 10, 20)).toBe(15);
  });

  it('handles edge cases at boundaries', () => {
    expect(clamp(0)).toBe(0);
    expect(clamp(100)).toBe(100);
  });
});

describe('calculateAge', () => {
  it('calculates age from date of birth string', () => {
    // Use a date that's far enough in the past to be stable
    const age = calculateAge('1990-01-01');
    // Should be 36 in 2026
    expect(age).toBeGreaterThanOrEqual(35);
    expect(age).toBeLessThanOrEqual(37);
  });

  it('returns 0 for empty string', () => {
    expect(calculateAge('')).toBe(0);
  });

  it('returns 0 for invalid date', () => {
    expect(calculateAge('not-a-date')).toBe(0);
  });

  it('handles recent dates correctly', () => {
    const thisYear = new Date().getFullYear();
    // Born last year — should be 0 or 1
    const age = calculateAge(`${thisYear - 1}-06-15`);
    expect(age).toBeGreaterThanOrEqual(0);
    expect(age).toBeLessThanOrEqual(1);
  });

  it('handles birthday not yet occurred this year', () => {
    const thisYear = new Date().getFullYear();
    // Born 30 years ago in December — if current month is before Dec, age should be 29
    const age = calculateAge(`${thisYear - 30}-12-31`);
    const now = new Date();
    if (now.getMonth() < 11) {
      // Before December
      expect(age).toBe(29);
    } else if (now.getMonth() === 11 && now.getDate() >= 31) {
      expect(age).toBe(30);
    } else {
      expect(age).toBe(29);
    }
  });
});
