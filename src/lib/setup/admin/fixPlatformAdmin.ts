/**
 * Fix Platform Admin Profile
 * 
 * Ensures platform admin has no organizationId
 * Run from browser console: await window.fixPlatformAdmin()
 */

import { getDocs, updateDoc, query, where } from 'firebase/firestore';
import { getLegacyUserProfilesCollection, getLegacyUserProfileDoc } from '@/lib/database/collections';

const PLATFORM_ADMIN_EMAIL = 'michaeljbrown88@gmail.com';

export async function fixPlatformAdmin(): Promise<{
  success: boolean;
  updated: boolean;
  error?: string;
}> {
  try {
    console.log('🔧 Fixing platform admin profile...');
    
    // Find platform admin user profile
    const userProfilesQuery = query(
      getLegacyUserProfilesCollection(),
      where('email', '==', PLATFORM_ADMIN_EMAIL.toLowerCase())
    );
    
    const userProfilesSnapshot = await getDocs(userProfilesQuery);
    
    if (userProfilesSnapshot.empty) {
      console.warn('⚠️ Platform admin profile not found');
      return { success: true, updated: false, error: 'Platform admin profile not found' };
    }
    
    const adminDoc = userProfilesSnapshot.docs[0];
    const data = adminDoc.data();
    const userUid = adminDoc.id;
    
    if (data.organizationId) {
      console.log(`   Found platform admin: ${userUid}`);
      console.log(`   Current organizationId: ${data.organizationId}`);
      console.log(`   Removing organizationId...`);
      
      await updateDoc(getLegacyUserProfileDoc(userUid), {
        organizationId: null,
      });
      
      console.log(`   ✅ Removed organizationId from platform admin profile`);
      return { success: true, updated: true };
    } else {
      console.log(`   ✅ Platform admin already has no organizationId`);
      return { success: true, updated: false };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Failed to fix platform admin:', error);
    return { success: false, updated: false, error: errorMsg };
  }
}

// Expose to window for browser console access
if (typeof window !== 'undefined') {
  (window as unknown as { 
    fixPlatformAdmin: typeof fixPlatformAdmin;
  }).fixPlatformAdmin = fixPlatformAdmin;
}
