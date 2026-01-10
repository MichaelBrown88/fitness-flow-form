/**
 * Diagnose Data - Check what actually exists in Firestore
 * 
 * Run from browser console: await window.diagnoseData()
 * This will show exactly what coaches, clients, assessments, and AI costs exist
 */

import { getDocs, getDoc, collection } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { logger } from '@/lib/utils/logger';
import {
  getOrganizationsCollection,
  getOrganizationDoc,
  getLegacyUserProfilesCollection,
} from '@/lib/database/collections';

export async function diagnoseData(): Promise<{
  organizations: Array<{ id: string; name: string; stats: Record<string, unknown> }>;
  coaches: Array<{ id: string; email?: string; name?: string }>;
  clientsByCoach: Record<string, number>;
  assessmentsByCoach: Record<string, number>;
  totalClients: number;
  totalAssessments: number;
  aiLogs: { total: number; withOrgId: number; costs: number };
}> {
  const db = getDb();
  
  console.log('🔍 Diagnosing Firestore data...\n');
  
  // 1. Check organizations
  const orgsSnapshot = await getDocs(getOrganizationsCollection());
  const organizations: Array<{ id: string; name: string; stats: Record<string, unknown> }> = [];
  
  for (const orgDoc of orgsSnapshot.docs) {
    const data = orgDoc.data();
    const stats = await getDoc(getOrganizationDoc(orgDoc.id));
    organizations.push({
      id: orgDoc.id,
      name: data.name || 'Unnamed',
      stats: stats.data()?.stats || {},
    });
    console.log(`📊 Organization: ${data.name} (${orgDoc.id})`);
    console.log('   Stats:', stats.data()?.stats || 'No stats found');
  }
  
  // 2. Check coaches collection (root level)
  const coachesRef = collection(db, 'coaches');
  const coachesSnapshot = await getDocs(coachesRef);
  const coaches: Array<{ id: string; email?: string; name?: string }> = [];
  
  console.log(`\n👥 Coaches Collection (root): ${coachesSnapshot.size} coaches found`);
  
  coachesSnapshot.docs.forEach(coachDoc => {
    const data = coachDoc.data();
    coaches.push({
      id: coachDoc.id,
      email: data.email,
      name: data.name || data.displayName,
    });
    console.log(`   - Coach ID: ${coachDoc.id}, Email: ${data.email || 'N/A'}, Name: ${data.name || data.displayName || 'N/A'}`);
  });
  
  // 2b. Check userProfiles to see actual user UIDs and find coach data under their UID
  console.log(`\n🔍 Checking userProfiles for actual coach UIDs...`);
  const userProfilesSnapshot = await getDocs(getLegacyUserProfilesCollection());
  const coachUids: string[] = [];
  
  // Process user profiles sequentially (not in forEach) to use await
  for (const userDoc of userProfilesSnapshot.docs) {
    const data = userDoc.data();
    const authUid = userDoc.id; // The document ID is the Firebase Auth UID
    const profileUid = data.uid || authUid;
    
    if (data.role === 'coach' || data.role === 'org_admin') {
      coachUids.push(authUid);
      console.log(`   - ${data.role}: Auth UID: ${authUid}, Email: ${data.email || 'N/A'}, organizationId: ${data.organizationId || 'N/A'}`);
      
      // Check if this UID has a subcollection with clients/assessments
      try {
        const coachClientsRef = collection(db, 'coaches', authUid, 'clients');
        const coachClientsSnapshot = await getDocs(coachClientsRef);
        const coachAssessmentsRef = collection(db, 'coaches', authUid, 'assessments');
        const coachAssessmentsSnapshot = await getDocs(coachAssessmentsRef);
        
        if (coachClientsSnapshot.size > 0 || coachAssessmentsSnapshot.size > 0) {
          console.log(`      ✅ Found data: ${coachClientsSnapshot.size} clients, ${coachAssessmentsSnapshot.size} assessments`);
          coachClientsSnapshot.docs.forEach(clientDoc => {
            console.log(`         Client: ${clientDoc.id}`);
          });
        }
      } catch (e) {
        // Subcollection might not exist, that's okay
      }
    }
  }
  
  console.log(`\n📝 Coach UIDs found: ${coachUids.length}`, coachUids);
  
  // 3. Check clients and assessments for each coach (from root coaches AND from user UIDs)
  const clientsByCoach: Record<string, number> = {};
  const assessmentsByCoach: Record<string, number> = {};
  let totalClients = 0;
  let totalAssessments = 0;
  const clientSet = new Set<string>();
  
  console.log(`\n📋 Checking clients and assessments...`);
  
  // First check root coaches collection
  for (const coachDoc of coachesSnapshot.docs) {
    const coachId = coachDoc.id;
    
    // Count clients
    try {
      const clientsRef = collection(db, 'coaches', coachId, 'clients');
      const clientsSnapshot = await getDocs(clientsRef);
      clientsSnapshot.docs.forEach(clientDoc => {
        clientSet.add(`${coachId}:${clientDoc.id}`);
      });
      clientsByCoach[coachId] = clientsSnapshot.size;
      totalClients += clientsSnapshot.size;
      
      if (clientsSnapshot.size > 0) {
        console.log(`   Coach ${coachId}: ${clientsSnapshot.size} clients`);
        clientsSnapshot.docs.forEach(clientDoc => {
          console.log(`      - Client: ${clientDoc.id}`);
        });
      }
    } catch (e) {
      console.warn(`   ⚠️ Error counting clients for coach ${coachId}:`, e);
      clientsByCoach[coachId] = 0;
    }
    
    // Count assessments
    try {
      const assessmentsRef = collection(db, 'coaches', coachId, 'assessments');
      const assessmentsSnapshot = await getDocs(assessmentsRef);
      assessmentsByCoach[coachId] = assessmentsSnapshot.size;
      totalAssessments += assessmentsSnapshot.size;
      
      if (assessmentsSnapshot.size > 0) {
        console.log(`   Coach ${coachId}: ${assessmentsSnapshot.size} assessments`);
      }
    } catch (e) {
      console.warn(`   ⚠️ Error counting assessments for coach ${coachId}:`, e);
      assessmentsByCoach[coachId] = 0;
    }
  }
  
  // Also check coach data under user UIDs (Firebase Auth UIDs)
  console.log(`\n📋 Checking data under user UIDs...`);
  for (const coachUid of coachUids) {
    // Count clients
    try {
      const clientsRef = collection(db, 'coaches', coachUid, 'clients');
      const clientsSnapshot = await getDocs(clientsRef);
      clientsSnapshot.docs.forEach(clientDoc => {
        clientSet.add(`${coachUid}:${clientDoc.id}`);
      });
      clientsByCoach[coachUid] = (clientsByCoach[coachUid] || 0) + clientsSnapshot.size;
      totalClients += clientsSnapshot.size;
      
      if (clientsSnapshot.size > 0) {
        console.log(`   Coach ${coachUid}: ${clientsSnapshot.size} clients`);
        clientsSnapshot.docs.forEach(clientDoc => {
          console.log(`      - Client: ${clientDoc.id}`);
        });
      }
    } catch (e) {
      console.warn(`   ⚠️ Error counting clients for coach ${coachUid}:`, e);
      clientsByCoach[coachUid] = clientsByCoach[coachUid] || 0;
    }
    
    // Count assessments
    try {
      const assessmentsRef = collection(db, 'coaches', coachUid, 'assessments');
      const assessmentsSnapshot = await getDocs(assessmentsRef);
      assessmentsByCoach[coachUid] = (assessmentsByCoach[coachUid] || 0) + assessmentsSnapshot.size;
      totalAssessments += assessmentsSnapshot.size;
      
      if (assessmentsSnapshot.size > 0) {
        console.log(`   Coach ${coachUid}: ${assessmentsSnapshot.size} assessments`);
      }
    } catch (e) {
      console.warn(`   ⚠️ Error counting assessments for coach ${coachUid}:`, e);
      assessmentsByCoach[coachUid] = assessmentsByCoach[coachUid] || 0;
    }
  }
  
  console.log(`\n📊 Totals: ${clientSet.size} unique clients, ${totalAssessments} assessments`);
  
  // 4. Check AI usage logs
  const aiLogsRef = collection(db, 'ai_usage_logs');
  const aiLogsSnapshot = await getDocs(aiLogsRef);
  let aiLogsWithOrgId = 0;
  let totalAiCosts = 0;
  
  aiLogsSnapshot.docs.forEach(logDoc => {
    const data = logDoc.data();
    if (data.organizationId) {
      aiLogsWithOrgId++;
    }
    // Handle both new (costFils) and legacy (costEstimate) fields
    let costFils = data.costFils || 0;
    if (costFils === 0 && data.costEstimate) {
      // Convert USD to KWD, then to fils: USD * 0.305 KWD/USD * 1000 fils/KWD
      costFils = Math.round(data.costEstimate * 0.305 * 1000);
    }
    totalAiCosts += costFils;
  });
  
  console.log(`\n🤖 AI Usage Logs: ${aiLogsSnapshot.size} total logs`);
  console.log(`   - With organizationId: ${aiLogsWithOrgId}`);
  console.log(`   - Total costs: ${totalAiCosts} fils (KWD ${(totalAiCosts / 1000).toFixed(3)})`);
  
  // 5. Check userProfiles (reuse the snapshot from earlier)
  console.log(`\n👤 User Profiles: ${userProfilesSnapshot.size} total profiles`);
  
  userProfilesSnapshot.docs.forEach(userDoc => {
    const data = userDoc.data();
    if (data.role === 'coach' || data.role === 'org_admin') {
      console.log(`   - ${data.role}: ${data.email || userDoc.id}, organizationId: ${data.organizationId || 'N/A'}`);
    }
  });
  
  const result = {
    organizations,
    coaches,
    clientsByCoach,
    assessmentsByCoach,
    totalClients: clientSet.size, // Unique clients
    totalAssessments,
    aiLogs: {
      total: aiLogsSnapshot.size,
      withOrgId: aiLogsWithOrgId,
      costs: totalAiCosts,
    },
  };
  
  console.log('\n✅ Diagnosis complete!');
  console.log('Result object:', result);
  
  return result;
}

// Expose to window for browser console access
if (typeof window !== 'undefined') {
  (window as unknown as { 
    diagnoseData: typeof diagnoseData;
  }).diagnoseData = diagnoseData;
}

