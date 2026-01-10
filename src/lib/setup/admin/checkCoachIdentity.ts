/**
 * Check Coach Identity
 * 
 * Verify which coaches belong to One Fitness and identify unknown coaches
 * Run from browser console: await window.checkCoachIdentity('ZLEhu5Tz78WAk0Y5MBL5ic3quyx2')
 */

import { getDoc, getDocs, collection } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { getLegacyUserProfileDoc, getOrganizationsCollection } from '@/lib/database/collections';

export async function checkCoachIdentity(coachUid: string): Promise<{
  success: boolean;
  coachUid: string;
  email?: string;
  name?: string;
  organizationId?: string;
  role?: string;
  belongsToOneFitness: boolean;
  oneFitnessOrgId?: string;
  clients?: number;
  assessments?: number;
  error?: string;
}> {
  try {
    console.log(`🔍 Checking coach identity: ${coachUid}...\n`);
    
    const db = getDb();
    
    // Get user profile
    const userProfileRef = getLegacyUserProfileDoc(coachUid);
    const userProfileSnap = await getDoc(userProfileRef);
    
    if (!userProfileSnap.exists()) {
      return {
        success: false,
        coachUid,
        belongsToOneFitness: false,
        error: 'User profile not found',
      };
    }
    
    const userData = userProfileSnap.data();
    const organizationId = userData.organizationId;
    
    // Find One Fitness org ID
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
        break;
      }
    }
    
    const belongsToOneFitness = organizationId === oneFitnessOrgId;
    
    // Count clients and assessments
    let clients = 0;
    let assessments = 0;
    
    try {
      const clientsRef = collection(db, 'coaches', coachUid, 'clients');
      const clientsSnapshot = await getDocs(clientsRef);
      clients = clientsSnapshot.size;
      
      const assessmentsRef = collection(db, 'coaches', coachUid, 'assessments');
      const assessmentsSnapshot = await getDocs(assessmentsRef);
      assessments = assessmentsSnapshot.size;
    } catch (e) {
      // Ignore errors
    }
    
    const result = {
      success: true,
      coachUid,
      email: userData.email,
      name: userData.name || userData.displayName,
      organizationId: organizationId || undefined,
      role: userData.role,
      belongsToOneFitness,
      oneFitnessOrgId: oneFitnessOrgId || undefined,
      clients,
      assessments,
    };
    
    console.log('📋 Coach Details:');
    console.log(`   UID: ${coachUid}`);
    console.log(`   Email: ${result.email || 'No email'}`);
    console.log(`   Name: ${result.name || 'No name'}`);
    console.log(`   Role: ${result.role || 'Unknown'}`);
    console.log(`   Organization ID: ${result.organizationId || 'None'}`);
    console.log(`   Belongs to One Fitness: ${belongsToOneFitness ? '✅ YES' : '❌ NO'}`);
    console.log(`   One Fitness Org ID: ${oneFitnessOrgId || 'Not found'}`);
    console.log(`   Clients: ${clients}`);
    console.log(`   Assessments: ${assessments}`);
    
    if (!belongsToOneFitness && oneFitnessOrgId) {
      console.log(`\n⚠️  This coach does NOT belong to One Fitness!`);
      console.log(`   Current org: ${result.organizationId || 'None'}`);
      console.log(`   Should be: ${oneFitnessOrgId}`);
    }
    
    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Failed to check coach identity:', error);
    return {
      success: false,
      coachUid,
      belongsToOneFitness: false,
      error: errorMsg,
    };
  }
}

// Expose to window for browser console access
if (typeof window !== 'undefined') {
  (window as unknown as { 
    checkCoachIdentity: typeof checkCoachIdentity;
  }).checkCoachIdentity = checkCoachIdentity;
}
