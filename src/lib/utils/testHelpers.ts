/**
 * Test Helper Utilities
 * Quick access functions for testing and development
 */

import { STORAGE_KEYS } from '@/constants/storageKeys';
import { getClientAssessments } from '@/services/coachAssessments';
import { getCoachAssessment } from '@/services/coachAssessments';
import { auth } from '@/services/firebase';

/**
 * Quick test: Open Michael Brown's latest assessment in edit mode
 */
export async function openMichaelBrownAssessment() {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error('[TEST] User not logged in');
      return;
    }

    console.log('[TEST] Finding Michael Brown assessments...');
    const assessments = await getClientAssessments(user.uid, 'Michael Brown');
    
    if (assessments.length === 0) {
      console.error('[TEST] No assessments found for Michael Brown');
      console.log('[TEST] Available clients:', await getAllClients());
      return;
    }

    // Get the latest assessment
    const latest = assessments[0];
    console.log('[TEST] Found assessment:', latest.id, latest.clientName);

    // Get full assessment data
    const fullData = await getCoachAssessment(user.uid, latest.id, 'Michael Brown');
    if (!fullData) {
      console.error('[TEST] Could not load assessment data');
      return;
    }

    // Set up edit mode
    sessionStorage.setItem(STORAGE_KEYS.EDIT_ASSESSMENT, JSON.stringify({
      assessmentId: latest.id,
      formData: fullData.formData,
      clientName: 'Michael Brown',
    }));

    // Clear other modes
    sessionStorage.removeItem(STORAGE_KEYS.PARTIAL_ASSESSMENT);
    sessionStorage.removeItem(STORAGE_KEYS.PREFILL_CLIENT);
    sessionStorage.removeItem(STORAGE_KEYS.IS_DEMO);

    // Navigate to assessment
    window.location.href = '/assessment';
    console.log('[TEST] ✓ Navigated to assessment in edit mode');
  } catch (error) {
    console.error('[TEST] Error opening assessment:', error);
  }
}

/**
 * Get all client names for the current user
 */
async function getAllClients(): Promise<string[]> {
  const { getAllClients } = await import('@/services/coachAssessments');
  const user = auth.currentUser;
  if (!user) return [];
  return getAllClients(user.uid);
}

/**
 * List available snapshots for a client (for recovery)
 */
export async function listSnapshots(clientName: string) {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error('[RECOVERY] User not logged in');
      return;
    }
    
    const { listClientSnapshots } = await import('@/services/assessmentHistory');
    const snapshots = await listClientSnapshots(user.uid, clientName);
    
    console.log(`\n📸 Snapshots for "${clientName}":`);
    if (snapshots.length === 0) {
      console.log('   No snapshots found');
      return [];
    }
    
    snapshots.forEach((s, i) => {
      console.log(`   ${i + 1}. [${s.id}] ${s.date} - Score: ${s.score} (${s.type})`);
    });
    
    return snapshots;
  } catch (error) {
    console.error('[RECOVERY] Error listing snapshots:', error);
  }
}

/**
 * Restore a client's assessment from a previous snapshot
 * @param clientName - The client's full name
 * @param snapshotId - Optional specific snapshot ID (defaults to second most recent)
 */
export async function restoreClient(clientName: string, snapshotId?: string) {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error('[RECOVERY] User not logged in');
      return;
    }
    
    console.log(`\n🔄 Restoring "${clientName}"...`);
    
    // First show available snapshots
    await listSnapshots(clientName);
    
    const { restoreFromSnapshot } = await import('@/services/assessmentHistory');
    const result = await restoreFromSnapshot(user.uid, clientName, snapshotId);
    
    if (result.success) {
      console.log(`\n✅ ${result.message}`);
      console.log(`   Restored score: ${result.restoredScore}`);
      console.log('\n📝 Next steps:');
      console.log('   1. Refresh the page to see the restored data');
      console.log('   2. Delete the incorrect "Fawaz" assessment from the dashboard');
    } else {
      console.error(`\n❌ ${result.message}`);
    }
    
    return result;
  } catch (error) {
    console.error('[RECOVERY] Error restoring client:', error);
  }
}

/**
 * Quick recovery for Michael James Brown
 */
export async function restoreMichaelJamesBrown() {
  return restoreClient('Michael James Brown');
}

// Make it available globally
if (typeof window !== 'undefined') {
  (window as any).openMichaelBrownAssessment = openMichaelBrownAssessment;
  (window as any).listSnapshots = listSnapshots;
  (window as any).restoreClient = restoreClient;
  (window as any).restoreMichaelJamesBrown = restoreMichaelJamesBrown;
  
  console.log('🧪 Test helpers loaded!');
  console.log('🧪 Recovery commands:');
  console.log('   listSnapshots("Michael James Brown") - See available restore points');
  console.log('   restoreMichaelJamesBrown() - Quick restore for Michael');
  console.log('   restoreClient("Client Name", "snapshotId") - Restore any client');
}
