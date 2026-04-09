/**
 * creditGate
 *
 * Atomically checks and decrements `assessmentCredits` on the org document
 * before a billable Gemini call. Using a transaction prevents two concurrent
 * AI calls from both passing a balance of 1 and going negative.
 *
 * Rules:
 *   null / undefined  → field absent (legacy org) — allow without decrement
 *   >= 9999           → unlimited tier — allow without decrement
 *   <= 0              → exhausted — throw AICreditExhaustedError
 *   otherwise         → decrement by 1 and allow
 */

import { doc, runTransaction } from 'firebase/firestore';
import { db } from '@/services/firebase';

export class AICreditExhaustedError extends Error {
  constructor() {
    super('Your AI credit balance is zero. Please top up to continue using AI features.');
    this.name = 'AICreditExhaustedError';
  }
}

const UNLIMITED_THRESHOLD = 9999;

export async function checkAndDecrementAICredit(organizationId: string): Promise<void> {
  const orgRef = doc(db, 'organizations', organizationId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(orgRef);

    if (!snap.exists()) {
      // Org doc missing — be permissive rather than blocking the call
      return;
    }

    const credits: unknown = snap.data().assessmentCredits;

    // Field absent → legacy org with no credit tracking — allow
    if (credits === null || credits === undefined) return;

    const balance = typeof credits === 'number' ? credits : 0;

    // Unlimited tier
    if (balance >= UNLIMITED_THRESHOLD) return;

    // Exhausted
    if (balance <= 0) {
      throw new AICreditExhaustedError();
    }

    // Decrement
    tx.update(orgRef, { assessmentCredits: balance - 1 });
  });
}
