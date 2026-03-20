/**
 * Platform admin migration — run once with Firebase Admin SDK.
 * Requires: service-account.json in project root (from Firebase Console → Project settings → Service accounts).
 * Run: node migrate-admin.js
 */
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = join(__dirname, 'service-account.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function migrateAdmin() {
  const oldEmail = 'michaeljbrown88@gmail.com';
  const newEmail = 'michael@one-assess.com';
  const newUid = 'spkSr1v5ISYR99SrVymoQnc4KYP2';

  const oldLookupKey = oldEmail.toLowerCase().replace(/[.@]/g, '_');
  const newLookupKey = newEmail.toLowerCase().replace(/[.@]/g, '_');

  console.log('🔧 Starting admin migration...');
  console.log(`Old lookup key: ${oldLookupKey}`);
  console.log(`New lookup key: ${newLookupKey}`);

  // Step 1 — delete old lookup docs (both possible formats)
  const oldByKey = db.collection('platform_admin_lookup').doc(oldLookupKey);
  const oldByEmail = db.collection('platform_admin_lookup').doc(oldEmail);

  const [oldKeySnap, oldEmailSnap] = await Promise.all([
    oldByKey.get(),
    oldByEmail.get(),
  ]);

  if (oldKeySnap.exists) {
    await oldByKey.delete();
    console.log(`✅ Deleted old lookup doc: ${oldLookupKey}`);
  }
  if (oldEmailSnap.exists) {
    await oldByEmail.delete();
    console.log(`✅ Deleted old lookup doc (raw email format): ${oldEmail}`);
  }
  if (!oldKeySnap.exists && !oldEmailSnap.exists) {
    console.log('ℹ️  No old lookup docs found — already clean');
  }

  // Step 2 — update platform_admins collection
  const adminsSnap = await db
    .collection('platform_admins')
    .where('email', '==', oldEmail)
    .get();

  if (!adminsSnap.empty) {
    const batch = db.batch();
    adminsSnap.docs.forEach((d) => {
      batch.update(d.ref, {
        email: newEmail,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
    console.log(`✅ Updated ${adminsSnap.size} platform_admins doc(s) to new email`);
  } else {
    console.log('ℹ️  No platform_admins docs found with old email — may already be clean');
  }

  // Step 3 — write new lookup doc
  await db.collection('platform_admin_lookup').doc(newLookupKey).set({
    uid: newUid,
    email: newEmail,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log(`✅ Created new lookup doc: ${newLookupKey} → ${newUid}`);

  // Step 4 — set custom claim on new Firebase Auth user
  await admin.auth().setCustomUserClaims(newUid, {
    platformAdmin: true,
    role: 'platform_admin',
  });
  console.log(`✅ Custom claim set on UID: ${newUid}`);

  console.log('\n🎉 Migration complete. michael@one-assess.com is now platform admin.');
  process.exit(0);
}

migrateAdmin().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
