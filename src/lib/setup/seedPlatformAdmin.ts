/**
 * Seed Platform Admin
 * 
 * This script seeds the initial platform administrator.
 * Run this ONCE to set up the platform owner account.
 * 
 * Usage: Import and call seedPlatformAdminOnce() from browser console
 * or create a temporary button during development.
 */

import { setDoc, getDoc } from 'firebase/firestore';
import { logger } from '@/lib/utils/logger';
import type { PlatformAdmin, PlatformPermission } from '@/types/platform';
import { 
  getPlatformAdminDoc, 
  getPlatformAdminLookupDoc 
} from '@/lib/database/collections';

// Platform owner configuration
const PLATFORM_OWNER = {
  email: 'michael@one-assess.com',
  displayName: 'Michael Brown',
  permissions: [
    'view_metrics',
    'view_organizations', 
    'manage_organizations',
    'view_ai_costs',
    'manage_admins'
  ] as PlatformPermission[],
};

/**
 * Seed the platform admin record
 * This creates a "pending" record that will be activated when the user first logs in
 */
export async function seedPlatformAdminOnce(): Promise<{ success: boolean; message: string }> {
  try {
    // Check the dedicated lookup document
    const lookupRef = getPlatformAdminLookupDoc(PLATFORM_OWNER.email);
    const lookupSnap = await getDoc(lookupRef);
    
    if (lookupSnap.exists()) {
      logger.info('Platform admin already seeded:', PLATFORM_OWNER.email);
      return { 
        success: true, 
        message: `Platform admin ${PLATFORM_OWNER.email} already exists. Go to /admin/login to set your password.` 
      };
    }

    // Create a pending admin record (will be updated with real UID on first login)
    const pendingUid = `pending_${Date.now()}`;
    const adminRecord: Omit<PlatformAdmin, 'uid'> = {
      email: PLATFORM_OWNER.email.toLowerCase(),
      displayName: PLATFORM_OWNER.displayName,
      permissions: PLATFORM_OWNER.permissions,
      isPasswordSet: false,
      createdAt: new Date(),
    };

    // Store the admin record
    await setDoc(getPlatformAdminDoc(pendingUid), adminRecord);
    
    // Create lookup document for quick email-based queries
    await setDoc(lookupRef, {
      uid: pendingUid,
      email: PLATFORM_OWNER.email.toLowerCase(),
      createdAt: new Date(),
    });

    logger.info('Platform admin seeded successfully:', PLATFORM_OWNER.email);
    
    return { 
      success: true, 
      message: `Platform admin ${PLATFORM_OWNER.email} has been seeded. Go to /admin/login to set your password.` 
    };
  } catch (error) {
    logger.error('Failed to seed platform admin:', error);
    return { 
      success: false, 
      message: `Failed to seed platform admin: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Check if platform admin is already seeded
 */
export async function isPlatformAdminSeeded(): Promise<boolean> {
  try {
    const lookupRef = getPlatformAdminLookupDoc(PLATFORM_OWNER.email);
    const lookupSnap = await getDoc(lookupRef);
    return lookupSnap.exists();
  } catch {
    return false;
  }
}

// Expose to window for easy browser console access during development
if (typeof window !== 'undefined') {
  (window as unknown as { seedPlatformAdmin: typeof seedPlatformAdminOnce }).seedPlatformAdmin = seedPlatformAdminOnce;
}


