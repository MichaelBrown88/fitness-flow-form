/**
 * Cleanup Organizations Script
 * 
 * Deletes all organizations EXCEPT the one specified (One Fitness).
 * Also cleans up related data:
 * - onboarding_sessions
 * - userProfiles (except yours)
 * - platform_admins (keeps your admin record)
 * 
 * Run from browser console: await window.cleanupOrganizations()
 */

import { 
  collection, 
  getDocs, 
  deleteDoc, 
  doc
} from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { logger } from '@/lib/utils/logger';

// Your platform admin email to KEEP
const PLATFORM_ADMIN_EMAIL = 'michaeljbrown88@gmail.com';

// Your One Fitness user email to KEEP  
const ONE_FITNESS_USER_EMAIL = 'onefitnesskw@gmail.com';

/**
 * Detect One Fitness organization by name or known patterns
 */
function isOneFitnessOrg(orgId: string, orgData: Record<string, unknown>): boolean {
  const name = String(orgData.name || '').toLowerCase();
  return (
    name.includes('one fitness') ||
    name.includes('onefitness') ||
    name === 'one fitness' ||
    orgId.includes('onefitness')
  );
}

interface CleanupResult {
  organizationsDeleted: string[];
  userProfilesDeleted: string[];
  onboardingSessionsDeleted: string[];
  platformAdminsDeleted: string[];
  errors: string[];
}

/**
 * Preview what will be deleted (dry run)
 */
export async function previewCleanup(): Promise<{
  organizationsToDelete: { id: string; name: string }[];
  userProfilesToDelete: { id: string; email?: string }[];
  onboardingSessionsToDelete: string[];
  organizationToKeep: { id: string; name: string } | null;
  oneFitnessOrgId: string | null;
}> {
  const db = getDb();
  
  // Get all organizations and find One Fitness
  const orgsSnapshot = await getDocs(collection(db, 'organizations'));
  const organizationsToDelete: { id: string; name: string }[] = [];
  let organizationToKeep: { id: string; name: string } | null = null;
  let oneFitnessOrgId: string | null = null;
  
  orgsSnapshot.docs.forEach(orgDoc => {
    const data = orgDoc.data();
    if (isOneFitnessOrg(orgDoc.id, data)) {
      organizationToKeep = { id: orgDoc.id, name: data.name || 'One Fitness' };
      oneFitnessOrgId = orgDoc.id;
    } else {
      organizationsToDelete.push({ id: orgDoc.id, name: data.name || 'Unnamed' });
    }
  });
  
  // Get user profiles to delete (keep One Fitness users and platform admin)
  const usersSnapshot = await getDocs(collection(db, 'userProfiles'));
  const userProfilesToDelete: { id: string; email?: string }[] = [];
  
  usersSnapshot.docs.forEach(userDoc => {
    const data = userDoc.data();
    const email = (data.email || '').toLowerCase();
    const isKeepEmail = email === ONE_FITNESS_USER_EMAIL.toLowerCase() || 
                        email === PLATFORM_ADMIN_EMAIL.toLowerCase();
    const isKeepOrg = oneFitnessOrgId && data.organizationId === oneFitnessOrgId;
    
    if (!isKeepEmail && !isKeepOrg) {
      userProfilesToDelete.push({ id: userDoc.id, email: data.email });
    }
  });
  
  // Get onboarding sessions to delete
  const sessionsSnapshot = await getDocs(collection(db, 'onboarding_sessions'));
  const onboardingSessionsToDelete = sessionsSnapshot.docs
    .filter(sessionDoc => {
      const data = sessionDoc.data();
      return !oneFitnessOrgId || data.organizationId !== oneFitnessOrgId;
    })
    .map(sessionDoc => sessionDoc.id);
  
  return {
    organizationsToDelete,
    userProfilesToDelete,
    onboardingSessionsToDelete,
    organizationToKeep,
    oneFitnessOrgId,
  };
}

/**
 * Execute the cleanup (destructive!)
 */
export async function executeCleanup(): Promise<CleanupResult> {
  const db = getDb();
  const result: CleanupResult = {
    organizationsDeleted: [],
    userProfilesDeleted: [],
    onboardingSessionsDeleted: [],
    platformAdminsDeleted: [],
    errors: [],
  };
  
  try {
    // First, find One Fitness org ID
    const orgsSnapshot = await getDocs(collection(db, 'organizations'));
    let oneFitnessOrgId: string | null = null;
    
    for (const orgDoc of orgsSnapshot.docs) {
      const data = orgDoc.data();
      if (isOneFitnessOrg(orgDoc.id, data)) {
        oneFitnessOrgId = orgDoc.id;
        logger.info('Found One Fitness org to keep:', orgDoc.id, data.name);
        break;
      }
    }
    
    // 1. Delete organizations (except One Fitness)
    for (const orgDoc of orgsSnapshot.docs) {
      const data = orgDoc.data();
      if (!isOneFitnessOrg(orgDoc.id, data)) {
        try {
          await deleteDoc(doc(db, 'organizations', orgDoc.id));
          result.organizationsDeleted.push(`${orgDoc.id} (${data.name || 'Unnamed'})`);
          logger.info('Deleted organization:', orgDoc.id);
        } catch (e) {
          result.errors.push(`Failed to delete org ${orgDoc.id}: ${e}`);
        }
      }
    }
    
    // 2. Delete user profiles (except One Fitness user and platform admin)
    const usersSnapshot = await getDocs(collection(db, 'userProfiles'));
    for (const userDoc of usersSnapshot.docs) {
      const data = userDoc.data();
      const email = (data.email || '').toLowerCase();
      const isKeepEmail = email === ONE_FITNESS_USER_EMAIL.toLowerCase() || 
                          email === PLATFORM_ADMIN_EMAIL.toLowerCase();
      const isKeepOrg = oneFitnessOrgId && data.organizationId === oneFitnessOrgId;
      
      if (!isKeepEmail && !isKeepOrg) {
        try {
          await deleteDoc(doc(db, 'userProfiles', userDoc.id));
          result.userProfilesDeleted.push(`${userDoc.id} (${data.email || 'No email'})`);
          logger.info('Deleted user profile:', userDoc.id);
        } catch (e) {
          result.errors.push(`Failed to delete user ${userDoc.id}: ${e}`);
        }
      }
    }
    
    // 3. Delete onboarding sessions (except One Fitness)
    const sessionsSnapshot = await getDocs(collection(db, 'onboarding_sessions'));
    for (const sessionDoc of sessionsSnapshot.docs) {
      const data = sessionDoc.data();
      const isKeep = oneFitnessOrgId && data.organizationId === oneFitnessOrgId;
      if (!isKeep) {
        try {
          await deleteDoc(doc(db, 'onboarding_sessions', sessionDoc.id));
          result.onboardingSessionsDeleted.push(sessionDoc.id);
          logger.info('Deleted onboarding session:', sessionDoc.id);
        } catch (e) {
          result.errors.push(`Failed to delete session ${sessionDoc.id}: ${e}`);
        }
      }
    }
    
    // 4. Clean up platform_admin_lookup (keep only the real admin)
    const lookupSnapshot = await getDocs(collection(db, 'platform_admin_lookup'));
    for (const lookupDoc of lookupSnapshot.docs) {
      const data = lookupDoc.data();
      if ((data.email || '').toLowerCase() !== PLATFORM_ADMIN_EMAIL.toLowerCase()) {
        try {
          await deleteDoc(doc(db, 'platform_admin_lookup', lookupDoc.id));
          result.platformAdminsDeleted.push(lookupDoc.id);
        } catch (e) {
          result.errors.push(`Failed to delete lookup ${lookupDoc.id}: ${e}`);
        }
      }
    }
    
    // 5. Clean up platform_admins (keep only the real admin)
    const adminsSnapshot = await getDocs(collection(db, 'platform_admins'));
    for (const adminDoc of adminsSnapshot.docs) {
      const data = adminDoc.data();
      if ((data.email || '').toLowerCase() !== PLATFORM_ADMIN_EMAIL.toLowerCase()) {
        try {
          await deleteDoc(doc(db, 'platform_admins', adminDoc.id));
          result.platformAdminsDeleted.push(adminDoc.id);
        } catch (e) {
          result.errors.push(`Failed to delete admin ${adminDoc.id}: ${e}`);
        }
      }
    }
    
    logger.info('Cleanup complete:', result);
    return result;
    
  } catch (error) {
    logger.error('Cleanup failed:', error);
    result.errors.push(`General error: ${error}`);
    return result;
  }
}

// Expose to window for browser console access
if (typeof window !== 'undefined') {
  (window as any).previewCleanup = previewCleanup;
  (window as any).cleanupOrganizations = executeCleanup;
}

