/**
 * Platform Health Check
 *
 * Checks npm registry for newer versions of key dependencies and writes
 * results to platform/health/dependencies. Runs on a weekly schedule.
 */

import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';

interface PackageStatus {
  current: string;
  latest: string;
  needsUpdate: boolean;
}

interface DependenciesDoc {
  checkedAt: admin.firestore.FieldValue;
  packages: Record<string, PackageStatus>;
}

const TRACKED_PACKAGES: Record<string, string> = {
  'firebase-functions': '7.1.1',
  'firebase-admin': '13.7.0',
  '@google/generative-ai': '0.24.1',
  'firebase': '12.7.0',
};

async function fetchLatestVersion(packageName: string): Promise<string> {
  const encoded = packageName.replace('/', '%2F');
  const res = await fetch(`https://registry.npmjs.org/${encoded}/latest`);
  if (!res.ok) throw new Error(`npm registry request failed for ${packageName}: ${res.status}`);
  const data = await res.json() as { version: string };
  return data.version;
}

function stripCaret(version: string): string {
  return version.replace(/^\^/, '');
}

export async function checkPlatformHealth(): Promise<void> {
  const db = admin.firestore();
  const packages: Record<string, PackageStatus> = {};

  await Promise.all(
    Object.entries(TRACKED_PACKAGES).map(async ([name, rawCurrent]) => {
      const current = stripCaret(rawCurrent);
      try {
        const latest = await fetchLatestVersion(name);
        const needsUpdate = latest !== current && !current.startsWith(latest.split('.')[0] + '.');
        packages[name] = { current, latest, needsUpdate };
      } catch (err) {
        logger.warn(`[PlatformHealth] Could not fetch version for ${name}`, err);
        packages[name] = { current, latest: 'unknown', needsUpdate: false };
      }
    }),
  );

  const doc: DependenciesDoc = {
    checkedAt: admin.firestore.FieldValue.serverTimestamp(),
    packages,
  };

  await db.doc('platform/dependencies').set(doc);

  const stale = Object.entries(packages).filter(([, v]) => v.needsUpdate);
  if (stale.length > 0) {
    logger.warn('[PlatformHealth] Stale packages detected:', stale.map(([n, v]) => `${n} (${v.current} → ${v.latest})`).join(', '));
  } else {
    logger.info('[PlatformHealth] All tracked packages are up to date');
  }
}
