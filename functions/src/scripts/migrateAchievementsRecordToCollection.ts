/**
 * One-off: copy `organizations/{org}/clients/{slug}/achievements/record` field map into
 * per-definition docs `achievements/{achievementId}` and optionally delete `record`.
 *
 * Run with Admin credentials:
 *   GOOGLE_APPLICATION_CREDENTIALS=... npx ts-node --transpile-only src/scripts/migrateAchievementsRecordToCollection.ts
 *
 * Dry-run by default. Commit:
 *   MIGRATE_ACHIEVEMENTS_RECORD_COMMIT=1 GOOGLE_APPLICATION_CREDENTIALS=... npx ts-node --transpile-only src/scripts/migrateAchievementsRecordToCollection.ts
 *
 * Phase 2 delete record only (after verifying clients):
 *   MIGRATE_ACHIEVEMENTS_RECORD_DELETE_RECORD=1 MIGRATE_ACHIEVEMENTS_RECORD_COMMIT=1 ...
 */

import * as admin from 'firebase-admin';
import type { DocumentReference, QueryDocumentSnapshot } from 'firebase-admin/firestore';

const BATCH_MAX = 400;
const PAGE_SIZE = 200;
const COMMIT = process.env.MIGRATE_ACHIEVEMENTS_RECORD_COMMIT === '1';
const DELETE_RECORD = process.env.MIGRATE_ACHIEVEMENTS_RECORD_DELETE_RECORD === '1';

/** Must match `src/constants/achievements.ts` achievement ids. */
const ACHIEVEMENT_DOC_IDS: readonly string[] = [
  'streak_first_steps',
  'streak_consistent',
  'streak_committed',
  'streak_dedicated',
  'milestone_60',
  'milestone_70',
  'milestone_80',
  'milestone_90',
  'trophy_first_assessment',
  'trophy_all_improved',
  'trophy_biggest_leap',
  'trophy_goal_crusher',
  'trophy_full_house',
  'pillar_bodyComp_80',
  'pillar_strength_80',
  'pillar_cardio_80',
  'pillar_movementQuality_80',
  'pillar_lifestyle_80',
  'pillar_weakest_link',
  'pillar_biggest_gain',
] as const;

const ACHIEVEMENT_ID_SET = new Set(ACHIEVEMENT_DOC_IDS);

function initAdmin(): void {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

async function main(): Promise<void> {
  initAdmin();
  const db = admin.firestore();
  let scannedClients = 0;
  let withRecord = 0;
  let migratedFields = 0;

  let lastOrg: QueryDocumentSnapshot | undefined;
  let orgMore = true;
  while (orgMore) {
    let oq = db.collection('organizations').orderBy(admin.firestore.FieldPath.documentId()).limit(PAGE_SIZE);
    if (lastOrg) oq = oq.startAfter(lastOrg);
    const orgSnap = await oq.get();
    if (orgSnap.empty) break;

    for (const orgDoc of orgSnap.docs) {
      const orgId = orgDoc.id;
      let lastClient: QueryDocumentSnapshot | undefined;
      let clientMore = true;
      while (clientMore) {
        let cq = orgDoc.ref.collection('clients').orderBy(admin.firestore.FieldPath.documentId()).limit(PAGE_SIZE);
        if (lastClient) cq = cq.startAfter(lastClient);
        const clientSnap = await cq.get();
        if (clientSnap.empty) break;

        for (const clientDoc of clientSnap.docs) {
          scannedClients++;
          const slug = clientDoc.id;
          const recordRef = clientDoc.ref.collection('achievements').doc('record');
          const recordSnap = await recordRef.get();
          if (!recordSnap.exists) continue;
          withRecord++;

          const raw = recordSnap.data() ?? {};
          const nested = isPlainObject(raw.achievements) ? (raw.achievements as Record<string, unknown>) : raw;

          const writes: Array<{ ref: DocumentReference; data: Record<string, unknown> }> = [];
          for (const achId of ACHIEVEMENT_ID_SET) {
            const payload = nested[achId];
            if (!isPlainObject(payload)) continue;
            const destRef = clientDoc.ref.collection('achievements').doc(achId);
            const destSnap = await destRef.get();
            if (destSnap.exists) continue;
            writes.push({
              ref: destRef,
              data: {
                ...payload,
                organizationId: orgId,
              },
            });
            migratedFields++;
          }

          if (COMMIT && writes.length > 0) {
            for (let i = 0; i < writes.length; i += BATCH_MAX) {
              const chunk = writes.slice(i, i + BATCH_MAX);
              const batch = db.batch();
              for (const w of chunk) {
                batch.set(w.ref, w.data, { merge: true });
              }
              await batch.commit();
            }
          }

          if (COMMIT && DELETE_RECORD && writes.length > 0) {
            await recordRef.delete();
          }

          if (!COMMIT && writes.length > 0) {
            console.log(
              `DRY-RUN ${orgId}/${slug}: would write ${writes.length} achievement doc(s) from achievements/record`,
            );
          }
        }

        lastClient = clientSnap.docs[clientSnap.docs.length - 1];
        clientMore = clientSnap.size >= PAGE_SIZE;
      }
    }

    lastOrg = orgSnap.docs[orgSnap.docs.length - 1];
    orgMore = orgSnap.size >= PAGE_SIZE;
  }

  console.log(
    `${COMMIT ? 'COMMIT' : 'DRY-RUN'} complete: clientsScanned=${scannedClients}, clientsWithRecord=${withRecord}, fieldsMigrated=${migratedFields}`,
  );
  if (!DELETE_RECORD && withRecord > 0) {
    console.log(
      'Record docs not deleted. After verification, run with MIGRATE_ACHIEVEMENTS_RECORD_DELETE_RECORD=1 MIGRATE_ACHIEVEMENTS_RECORD_COMMIT=1',
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
