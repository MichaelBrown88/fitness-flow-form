/**
 * One-off: copy `platform-admin-lookup` docs that use legacy ids (email with `.`/`@` → `_`)
 * onto canonical ids (`email.trim().toLowerCase()`) and delete the legacy doc when safe.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=... npx ts-node --transpile-only src/scripts/consolidatePlatformAdminLookup.ts
 *
 * Commit:
 *   MIGRATE_ADMIN_LOOKUP_COMMIT=1 GOOGLE_APPLICATION_CREDENTIALS=... npx ts-node --transpile-only src/scripts/consolidatePlatformAdminLookup.ts
 */

import * as admin from 'firebase-admin';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';

const PAGE_SIZE = 500;
const COMMIT = process.env.MIGRATE_ADMIN_LOOKUP_COMMIT === '1';

function legacyLookupKeyFromEmail(email: string): string {
  return email.trim().toLowerCase().replace(/[.@]/g, '_');
}

function initAdmin(): void {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
}

async function main(): Promise<void> {
  initAdmin();
  const db = admin.firestore();
  let scanned = 0;
  let copied = 0;
  let deleted = 0;
  let skipped = 0;

  let last: QueryDocumentSnapshot | undefined;
  let more = true;
  while (more) {
    let q = db
      .collection('platform-admin-lookup')
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(PAGE_SIZE);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;

    for (const d of snap.docs) {
      scanned++;
      const docId = d.id;
      if (docId.includes('@')) {
        skipped++;
        continue;
      }

      const email =
        typeof d.data().email === 'string' ? d.data().email.trim().toLowerCase() : '';
      if (!email || !email.includes('@')) {
        skipped++;
        continue;
      }

      const canonicalId = email;
      const legacyId = legacyLookupKeyFromEmail(email);
      if (docId !== legacyId) {
        skipped++;
        continue;
      }

      const canonRef = db.doc(`platform-admin-lookup/${canonicalId}`);
      const canonSnap = await canonRef.get();
      if (canonSnap.exists) {
        console.log(`SKIP delete legacy ${docId}: canonical already exists`);
        if (COMMIT) {
          await d.ref.delete();
          deleted++;
        }
        continue;
      }

      console.log(`${COMMIT ? 'COPY' : 'DRY-RUN'} ${docId} -> ${canonicalId}`);
      if (COMMIT) {
        await canonRef.set(d.data(), { merge: false });
        copied++;
        await d.ref.delete();
        deleted++;
      }
    }

    last = snap.docs[snap.docs.length - 1];
    more = snap.size >= PAGE_SIZE;
  }

  console.log(
    `${COMMIT ? 'COMMIT' : 'DRY-RUN'} done: scanned=${scanned}, copiedToCanonical=${copied}, legacyRemoved=${deleted}, skipped=${skipped}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
