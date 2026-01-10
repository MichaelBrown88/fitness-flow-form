/**
 * Remove Orphaned Organization
 * 
 * This script permanently deletes an orphaned organization document
 * Run from browser console: await window.removeOrphanedOrg('org-YdnNYfGwGkQvek5MmVKG4jtaijS2')
 */

import { deleteDoc } from 'firebase/firestore';
import { getOrganizationDoc } from '@/lib/database/collections';

export async function removeOrphanedOrg(orgId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    console.log(`🗑️  Deleting orphaned organization: ${orgId}...`);
    await deleteDoc(getOrganizationDoc(orgId));
    console.log(`✅ Successfully deleted organization: ${orgId}`);
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to delete organization ${orgId}:`, error);
    return { success: false, error: errorMsg };
  }
}

// Expose to window for browser console access
if (typeof window !== 'undefined') {
  (window as unknown as { 
    removeOrphanedOrg: typeof removeOrphanedOrg;
  }).removeOrphanedOrg = removeOrphanedOrg;
}
