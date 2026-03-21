/**
 * Optional one-off: backfill subscription.clientCap and subscription.capacityTierId on org docs
 * from legacy clientSeats / clientCount (GBP capacity model).
 *
 * Run in a trusted environment with Firebase Admin credentials:
 *   GOOGLE_APPLICATION_CREDENTIALS=... npx ts-node --transpile-only src/scripts/migrateLegacyBillingFields.ts
 *
 * Default: dry-run (logs only). To commit batched writes:
 *   MIGRATE_BILLING_COMMIT=1 GOOGLE_APPLICATION_CREDENTIALS=... npx ts-node --transpile-only src/scripts/migrateLegacyBillingFields.ts
 *
 * Uses Firestore batches (max 500 ops each) so each batch commits atomically; if a batch fails,
 * earlier batches stay applied — re-run is safe (skips docs that already have clientCap + capacityTierId).
 */

import * as admin from 'firebase-admin';
import type { DocumentReference, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getPaidTierByClientCount, type PaidCapacityTierId } from '../shared/billing/capacityTiers';

const BATCH_MAX = 450;
const PAGE_SIZE = 500;
const COMMIT = process.env.MIGRATE_BILLING_COMMIT === '1';

function initAdmin(): void {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
}

interface PendingUpdate {
  ref: DocumentReference;
  clientCap: number;
  capacityTierId: PaidCapacityTierId;
  monthlyAiCredits: number;
}

async function main(): Promise<void> {
  initAdmin();
  const db = admin.firestore();
  const pending: PendingUpdate[] = [];

  let lastDoc: QueryDocumentSnapshot | undefined;
  let hasMore = true;
  while (hasMore) {
    let q = db.collection('organizations').orderBy(admin.firestore.FieldPath.documentId()).limit(PAGE_SIZE);
    if (lastDoc) {
      q = q.startAfter(lastDoc);
    }
    const snap = await q.get();
    if (snap.empty) break;

    for (const docSnap of snap.docs) {
      const d = docSnap.data();
      const sub = d.subscription as Record<string, unknown> | undefined;
      if (!sub) continue;
      if (sub.clientCap != null && sub.capacityTierId != null) continue;
      const seats =
        typeof sub.clientSeats === 'number'
          ? sub.clientSeats
          : typeof sub.clientCount === 'number'
            ? sub.clientCount
            : 10;
      const row = getPaidTierByClientCount(seats, 'solo');
      const tierId = row.id as PaidCapacityTierId;
      // eslint-disable-next-line no-console -- migration script
      console.log(
        `${COMMIT ? 'UPDATE' : 'DRY-RUN'} ${docSnap.id}: clientCap=${row.clientLimit}, capacityTierId=${tierId}, monthlyAiCredits=${row.monthlyAiCredits}`,
      );
      pending.push({
        ref: docSnap.ref,
        clientCap: row.clientLimit,
        capacityTierId: tierId,
        monthlyAiCredits: row.monthlyAiCredits,
      });
    }

    lastDoc = snap.docs[snap.docs.length - 1];
    hasMore = snap.size >= PAGE_SIZE;
  }

  if (!COMMIT || pending.length === 0) {
    // eslint-disable-next-line no-console -- migration script
    console.log(COMMIT ? 'No documents to update.' : `Dry-run complete (${pending.length} would update). Set MIGRATE_BILLING_COMMIT=1 to write.`);
    return;
  }

  for (let i = 0; i < pending.length; i += BATCH_MAX) {
    const chunk = pending.slice(i, i + BATCH_MAX);
    const batch = db.batch();
    for (const p of chunk) {
      batch.update(p.ref, {
        'subscription.clientCap': p.clientCap,
        'subscription.capacityTierId': p.capacityTierId,
        'subscription.monthlyAiCredits': p.monthlyAiCredits,
      });
    }
    await batch.commit();
    // eslint-disable-next-line no-console -- migration script
    console.log(`Committed batch ${Math.floor(i / BATCH_MAX) + 1} (${chunk.length} docs).`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
