/**
 * Fix Platform Admin User Profile
 * 
 * Ensures platform admin user profile is correctly configured:
 * - No organizationId (platform admin is not part of any org)
 * - Correct role (should not be "coach" or "org_admin")
 * - Proper displayName
 * 
 * Also removes the incorrectly created organization if it exists.
 * 
 * Run from browser console: await window.fixPlatformAdminProfile()
 */

import { getDocs, deleteDoc, updateDoc, getDoc, query, where } from 'firebase/firestore';
import { 
  getLegacyUserProfileDoc,
  getLegacyUserProfilesCollection,
  getPlatformAdminsCollection,
  getOrganizationsCollection,
  getOrganizationDoc,
} from '@/lib/database/collections';

const PLATFORM_ADMIN_EMAIL = 'michaeljbrown88@gmail.com';

export async function fixPlatformAdminProfile(): Promise<{
  success: boolean;
  userProfileFixed: boolean;
  organizationDeleted: boolean;
  errors: string[];
}> {
  const result = {
    success: false,
    userProfileFixed: false,
    organizationDeleted: false,
    errors: [] as string[],
  };
  
  try {
    console.log('🔧 Fixing platform admin user profile...\n');
    
    // 1. Find platform admin UID from platform_admins collection
    console.log('1️⃣ Finding platform admin UID...');
    const platformAdminsSnapshot = await getDocs(getPlatformAdminsCollection());
    
    if (platformAdminsSnapshot.empty) {
      result.errors.push('Platform admin not found in platform_admins collection');
      console.error('❌ Platform admin not found in platform_admins collection');
      return result;
    }
    
    const platformAdminDoc = platformAdminsSnapshot.docs.find(
      doc => doc.data().email?.toLowerCase() === PLATFORM_ADMIN_EMAIL.toLowerCase()
    );
    
    if (!platformAdminDoc) {
      result.errors.push('Platform admin email not found');
      console.error('❌ Platform admin email not found');
      return result;
    }
    
    const platformAdminUid = platformAdminDoc.id;
    const platformAdminData = platformAdminDoc.data();
    
    console.log(`   ✅ Found platform admin: ${platformAdminUid} (${platformAdminData.email})`);
    
    // 2. Fix user profile
    console.log('\n2️⃣ Fixing user profile...');
    const userProfileRef = getLegacyUserProfileDoc(platformAdminUid);
    
    // Try direct document access (userProfile document ID is the UID)
    const userProfileDoc = await getDoc(userProfileRef);
    
    if (!userProfileDoc.exists()) {
      console.log('   ⚠️  User profile not found - this might be okay if platform admin only exists in platform_admins');
      result.userProfileFixed = true; // Not an error if profile doesn't exist
    } else {
      // Update existing profile
      const currentData = userProfileDoc.data();
      console.log(`   Current profile data:`, {
        organizationId: currentData.organizationId,
        role: currentData.role,
        displayName: currentData.displayName,
      });
      
      const updates: Record<string, unknown> = {};
      
      if (currentData.organizationId) {
        updates.organizationId = null;
        console.log(`   → Removing organizationId: ${currentData.organizationId}`);
      }
      
      if (currentData.role === 'org_admin' || currentData.role === 'coach') {
        updates.role = null; // Platform admin doesn't need a role in userProfiles
        console.log(`   → Removing incorrect role: ${currentData.role}`);
      }
      
      if (currentData.displayName === 'Coach') {
        updates.displayName = platformAdminData.displayName || 'Platform Admin';
        console.log(`   → Fixing displayName: ${currentData.displayName} → ${updates.displayName}`);
      }
      
      if (Object.keys(updates).length > 0) {
        await updateDoc(userProfileRef, updates);
        console.log('   ✅ User profile fixed');
        result.userProfileFixed = true;
      } else {
        console.log('   ✅ User profile already correct');
        result.userProfileFixed = true;
      }
    }
    
    // 3. Delete the incorrectly created organization
    console.log('\n3️⃣ Checking for incorrect organization...');
    const organizationsSnapshot = await getDocs(getOrganizationsCollection());
    
    const incorrectOrg = organizationsSnapshot.docs.find(
      doc => doc.id === `org-${platformAdminUid}`
    );
    
    if (incorrectOrg) {
      console.log(`   Found incorrect organization: ${incorrectOrg.id}`);
      console.log(`   Organization data:`, incorrectOrg.data());
      
      try {
        await deleteDoc(getOrganizationDoc(incorrectOrg.id));
        console.log(`   ✅ Deleted incorrect organization: ${incorrectOrg.id}`);
        result.organizationDeleted = true;
      } catch (e) {
        result.errors.push(`Failed to delete organization: ${e}`);
        console.error(`   ❌ Failed to delete organization:`, e);
      }
    } else {
      console.log('   ✅ No incorrect organization found');
      result.organizationDeleted = true; // Not an error if it doesn't exist
    }
    
    result.success = true;
    console.log('\n✅ Platform admin profile fix complete!');
    console.log(`   User profile fixed: ${result.userProfileFixed}`);
    console.log(`   Organization deleted: ${result.organizationDeleted}`);
    
    return result;
  } catch (error) {
    console.error('❌ Failed to fix platform admin profile:', error);
    result.errors.push(`General error: ${error}`);
    return result;
  }
}

// Expose to window for browser console access
if (typeof window !== 'undefined') {
  (window as unknown as { 
    fixPlatformAdminProfile: typeof fixPlatformAdminProfile;
  }).fixPlatformAdminProfile = fixPlatformAdminProfile;
}
