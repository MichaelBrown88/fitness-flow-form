import { describe, expect, it } from 'vitest';
import { METADATA_MAX_CLIENT_CAP, parseMetadataInt } from '@shared/metadataInts';

describe('parseMetadataInt (Stripe metadata safety)', () => {
  it('returns clamped fallback when raw is empty', () => {
    expect(parseMetadataInt(undefined, 12, METADATA_MAX_CLIENT_CAP)).toBe(12);
    expect(parseMetadataInt('', 5, 100)).toBe(5);
    expect(parseMetadataInt('   ', 7, 100)).toBe(7);
  });

  it('returns fallback when raw is not a finite integer', () => {
    expect(parseMetadataInt('abc', 3, 100)).toBe(3);
    expect(parseMetadataInt('not-a-number', 8, 100)).toBe(8);
  });

  it('parses integer prefix of numeric strings', () => {
    expect(parseMetadataInt('12.7', 3, 100)).toBe(12);
  });

  it('clamps parsed value to max', () => {
    expect(parseMetadataInt('999999', 1, 100)).toBe(100);
    expect(parseMetadataInt('50', 0, METADATA_MAX_CLIENT_CAP)).toBe(50);
  });
});
