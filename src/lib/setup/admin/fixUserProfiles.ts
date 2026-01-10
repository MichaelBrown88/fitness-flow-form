/**
 * Fix User Profiles - Update user profiles to point to correct organization
 * 
 * Run from browser console: await window.fixUserProfiles()
 */

import { updateDoc, getDocs, collection } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { logger } from '@/lib/utils/logger';
import { getLegacyUserProfilesCollection, getLegacyUserProfileDoc } from '@/lib/database/collections';
import {
  getOrganizationsCollection,
} from '@/lib/database/collections';

export async function fixUserProfiles(): Promise<{
  success: boolean;
  oneFitnessOrgId: string | null;
  userProfilesUpdated: string[];
  clientsPreserved: Array<{ coachUid: string; clientName: string }>;
  assessmentsPreserved: number;
  errors: string[];
}> {
  const db = getDb();
  const result = {
    success: false,
    oneFitnessOrgId: null as string | null,
    userProfilesUpdated: [] as string[],
    clientsPreserved: [] as Array<{ coachUid: string; clientName: string }>,
    assessmentsPreserved: 0,
    errors: [] as string[],
  };
  
  try {
    // 1. Find One Fitness org
    const orgsSnapshot = await getDocs(getOrganizationsCollection());
    let oneFitnessOrgId: string | null = null;
    
    for (const orgDoc of orgsSnapshot.docs) {
      const data = orgDoc.data();
      const name = String(data.name || '').toLowerCase();
      
      if (
        name.includes('one fitness') ||
        name.includes('onefitness') ||
        name === 'one fitness' ||
        orgDoc.id.includes('onefitness')
      ) {
        oneFitnessOrgId = orgDoc.id;
        break;
      }
    }
    
    if (!oneFitnessOrgId) {
      result.errors.push('One Fitness organization not found');
      return result;
    }
    
    result.oneFitnessOrgId = oneFitnessOrgId;
    console.log(`✅ Found One Fitness org: ${oneFitnessOrgId}`);
    
    // 2. SAFETY CHECK: Verify client and assessment data exists BEFORE making changes
    console.log(`\n🔍 SAFETY CHECK: Verifying client and assessment data...`);
    const userProfilesSnapshot = await getDocs(getLegacyUserProfilesCollection());
    
    const clientsToPreserve: Array<{ coachUid: string; clientName: string }> = [];
    let totalAssessments = 0;
    
    // Check all coach UIDs for their clients and assessments
    for (const userDoc of userProfilesSnapshot.docs) {
      const data = userDoc.data();
      const coachUid = userDoc.id;
      
      if (data.role === 'coach' || data.role === 'org_admin') {
        // Check clients
        try {
          const clientsRef = collection(db, 'coaches', coachUid, 'clients');
          const clientsSnapshot = await getDocs(clientsRef);
          
          clientsSnapshot.docs.forEach(clientDoc => {
            clientsToPreserve.push({
              coachUid,
              clientName: clientDoc.id,
            });
          });
          
          if (clientsSnapshot.size > 0) {
            console.log(`   ✅ Coach ${coachUid}: Found ${clientsSnapshot.size} clients`);
            clientsSnapshot.docs.forEach(clientDoc => {
              console.log(`      - ${clientDoc.id}`);
            });
          }
        } catch (e) {
          // No clients collection, that's okay
        }
        
        // Check assessments
        try {
          const assessmentsRef = collection(db, 'coaches', coachUid, 'assessments');
          const assessmentsSnapshot = await getDocs(assessmentsRef);
          totalAssessments += assessmentsSnapshot.size;
          
          if (assessmentsSnapshot.size > 0) {
            console.log(`   ✅ Coach ${coachUid}: Found ${assessmentsSnapshot.size} assessments`);
          }
        } catch (e) {
          // No assessments collection, that's okay
        }
      }
    }
    
    result.clientsPreserved = clientsToPreserve;
    result.assessmentsPreserved = totalAssessments;
    
    console.log(`\n✅ SAFETY CHECK COMPLETE:`);
    console.log(`   - ${clientsToPreserve.length} clients will be preserved`);
    console.log(`   - ${totalAssessments} assessments will be preserved`);
    console.log(`\n📋 Proceeding with user profile updates...`);
    
    // 3. Update user profiles
    for (const userDoc of userProfilesSnapshot.docs) {
      const data = userDoc.data();
      const userUid = userDoc.id;
      const currentOrgId = data.organizationId;
      
      // If user belongs to a deleted org or has no org, update to One Fitness
      // EXCEPT if they're the platform admin (michaeljbrown88@gmail.com)
      const isPlatformAdmin = data.email === 'michaeljbrown88@gmail.com';
      
      if (isPlatformAdmin) {
        console.log(`   ⏭️  Skipping platform admin: ${userUid}`);
        continue;
      }
      
      // Check if org still exists
      let orgExists = false;
      if (currentOrgId) {
        try {
          const orgSnapshot = await getDocs(getOrganizationsCollection());
          orgExists = orgSnapshot.docs.some(doc => doc.id === currentOrgId);
        } catch (e) {
          // Org doesn't exist
        }
      }
      
      // Update if org doesn't exist or user has no org (and they're a coach/admin)
      if ((!orgExists || !currentOrgId) && (data.role === 'coach' || data.role === 'org_admin')) {
        try {
          await updateDoc(getLegacyUserProfileDoc(userUid), {
            organizationId: oneFitnessOrgId,
          });
          result.userProfilesUpdated.push(`${userUid} (${data.email || 'No email'})`);
          console.log(`   ✅ Updated user ${userUid} to One Fitness`);
        } catch (e) {
          result.errors.push(`Failed to update user ${userUid}: ${e}`);
          console.error(`   ❌ Failed to update user ${userUid}:`, e);
        }
      } else if (currentOrgId === oneFitnessOrgId) {
        console.log(`   ✓ User ${userUid} already belongs to One Fitness`);
      } else {
        console.log(`   ⏭️  Skipping user ${userUid} (belongs to other org: ${currentOrgId})`);
      }
    }
    
    result.success = true;
    console.log(`\n✅ Fix complete!`);
    console.log(`   One Fitness org ID: ${oneFitnessOrgId}`);
    console.log(`   Updated ${result.userProfilesUpdated.length} user profiles`);
    console.log(`   ✅ PRESERVED: ${result.clientsPreserved.length} clients, ${result.assessmentsPreserved} assessments`);
    console.log(`   Updated users:`, result.userProfilesUpdated);
    
    // Final verification - double check clients still exist
    console.log(`\n🔍 Final Verification: Checking clients still exist...`);
    for (const client of clientsToPreserve) {
      try {
        const clientsRef = collection(db, 'coaches', client.coachUid, 'clients');
        const clientsSnapshot = await getDocs(clientsRef);
        const clientExists = clientsSnapshot.docs.some(doc => doc.id === client.clientName);
        if (clientExists) {
          console.log(`   ✅ ${client.clientName} (Coach ${client.coachUid}) - PRESERVED`);
        } else {
          console.warn(`   ⚠️ ${client.clientName} (Coach ${client.coachUid}) - NOT FOUND (may have been deleted before)`);
          result.errors.push(`Client ${client.clientName} not found during final verification`);
        }
      } catch (e) {
        console.warn(`   ⚠️ Error checking ${client.clientName}:`, e);
      }
    }
    
    return result;
  } catch (error) {
    logger.error('Failed to fix user profiles:', error);
    result.errors.push(`General error: ${error}`);
    return result;
  }
}

// Expose to window for browser console access
if (typeof window !== 'undefined') {
  (window as unknown as { 
    fixUserProfiles: typeof fixUserProfiles;
  }).fixUserProfiles = fixUserProfiles;
}

