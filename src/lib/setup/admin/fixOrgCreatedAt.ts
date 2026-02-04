/**
 * Fix Organization createdAt Field
 *
 * Adds missing createdAt field to organization documents.
 * Without createdAt, orgs won't appear in the platform admin dashboard
 * because the query uses orderBy('createdAt', 'desc').
 *
 * Run from browser console: await window.fixOrgCreatedAt()
 */

import { getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getOrganizationsCollection, getOrganizationDoc } from '@/lib/database/collections';
import { logger } from '@/lib/utils/logger';

export async function fixOrgCreatedAt(): Promise<{
  checked: number;
  fixed: string[];
  errors: string[];
}> {
  const result = {
    checked: 0,
    fixed: [] as string[],
    errors: [] as string[],
  };

  try {
    logger.info('🔍 Checking organization createdAt fields...');

    const orgsSnapshot = await getDocs(getOrganizationsCollection());

    for (const orgDoc of orgsSnapshot.docs) {
      result.checked++;
      const data = orgDoc.data();
      const orgId = orgDoc.id;
      const orgName = data.name || 'Unnamed';

      logger.info(`Checking ${orgName} (${orgId}):`);
      logger.info(`  - createdAt: ${data.createdAt ? 'exists' : 'MISSING'}`);
      logger.info(`  - stats: ${JSON.stringify(data.stats || {})}`);

      if (!data.createdAt) {
        try {
          logger.info(`  - Adding createdAt to ${orgName}...`);
          await updateDoc(getOrganizationDoc(orgId), {
            createdAt: serverTimestamp(),
          });
          result.fixed.push(`${orgId} (${orgName})`);
          logger.info(`  ✅ Fixed ${orgName}`);
        } catch (e) {
          result.errors.push(`Failed to fix ${orgId}: ${e}`);
          logger.error(`  ❌ Error fixing ${orgName}:`, e);
        }
      }
    }

    logger.info('\n📋 Summary:');
    logger.info(`  - Checked: ${result.checked} organizations`);
    logger.info(`  - Fixed: ${result.fixed.length}`);
    if (result.fixed.length > 0) {
      logger.info(`  - Fixed orgs: ${result.fixed.join(', ')}`);
    }
    if (result.errors.length > 0) {
      logger.error(`  - Errors: ${result.errors.join(', ')}`);
    }

    return result;

  } catch (error) {
    logger.error('Failed to fix org createdAt:', error);
    result.errors.push(`General error: ${error}`);
    return result;
  }
}

// Expose to window for browser console access
if (typeof window !== 'undefined') {
  (window as unknown as { fixOrgCreatedAt: typeof fixOrgCreatedAt }).fixOrgCreatedAt = fixOrgCreatedAt;
}
