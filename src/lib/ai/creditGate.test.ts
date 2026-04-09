import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkAndDecrementAICredit, AICreditExhaustedError } from './creditGate';

// ---------------------------------------------------------------------------
// Mock firebase/firestore so the test never touches a real database.
// We capture the transaction callback and invoke it with a controllable
// snapshot, letting us test every branch of the gate logic.
// ---------------------------------------------------------------------------

let capturedCredits: unknown = undefined;
let docMissing = false;
let updatedWith: Record<string, unknown> | null = null;

vi.mock('firebase/firestore', () => {
  const doc = vi.fn(() => 'mock-org-ref');

  const runTransaction = vi.fn(async (_db: unknown, fn: (tx: unknown) => Promise<void>) => {
    updatedWith = null;
    const tx = {
      get: vi.fn(async () => ({
        exists: () => !docMissing,
        data: () => ({ assessmentCredits: capturedCredits }),
      })),
      update: vi.fn((_ref: unknown, data: Record<string, unknown>) => {
        updatedWith = data;
      }),
    };
    await fn(tx);
  });

  return { doc, runTransaction };
});

vi.mock('@/services/firebase', () => ({ db: 'mock-db' }));

// ---------------------------------------------------------------------------

describe('checkAndDecrementAICredit', () => {
  beforeEach(() => {
    capturedCredits = undefined;
    docMissing = false;
    updatedWith = null;
  });

  it('allows the call when org doc is missing (permissive fallback)', async () => {
    docMissing = true;
    await expect(checkAndDecrementAICredit('org_missing')).resolves.toBeUndefined();
    expect(updatedWith).toBeNull();
  });

  it('allows the call when assessmentCredits field is null (legacy org)', async () => {
    capturedCredits = null;
    await expect(checkAndDecrementAICredit('org_legacy')).resolves.toBeUndefined();
    expect(updatedWith).toBeNull();
  });

  it('allows the call when assessmentCredits field is undefined (legacy org)', async () => {
    capturedCredits = undefined;
    await expect(checkAndDecrementAICredit('org_legacy')).resolves.toBeUndefined();
    expect(updatedWith).toBeNull();
  });

  it('allows the call without decrement when balance >= 9999 (unlimited tier)', async () => {
    capturedCredits = 9999;
    await expect(checkAndDecrementAICredit('org_unlimited')).resolves.toBeUndefined();
    expect(updatedWith).toBeNull();
  });

  it('allows the call without decrement when balance is above unlimited threshold', async () => {
    capturedCredits = 99999;
    await expect(checkAndDecrementAICredit('org_unlimited')).resolves.toBeUndefined();
    expect(updatedWith).toBeNull();
  });

  it('throws AICreditExhaustedError when balance is 0', async () => {
    capturedCredits = 0;
    await expect(checkAndDecrementAICredit('org_empty')).rejects.toThrow(AICreditExhaustedError);
  });

  it('throws AICreditExhaustedError when balance is negative', async () => {
    capturedCredits = -5;
    await expect(checkAndDecrementAICredit('org_negative')).rejects.toThrow(AICreditExhaustedError);
  });

  it('decrements balance by 1 when balance is 1', async () => {
    capturedCredits = 1;
    await checkAndDecrementAICredit('org_last_credit');
    expect(updatedWith).toEqual({ assessmentCredits: 0 });
  });

  it('decrements balance by 1 when balance is 50', async () => {
    capturedCredits = 50;
    await checkAndDecrementAICredit('org_normal');
    expect(updatedWith).toEqual({ assessmentCredits: 49 });
  });

  it('treats non-numeric credits as 0 and throws AICreditExhaustedError', async () => {
    capturedCredits = 'broken';
    await expect(checkAndDecrementAICredit('org_bad_data')).rejects.toThrow(AICreditExhaustedError);
  });

  it('AICreditExhaustedError has correct name and message', () => {
    const err = new AICreditExhaustedError();
    expect(err.name).toBe('AICreditExhaustedError');
    expect(err.message).toMatch(/zero/i);
    expect(err).toBeInstanceOf(Error);
  });
});
