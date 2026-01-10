/**
 * Backfill organizationId for AI Usage Logs
 * 
 * Many AI usage logs have organizationId: null because they were created before
 * the organizationId was properly tracked. This script backfills the organizationId
 * by looking up the coach's user profile.
 * 
 * Run from browser console: await window.backfillAIUsageOrganizationId()
 */

import { getDocs, updateDoc } from 'firebase/firestore';
import { 
  getAIUsageLogsCollection,
  getLegacyUserProfilesCollection,
  getOrganizationsCollection,
} from '@/lib/database/collections';

export async function backfillAIUsageOrganizationId(): Promise<{
  success: boolean;
  totalLogs: number;
  logsUpdated: number;
  logsSkipped: number;
  errors: string[];
}> {
  const result = {
    success: false,
    totalLogs: 0,
    logsUpdated: 0,
    logsSkipped: 0,
    errors: [] as string[],
  };
  
  try {
    console.log('🔄 Backfilling organizationId for AI usage logs...\n');
    
    // 1. Get all AI usage logs
    console.log('1️⃣ Fetching AI usage logs...');
    const aiLogsSnapshot = await getDocs(getAIUsageLogsCollection());
    result.totalLogs = aiLogsSnapshot.size;
    
    console.log(`   Found ${result.totalLogs} total AI usage logs\n`);
    
    if (aiLogsSnapshot.empty) {
      console.log('✅ No AI usage logs found');
      result.success = true;
      return result;
    }
    
    // 2. Find One Fitness organization ID
    console.log('2️⃣ Finding One Fitness organization...');
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
    
    // 3. Get all user profiles to create a coachUid -> organizationId map
    console.log('\n3️⃣ Building coach to organization map...');
    const userProfilesSnapshot = await getDocs(getLegacyUserProfilesCollection());
    const coachToOrgMap = new Map<string, string>();
    
    userProfilesSnapshot.docs.forEach(userDoc => {
      const data = userDoc.data();
      const organizationId = data.organizationId;
      if (organizationId && (data.role === 'coach' || data.role === 'org_admin')) {
        coachToOrgMap.set(userDoc.id, organizationId);
      }
    });
    
    console.log(`   Mapped ${coachToOrgMap.size} coaches to organizations`);
    console.log(`   Default org (for unmapped coaches): ${oneFitnessOrgId}\n`);
    
    // 4. Process each AI usage log
    console.log('4️⃣ Processing AI usage logs...');
    let batchCount = 0;
    
    for (const logDoc of aiLogsSnapshot.docs) {
      try {
        const logData = logDoc.data();
        const coachUid = logData.coachUid;
        const currentOrgId = logData.organizationId;
        
        // Skip if already has organizationId
        if (currentOrgId) {
          result.logsSkipped++;
          continue;
        }
        
        // Find organizationId from coach, or default to One Fitness
        let organizationId = coachToOrgMap.get(coachUid);
        
        // If coach not found in map, default to One Fitness (since it's the only org currently)
        if (!organizationId) {
          organizationId = oneFitnessOrgId;
          console.log(`   ⚠️  Coach ${coachUid} not found in map, defaulting to One Fitness`);
        }
        
        // Update the log with organizationId
        await updateDoc(logDoc.ref, {
          organizationId,
        });
        
        result.logsUpdated++;
        batchCount++;
        
        if (batchCount % 100 === 0) {
          console.log(`   ✅ Updated ${result.logsUpdated} logs...`);
        }
      } catch (e) {
        result.errors.push(`Failed to update log ${logDoc.id}: ${e}`);
        console.error(`   ❌ Failed to update log ${logDoc.id}:`, e);
      }
    }
    
    result.success = true;
    console.log(`\n✅ Backfill complete!`);
    console.log(`   Total logs: ${result.totalLogs}`);
    console.log(`   Updated: ${result.logsUpdated}`);
    console.log(`   Skipped: ${result.logsSkipped} (already had organizationId or coach not found)`);
    
    if (result.errors.length > 0) {
      console.log(`   Errors: ${result.errors.length}`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Failed to backfill AI usage organizationId:', error);
    result.errors.push(`General error: ${error}`);
    return result;
  }
}

// Expose to window for browser console access
if (typeof window !== 'undefined') {
  (window as unknown as { 
    backfillAIUsageOrganizationId: typeof backfillAIUsageOrganizationId;
  }).backfillAIUsageOrganizationId = backfillAIUsageOrganizationId;
}
