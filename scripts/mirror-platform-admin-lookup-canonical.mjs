/**
 * One-time: copy each platform_admin_lookup doc to the canonical id (lowercased email).
 * Firestore rules use request.auth.token.email as the lookup path for admin bootstrap.
 *
 * Requires service-account.json in project root. Run: node scripts/mirror-platform-admin-lookup-canonical.mjs
 */
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const serviceAccountPath = join(root, 'service-account.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();

async function main() {
  const snap = await db.collection('platform_admin_lookup').get();
  let mirrored = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
    if (!email) {
      console.warn('Skip doc (no email):', doc.id);
      continue;
    }
    if (doc.id === email) {
      continue;
    }
    const canonicalRef = db.collection('platform_admin_lookup').doc(email);
    const existing = await canonicalRef.get();
    if (existing.exists) {
      console.log('Already exists:', email);
      continue;
    }
    await canonicalRef.set({ ...data, email }, { merge: true });
    console.log('Mirrored', doc.id, '->', email);
    mirrored += 1;
  }
  console.log(`Done. Mirrored ${mirrored} document(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
