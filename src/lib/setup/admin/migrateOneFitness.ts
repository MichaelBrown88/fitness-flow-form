/**
 * Migrate Current User Profile
 *
 * One-time script to ensure the currently logged-in user has
 * the new profile fields set correctly:
 *   - onboardingCompleted: true
 *   - firstAssessmentCompleted: true
 *
 * This prevents existing users from being treated as brand-new
 * onboarding users after the UX overhaul.
 *
 * Run from browser console: await window.migrateOneFitness()
 */

import { doc, updateDoc } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { getAuth } from 'firebase/auth';
import { logger } from '@/lib/utils/logger';

export async function migrateOneFitness(): Promise<{
  success: boolean;
  message: string;
}> {
  const db = getDb();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    return { success: false, message: 'No user logged in. Please log in first.' };
  }

  try {
    const uid = currentUser.uid;
    logger.info(`[migrateOneFitness] Updating profile for ${currentUser.email || uid}...`);

    await updateDoc(doc(db, 'userProfiles', uid), {
      onboardingCompleted: true,
      firstAssessmentCompleted: true,
    });

    const msg = `Profile updated for ${currentUser.email || uid}: onboardingCompleted=true, firstAssessmentCompleted=true. Reload the page.`;
    logger.info(`[migrateOneFitness] ${msg}`);
    return { success: true, message: msg };

  } catch (error) {
    const msg = `Migration failed: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(`[migrateOneFitness] ${msg}`);
    return { success: false, message: msg };
  }
}

// Expose to window for browser console access
if (typeof window !== 'undefined') {
  (window as unknown as { migrateOneFitness: typeof migrateOneFitness }).migrateOneFitness = migrateOneFitness;
}
