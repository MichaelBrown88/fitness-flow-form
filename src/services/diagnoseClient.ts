/**
 * Dev-only diagnostic utility for inspecting and fixing client data in Firestore.
 * 
 * Usage (browser console on localhost):
 *   diagnoseClient("michael james brown")
 *   fixClientAnimations("michael james brown")
 */

import { getDb } from '@/services/firebase';
import { COLLECTIONS } from '@/constants/collections';
import { logger } from '@/lib/utils/logger';

/**
 * Diagnose a client's public report data.
 * Shows: token, formData fields, previousFormData presence, achievements, notifications.
 */
export async function diagnoseClient(clientNameLower: string): Promise<void> {
  if (!import.meta.env.DEV) {
    logger.warn('[Diagnose] Only available in dev mode');
    return;
  }

  const {
    collection: fbCollection,
    query: fbQuery,
    where: fbWhere,
    getDocs: fbGetDocs,
    limit: fbLimit,
    orderBy: fbOrderBy,
  } = await import('firebase/firestore');
  const { computeScores } = await import('@/lib/scoring');
  const db = getDb();
  const name = clientNameLower.toLowerCase();

  // 1. Find public reports
  console.group(`🔍 Diagnosing: "${name}"`);
  const reportsQ = fbQuery(
    fbCollection(db, COLLECTIONS.PUBLIC_REPORTS),
    fbWhere('clientNameLower', '==', name),
    fbLimit(10),
  );
  const reportSnap = await fbGetDocs(reportsQ);

  if (reportSnap.empty) {
    console.warn('❌ No public reports found for this client');
    console.groupEnd();
    return;
  }

  console.log(`✅ Found ${reportSnap.size} public report(s)`);

  for (const reportDoc of reportSnap.docs) {
    const data = reportDoc.data();
    const token = reportDoc.id;
    console.group(`📄 Token: ${token}`);
    console.log('Assessment ID:', data.assessmentId);
    console.log('Coach UID:', data.coachUid);
    console.log('Org ID:', data.organizationId);
    console.log('Visibility:', data.visibility);
    console.log('Created:', data.createdAt?.toDate?.()?.toISOString?.() ?? 'N/A');
    console.log('Updated:', data.updatedAt?.toDate?.()?.toISOString?.() ?? 'N/A');

    // Form data summary
    if (data.formData) {
      const fd = data.formData;
      console.group('📊 Current formData');
      console.log('Name:', fd.fullName);
      console.log('Weight:', fd.inbodyWeightKg, 'kg');
      console.log('Body Fat:', fd.inbodyBodyFatPct, '%');
      console.log('Muscle:', fd.skeletalMuscleMassKg, 'kg');
      console.log('Resting HR:', fd.cardioRestingHr);
      console.log('Push-ups:', fd.pushupsOneMinuteReps || fd.pushupMaxReps);
      console.log('Plank:', fd.plankDurationSeconds, 's');
      try {
        const scores = computeScores(fd);
        console.log('Overall Score:', scores.overall);
        scores.categories.forEach((c: { id: string; score: number }) => {
          console.log(`  ${c.id}: ${c.score}`);
        });
      } catch (e) {
        console.warn('Could not compute scores:', e);
      }
      console.groupEnd();
    } else {
      console.warn('❌ No formData on this report');
    }

    // Previous form data
    if (data.previousFormData) {
      const pfd = data.previousFormData;
      console.group('📊 previousFormData (for animations)');
      console.log('Weight:', pfd.inbodyWeightKg, 'kg');
      console.log('Body Fat:', pfd.inbodyBodyFatPct, '%');
      console.log('Muscle:', pfd.skeletalMuscleMassKg, 'kg');
      console.log('Resting HR:', pfd.cardioRestingHr);
      try {
        const prevScores = computeScores(pfd);
        console.log('Previous Overall Score:', prevScores.overall);
        prevScores.categories.forEach((c: { id: string; score: number }) => {
          console.log(`  ${c.id}: ${c.score}`);
        });
      } catch (e) {
        console.warn('Could not compute previous scores:', e);
      }
      console.groupEnd();
    } else {
      console.warn('⚠️ No previousFormData — animations will NOT fire');
    }

    // Achievements
    const achQ = fbQuery(
      fbCollection(db, COLLECTIONS.PUBLIC_REPORTS, token, COLLECTIONS.ACHIEVEMENTS),
      fbLimit(50),
    );
    const achSnap = await fbGetDocs(achQ);
    const unlocked = achSnap.docs.filter(d => d.data().unlockedAt);
    console.log(`🏆 Achievements: ${unlocked.length}/${achSnap.size} unlocked`);

    // Notifications
    const notifQ = fbQuery(
      fbCollection(db, COLLECTIONS.PUBLIC_REPORTS, token, COLLECTIONS.NOTIFICATIONS),
      fbLimit(50),
    );
    const notifSnap = await fbGetDocs(notifQ);
    console.log(`🔔 Notifications: ${notifSnap.size} total`);

    console.groupEnd();
  }

  // 2. Also check assessment history for this client via org-scoped collection
  if (reportSnap.docs.length > 0) {
    const firstReport = reportSnap.docs[0].data();
    const orgId = firstReport.organizationId;
    const coachUid = firstReport.coachUid;
    const clientName = firstReport.clientName;

    if (orgId) {
      console.group('📜 Assessment history (org-scoped)');
      
      // Check org assessments collection
      const assessQ = fbQuery(
        fbCollection(db, `organizations/${orgId}/assessments`),
        fbWhere('clientNameLower', '==', name),
        fbOrderBy('createdAt', 'desc'),
        fbLimit(10),
      );
      try {
        const assessSnap = await fbGetDocs(assessQ);
        console.log(`Found ${assessSnap.size} assessment(s) in org assessments`);
        assessSnap.docs.forEach(d => {
          const ad = d.data();
          console.log(`  ID: ${d.id} | Score: ${ad.overallScore} | Partial: ${ad.isPartial ?? false} | Category: ${ad.category ?? 'full'} | Created: ${ad.createdAt?.toDate?.()?.toISOString?.() ?? 'N/A'} | Updated: ${ad.updatedAt?.toDate?.()?.toISOString?.() ?? 'N/A'}`);
        });
      } catch (e) {
        console.warn('Could not query org assessments (may need composite index):', e);
      }

      // Check assessment history snapshots
      const slug = clientName.trim().replace(/\s+/g, ' ').toLowerCase().replace(/\s+/g, '-');
      const snapshotsPath = `organizations/${orgId}/assessmentHistory/${slug}/snapshots`;
      console.group(`📸 Snapshots (${snapshotsPath})`);
      try {
        const snapQ = fbQuery(
          fbCollection(db, snapshotsPath),
          fbOrderBy('timestamp', 'desc'),
          fbLimit(10),
        );
        const snapResult = await fbGetDocs(snapQ);
        console.log(`Found ${snapResult.size} snapshot(s)`);
        snapResult.docs.forEach(d => {
          const sd = d.data();
          console.log(`  ID: ${d.id} | Score: ${sd.overallScore} | Type: ${sd.type} | Time: ${sd.timestamp?.toDate?.()?.toISOString?.() ?? 'N/A'}`);
          if (sd.formData) {
            console.log(`    Weight: ${sd.formData.inbodyWeightKg} | Fat: ${sd.formData.inbodyBodyFatPct} | Muscle: ${sd.formData.skeletalMuscleMassKg}`);
          }
        });
      } catch (e) {
        console.warn('Could not query snapshots:', e);
      }
      console.groupEnd();
      
      console.log(`Coach UID for fix: ${coachUid}`);
      console.log(`Org ID for fix: ${orgId}`);
      console.groupEnd();
    }
  }

  console.groupEnd();
}

/**
 * Fix a client's public report so animations work.
 * Reads the assessment history, finds the previous formData, and writes it as previousFormData.
 */
export async function fixClientAnimations(clientNameLower: string): Promise<void> {
  if (!import.meta.env.DEV) {
    logger.warn('[Fix] Only available in dev mode');
    return;
  }

  const {
    collection: fbCollection,
    query: fbQuery,
    where: fbWhere,
    getDocs: fbGetDocs,
    limit: fbLimit,
    doc: fbDoc,
    updateDoc: fbUpdateDoc,
  } = await import('firebase/firestore');
  const { sanitizeForFirestore } = await import('@/lib/utils/firebaseUtils');
  const db = getDb();
  const name = clientNameLower.toLowerCase();

  // Find the public report
  const reportsQ = fbQuery(
    fbCollection(db, COLLECTIONS.PUBLIC_REPORTS),
    fbWhere('clientNameLower', '==', name),
    fbLimit(1),
  );
  const reportSnap = await fbGetDocs(reportsQ);

  if (reportSnap.empty) {
    console.error('❌ No public report found for', name);
    return;
  }

  const reportDoc = reportSnap.docs[0];
  const reportData = reportDoc.data();
  const token = reportDoc.id;

  if (reportData.previousFormData) {
    console.log('✅ previousFormData already exists for', name);
    return;
  }

  // Find assessment snapshots for this client
  const { getSnapshots } = await import('@/services/assessmentHistory');
  const coachUid = reportData.coachUid;

  const snapshots = await getSnapshots(coachUid, reportData.clientName, 5, reportData.organizationId);
  console.log(`Found ${snapshots.length} snapshots for ${reportData.clientName}`);

  if (snapshots.length < 2) {
    console.warn('⚠️ Only', snapshots.length, 'snapshot(s) — need at least 2 for animations');
    if (snapshots.length === 1) {
      console.log('Only one assessment exists. Animations require a previous assessment to compare against.');
    }
    return;
  }

  // snapshots[0] is most recent, snapshots[1] is the one before
  const previousFormData = snapshots[1].formData;

  if (!previousFormData) {
    console.error('❌ Previous snapshot has no formData');
    return;
  }

  console.log('Writing previousFormData to public report', token);
  const ref = fbDoc(db, COLLECTIONS.PUBLIC_REPORTS, token);
  await fbUpdateDoc(ref, {
    previousFormData: sanitizeForFirestore(previousFormData),
  });

  console.log('✅ Done! previousFormData written. Refresh the report to see animations.');
}

// Expose on window for dev console usage
if (import.meta.env.DEV) {
  const w = window as unknown as Record<string, unknown>;
  w.diagnoseClient = diagnoseClient;
  w.fixClientAnimations = fixClientAnimations;
}
