/**
 * Add Organization Names to All User Profiles
 * 
 * Adds organizationName field to all user profiles for easier tracking in Firestore.
 * This makes it much easier to see which org a user belongs to without looking up the org ID.
 * 
 * Run from browser console: await window.addOrganizationNames()
 */

import { getDocs, updateDoc, getDoc } from 'firebase/firestore';
import { 
  getLegacyUserProfilesCollection,
  getLegacyUserProfileDoc,
  getOrganizationsCollection,
  getOrganizationDoc,
} from '@/lib/database/collections';

export async function addOrganizationNames(): Promise<{
  success: boolean;
  updated: number;
  skipped: number;
  errors: string[];
}> {
  const result = {
    success: false,
    updated: 0,
    skipped: 0,
    errors: [] as string[],
  };
  
  try {
    console.log('📝 Adding organization names to user profiles...\n');
    
    // 1. Get all organizations and create a map
    console.log('1️⃣ Loading organizations...');
    const orgsSnapshot = await getDocs(getOrganizationsCollection());
    const orgMap = new Map<string, string>(); // orgId -> orgName
    
    orgsSnapshot.docs.forEach(orgDoc => {
      const orgData = orgDoc.data();
      const orgName = orgData.name || 'Unnamed Organization';
      orgMap.set(orgDoc.id, orgName);
    });
    
    console.log(`   ✅ Loaded ${orgMap.size} organizations`);
    orgMap.forEach((name, id) => {
      console.log(`   - ${id}: ${name}`);
    });
    
    // 2. Get all user profiles
    console.log('\n2️⃣ Processing user profiles...');
    const userProfilesSnapshot = await getDocs(getLegacyUserProfilesCollection());
    
    for (const userDoc of userProfilesSnapshot.docs) {
      const data = userDoc.data();
      const userUid = userDoc.id;
      const organizationId = data.organizationId;
      const currentOrgName = data.organizationName;
      
      // Skip if no organizationId
      if (!organizationId) {
        result.skipped++;
        continue;
      }
      
      // Get organization name
      const orgName = orgMap.get(organizationId);
      
      if (!orgName) {
        // Organization not found in map, try to fetch it
        try {
          const orgDoc = await getDoc(getOrganizationDoc(organizationId));
          if (orgDoc.exists()) {
            const fetchedOrgName = orgDoc.data().name || 'Unknown Organization';
            orgMap.set(organizationId, fetchedOrgName);
            
            // Update user profile
            if (currentOrgName !== fetchedOrgName) {
              await updateDoc(getLegacyUserProfileDoc(userUid), {
                organizationName: fetchedOrgName,
              });
              console.log(`   ✅ Updated ${userUid}: organizationName = "${fetchedOrgName}"`);
              result.updated++;
            } else {
              result.skipped++;
            }
          } else {
            console.log(`   ⚠️  Organization ${organizationId} not found for user ${userUid}`);
            result.errors.push(`Org ${organizationId} not found for user ${userUid}`);
            result.skipped++;
          }
        } catch (e) {
          result.errors.push(`Failed to fetch org ${organizationId} for user ${userUid}: ${e}`);
          result.skipped++;
        }
      } else {
        // Organization found in map
        if (currentOrgName !== orgName) {
          try {
            await updateDoc(getLegacyUserProfileDoc(userUid), {
              organizationName: orgName,
            });
            console.log(`   ✅ Updated ${userUid}: organizationName = "${orgName}"`);
            result.updated++;
          } catch (e) {
            result.errors.push(`Failed to update ${userUid}: ${e}`);
            console.error(`   ❌ Failed to update ${userUid}:`, e);
          }
        } else {
          result.skipped++;
        }
      }
    }
    
    result.success = true;
    console.log('\n✅ Organization names added to user profiles!');
    console.log(`   Updated: ${result.updated}`);
    console.log(`   Skipped: ${result.skipped} (already had correct name or no org)`);
    if (result.errors.length > 0) {
      console.log(`   Errors: ${result.errors.length}`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Failed to add organization names:', error);
    result.errors.push(`General error: ${error}`);
    return result;
  }
}

// Expose to window for browser console access
if (typeof window !== 'undefined') {
  (window as unknown as { 
    addOrganizationNames: typeof addOrganizationNames;
  }).addOrganizationNames = addOrganizationNames;
}
