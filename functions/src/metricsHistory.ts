/**
 * Metrics History
 *
 * Scheduled function that writes daily platform metrics snapshots to
 * platform/metrics/history/{YYYY-MM-DD} for historical charts.
 */

import * as admin from 'firebase-admin';

export async function snapshotPlatformMetrics(): Promise<void> {
  const db = admin.firestore();

  const statsRef = db.doc('system_stats/global_metrics');
  const statsSnap = await statsRef.get();

  if (!statsSnap.exists) {
    console.log('[MetricsHistory] system_stats/global_metrics does not exist, skipping snapshot');
    return;
  }

  const stats = statsSnap.data();
  const today = new Date();
  const dateKey = today.toISOString().split('T')[0];

  const historyDoc: Record<string, unknown> = {
    date: dateKey,
    mrrGbpPence: stats?.monthlyRecurringRevenueGbpPence ?? stats?.monthlyRecurringRevenueFils ?? 0,
    totalOrgs: stats?.totalOrgs ?? 0,
    activeOrgs: stats?.activeOrgs ?? 0,
    trialOrgs: stats?.trialOrgs ?? 0,
    totalCoaches: stats?.totalCoaches ?? 0,
    totalClients: stats?.totalClients ?? 0,
    totalAssessments: stats?.totalAssessments ?? 0,
    assessmentsThisMonth: stats?.assessments_this_month ?? 0,
    totalAiCostsFils: stats?.totalAiCostsFils ?? 0,
    totalAiCostsGbpPence: stats?.totalAiCostsGbpPence ?? 0,
    aiCostsMtdGbpPence: stats?.aiCostsMtdGbpPence ?? 0,
    snapshotAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.doc(`platform/metrics/history/${dateKey}`).set(historyDoc, { merge: true });
  console.log(`[MetricsHistory] Snapshot written for ${dateKey}`);
}

/**
 * Monthly counter reset — runs on the 1st of each month at 00:01 UTC.
 * Zeroes assessments_this_month in system_stats and assessmentsThisMonth
 * in every non-deleted org's stats. The weekly reconciliation will correct
 * these to accurate values within 7 days.
 */
export async function resetAssessmentsThisMonth(): Promise<void> {
  const db = admin.firestore();

  const orgsSnap = await db.collection('organizations').get();
  const batch = db.batch();
  let orgCount = 0;

  for (const orgDoc of orgsSnap.docs) {
    const orgData = orgDoc.data() as Record<string, unknown>;
    if ((orgData.metadata as Record<string, unknown> | undefined)?.isDeleted === true) continue;
    batch.set(orgDoc.ref, { stats: { assessmentsThisMonth: 0 } }, { merge: true });
    orgCount += 1;

    if (orgCount % 499 === 0) {
      await batch.commit();
    }
  }

  await batch.commit();

  await db.doc('system_stats/global_metrics').set(
    { assessments_this_month: 0 },
    { merge: true },
  );

  console.log(`[MetricsHistory] assessmentsThisMonth reset to 0 for ${orgCount} orgs`);
}
