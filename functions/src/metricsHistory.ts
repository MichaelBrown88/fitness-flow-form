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

/**
 * Compute per-org health summaries for the platform admin dashboard.
 * Writes to platform/metrics/org-health/{orgId} — NO client PII, just aggregate counts.
 *
 * Health score (0-100) = weighted engagement signals:
 * - Activity (40%): assessments per client this month
 * - Breadth (20%): how many product features are used
 * - Recency (20%): days since last assessment (lower is better)
 * - Growth (20%): client count trend vs last month
 */
export async function computeOrgHealthSummaries(): Promise<void> {
  const db = admin.firestore();
  const orgsSnap = await db.collection('organizations').get();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let updated = 0;

  for (const orgDoc of orgsSnap.docs) {
    const orgData = orgDoc.data();
    const meta = orgData.metadata as Record<string, unknown> | undefined;
    if (meta?.isDeleted === true) continue;

    const stats = orgData.stats as Record<string, unknown> | undefined;
    const sub = orgData.subscription as Record<string, unknown> | undefined;
    const clientCount = Number(stats?.clientCount ?? 0);
    const coachCount = Number(stats?.coachCount ?? 0);
    const assessmentsThisMonth = Number(stats?.assessmentsThisMonth ?? 0);

    // Read last month's org-health doc for growth comparison
    const prevHealthSnap = await db.doc(`platform/metrics/org-health/${orgDoc.id}`).get();
    const prevData = prevHealthSnap.exists ? prevHealthSnap.data() : null;
    const prevClientCount = Number(prevData?.clientCount ?? clientCount);

    // Last active: most recent assessment date from org stats
    const lastActiveRaw = stats?.lastUpdated ?? orgData.updatedAt;
    const lastActiveAt = lastActiveRaw?.toDate?.() ?? now;
    const daysSinceActive = Math.floor((now.getTime() - lastActiveAt.getTime()) / (1000 * 60 * 60 * 24));

    // Features used
    const featuresUsed: string[] = Array.isArray(orgData.featuresUsed)
      ? orgData.featuresUsed
      : [];

    // AI costs
    const aiCostsMtd = Number(stats?.aiCostsMtdGbpPence ?? 0);
    const aiCostsLifetime = Number(stats?.aiCostsLifetimeGbpPence ?? stats?.aiCostsGbpPence ?? 0);

    // MRR contribution
    const mrrContribution = Number(sub?.mrrGbpPence ?? 0);

    // Health score computation
    const activityScore = clientCount > 0
      ? Math.min(100, (assessmentsThisMonth / clientCount) * 100)
      : 0;
    const breadthScore = Math.min(100, (featuresUsed.length / 5) * 100); // 5 features = 100
    const recencyScore = daysSinceActive <= 1 ? 100
      : daysSinceActive <= 7 ? 80
      : daysSinceActive <= 14 ? 60
      : daysSinceActive <= 30 ? 30
      : 0;
    const growthScore = prevClientCount > 0
      ? Math.min(100, Math.max(0, 50 + ((clientCount - prevClientCount) / prevClientCount) * 50))
      : clientCount > 0 ? 100 : 0;

    const healthScore = Math.round(
      activityScore * 0.4 +
      breadthScore * 0.2 +
      recencyScore * 0.2 +
      growthScore * 0.2
    );

    const healthDoc = {
      orgId: orgDoc.id,
      orgName: orgData.name || orgData.orgName || orgDoc.id,
      plan: sub?.plan || 'unknown',
      region: sub?.region || orgData.region || 'unknown',
      status: sub?.status || 'unknown',
      clientCount,
      coachCount,
      assessmentsThisMonth,
      assessmentsLastMonth: Number(prevData?.assessmentsThisMonth ?? 0),
      lastActiveAt: admin.firestore.Timestamp.fromDate(lastActiveAt),
      firstAssessmentAt: stats?.firstAssessmentAt ?? null,
      featuresUsed,
      aiCostsMtd,
      aiCostsLifetime,
      mrrContribution,
      healthScore,
      computedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.doc(`platform/metrics/org-health/${orgDoc.id}`).set(healthDoc);
    updated++;
  }

  console.log(`[OrgHealth] Computed health summaries for ${updated} orgs`);
}

/**
 * Monthly rollup — writes to platform/metrics/monthly/{YYYY-MM}.
 * Called by snapshotPlatformMetrics on the 1st of each month.
 */
export async function writeMonthlyRollup(): Promise<void> {
  const db = admin.firestore();
  const now = new Date();

  // Roll up the previous month
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

  // Read all daily snapshots for the previous month
  const daysInMonth = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate();
  const firstDay = `${monthKey}-01`;
  const lastDay = `${monthKey}-${String(daysInMonth).padStart(2, '0')}`;

  const dailySnaps = await db.collection('platform/metrics/history')
    .where('date', '>=', firstDay)
    .where('date', '<=', lastDay)
    .get();

  if (dailySnaps.empty) {
    console.log(`[MetricsHistory] No daily snapshots for ${monthKey}, skipping rollup`);
    return;
  }

  // Aggregate: take the last day's values as end-of-month state
  const sorted = dailySnaps.docs
    .map(d => d.data())
    .sort((a, b) => (a.date as string).localeCompare(b.date as string));
  const endOfMonth = sorted[sorted.length - 1];
  const startOfMonthSnap = sorted[0];

  const rollup = {
    month: monthKey,
    mrrEndGbpPence: endOfMonth.mrrGbpPence ?? 0,
    mrrStartGbpPence: startOfMonthSnap.mrrGbpPence ?? 0,
    activeOrgsEnd: endOfMonth.activeOrgs ?? 0,
    activeOrgsStart: startOfMonthSnap.activeOrgs ?? 0,
    totalAssessmentsEnd: endOfMonth.totalAssessments ?? 0,
    assessmentsThisMonth: endOfMonth.assessmentsThisMonth ?? 0,
    totalClientsEnd: endOfMonth.totalClients ?? 0,
    totalCoachesEnd: endOfMonth.totalCoaches ?? 0,
    aiCostsGbpPence: endOfMonth.aiCostsMtdGbpPence ?? 0,
    dailySnapshots: dailySnaps.size,
    computedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.doc(`platform/metrics/monthly/${monthKey}`).set(rollup);
  console.log(`[MetricsHistory] Monthly rollup written for ${monthKey}`);
}
