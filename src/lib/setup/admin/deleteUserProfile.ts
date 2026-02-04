/**
 * Delete User Profile
 *
 * Quick utility to delete a specific user profile by UID.
 *
 * Run from browser console: await window.deleteUserProfile('uid-here')
 */

import { deleteDoc, doc, getDoc } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { logger as appLogger } from '@/lib/utils/logger';
import { COLLECTIONS } from '@/constants/collections';

const logger = {
  info: (...args: unknown[]) => appLogger.info('✅', ...args),
  warn: (...args: unknown[]) => appLogger.warn('⚠️', ...args),
  error: (...args: unknown[]) => appLogger.error('❌', ...args),
};

export async function deleteUserProfile(uid: string): Promise<{ success: boolean; message: string }> {
  const db = getDb();

  try {
    // Check if it exists first
    const userRef = doc(db, COLLECTIONS.USER_PROFILES, uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      logger.warn(`User profile ${uid} does not exist`);
      return { success: false, message: 'User profile not found' };
    }

    const userData = userSnap.data();
    logger.info(`Found user profile: ${uid}`);
    logger.info(`  Role: ${userData.role}`);
    logger.info(`  Email: ${userData.email || 'N/A'}`);
    logger.info(`  OrgId: ${userData.organizationId || 'N/A'}`);

    // Delete the user profile
    await deleteDoc(userRef);
    logger.info(`Deleted user profile: ${uid}`);

    // Also try to delete any coach data
    try {
      const coachRef = doc(db, COLLECTIONS.COACHES, uid);
      const coachSnap = await getDoc(coachRef);
      if (coachSnap.exists()) {
        await deleteDoc(coachRef);
        logger.info(`Also deleted coach document: ${uid}`);
      }
    } catch {
      // Coach doc might not exist, that's fine
    }

    return { success: true, message: `Deleted user profile ${uid}` };

  } catch (error) {
    logger.error('Failed to delete user profile:', error);
    return { success: false, message: `Error: ${error}` };
  }
}

// Expose to window for browser console access
if (typeof window !== 'undefined') {
  (window as unknown as {
    deleteUserProfile: typeof deleteUserProfile;
  }).deleteUserProfile = deleteUserProfile;
}
