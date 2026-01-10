/**
 * Final Cleanup - Clean Database Structure
 * 
 * This script ensures clean database structure:
 * - Platform Owner: michael brown (platform admin, NOT tied to One Fitness)
 * - One Fitness org with 2 coaches: Coach Mike and Coach Selina
 * - Delete all other users, organizations, and test data
 * 
 * Run from browser console: await window.finalCleanup()
 */

import { 
  getDocs, 
  deleteDoc,
  updateDoc,
  query,
  where,
  collection,
} from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { logger } from '@/lib/utils/logger';
import {
  getOrganizationsCollection,
  getOrganizationDoc,
  getLegacyUserProfilesCollection,
  getLegacyUserProfileDoc,
  getPlatformAdminsCollection,
  getPlatformAdminDoc,
} from '@/lib/database/collections';

const PLATFORM_ADMIN_EMAIL = 'michaeljbrown88@gmail.com';
const ONE_FITNESS_ORG_NAME = 'One Fitness';

// Known good users to keep
const KEEP_EMAILS = new Set([
  PLATFORM_ADMIN_EMAIL.toLowerCase(),
  'onefitnesskw@gmail.com', // One Fitness email
  // Add coach emails here if known
]);

export async function finalCleanup(): Promise<{
  success: boolean;
  oneFitnessOrgId: string | null;
  coachesKept: string[];
  usersDeleted: string[];
  orgsDeleted: string[];
  errors: string[];
}> {
  const db = getDb();
  const result = {
    success: false,
    oneFitnessOrgId: null as string | null,
    coachesKept: [] as string[],
    usersDeleted: [] as string[],
    orgsDeleted: [] as string[],
    errors: [] as string[],
  };
  
  try {
    console.log('🧹 Starting final cleanup...\n');
    
    // 1. Find One Fitness organization
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
        console.log(`✅ Found One Fitness org: ${oneFitnessOrgId}`);
        break;
      }
    }
    
    if (!oneFitnessOrgId) {
      result.errors.push('One Fitness organization not found');
      console.error('❌ One Fitness organization not found');
      return result;
    }
    
    result.oneFitnessOrgId = oneFitnessOrgId;
    
    // 2. Delete all other organizations
    console.log('\n🗑️  Deleting other organizations...');
    for (const orgDoc of orgsSnapshot.docs) {
      if (orgDoc.id !== oneFitnessOrgId) {
        try {
          await deleteDoc(getOrganizationDoc(orgDoc.id));
          result.orgsDeleted.push(orgDoc.id);
          console.log(`   ✅ Deleted org: ${orgDoc.id} (${orgDoc.data().name || 'Unnamed'})`);
        } catch (e) {
          result.errors.push(`Failed to delete org ${orgDoc.id}: ${e}`);
          console.error(`   ❌ Failed to delete org ${orgDoc.id}:`, e);
        }
      }
    }
    
    // 3. Get all user profiles
    console.log('\n👤 Processing user profiles...');
    const userProfilesSnapshot = await getDocs(getLegacyUserProfilesCollection());
    
    // Identify coaches that belong to One Fitness
    const oneFitnessCoachUids: string[] = [];
    
    for (const userDoc of userProfilesSnapshot.docs) {
      const data = userDoc.data();
      const userUid = userDoc.id;
      const email = (data.email || '').toLowerCase();
      const userOrgId = data.organizationId;
      
      // Keep platform admin (separate from One Fitness)
      if (email === PLATFORM_ADMIN_EMAIL.toLowerCase()) {
        console.log(`   ✅ Keeping platform admin: ${userUid} (${email})`);
        // Ensure platform admin is NOT tied to ANY organization
        if (userOrgId) {
          await updateDoc(getLegacyUserProfileDoc(userUid), {
            organizationId: null, // Platform admin has no org
          });
          console.log(`      → Removed organizationId (platform admin should not belong to org)`);
        }
        continue;
      }
      
      // Keep coaches that belong to One Fitness
      if ((data.role === 'coach' || data.role === 'org_admin') && userOrgId === oneFitnessOrgId) {
        oneFitnessCoachUids.push(userUid);
        result.coachesKept.push(userUid);
        console.log(`   ✅ Keeping One Fitness coach: ${userUid} (${email || 'No email'})`);
        continue;
      }
      
      // Keep if email is in keep list
      if (KEEP_EMAILS.has(email)) {
        console.log(`   ✅ Keeping user (whitelisted): ${userUid} (${email})`);
        // Make sure they belong to One Fitness if they're a coach
        if (data.role === 'coach' || data.role === 'org_admin') {
          await updateDoc(getLegacyUserProfileDoc(userUid), {
            organizationId: oneFitnessOrgId,
          });
          oneFitnessCoachUids.push(userUid);
          result.coachesKept.push(userUid);
        }
        continue;
      }
      
      // Delete all other users
      try {
        await deleteDoc(getLegacyUserProfileDoc(userUid));
        result.usersDeleted.push(userUid);
        console.log(`   🗑️  Deleted user: ${userUid} (${email || 'No email'}, org: ${userOrgId || 'None'})`);
      } catch (e) {
        result.errors.push(`Failed to delete user ${userUid}: ${e}`);
        console.error(`   ❌ Failed to delete user ${userUid}:`, e);
      }
    }
    
    console.log(`\n✅ Kept ${oneFitnessCoachUids.length} One Fitness coaches:`, oneFitnessCoachUids);
    
    // 4. Verify One Fitness structure
    console.log('\n📊 Verifying One Fitness structure...');
    
    // Check clients and assessments for each coach
    for (const coachUid of oneFitnessCoachUids) {
      try {
        const clientsRef = collection(db, 'coaches', coachUid, 'clients');
        const clientsSnapshot = await getDocs(clientsRef);
        const assessmentsRef = collection(db, 'coaches', coachUid, 'assessments');
        const assessmentsSnapshot = await getDocs(assessmentsRef);
        
        console.log(`   Coach ${coachUid}:`);
        console.log(`      - ${clientsSnapshot.size} clients`);
        console.log(`      - ${assessmentsSnapshot.size} assessments`);
        
        if (clientsSnapshot.size > 0) {
          clientsSnapshot.docs.forEach(clientDoc => {
            console.log(`         Client: ${clientDoc.id}`);
          });
        }
      } catch (e) {
        console.warn(`   ⚠️ Error checking coach ${coachUid}:`, e);
      }
    }
    
    // 5. Clean up platform admins (keep only michael brown)
    console.log('\n👑 Cleaning platform admins...');
    const platformAdminsSnapshot = await getDocs(getPlatformAdminsCollection());
    for (const adminDoc of platformAdminsSnapshot.docs) {
      const data = adminDoc.data();
      const email = (data.email || '').toLowerCase();
      
      if (email !== PLATFORM_ADMIN_EMAIL.toLowerCase()) {
        try {
          await deleteDoc(getPlatformAdminDoc(adminDoc.id));
          console.log(`   🗑️  Deleted platform admin: ${adminDoc.id} (${email})`);
        } catch (e) {
          result.errors.push(`Failed to delete platform admin ${adminDoc.id}: ${e}`);
        }
      } else {
        console.log(`   ✅ Keeping platform admin: ${adminDoc.id} (${email})`);
      }
    }
    
    // 6. Update One Fitness organization to ensure correct structure
    console.log('\n📝 Updating One Fitness organization...');
    const oneFitnessStats = {
      coachCount: oneFitnessCoachUids.length,
      clientCount: 0, // Will be calculated
      assessmentCount: 0, // Will be calculated
      aiCostsMtdFils: 0,
      lastUpdated: new Date(),
    };
    
    // Count clients and assessments
    for (const coachUid of oneFitnessCoachUids) {
      try {
        const clientsRef = collection(db, 'coaches', coachUid, 'clients');
        const clientsSnapshot = await getDocs(clientsRef);
        oneFitnessStats.clientCount += clientsSnapshot.size;
        
        const assessmentsRef = collection(db, 'coaches', coachUid, 'assessments');
        const assessmentsSnapshot = await getDocs(assessmentsRef);
        oneFitnessStats.assessmentCount += assessmentsSnapshot.size;
      } catch (e) {
        // Ignore errors
      }
    }
    
    await updateDoc(getOrganizationDoc(oneFitnessOrgId), {
      stats: oneFitnessStats,
      subscription: {
        plan: 'enterprise',
        status: 'active',
        isComped: true,
        clientCapacity: 'unlimited',
      },
      metadata: {
        isInternal: true,
        isTest: false,
      },
      type: 'gym',
    });
    
    console.log(`   ✅ Updated One Fitness with stats:`, oneFitnessStats);
    
    result.success = true;
    console.log('\n✅ Final cleanup complete!');
    console.log(`   One Fitness org: ${oneFitnessOrgId}`);
    console.log(`   Coaches kept: ${result.coachesKept.length}`);
    console.log(`   Users deleted: ${result.usersDeleted.length}`);
    console.log(`   Orgs deleted: ${result.orgsDeleted.length}`);
    
    return result;
  } catch (error) {
    logger.error('Failed final cleanup:', error);
    result.errors.push(`General error: ${error}`);
    console.error('❌ Final cleanup failed:', error);
    return result;
  }
}

// Expose to window for browser console access
if (typeof window !== 'undefined') {
  (window as unknown as { 
    finalCleanup: typeof finalCleanup;
  }).finalCleanup = finalCleanup;
}

