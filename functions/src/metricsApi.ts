/**
 * Metrics API
 *
 * Callable Cloud Functions for platform metrics.
 * Returns pre-aggregated assessment chart data and assessments-this-month
 * to avoid expensive client-side Firestore queries.
 */

import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { filsToGbpPence } from './currency.js';
import {
  currencyRatesFromFirestoreDoc,
  subscriptionSmallestUnitToGbpPence,
  type CurrencyRatesForReporting,
} from './shared/reportingFx.js';
import { getLogCostFils as getLogCostFilsShared } from './aiPricing.js';
import { firestoreValueToDate as toDate } from './firestoreTimestamp.js';

function getDb() {
  return admin.firestore();
}

function isTrackableAssessmentType(type: unknown): boolean {
  return type === 'full'
    || type === 'full-assessment'
    || (typeof type === 'string' && type.startsWith('partial-'));
}

function getSessionOrgId(path: string): string | null {
  const match = path.match(/^organizations\/([^/]+)\/clients\/[^/]+\/sessions\/[^/]+$/);
  return match?.[1] ?? null;
}

/**
 * Returns daily assessment counts for the last 30 days by computing deltas
 * between consecutive daily snapshots stored in platform/metrics/history.
 * No dependency on platform_activity_feed.
 */
export async function getAssessmentChartDataCallable(
  request: { auth?: { uid?: string } },
): Promise<Array<{ date: string; assessments: number }>> {
  if (!request.auth?.uid) throw new Error('Authentication required.');
  const db = getDb();
  const adminDoc = await db.doc(`platform_admins/${request.auth.uid}`).get();
  if (!adminDoc.exists) throw new Error('Platform admin access required.');

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Build ordered list of the last 31 date keys (we need n+1 to compute n deltas)
  const dateKeys: string[] = [];
  for (let i = 30; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dateKeys.push(d.toISOString().split('T')[0]);
  }

  // Fetch history docs in one batch
  const refs = dateKeys.map((k) => db.doc(`platform/metrics/history/${k}`));
  const snaps = await db.getAll(...refs);
  const totalByDate = new Map<string, number>();
  snaps.forEach((snap, idx) => {
    if (snap.exists) {
      totalByDate.set(dateKeys[idx], snap.data()?.totalAssessments ?? 0);
    }
  });

  // Compute daily deltas: assessments on day[i] = total[i] - total[i-1]
  const result: Array<{ date: string; assessments: number }> = [];
  for (let i = 1; i < dateKeys.length; i++) {
    const today = dateKeys[i];
    const yesterday = dateKeys[i - 1];
    const todayTotal = totalByDate.get(today) ?? 0;
    const yesterdayTotal = totalByDate.get(yesterday) ?? 0;
    result.push({ date: today, assessments: Math.max(0, todayTotal - yesterdayTotal) });
  }
  return result;
}

export async function getAssessmentsThisMonthCallable(): Promise<number> {
  const db = getDb();
  const statsRef = db.doc('system_stats/global_metrics');
  const statsSnap = await statsRef.get();
  return statsSnap.exists ? (statsSnap.data()?.assessments_this_month ?? 0) : 0;
}

export type MetricsHistoryEntry = {
  date: string;
  mrrCents: number;
  activeOrgs: number;
  trialOrgs: number;
  totalOrgs: number;
  totalAssessments: number;
  assessmentsThisMonth: number;
  aiCostsMtdCents: number;
  totalAiCostsCents: number;
};

type AssessmentEvent = {
  organizationId: string;
  timestamp: Date;
};

function startOfDay(date: Date): Date {
  const clone = new Date(date);
  clone.setHours(0, 0, 0, 0);
  return clone;
}

const getLogCostFils = getLogCostFilsShared;

function getLogDate(log: Record<string, unknown>): Date | null {
  return (
    toDate(log.timestamp) ??
    toDate((log.metadata as Record<string, unknown> | undefined)?.timestamp) ??
    toDate(log.createdAt)
  );
}

function getMrrGbpPence(
  subscription: Record<string, unknown> | undefined,
  rates: CurrencyRatesForReporting,
): number {
  if (!subscription || subscription.status !== 'active') return 0;
  const currency = typeof subscription.currency === 'string' ? subscription.currency : 'KWD';
  const amount = Number(subscription.amountCents ?? subscription.amountFils ?? 0);
  if (!amount) return 0;
  return subscriptionSmallestUnitToGbpPence(amount, currency, rates);
}

function getOrgLifecycleForDay(
  data: Record<string, unknown>,
  day: Date,
  rates: CurrencyRatesForReporting,
): {
  exists: boolean;
  active: boolean;
  trial: boolean;
  mrrCents: number;
} {
  const createdAt = startOfDay(
    toDate(data.createdAt) ??
      toDate(data.onboardingCompletedAt) ??
      new Date('2000-01-01T00:00:00.000Z'),
  );
  if (day < createdAt) {
    return { exists: false, active: false, trial: false, mrrCents: 0 };
  }

  const subscription = (data.subscription as Record<string, unknown> | undefined) ?? undefined;
  const currentStatus = typeof subscription?.status === 'string' ? subscription.status : 'none';
  const trialEndsAt = toDate(data.trialEndsAt);
  const onboardingCompletedAt = toDate(data.onboardingCompletedAt);
  const activationDate = startOfDay(onboardingCompletedAt ?? trialEndsAt ?? createdAt);

  let trial = false;
  let active = false;

  if (currentStatus === 'trial') {
    trial = !trialEndsAt || day <= startOfDay(trialEndsAt);
  } else if (currentStatus === 'active' || currentStatus === 'past_due') {
    if (trialEndsAt && day < startOfDay(trialEndsAt)) {
      trial = true;
    } else if (day >= activationDate) {
      active = true;
    }
  } else if (trialEndsAt && day <= startOfDay(trialEndsAt)) {
    trial = true;
  }

  return {
    exists: true,
    active,
    trial,
    mrrCents: active ? getMrrGbpPence(subscription, rates) : 0,
  };
}

async function loadAssessmentEvents(db: admin.firestore.Firestore): Promise<AssessmentEvent[]> {
  const BATCH_SIZE = 1_000;
  const events: AssessmentEvent[] = [];
  let lastDoc: admin.firestore.QueryDocumentSnapshot | undefined;

  while (true) {
    let query = db
      .collectionGroup('sessions')
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(BATCH_SIZE);

    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const batch = await query.get();
    if (batch.empty) break;

    batch.docs.forEach((docSnap) => {
      const data = docSnap.data() as Record<string, unknown>;
      const organizationId = getSessionOrgId(docSnap.ref.path);
      if (!organizationId || !isTrackableAssessmentType(data.type)) return;

      const timestamp = toDate(data.timestamp);
      if (!timestamp) return;

      events.push({ organizationId, timestamp });
    });

    if (batch.size < BATCH_SIZE) break;
    lastDoc = batch.docs[batch.docs.length - 1];
  }

  return events;
}

/**
 * Get platform metrics history for the last N days (server-side, bypasses Firestore rules)
 */
export async function getMetricsHistoryCallable(
  request: { auth?: { uid?: string }; data?: { days?: number } },
): Promise<MetricsHistoryEntry[]> {
  if (!request.auth?.uid) {
    throw new Error('Authentication required.');
  }
  const db = getDb();
  const adminDoc = await db.doc(`platform_admins/${request.auth.uid}`).get();
  if (!adminDoc.exists) {
    throw new Error('Platform admin access required.');
  }
  const days = typeof request.data?.days === 'number' ? request.data.days : 30;
  const now = new Date();

  // Build date keys
  const dateKeys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dateKeys.push(d.toISOString().split('T')[0]);
  }

  // Batch-fetch all history docs in one round trip instead of N sequential reads
  const refs = dateKeys.map((k) => db.doc(`platform/metrics/history/${k}`));
  const snaps = await db.getAll(...refs);

  const emptyEntry = (dateKey: string): MetricsHistoryEntry => ({
    date: dateKey,
    mrrCents: 0,
    activeOrgs: 0,
    trialOrgs: 0,
    totalOrgs: 0,
    totalAssessments: 0,
    assessmentsThisMonth: 0,
    aiCostsMtdCents: 0,
    totalAiCostsCents: 0,
  });

  return dateKeys.map((dateKey, idx) => {
    const snap = snaps[idx];
    if (!snap.exists) return emptyEntry(dateKey);
    const data = snap.data();
    return {
      date: dateKey,
      mrrCents: data?.mrrGbpPence ?? 0,
      activeOrgs: data?.activeOrgs ?? 0,
      trialOrgs: data?.trialOrgs ?? 0,
      totalOrgs: data?.totalOrgs ?? 0,
      totalAssessments: data?.totalAssessments ?? 0,
      assessmentsThisMonth: data?.assessmentsThisMonth ?? 0,
      aiCostsMtdCents: data?.aiCostsMtdGbpPence ?? 0,
      totalAiCostsCents: data?.totalAiCostsGbpPence ?? 0,
    };
  });
}

export async function rebuildPlatformMetricsHistoryCallable(
  request: { auth?: { uid?: string }; data?: { days?: number } },
): Promise<MetricsHistoryEntry[]> {
  if (!request.auth?.uid) {
    throw new Error('Authentication required.');
  }

  const db = getDb();
  const adminDoc = await db.doc(`platform_admins/${request.auth.uid}`).get();
  if (!adminDoc.exists) {
    throw new Error('Platform admin access required.');
  }

  const days = typeof request.data?.days === 'number' ? request.data.days : 30;
  const configSnap = await db.doc('platform/config').get();
  const currencyRates = currencyRatesFromFirestoreDoc(
    configSnap.exists ? (configSnap.data() as Record<string, unknown>) : undefined,
  );
  const orgsSnap = await db.collection('organizations').get();
  const aiLogsSnap = await db.collection('ai_usage_logs').get();
  const logs = aiLogsSnap.docs.map((docSnap) => docSnap.data() as Record<string, unknown>);
  const assessmentEvents = await loadAssessmentEvents(db);
  const results: MetricsHistoryEntry[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - i);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    const startOfMonth = new Date(day.getFullYear(), day.getMonth(), 1);
    const dateKey = day.toISOString().split('T')[0];

    let activeOrgs = 0;
    let trialOrgs = 0;
    let totalOrgs = 0;
    let mrrCents = 0;
    const totalAssessments = assessmentEvents.filter((event) => event.timestamp < nextDay).length;
    const assessmentsThisMonth = assessmentEvents.filter(
      (event) => event.timestamp >= startOfMonth && event.timestamp < nextDay,
    ).length;

    for (const orgDoc of orgsSnap.docs) {
      const data = orgDoc.data() as Record<string, unknown>;
      if ((data.metadata as Record<string, unknown> | undefined)?.isDeleted === true) continue;
      const lifecycle = getOrgLifecycleForDay(data, day, currencyRates);
      if (!lifecycle.exists) continue;
      totalOrgs += 1;
      if (lifecycle.active) activeOrgs += 1;
      if (lifecycle.trial) trialOrgs += 1;
      mrrCents += lifecycle.mrrCents;
    }

    let totalAiCostsFils = 0;
    let aiCostsMtdFils = 0;
    logs.forEach((log) => {
      const logDate = getLogDate(log);
      if (!logDate || logDate > day) return;
      const costFils = getLogCostFils(log);
      totalAiCostsFils += costFils;
      if (logDate >= startOfMonth && logDate < nextDay) {
        aiCostsMtdFils += costFils;
      }
    });

    results.push({
      date: dateKey,
      mrrCents,
      activeOrgs,
      trialOrgs,
      totalOrgs,
      totalAssessments,
      assessmentsThisMonth,
      aiCostsMtdCents: filsToGbpPence(aiCostsMtdFils),
      totalAiCostsCents: filsToGbpPence(totalAiCostsFils),
    });
  }

  // Batch-write all history entries (Firestore limit: 500 ops per batch)
  const BATCH_LIMIT = 500;
  for (let i = 0; i < results.length; i += BATCH_LIMIT) {
    const writeBatch = db.batch();
    for (const entry of results.slice(i, i + BATCH_LIMIT)) {
      writeBatch.set(
        db.doc(`platform/metrics/history/${entry.date}`),
        {
          date: entry.date,
          mrrGbpPence: entry.mrrCents,
          activeOrgs: entry.activeOrgs,
          trialOrgs: entry.trialOrgs,
          totalOrgs: entry.totalOrgs,
          totalAssessments: entry.totalAssessments,
          assessmentsThisMonth: entry.assessmentsThisMonth,
          aiCostsMtdGbpPence: entry.aiCostsMtdCents,
          totalAiCostsGbpPence: entry.totalAiCostsCents,
          snapshotAt: admin.firestore.FieldValue.serverTimestamp(),
          rebuiltAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
    await writeBatch.commit();
  }

  logger.info('Platform metrics history rebuilt', { days, entries: results.length });
  return results;
}

/**
 * Get AI costs MTD (Month-To-Date) in GBP pence from ai_usage_logs.
 * Prefer system_stats.aiCostsMtdGbpPence when populated; otherwise aggregate from logs.
 */
export async function getAICostsMTDCallable(
  request: { auth?: { uid?: string } },
): Promise<number> {
  if (!request.auth?.uid) throw new Error('Authentication required.');
  const db = getDb();
  const adminDoc = await db.doc(`platform_admins/${request.auth.uid}`).get();
  if (!adminDoc.exists) throw new Error('Platform admin access required.');

  const statsSnap = await db.doc('system_stats/global_metrics').get();
  const stats = statsSnap.data();
  const storedGbpPence = stats?.aiCostsMtdGbpPence ?? null;
  if (typeof storedGbpPence === 'number' && storedGbpPence >= 0) {
    return storedGbpPence;
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const snap = await db
    .collection('ai_usage_logs')
    .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(startOfMonth))
    .limit(5000)
    .get();

  let totalFils = 0;
  snap.docs.forEach((d) => {
    totalFils += getLogCostFils(d.data() as Record<string, unknown>);
  });
  return filsToGbpPence(totalFils);
}

export type RebuildSystemStatsResult = {
  totalAssessments: number;
  assessments_this_month: number;
  totalAiCostsGbpPence: number;
  aiCostsMtdGbpPence: number;
  totalCoaches: number;
  totalClients: number;
};

/**
 * Core reconciliation logic — no auth checks.
 * Called by the admin callable and the weekly scheduler.
 */
export async function reconcileSystemStats(): Promise<RebuildSystemStatsResult> {
  const db = getDb();
  const assessmentEvents = await loadAssessmentEvents(db);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const totalAssessments = assessmentEvents.length;
  const assessmentsThisMonth = assessmentEvents.filter(
    (e) => e.timestamp >= startOfMonth,
  ).length;

  const orgAssessmentCounts = new Map<string, { total: number; thisMonth: number }>();
  for (const event of assessmentEvents) {
    const entry = orgAssessmentCounts.get(event.organizationId) ?? { total: 0, thisMonth: 0 };
    entry.total += 1;
    if (event.timestamp >= startOfMonth) entry.thisMonth += 1;
    orgAssessmentCounts.set(event.organizationId, entry);
  }

  const aiLogsSnap = await db.collection('ai_usage_logs').get();
  let totalAiCostsFils = 0;
  let aiCostsMtdFils = 0;
  aiLogsSnap.docs.forEach((d) => {
    const log = d.data() as Record<string, unknown>;
    const costFils = getLogCostFils(log);
    totalAiCostsFils += costFils;
    const logDate = getLogDate(log);
    if (logDate && logDate >= startOfMonth) {
      aiCostsMtdFils += costFils;
    }
  });

  const orgsSnap = await db.collection('organizations').get();
  let totalCoaches = 0;
  let totalClients = 0;

  // Parallelize reads across all orgs, then batch-write results
  const orgStats = await Promise.all(
    orgsSnap.docs.map(async (orgDoc) => {
      const orgData = orgDoc.data() as Record<string, unknown>;
      if ((orgData.metadata as Record<string, unknown> | undefined)?.isDeleted === true) return null;
      const orgId = orgDoc.id;
      const [coachesSnap, clientsSnap] = await Promise.all([
        db.collection(`organizations/${orgId}/coaches`).get(),
        db.collection(`organizations/${orgId}/clients`).get(),
      ]);
      return { orgId, coachCount: coachesSnap.size, clientCount: clientsSnap.size };
    }),
  );

  const writeBatch = db.batch();
  for (const stat of orgStats) {
    if (!stat) continue;
    const { orgId, coachCount, clientCount } = stat;
    totalCoaches += coachCount;
    totalClients += clientCount;
    const assessmentCounts = orgAssessmentCounts.get(orgId) ?? { total: 0, thisMonth: 0 };
    writeBatch.set(
      db.doc(`organizations/${orgId}`),
      {
        stats: {
          assessmentCount: assessmentCounts.total,
          assessmentsThisMonth: assessmentCounts.thisMonth,
          coachCount,
          clientCount,
        },
      },
      { merge: true },
    );
  }
  await writeBatch.commit();

  const result: RebuildSystemStatsResult = {
    totalAssessments,
    assessments_this_month: assessmentsThisMonth,
    totalAiCostsGbpPence: filsToGbpPence(totalAiCostsFils),
    aiCostsMtdGbpPence: filsToGbpPence(aiCostsMtdFils),
    totalCoaches,
    totalClients,
  };

  await db.doc('system_stats/global_metrics').set(
    {
      ...result,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      rebuiltAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  logger.info('system_stats/global_metrics rebuilt from canonical sources', result);
  return result;
}

export async function rebuildSystemStatsCallable(
  request: { auth?: { uid?: string } },
): Promise<RebuildSystemStatsResult> {
  if (!request.auth?.uid) throw new Error('Authentication required.');
  const db = getDb();
  const adminDoc = await db.doc(`platform_admins/${request.auth.uid}`).get();
  if (!adminDoc.exists) throw new Error('Platform admin access required.');
  return reconcileSystemStats();
}

const LEGACY_COLLECTIONS = ['assessments_aggregation', 'coaches', 'platform_activity_feed'];

export async function deleteLegacyCollectionsCallable(
  request: { auth?: { uid?: string }; data?: { dryRun?: boolean } },
): Promise<{ dryRun: boolean; deleted: Record<string, number>; total: number }> {
  if (!request.auth?.uid) throw new Error('Authentication required.');
  const db = getDb();
  const adminDoc = await db.doc(`platform_admins/${request.auth.uid}`).get();
  if (!adminDoc.exists) throw new Error('Platform admin access required.');

  const dryRun = request.data?.dryRun !== false;
  const deleted: Record<string, number> = {};
  let total = 0;

  for (const name of LEGACY_COLLECTIONS) {
    const colRef = db.collection(name);
    const topLevelDocs = await colRef.listDocuments();
    const docCount = topLevelDocs.length;

    if (dryRun) {
      const subcollectionNames: string[] = [];
      for (const docRef of topLevelDocs.slice(0, 5)) {
        const subs = await docRef.listCollections();
        subcollectionNames.push(...subs.map((s) => `${docRef.id}/${s.id}`));
      }
      deleted[name] = docCount;
      total += docCount;
      logger.info(`[LegacyCleanup] DRY RUN: "${name}" has ${docCount} top-level docs (incl. phantom)`, {
        sampleSubcollections: subcollectionNames,
      });
    } else if (docCount > 0) {
      await db.recursiveDelete(colRef);
      deleted[name] = docCount;
      total += docCount;
      logger.info(`[LegacyCleanup] Recursively deleted "${name}" (${docCount} top-level docs + all subcollections)`);
    } else {
      deleted[name] = 0;
    }
  }

  logger.info(`[LegacyCleanup] ${dryRun ? 'DRY RUN' : 'COMPLETE'}: ${total} total docs`);
  return { dryRun, deleted, total };
}

export interface AIConfigDoc {
  modelId: string;
  provider: string;
  status: 'active' | 'deprecated' | 'sunset';
  deprecationMessage: string | null;
  newerModelId: string | null;
  sdkVersion: string;
  lastUpdated: admin.firestore.FieldValue;
}

/**
 * Writes the initial AI model config document to platform/health/aiConfig.
 * Uses merge:true so it never overwrites manual edits.
 */
export async function seedAIConfigCallable(
  request: { auth?: { uid?: string } },
): Promise<{ success: true }> {
  if (!request.auth?.uid) throw new Error('Authentication required.');
  const db = getDb();
  const adminDoc = await db.doc(`platform_admins/${request.auth.uid}`).get();
  if (!adminDoc.exists) throw new Error('Platform admin access required.');

  const configDoc: AIConfigDoc = {
    modelId: 'gemini-2.5-flash',
    provider: 'gemini',
    status: 'active',
    deprecationMessage: null,
    newerModelId: null,
    sdkVersion: '0.24.1',
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.doc('platform/aiConfig').set(configDoc, { merge: true });
  logger.info('[seedAIConfig] platform/aiConfig written');

  // Ensure platform/config has currencyRates (used by aggregation functions for MRR)
  await db.doc('platform/config').set(
    { currencyRates: { KWD_TO_GBP: 2.6, USD_TO_GBP: 0.79, EUR_TO_GBP: 0.86 } },
    { merge: true }
  );
  logger.info('[seedAIConfig] platform/config currencyRates ensured');

  return { success: true };
}

