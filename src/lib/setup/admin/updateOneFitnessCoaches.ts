/**
 * Update One Fitness Coach Names
 * 
 * Updates display names for One Fitness coaches:
 * - Coach Mike (Michael Brown) - has clients and assessments
 * - Coach Selina (Selina Cumming) - no clients yet
 * 
 * Run from browser console: await window.updateOneFitnessCoaches()
 */

import { getDocs, updateDoc, collection, getDoc } from 'firebase/firestore';
import { getLegacyUserProfileDoc, getLegacyUserProfilesCollection, getOrganizationsCollection, getOrganizationDoc } from '@/lib/database/collections';
import { getDb } from '@/services/firebase';

const ONE_FITNESS_ORG_NAME = 'One Fitness';

export async function updateOneFitnessCoaches(): Promise<{
  success: boolean;
  coachesUpdated: Array<{ uid: string; oldName: string; newName: string }>;
  errors: string[];
}> {
  const result = {
    success: false,
    coachesUpdated: [] as Array<{ uid: string; oldName: string; newName: string }>,
    errors: [] as string[],
  };
  
  try {
    console.log('👥 Updating One Fitness coach names...\n');
    
    // 1. Find One Fitness organization
    console.log('1️⃣ Finding One Fitness organization...');
    const orgsSnapshot = await getDocs(getOrganizationsCollection());
    
    let oneFitnessOrgId: string | null = null;
    for (const orgDoc of orgsSnapshot.docs) {
      const data = orgDoc.data();
      const name = String(data.name || '').toLowerCase();
      
      if (
        name.includes('one fitness') ||
        name.includes('onefitness') ||
        name === 'one fitness'
      ) {
        oneFitnessOrgId = orgDoc.id;
        console.log(`   ✅ Found One Fitness org: ${oneFitnessOrgId}`);
        break;
      }
    }
    
    if (!oneFitnessOrgId) {
      result.errors.push('One Fitness organization not found');
      console.error('❌ One Fitness organization not found');
      return result;
    }
    
    // 2. Get all user profiles and find coaches belonging to One Fitness
    console.log('\n2️⃣ Finding One Fitness coaches...');
    const userProfilesSnapshot = await getDocs(getLegacyUserProfilesCollection());
    
    const oneFitnessCoaches: Array<{
      uid: string;
      email?: string;
      currentName?: string;
      clients: number;
      assessments: number;
    }> = [];
    
    for (const userDoc of userProfilesSnapshot.docs) {
      const data = userDoc.data();
      const userUid = userDoc.id;
      const userOrgId = data.organizationId;
      
      // Only process coaches that belong to One Fitness
      if (
        userOrgId === oneFitnessOrgId &&
        (data.role === 'coach' || data.role === 'org_admin')
      ) {
        // Count clients and assessments to identify who is who
        let clients = 0;
        let assessments = 0;
        
        try {
          const db = getDb();
          const clientsRef = collection(db, 'coaches', userUid, 'clients');
          const clientsSnapshot = await getDocs(clientsRef);
          clients = clientsSnapshot.size;
          
          const assessmentsRef = collection(db, 'coaches', userUid, 'assessments');
          const assessmentsSnapshot = await getDocs(assessmentsRef);
          assessments = assessmentsSnapshot.size;
        } catch (e) {
          // Ignore errors
        }
        
        oneFitnessCoaches.push({
          uid: userUid,
          email: data.email,
          currentName: data.displayName || data.name,
          clients,
          assessments,
        });
      }
    }
    
    console.log(`   Found ${oneFitnessCoaches.length} One Fitness coaches:`);
    oneFitnessCoaches.forEach(coach => {
      console.log(`   - ${coach.uid}: ${coach.currentName || 'No name'} (${coach.email || 'No email'}) - ${coach.clients} clients, ${coach.assessments} assessments`);
    });
    
    // 3. Update coach names based on activity
    console.log('\n3️⃣ Updating coach names...');
    
    for (const coach of oneFitnessCoaches) {
      let newName: string;
      
      // Identify by activity: Michael Brown has clients and assessments
      if (coach.clients > 0 && coach.assessments > 0) {
        newName = 'Michael Brown';
      } else if (coach.clients === 0 && coach.assessments === 0) {
        newName = 'Selina Cumming';
      } else {
        // Fallback: try to identify by email if available
        const email = (coach.email || '').toLowerCase();
        if (email.includes('michael') || email.includes('brown') || email.includes('mike')) {
          newName = 'Michael Brown';
        } else if (email.includes('selina') || email.includes('cumming')) {
          newName = 'Selina Cumming';
        } else {
          newName = coach.currentName || 'Coach'; // Keep current name if can't determine
        }
      }
      
      // Get organization name for reference
      let orgName: string | undefined;
      try {
        const orgDoc = await getDoc(getOrganizationDoc(oneFitnessOrgId!));
        if (orgDoc.exists()) {
          orgName = orgDoc.data().name || 'One Fitness';
        }
      } catch (e) {
        orgName = 'One Fitness'; // Fallback
      }
      
      // Prepare updates
      const updates: Record<string, unknown> = {};
      
      if (newName !== coach.currentName) {
        updates.displayName = newName;
      }
      
      // Always update organizationName for easier tracking in Firestore console
      if (orgName) {
        updates.organizationName = orgName;
      }
      
      // Only update if there are changes
      if (Object.keys(updates).length > 0) {
        try {
          await updateDoc(getLegacyUserProfileDoc(coach.uid), updates);
          
          if (newName !== coach.currentName) {
            result.coachesUpdated.push({
              uid: coach.uid,
              oldName: coach.currentName || 'Coach',
              newName,
            });
            console.log(`   ✅ Updated ${coach.uid}: "${coach.currentName || 'Coach'}" → "${newName}"`);
          }
          
          if (orgName) {
            console.log(`   ✅ Added organizationName: "${orgName}" to ${coach.uid}`);
          }
        } catch (e) {
          result.errors.push(`Failed to update ${coach.uid}: ${e}`);
          console.error(`   ❌ Failed to update ${coach.uid}:`, e);
        }
      } else {
        console.log(`   ✓ ${coach.uid}: "${newName}" (already correct)`);
      }
    }
    
    result.success = true;
    console.log('\n✅ One Fitness coach names updated!');
    console.log(`   Updated ${result.coachesUpdated.length} coaches`);
    
    return result;
  } catch (error) {
    console.error('❌ Failed to update One Fitness coach names:', error);
    result.errors.push(`General error: ${error}`);
    return result;
  }
}

// Expose to window for browser console access
if (typeof window !== 'undefined') {
  (window as unknown as { 
    updateOneFitnessCoaches: typeof updateOneFitnessCoaches;
  }).updateOneFitnessCoaches = updateOneFitnessCoaches;
}
