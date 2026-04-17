/**
 * Metrics History
 *
 * Scheduled function that writes daily platform metrics snapshots to
 * platform/metrics/history/{YYYY-MM-DD} for historical charts.
 */

import * as admin from 'firebase-admin';
import { alertMrrDrop, alertAiCostSpike } from './slackBillingAlerts';

// Alert when MRR drops by more than this fraction in one day (default 20%)
const MRR_DROP_THRESHOLD = parseFloat(process.env.ALERT_MRR_DROP_PCT ?? '20') / 100;
// Alert when MTD AI costs exceed this amount in GBP pence (default £50 = 5000p)
const AI_COST_SPIKE_THRESHOLD_GBP_PENCE = Math.round(
  parseFloat(process.env.ALERT_AI_COST_SPIKE_GBP ?? '50') * 100,
);

export async function snapshotPlatformMetrics(): Promise<void> {
  const db = admin.firestore();

  const statsRef = db.doc('platform-stats/global-metrics');
  const statsSnap = await statsRef.get();

  if (!statsSnap.exists) {
    console.log('[MetricsHistory] platform-stats/global-metrics does not exist, skipping snapshot');
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

  // --- Platform admin alerting ---

  // Read yesterday's snapshot for comparison
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().split('T')[0];
  const prevSnap = await db.doc(`platform/metrics/history/${yesterdayKey}`).get();
  const prevData = prevSnap.data();

  const currMrr: number = (historyDoc.mrrGbpPence as number) ?? 0;
  const prevMrr: number = prevData?.mrrGbpPence ?? 0;

  // MRR drop: only alert if previous MRR was non-zero and today's drop exceeds threshold
  if (prevMrr > 0 && currMrr < prevMrr) {
    const dropFraction = (prevMrr - currMrr) / prevMrr;
    if (dropFraction >= MRR_DROP_THRESHOLD) {
      await alertMrrDrop({
        prevMrrGbpPence: prevMrr,
        currMrrGbpPence: currMrr,
        dropPct: dropFraction * 100,
      }).catch((err) => console.warn('[MetricsHistory] MRR drop alert failed', err));
    }
  }

  // AI cost spike: alert on first day MTD costs exceed threshold (not every day after)
  const currAiMtd: number = (historyDoc.aiCostsMtdGbpPence as number) ?? 0;
  const prevAiMtd: number = prevData?.aiCostsMtdGbpPence ?? 0;
  if (
    currAiMtd >= AI_COST_SPIKE_THRESHOLD_GBP_PENCE &&
    prevAiMtd < AI_COST_SPIKE_THRESHOLD_GBP_PENCE
  ) {
    await alertAiCostSpike({
      mtdGbpPence: currAiMtd,
      thresholdGbpPence: AI_COST_SPIKE_THRESHOLD_GBP_PENCE,
    }).catch((err) => console.warn('[MetricsHistory] AI cost spike alert failed', err));
  }
}

/**
 * Monthly counter reset — runs on the 1st of each month at 00:01 UTC.
 * Zeroes assessments_this_month in platform-stats and assessmentsThisMonth
 * in every non-deleted org's stats. The weekly reconciliation will correct
 * these to accurate values within 7 days.
 */
export async function resetAssessmentsThisMonth(): Promise<void> {
  const db = admin.firestore();

  const orgsSnap = await db.collection('organizations').get();
  let batch = db.batch();
  let orgCount = 0;
  let batchCount = 0;

  for (const orgDoc of orgsSnap.docs) {
    const orgData = orgDoc.data() as Record<string, unknown>;
    if ((orgData.metadata as Record<string, unknown> | undefined)?.isDeleted === true) continue;
    batch.set(orgDoc.ref, { stats: { assessmentsThisMonth: 0 } }, { merge: true });
    orgCount += 1;
    batchCount += 1;

    if (batchCount >= 499) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  // Commit any remaining writes in the final batch
  if (batchCount > 0) {
    await batch.commit();
  }

  await db.doc('platform-stats/global-metrics').set(
    { assessments_this_month: 0 },
    { merge: true },
  );

  console.log(`[MetricsHistory] assessmentsThisMonth reset to 0 for ${orgCount} orgs`);
}
