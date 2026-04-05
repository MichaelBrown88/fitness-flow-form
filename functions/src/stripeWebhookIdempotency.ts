/**
 * Stripe webhook idempotency: event-level processing lock + checkout session fulfillment ledger.
 * Admin SDK only — clients must never read/write these collections (see firestore.rules).
 */

import * as admin from 'firebase-admin';

/** Document ID = Stripe Event id (`evt_...`). */
export const STRIPE_INBOUND_EVENTS_COLLECTION = 'stripeInboundEvents';

/** Document ID = Stripe Checkout Session id (`cs_...`) for one-time fulfillments (e.g. credit top-up). */
export const STRIPE_FULFILLED_CHECKOUT_SESSIONS_COLLECTION = 'stripeFulfilledCheckoutSessions';

/** If another invocation holds `processing: true` and started within this window, skip (assume peer is working). */
const PROCESSING_LOCK_STALE_MS = 120_000;

function isAlreadyExistsError(e: unknown): boolean {
  const err = e as { code?: number | string };
  return err.code === 6 || err.code === 'ALREADY_EXISTS' || err.code === 'already-exists';
}

function isProcessingStale(
  data: FirebaseFirestore.DocumentData | undefined,
  nowMs: number,
): boolean {
  if (data?.processing !== true) return true;
  const ts = data.processingStartedAt as admin.firestore.Timestamp | undefined;
  if (!ts || typeof ts.toMillis !== 'function') return true;
  return nowMs - ts.toMillis() >= PROCESSING_LOCK_STALE_MS;
}

export type StripeWebhookClaimResult = 'process' | 'duplicate';

/**
 * Claim exclusive processing for this Stripe event. Returns `duplicate` when the event is already
 * completed, or another invocation holds a fresh processing lock (respond 200 without side effects).
 */
export async function beginStripeWebhookProcessing(
  db: admin.firestore.Firestore,
  event: { id: string; type: string },
): Promise<StripeWebhookClaimResult> {
  const ref = db.collection(STRIPE_INBOUND_EVENTS_COLLECTION).doc(event.id);
  const nowMs = Date.now();

  const outcome = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data();

    if (data?.completed === true) {
      return 'duplicate' as const;
    }

    if (data?.processing === true && !isProcessingStale(data, nowMs)) {
      return 'duplicate' as const;
    }

    tx.set(
      ref,
      {
        stripeEventId: event.id,
        type: event.type,
        receivedAt: admin.firestore.FieldValue.serverTimestamp(),
        processing: true,
        processingStartedAt: admin.firestore.FieldValue.serverTimestamp(),
        completed: false,
      },
      { merge: true },
    );
    return 'process' as const;
  });

  return outcome;
}

/** Mark event successfully processed (clears processing lock). */
export async function markStripeWebhookEventCompleted(
  db: admin.firestore.Firestore,
  eventId: string,
): Promise<void> {
  const ref = db.collection(STRIPE_INBOUND_EVENTS_COLLECTION).doc(eventId);
  await ref.set(
    {
      completed: true,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      processing: false,
    },
    { merge: true },
  );
}

/** Clear processing lock after a failed handler so Stripe retry can re-run. */
export async function clearStripeWebhookProcessingLock(
  db: admin.firestore.Firestore,
  eventId: string,
): Promise<void> {
  const ref = db.collection(STRIPE_INBOUND_EVENTS_COLLECTION).doc(eventId);
  await ref.set(
    {
      processing: false,
      lastFailureAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export type CreditTopupClaimPayload = {
  orgId: string;
  stripeEventId: string;
  quantity: number;
};

/**
 * Returns true if this session was newly claimed for fulfillment; false if already fulfilled.
 */
export async function claimCreditTopupCheckoutSession(
  db: admin.firestore.Firestore,
  checkoutSessionId: string,
  payload: CreditTopupClaimPayload,
): Promise<boolean> {
  const ref = db.collection(STRIPE_FULFILLED_CHECKOUT_SESSIONS_COLLECTION).doc(checkoutSessionId);
  try {
    await ref.create({
      kind: 'credit_topup' as const,
      orgId: payload.orgId,
      stripeEventId: payload.stripeEventId,
      quantity: payload.quantity,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return true;
  } catch (e: unknown) {
    if (isAlreadyExistsError(e)) {
      return false;
    }
    throw e;
  }
}
