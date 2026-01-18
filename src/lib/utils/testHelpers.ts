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

// Make it available globally
if (typeof window !== 'undefined') {
  (window as any).openMichaelBrownAssessment = openMichaelBrownAssessment;
  console.log('🧪 Test helper loaded!');
  console.log('🧪 Use: openMichaelBrownAssessment() to open Michael Brown\'s assessment in edit mode');
}
