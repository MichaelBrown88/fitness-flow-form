/**
 * One-off: promote `publicReports/{coachUid}__{assessmentId}` documents to UUID ids
 * (same semantics as runtime promotion in `share.ts`), and refresh `shareToken` on matching client profiles.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=... npx ts-node --transpile-only src/scripts/migrateLegacyPublicReportDocIds.ts
 *
 * Commit writes:
 *   MIGRATE_PUBLIC_REPORTS_COMMIT=1 GOOGLE_APPLICATION_CREDENTIALS=... npx ts-node --transpile-only src/scripts/migrateLegacyPublicReportDocIds.ts
 */

import { randomUUID } from 'node:crypto';
import * as admin from 'firebase-admin';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { APP_HOST } from '../config';

const PAGE_SIZE = 300;
const COMMIT = process.env.MIGRATE_PUBLIC_REPORTS_COMMIT === '1';

function initAdmin(): void {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
}

function isLegacyPublicReportDocId(id: string): boolean {
  return id.includes('__') && !id.includes('/') && id.length < 1500;
}

async function main(): Promise<void> {
  initAdmin();
  const db = admin.firestore();
  let scanned = 0;
  let promoted = 0;
  let skipped = 0;
  let profilesUpdated = 0;

  let last: QueryDocumentSnapshot | undefined;
  let more = true;
  while (more) {
    let q = db.collection('publicReports').orderBy(admin.firestore.FieldPath.documentId()).limit(PAGE_SIZE);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;

    for (const docSnap of snap.docs) {
      scanned++;
      const oldId = docSnap.id;
      if (!isLegacyPublicReportDocId(oldId)) {
        skipped++;
        continue;
      }

      const data = docSnap.data();
      const orgId = typeof data.organizationId === 'string' ? data.organizationId : '';
      const newToken = randomUUID();
      const newRef = db.doc(`publicReports/${newToken}`);

      console.log(
        `${COMMIT ? 'PROMOTE' : 'DRY-RUN'} ${oldId} -> ${newToken} orgId=${orgId || '?'}`,
      );

      if (COMMIT) {
        const batch = db.batch();
        batch.set(
          newRef,
          {
            ...data,
            shareToken: newToken,
            shareUrl: `${APP_HOST}/r/${newToken}`,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: false },
        );
        batch.delete(docSnap.ref);
        await batch.commit();
        promoted++;

        if (orgId) {
          const clientsQ = await db
            .collection(`organizations/${orgId}/clients`)
            .where('shareToken', '==', oldId)
            .limit(20)
            .get();
          for (const c of clientsQ.docs) {
            await c.ref.update({
              shareToken: newToken,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            profilesUpdated++;
          }
        }
      }
    }

    last = snap.docs[snap.docs.length - 1];
    more = snap.size >= PAGE_SIZE;
  }

  console.log(
    `${COMMIT ? 'COMMIT' : 'DRY-RUN'} done: scanned=${scanned}, promoted=${promoted}, skippedNonLegacy=${skipped}, clientProfilesUpdated=${profilesUpdated}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
