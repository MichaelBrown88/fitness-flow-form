import { describe, it, expect } from 'vitest';
import { normalizeForComparison } from './assessmentHistory';

/**
 * Tests for normalizeForComparison — the function that gates whether
 * an assessment snapshot is written to Firestore (F4 fix).
 *
 * Critical invariant: two semantically identical objects must produce
 * the same hash regardless of key insertion order.
 */

describe('normalizeForComparison', () => {
  // --- Primitives ---

  it('returns null for undefined', () => {
    expect(normalizeForComparison(undefined)).toBeNull();
  });

  it('returns null for NaN', () => {
    expect(normalizeForComparison(NaN)).toBeNull();
  });

  it('returns null for Infinity', () => {
    expect(normalizeForComparison(Infinity)).toBeNull();
  });

  it('passes through null', () => {
    expect(normalizeForComparison(null)).toBeNull();
  });

  it('passes through strings', () => {
    expect(normalizeForComparison('hello')).toBe('hello');
  });

  it('passes through finite numbers', () => {
    expect(normalizeForComparison(42)).toBe(42);
    expect(normalizeForComparison(0)).toBe(0);
  });

  it('passes through booleans', () => {
    expect(normalizeForComparison(true)).toBe(true);
  });

  // --- Arrays ---

  it('recursively normalizes arrays', () => {
    expect(normalizeForComparison([undefined, 1, 'two'])).toEqual([null, 1, 'two']);
  });

  // --- Key-order determinism (the F4 bug fix) ---

  it('produces identical output regardless of object key insertion order', () => {
    const a = { z: 1, a: 2, m: 3 };
    const b = { a: 2, m: 3, z: 1 };
    expect(JSON.stringify(normalizeForComparison(a))).toBe(
      JSON.stringify(normalizeForComparison(b)),
    );
  });

  it('produces identical output for nested objects with different key order', () => {
    const a = { outer: { z: 'last', a: 'first' } };
    const b = { outer: { a: 'first', z: 'last' } };
    expect(JSON.stringify(normalizeForComparison(a))).toBe(
      JSON.stringify(normalizeForComparison(b)),
    );
  });

  // --- Private keys stripped ---

  it('strips keys starting with underscore', () => {
    const result = normalizeForComparison({ name: 'Alice', _internal: 'secret' }) as Record<string, unknown>;
    expect(result).not.toHaveProperty('_internal');
    expect(result).toHaveProperty('name', 'Alice');
  });

  // --- Base64 image truncation ---

  it('truncates base64 image strings to 200 chars', () => {
    const longImage = 'data:image/jpeg;base64,' + 'A'.repeat(500);
    const result = normalizeForComparison({ photo: longImage }) as Record<string, unknown>;
    expect(typeof result.photo).toBe('string');
    expect((result.photo as string).length).toBe(200);
  });

  it('does not truncate non-image strings', () => {
    const longString = 'x'.repeat(500);
    const result = normalizeForComparison({ notes: longString }) as Record<string, unknown>;
    expect((result.notes as string).length).toBe(500);
  });

  it('does not truncate base64 strings under 200 chars', () => {
    const shortImage = 'data:image/jpeg;base64,AAAA';
    const result = normalizeForComparison({ photo: shortImage }) as Record<string, unknown>;
    expect(result.photo).toBe(shortImage);
  });

  // --- Firestore Timestamp sentinel ---

  it('serializes Timestamp-like objects to ts:<seconds> string', () => {
    const fakeTimestamp = Object.create({ constructor: { name: 'Timestamp' } });
    fakeTimestamp.constructor = { name: 'Timestamp' };
    fakeTimestamp.seconds = 1700000000;
    const result = normalizeForComparison(fakeTimestamp);
    expect(result).toBe('ts:1700000000');
  });

  // --- Change detection: two calls on equivalent data must hash the same ---

  it('two structurally equal objects with different key order hash identically', () => {
    const form1 = { fullName: 'Alice', inbodyWeightKg: '70', dateOfBirth: '1990-01-01' };
    const form2 = { dateOfBirth: '1990-01-01', fullName: 'Alice', inbodyWeightKg: '70' };
    expect(JSON.stringify(normalizeForComparison(form1))).toBe(
      JSON.stringify(normalizeForComparison(form2)),
    );
  });

  it('two objects that differ by one field hash differently', () => {
    const form1 = { fullName: 'Alice', inbodyWeightKg: '70' };
    const form2 = { fullName: 'Alice', inbodyWeightKg: '75' };
    expect(JSON.stringify(normalizeForComparison(form1))).not.toBe(
      JSON.stringify(normalizeForComparison(form2)),
    );
  });
});
