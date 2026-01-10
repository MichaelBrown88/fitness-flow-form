/**
 * Diagnose Public Reports
 * 
 * Check for orphaned or stale public reports that should be cleaned up
 * Run from browser console: await window.diagnosePublicReports()
 */

import { getDocs, deleteDoc, getDoc, doc } from 'firebase/firestore';
import { getPublicReportsCollection, getPublicReportDoc } from '@/lib/database/collections';
import { getDb } from '@/services/firebase';

export async function diagnosePublicReports(): Promise<{
  success: boolean;
  totalReports: number;
  reportsByCoach: Record<string, number>;
  orphanedReports: Array<{ token: string; coachUid: string; assessmentId: string; reason: string }>;
  expiredReports: Array<{ token: string; expiresAt: Date }>;
  errors: string[];
}> {
  const result = {
    success: false,
    totalReports: 0,
    reportsByCoach: {} as Record<string, number>,
    orphanedReports: [] as Array<{ token: string; coachUid: string; assessmentId: string; reason: string }>,
    expiredReports: [] as Array<{ token: string; expiresAt: Date }>,
    errors: [] as string[],
  };
  
  try {
    console.log('🔍 Diagnosing public reports...\n');
    
    // Get all public reports
    const reportsSnapshot = await getDocs(getPublicReportsCollection());
    result.totalReports = reportsSnapshot.size;
    
    console.log(`📊 Total public reports: ${result.totalReports}\n`);
    
    if (reportsSnapshot.empty) {
      console.log('✅ No public reports found');
      result.success = true;
      return result;
    }
    
    const db = getDb();
    const now = Date.now();
    
    // Process each report
    for (const reportDoc of reportsSnapshot.docs) {
      const token = reportDoc.id;
      const data = reportDoc.data();
      const coachUid = data.coachUid;
      const assessmentId = data.assessmentId;
      
      // Count by coach
      result.reportsByCoach[coachUid] = (result.reportsByCoach[coachUid] || 0) + 1;
      
      // Check if expired
      if (data.expiresAt) {
        const expiresAt = data.expiresAt.toMillis();
        if (expiresAt < now) {
          result.expiredReports.push({
            token,
            expiresAt: data.expiresAt.toDate(),
          });
        }
      }
      
      // Check if assessment still exists
      try {
        const assessmentRef = doc(db, 'coaches', coachUid, 'assessments', assessmentId);
        const assessmentSnap = await getDoc(assessmentRef);
        
        if (!assessmentSnap.exists()) {
          result.orphanedReports.push({
            token,
            coachUid,
            assessmentId,
            reason: 'Assessment does not exist',
          });
        }
      } catch (e) {
        result.errors.push(`Failed to check assessment ${assessmentId} for coach ${coachUid}: ${e}`);
      }
    }
    
    // Print summary
    console.log('📊 Reports by coach:');
    Object.entries(result.reportsByCoach).forEach(([coachUid, count]) => {
      console.log(`   Coach ${coachUid}: ${count} reports`);
    });
    
    if (result.expiredReports.length > 0) {
      console.log(`\n⏰ Expired reports: ${result.expiredReports.length}`);
      result.expiredReports.slice(0, 5).forEach(report => {
        console.log(`   - ${report.token} (expired: ${report.expiresAt.toISOString()})`);
      });
      if (result.expiredReports.length > 5) {
        console.log(`   ... and ${result.expiredReports.length - 5} more`);
      }
    }
    
    if (result.orphanedReports.length > 0) {
      console.log(`\n🗑️  Orphaned reports (assessment deleted): ${result.orphanedReports.length}`);
      result.orphanedReports.slice(0, 5).forEach(report => {
        console.log(`   - ${report.token} (${report.coachUid}/${report.assessmentId})`);
      });
      if (result.orphanedReports.length > 5) {
        console.log(`   ... and ${result.orphanedReports.length - 5} more`);
      }
    }
    
    if (result.expiredReports.length === 0 && result.orphanedReports.length === 0) {
      console.log('\n✅ All public reports appear to be valid!');
    }
    
    result.success = true;
    console.log('\n✅ Diagnosis complete!');
    console.log('Result object:', result);
    
    return result;
  } catch (error) {
    console.error('❌ Failed to diagnose public reports:', error);
    result.errors.push(`General error: ${error}`);
    return result;
  }
}

/**
 * Clean up orphaned public reports (where assessment no longer exists)
 */
export async function cleanupOrphanedPublicReports(): Promise<{
  success: boolean;
  deleted: number;
  errors: string[];
}> {
  const result = {
    success: false,
    deleted: 0,
    errors: [] as string[],
  };
  
  try {
    console.log('🧹 Cleaning up orphaned public reports...\n');
    
    // First diagnose
    const diagnosis = await diagnosePublicReports();
    
    if (diagnosis.orphanedReports.length === 0) {
      console.log('✅ No orphaned reports to clean up');
      result.success = true;
      return result;
    }
    
    // Delete orphaned reports
    for (const report of diagnosis.orphanedReports) {
      try {
        await deleteDoc(getPublicReportDoc(report.token));
        result.deleted++;
        console.log(`   ✅ Deleted orphaned report: ${report.token}`);
      } catch (e) {
        result.errors.push(`Failed to delete ${report.token}: ${e}`);
        console.error(`   ❌ Failed to delete ${report.token}:`, e);
      }
    }
    
    result.success = true;
    console.log(`\n✅ Cleanup complete! Deleted ${result.deleted} orphaned reports`);
    
    return result;
  } catch (error) {
    console.error('❌ Failed to cleanup orphaned reports:', error);
    result.errors.push(`General error: ${error}`);
    return result;
  }
}

// Expose to window for browser console access
if (typeof window !== 'undefined') {
  (window as unknown as { 
    diagnosePublicReports: typeof diagnosePublicReports;
    cleanupOrphanedPublicReports: typeof cleanupOrphanedPublicReports;
  }).diagnosePublicReports = diagnosePublicReports;
  (window as unknown as { 
    cleanupOrphanedPublicReports: typeof cleanupOrphanedPublicReports;
  }).cleanupOrphanedPublicReports = cleanupOrphanedPublicReports;
}
