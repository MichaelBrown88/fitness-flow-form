/**
 * Optional one-off: backfill subscription.clientCap and subscription.capacityTierId on org docs
 * from legacy clientSeats / clientCount (GBP capacity model).
 *
 * Run in a trusted environment with Firebase Admin credentials:
 *   GOOGLE_APPLICATION_CREDENTIALS=... npx ts-node --transpile-only src/scripts/migrateLegacyBillingFields.ts
 *
 * Review output before uncommenting batch commits.
 */

import * as admin from 'firebase-admin';
import { getPaidTierByClientCount, type PaidCapacityTierId } from '../shared/billing/capacityTiers';

function initAdmin(): void {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
}

async function main(): Promise<void> {
  initAdmin();
  const db = admin.firestore();
  const snap = await db.collection('organizations').limit(500).get();
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
    const row = getPaidTierByClientCount(seats);
    const tierId = row.id as PaidCapacityTierId;
    // eslint-disable-next-line no-console -- migration script
    console.log(
      `Would update ${docSnap.id}: clientCap=${row.clientLimit}, capacityTierId=${tierId}, monthlyAiCredits=${row.monthlyAiCredits}`,
    );
    // await docSnap.ref.update({
    //   'subscription.clientCap': row.clientLimit,
    //   'subscription.capacityTierId': tierId,
    //   'subscription.monthlyAiCredits': row.monthlyAiCredits,
    // });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
