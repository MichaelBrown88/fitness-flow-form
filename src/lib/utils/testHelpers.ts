/**
 * Test Helper Utilities
 * Quick access functions for testing and development
 */

import { STORAGE_KEYS } from '@/constants/storageKeys';
import { getClientAssessments } from '@/services/coachAssessments';
import { getCoachAssessment } from '@/services/coachAssessments';
import { auth } from '@/services/firebase';
import { logger } from '@/lib/utils/logger';

/**
 * Quick test: Open Michael Brown's latest assessment in edit mode
 */
export async function openMichaelBrownAssessment() {
  try {
    const user = auth.currentUser;
    if (!user) {
      logger.error('[TEST] User not logged in');
      return;
    }

    logger.info('[TEST] Finding Michael Brown assessments...');
    const assessments = await getClientAssessments(user.uid, 'Michael Brown');
    
    if (assessments.length === 0) {
      logger.error('[TEST] No assessments found for Michael Brown');
      logger.info('[TEST] Available clients:', await getAllClients());
      return;
    }

    // Get the latest assessment
    const latest = assessments[0];
    logger.info('[TEST] Found assessment:', latest.id, latest.clientName);

    // Get full assessment data
    const fullData = await getCoachAssessment(user.uid, latest.id, 'Michael Brown');
    if (!fullData) {
      logger.error('[TEST] Could not load assessment data');
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
    logger.info('[TEST] ✓ Navigated to assessment in edit mode');
  } catch (error) {
    logger.error('[TEST] Error opening assessment:', error);
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
      logger.error('[RECOVERY] User not logged in');
      return;
    }
    
    const { listClientSnapshots } = await import('@/services/assessmentHistory');
    const snapshots = await listClientSnapshots(user.uid, clientName);
    
    logger.info(`\n📸 Snapshots for "${clientName}":`);
    if (snapshots.length === 0) {
      logger.info('   No snapshots found');
      return [];
    }
    
    snapshots.forEach((s, i) => {
      logger.info(`   ${i + 1}. [${s.id}] ${s.date} - Score: ${s.score} (${s.type})`);
    });
    
    return snapshots;
  } catch (error) {
    logger.error('[RECOVERY] Error listing snapshots:', error);
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
      logger.error('[RECOVERY] User not logged in');
      return;
    }
    
    logger.info(`\n🔄 Restoring "${clientName}"...`);
    
    // First show available snapshots
    await listSnapshots(clientName);
    
    const { restoreFromSnapshot } = await import('@/services/assessmentHistory');
    const result = await restoreFromSnapshot(user.uid, clientName, snapshotId);
    
    if (result.success) {
      logger.info(`\n✅ ${result.message}`);
      logger.info(`   Restored score: ${result.restoredScore}`);
      logger.info('\n📝 Next steps:');
      logger.info('   1. Refresh the page to see the restored data');
      logger.info('   2. Delete the incorrect "Fawaz" assessment from the dashboard');
    } else {
      logger.error(`\n❌ ${result.message}`);
    }
    
    return result;
  } catch (error) {
    logger.error('[RECOVERY] Error restoring client:', error);
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
  
  logger.info('🧪 Test helpers loaded!');
  logger.info('🧪 Recovery commands:');
  logger.info('   listSnapshots("Michael James Brown") - See available restore points');
  logger.info('   restoreMichaelJamesBrown() - Quick restore for Michael');
  logger.info('   restoreClient("Client Name", "snapshotId") - Restore any client');
}
