import { httpsCallable } from 'firebase/functions';
import { collection, collectionGroup, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, where, limit, Timestamp } from 'firebase/firestore';
import {
  getAIUsageLogsCollection,
  getOrganizationDoc,
  getOrganizationsCollection,
  getOrgAssessmentsCollection,
  getOrgAssessmentHistoryCollection,
  getOrgClientsCollection,
  getSystemStatsDoc,
  getUserProfilesCollection,
} from '@/lib/database/collections';
import { getDb, getFirebaseFunctions } from '@/services/firebase';
import { filsToGbpPence } from '@/lib/utils/currency';
import { getLogCostFils } from '@/lib/ai/aiPricing';
import { logger } from '@/lib/utils/logger';
import { ORG_CLIENT_PROFILES_QUERY_LIMIT, ORG_COACHES_SUBCOLLECTION_LIMIT } from '@/constants/firestoreQueryLimits';

type OrgSummary = {
  orgId: string;
  name: string;
  coachCount: number;
  clientCount: number;
  assessmentCount: number;
  assessmentsThisMonth: number;
  aiCostsMtdGbpPence: number;
  totalAiCostsGbpPence: number;
  lastAssessmentDate: Date | null;
};

type HistoryEntry = {
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

export interface CutoverAuditReport {
  auditedAt: string;
  organizations: Array<{
    orgId: string;
    name: string;
    orgClients: number;
    orgAssessments: number;
    assessmentHistoryClients: number;
  }>;
  totals: {
    organizations: number;
    orgClients: number;
    orgAssessments: number;
    assessmentHistoryClients: number;
    aiLogs: number;
  };
  mismatches: string[];
}

export interface ReconcilePlatformResult {
  success: boolean;
  organizations: OrgSummary[];
  systemStats: Record<string, number | Date | null>;
  warnings: string[];
}

export interface NormalizeAIUsageLogsResult {
  success: boolean;
  totalLogs: number;
  updatedLogs: number;
  warnings: string[];
}

export interface VerifyPlatformCutoverResult {
  success: boolean;
  mismatches: string[];
  audit: CutoverAuditReport;
  reconciled: ReconcilePlatformResult;
}

interface ComputedPlatformSnapshot {
  organizations: OrgSummary[];
  systemStats: Record<string, number | Date | null>;
  warnings: string[];
}


function getLogDate(log: Record<string, unknown>): Date | null {
  const root = log.timestamp as { toDate?: () => Date } | undefined;
  if (root?.toDate) return root.toDate();
  const meta = log.metadata as Record<string, unknown> | undefined;
  const metaTs = meta?.timestamp as { toDate?: () => Date } | undefined;
  if (metaTs?.toDate) return metaTs.toDate();
  const createdAt = log.createdAt as { toDate?: () => Date } | undefined;
  return createdAt?.toDate?.() ?? null;
}

function getLogOrgId(log: Record<string, unknown>): string | null {
  if (typeof log.organizationId === 'string' && log.organizationId.trim()) {
    return log.organizationId;
  }
  const meta = log.metadata as Record<string, unknown> | undefined;
  const orgId = meta?.organizationId;
  return typeof orgId === 'string' && orgId.trim() ? orgId : null;
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function startOfDay(date: Date): Date {
  const clone = new Date(date);
  clone.setHours(0, 0, 0, 0);
  return clone;
}

function sanitizeIdPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120);
}

function isTrackableAssessmentHistoryType(type: unknown): boolean {
  return type === 'full'
    || type === 'full-assessment'
    || (typeof type === 'string' && type.startsWith('partial-'));
}

function getAssessmentHistoryOrgId(path: string): string | null {
  const match = path.match(/^organizations\/([^/]+)\/assessmentHistory\/[^/]+\/history\/[^/]+$/);
  return match?.[1] ?? null;
}

async function loadAssessmentEvents(): Promise<AssessmentEvent[]> {
  const historySnap = await getDocs(query(collectionGroup(getDb(), 'history'), limit(500)));
  const events: AssessmentEvent[] = [];

  historySnap.docs.forEach((docSnap) => {
    const data = docSnap.data() as Record<string, unknown>;
    const organizationId = getAssessmentHistoryOrgId(docSnap.ref.path);
    if (!organizationId || !isTrackableAssessmentHistoryType(data.type)) {
      return;
    }

    const timestamp = toDate(data.timestamp);
    if (!organizationId || !timestamp) {
      return;
    }

    events.push({ organizationId, timestamp });
  });

  return events;
}

function getOrgLifecycleForDay(data: Record<string, unknown>, day: Date): {
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
    mrrCents: active ? getMrrGbpPence(subscription) : 0,
  };
}

function getMrrGbpPence(subscription: Record<string, unknown> | undefined): number {
  if (!subscription || subscription.status !== 'active') return 0;
  const currency = typeof subscription.currency === 'string' ? subscription.currency : 'KWD';
  const amount = Number(subscription.amountCents ?? subscription.amountFils ?? 0);
  if (!amount) return 0;
  if (currency === 'GBP') return amount;
  if (currency === 'USD') return Math.round((amount / 100) * (1 / 1.27) * 100);
  return filsToGbpPence(amount);
}

async function buildOrgSummary(
  orgId: string,
  orgName: string,
  aiLogs: Array<Record<string, unknown>>,
  assessmentEvents: AssessmentEvent[],
): Promise<OrgSummary> {
  const profilesSnap = await getDocs(getUserProfilesCollection());
  let coachCount = 0;
  profilesSnap.docs.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.organizationId === orgId && (data.role === 'coach' || data.role === 'org_admin')) {
      coachCount += 1;
    }
  });

  const [clientsSnap] = await Promise.all([
    getDocs(getOrgClientsCollection(orgId)),
  ]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const orgAssessmentEvents = assessmentEvents.filter((event) => event.organizationId === orgId);
  const assessmentCount = orgAssessmentEvents.length;
  const assessmentsThisMonth = orgAssessmentEvents.filter((event) => event.timestamp >= startOfMonth).length;
  const lastAssessmentDate = orgAssessmentEvents.reduce<Date | null>((latest, event) => {
    if (!latest || event.timestamp > latest) {
      return event.timestamp;
    }
    return latest;
  }, null);

  let aiCostsMtdFils = 0;
  let totalAiCostsFils = 0;
  aiLogs.forEach((log) => {
    if (getLogOrgId(log) !== orgId) return;
    const costFils = getLogCostFils(log);
    totalAiCostsFils += costFils;
    const logDate = getLogDate(log);
    if (logDate && logDate >= startOfMonth) {
      aiCostsMtdFils += costFils;
    }
  });

  return {
    orgId,
    name: orgName,
    coachCount,
    clientCount: clientsSnap.size,
    assessmentCount,
    assessmentsThisMonth,
    aiCostsMtdGbpPence: filsToGbpPence(aiCostsMtdFils),
    totalAiCostsGbpPence: filsToGbpPence(totalAiCostsFils),
    lastAssessmentDate,
  };
}

export async function auditCanonicalData(): Promise<CutoverAuditReport> {
  const orgsSnap = await getDocs(getOrganizationsCollection());
  const organizations: CutoverAuditReport['organizations'] = [];
  const mismatches: string[] = [];
  let orgClients = 0;
  let orgAssessments = 0;
  let historyClients = 0;

  for (const orgDoc of orgsSnap.docs) {
    const data = orgDoc.data();
    if (data.metadata?.isDeleted === true) continue;
    const orgId = orgDoc.id;
    const orgName = data.name || 'Unnamed';
    const [clientsSnap, assessmentsSnap, historySnap] = await Promise.all([
      getDocs(getOrgClientsCollection(orgId)),
      getDocs(getOrgAssessmentsCollection(orgId)),
      getDocs(query(getOrgAssessmentHistoryCollection(orgId))),
    ]);

    orgClients += clientsSnap.size;
    orgAssessments += assessmentsSnap.size;
    historyClients += historySnap.size;

    organizations.push({
      orgId,
      name: orgName,
      orgClients: clientsSnap.size,
      orgAssessments: assessmentsSnap.size,
      assessmentHistoryClients: historySnap.size,
    });
  }

  const aiLogsSnap = await getDocs(getAIUsageLogsCollection());

  return {
    auditedAt: new Date().toISOString(),
    organizations,
    totals: {
      organizations: organizations.length,
      orgClients,
      orgAssessments,
      assessmentHistoryClients: historyClients,
      aiLogs: aiLogsSnap.size,
    },
    mismatches,
  };
}

export async function rebuildPlatformMetricsHistory(days: number = 30): Promise<HistoryEntry[]> {
  const callable = httpsCallable<{ days: number }, HistoryEntry[]>(
    getFirebaseFunctions(),
    'rebuildPlatformMetricsHistory',
  );
  const response = await callable({ days });
  return response.data;
}

export async function normalizeAIUsageLogs(): Promise<NormalizeAIUsageLogsResult> {
  const logsSnap = await getDocs(getAIUsageLogsCollection());
  let updatedLogs = 0;
  const warnings: string[] = [];

  for (const docSnap of logsSnap.docs) {
    const log = docSnap.data() as Record<string, unknown>;
    const meta = log.metadata as Record<string, unknown> | undefined;
    const updates: Record<string, unknown> = {};

    const normalizedOrgId = getLogOrgId(log);
    if (normalizedOrgId && log.organizationId !== normalizedOrgId) {
      updates.organizationId = normalizedOrgId;
    }

    const normalizedDate = getLogDate(log);
    if (normalizedDate && !(log.timestamp as { toDate?: () => Date } | undefined)?.toDate) {
      updates.timestamp = Timestamp.fromDate(normalizedDate);
    }

    const normalizedType = typeof log.type === 'string' && log.type.trim()
      ? log.type
      : typeof meta?.type === 'string'
      ? meta.type
      : undefined;
    if (normalizedType && log.type !== normalizedType) {
      updates.type = normalizedType;
    }

    const normalizedCostFils = getLogCostFils(log);
    if (normalizedCostFils > 0 && Number(log.costFils ?? 0) !== normalizedCostFils) {
      updates.costFils = normalizedCostFils;
    }

    const normalizedTokens = Number(log.tokensUsed ?? meta?.tokensUsed ?? 0);
    if (normalizedTokens > 0 && Number(log.tokensUsed ?? 0) !== normalizedTokens) {
      updates.tokensUsed = normalizedTokens;
    }

    if (!normalizedOrgId) {
      warnings.push(`AI log ${docSnap.id} is still missing organizationId after normalization.`);
    }

    if (Object.keys(updates).length > 0) {
      await updateDoc(docSnap.ref, updates);
      updatedLogs += 1;
    }
  }

  return {
    success: warnings.length === 0,
    totalLogs: logsSnap.size,
    updatedLogs,
    warnings,
  };
}

async function computePlatformSnapshot(): Promise<ComputedPlatformSnapshot> {
  const orgsSnap = await getDocs(getOrganizationsCollection());
  const aiLogsSnap = await getDocs(getAIUsageLogsCollection());
  const aiLogs = aiLogsSnap.docs.map((docSnap) => docSnap.data() as Record<string, unknown>);
  const assessmentEvents = await loadAssessmentEvents();
  const organizations: OrgSummary[] = [];
  const warnings: string[] = [];
  const now = new Date();

  let totalOrgs = 0;
  let activeOrgs = 0;
  let trialOrgs = 0;
  let totalCoaches = 0;
  let totalClients = 0;
  let totalAssessments = 0;
  let assessmentsThisMonth = 0;
  let totalAiTokensUsed = 0;
  let totalAiCostsFils = 0;
  let aiCostsMtdFils = 0;
  let monthlyRecurringRevenueGbpPence = 0;

  aiLogs.forEach((log) => {
    totalAiTokensUsed += Number(log.tokensUsed ?? 0);
    const costFils = getLogCostFils(log);
    totalAiCostsFils += costFils;
    const logDate = getLogDate(log);
    if (logDate && logDate.getFullYear() === now.getFullYear() && logDate.getMonth() === now.getMonth()) {
      aiCostsMtdFils += costFils;
    }
  });

  const totalAiCostsGbpPence = filsToGbpPence(totalAiCostsFils);
  const aiCostsMtdGbpPence = filsToGbpPence(aiCostsMtdFils);

  for (const orgDoc of orgsSnap.docs) {
    const data = orgDoc.data();
    if (data.metadata?.isDeleted === true) continue;
    totalOrgs += 1;
    if (data.subscription?.status === 'active') activeOrgs += 1;
    if (data.subscription?.status === 'trial') trialOrgs += 1;
    monthlyRecurringRevenueGbpPence += getMrrGbpPence(data.subscription as Record<string, unknown> | undefined);

    const orgSummary = await buildOrgSummary(orgDoc.id, data.name || 'Unnamed', aiLogs, assessmentEvents);
    organizations.push(orgSummary);

    totalCoaches += orgSummary.coachCount;
    totalClients += orgSummary.clientCount;
    totalAssessments += orgSummary.assessmentCount;
    assessmentsThisMonth += orgSummary.assessmentsThisMonth;
  }

  if (organizations.length === 0) {
    warnings.push('No non-deleted organizations were found during reconciliation.');
  }

  return {
    organizations,
    systemStats: {
      totalOrgs,
      activeOrgs,
      trialOrgs,
      totalCoaches,
      totalClients,
      totalAssessments,
      assessments_this_month: assessmentsThisMonth,
      totalAiTokensUsed,
      totalAiCostsGbpPence,
      aiCostsMtdGbpPence,
      monthlyRecurringRevenueGbpPence,
      lastUpdated: new Date(),
      version: 2,
    },
    warnings,
  };
}

/**
 * Permanently delete the platform_activity_feed collection via the
 * existing deleteLegacyCollections callable (which now includes it).
 */
export async function cleanupActivityFeed(dryRun = true): Promise<{ dryRun: boolean; deleted: Record<string, number>; total: number }> {
  const callable = httpsCallable<
    { dryRun: boolean },
    { dryRun: boolean; deleted: Record<string, number>; total: number }
  >(getFirebaseFunctions(), 'deleteLegacyCollections', { timeout: 300_000 });
  const response = await callable({ dryRun });
  return response.data;
}

export async function rebuildSystemStats(): Promise<Record<string, unknown>> {
  const callable = httpsCallable<void, Record<string, unknown>>(
    getFirebaseFunctions(),
    'rebuildSystemStats',
  );
  const response = await callable();
  return response.data;
}

export async function reconcilePlatformData(): Promise<ReconcilePlatformResult> {
  const snapshot = await computePlatformSnapshot();
  for (const orgSummary of snapshot.organizations) {
    await setDoc(
      getOrganizationDoc(orgSummary.orgId),
      {
        stats: {
          coachCount: orgSummary.coachCount,
          clientCount: orgSummary.clientCount,
          assessmentCount: orgSummary.assessmentCount,
          assessmentsThisMonth: orgSummary.assessmentsThisMonth,
          aiCostsMtdGbpPence: orgSummary.aiCostsMtdGbpPence,
          totalAiCostsGbpPence: orgSummary.totalAiCostsGbpPence,
          lastAssessmentDate: orgSummary.lastAssessmentDate,
          lastUpdated: new Date(),
        },
      },
      { merge: true },
    );
  }
  await setDoc(getSystemStatsDoc(), snapshot.systemStats, { merge: true });

  return {
    success: true,
    organizations: snapshot.organizations,
    systemStats: snapshot.systemStats,
    warnings: snapshot.warnings,
  };
}

export async function verifyPlatformCutover(): Promise<VerifyPlatformCutoverResult> {
  const [audit, statsSnap, orgsSnap, reconciled] = await Promise.all([
    auditCanonicalData(),
    getDoc(getSystemStatsDoc()),
    getDocs(getOrganizationsCollection()),
    computePlatformSnapshot(),
  ]);

  const mismatches = [...audit.mismatches, ...reconciled.warnings];
  const stats = statsSnap.data();
  if (stats?.totalAssessments !== reconciled.systemStats.totalAssessments) {
    mismatches.push(
      `system_stats totalAssessments=${stats?.totalAssessments ?? 0} differs from reconciled total=${reconciled.systemStats.totalAssessments}.`,
    );
  }
  if (stats?.totalAiCostsGbpPence !== reconciled.systemStats.totalAiCostsGbpPence) {
    mismatches.push(
      `system_stats totalAiCostsGbpPence=${stats?.totalAiCostsGbpPence ?? 0} differs from reconciled total=${reconciled.systemStats.totalAiCostsGbpPence}.`,
    );
  }

  const computedByOrg = new Map(reconciled.organizations.map((org) => [org.orgId, org]));
  for (const orgDoc of orgsSnap.docs) {
    const data = orgDoc.data();
    if (data.metadata?.isDeleted === true) continue;
    const computed = computedByOrg.get(orgDoc.id);
    if (!computed) continue;
    const storedStats = (data.stats as Record<string, unknown> | undefined) ?? {};
    if ((storedStats.assessmentCount ?? 0) !== computed.assessmentCount) {
      mismatches.push(
        `${computed.name}: stored assessmentCount=${storedStats.assessmentCount ?? 0} differs from computed=${computed.assessmentCount}.`,
      );
    }
    if ((storedStats.clientCount ?? 0) !== computed.clientCount) {
      mismatches.push(
        `${computed.name}: stored clientCount=${storedStats.clientCount ?? 0} differs from computed=${computed.clientCount}.`,
      );
    }
    if ((storedStats.coachCount ?? 0) !== computed.coachCount) {
      mismatches.push(
        `${computed.name}: stored coachCount=${storedStats.coachCount ?? 0} differs from computed=${computed.coachCount}.`,
      );
    }
  }

  return {
    success: mismatches.length === 0,
    mismatches,
    audit,
    reconciled: {
      success: mismatches.length === 0,
      organizations: reconciled.organizations,
      systemStats: reconciled.systemStats,
      warnings: reconciled.warnings,
    },
  };
}

/**
 * Merge a duplicate client into the canonical client.
 * Copies assessment history (current, history, snapshots), assessment summaries,
 * and drafts from sourceSlug into targetSlug, then deletes the source client.
 */
export async function mergeDuplicateClient(
  orgId: string,
  sourceSlug: string,
  targetSlug: string,
): Promise<{ merged: number; deleted: number; warnings: string[] }> {
  const db = getDb();
  const warnings: string[] = [];
  let merged = 0;
  let deleted = 0;

  const sourceClientRef = doc(db, `organizations/${orgId}/clients/${sourceSlug}`);
  const targetClientRef = doc(db, `organizations/${orgId}/clients/${targetSlug}`);

  const [sourceSnap, targetSnap] = await Promise.all([getDoc(sourceClientRef), getDoc(targetClientRef)]);
  if (!sourceSnap.exists()) throw new Error(`Source client "${sourceSlug}" not found in org ${orgId}`);
  if (!targetSnap.exists()) throw new Error(`Target client "${targetSlug}" not found in org ${orgId}`);

  logger.info(`[MergeClient] Merging "${sourceSlug}" → "${targetSlug}" in org ${orgId}`);

  const copySubcollection = async (sourcePath: string, targetPath: string) => {
    const sourceCol = collection(db, sourcePath);
    const snap = await getDocs(sourceCol);
    for (const d of snap.docs) {
      const targetDoc = doc(db, `${targetPath}/${d.id}`);
      const existing = await getDoc(targetDoc);
      if (existing.exists()) {
        warnings.push(`Skipped ${targetPath}/${d.id} (already exists)`);
        continue;
      }
      await setDoc(targetDoc, d.data());
      merged += 1;
    }
  };

  const sourceCurrentRef = doc(db, `organizations/${orgId}/assessmentHistory/${sourceSlug}/current/data`);
  const sourceCurrentSnap = await getDoc(sourceCurrentRef);
  if (sourceCurrentSnap.exists()) {
    const targetCurrentRef = doc(db, `organizations/${orgId}/assessmentHistory/${targetSlug}/current/data`);
    const targetCurrentSnap = await getDoc(targetCurrentRef);
    if (targetCurrentSnap.exists()) {
      warnings.push('Target already has current assessment data — skipping source current');
    } else {
      await setDoc(targetCurrentRef, sourceCurrentSnap.data());
      merged += 1;
    }
  }

  await copySubcollection(
    `organizations/${orgId}/assessmentHistory/${sourceSlug}/history`,
    `organizations/${orgId}/assessmentHistory/${targetSlug}/history`,
  );
  await copySubcollection(
    `organizations/${orgId}/assessmentHistory/${sourceSlug}/snapshots`,
    `organizations/${orgId}/assessmentHistory/${targetSlug}/snapshots`,
  );

  const assessmentsSnap = await getDocs(
    query(
      collection(db, `organizations/${orgId}/assessments`),
      where('clientNameLower', '==', sourceSlug.replace(/-/g, ' ')),
    ),
  );
  const targetName = (targetSnap.data() as Record<string, unknown>).clientName as string;
  for (const assessmentDoc of assessmentsSnap.docs) {
    await updateDoc(doc(db, `organizations/${orgId}/assessments/${assessmentDoc.id}`), {
      clientName: targetName,
      clientNameLower: targetName.toLowerCase(),
    });
    merged += 1;
  }

  const deleteSubcollection = async (path: string) => {
    const snap = await getDocs(collection(db, path));
    for (const d of snap.docs) {
      await deleteDoc(doc(db, `${path}/${d.id}`));
      deleted += 1;
    }
  };

  await deleteSubcollection(`organizations/${orgId}/assessmentHistory/${sourceSlug}/history`);
  await deleteSubcollection(`organizations/${orgId}/assessmentHistory/${sourceSlug}/snapshots`);
  if (sourceCurrentSnap.exists()) {
    await deleteDoc(sourceCurrentRef);
    deleted += 1;
  }

  const sourceHistoryParent = doc(db, `organizations/${orgId}/assessmentHistory/${sourceSlug}`);
  const sourceHistoryParentSnap = await getDoc(sourceHistoryParent);
  if (sourceHistoryParentSnap.exists()) {
    await deleteDoc(sourceHistoryParent);
    deleted += 1;
  }

  const draftRef = doc(db, `organizations/${orgId}/assessmentDrafts/${sourceSlug}`);
  const draftSnap = await getDoc(draftRef);
  if (draftSnap.exists()) {
    await deleteDoc(draftRef);
    deleted += 1;
  }

  await deleteDoc(sourceClientRef);
  deleted += 1;

  logger.info(`[MergeClient] Done: ${merged} docs merged, ${deleted} docs deleted, ${warnings.length} warnings`);
  return { merged, deleted, warnings };
}

/**
 * Delete legacy root-level Firestore collections that are no longer read by any code.
 * Runs server-side via callable to bypass Firestore rules.
 */
export async function deleteLegacyCollections(dryRun = true): Promise<{
  dryRun: boolean;
  deleted: Record<string, number>;
  total: number;
}> {
  const callable = httpsCallable<
    { dryRun: boolean },
    { dryRun: boolean; deleted: Record<string, number>; total: number }
  >(getFirebaseFunctions(), 'deleteLegacyCollections', { timeout: 300_000 });
  const response = await callable({ dryRun });
  return response.data;
}

/**
 * Writes the initial AI model config document to platform/health/aiConfig.
 * Safe to run multiple times — uses merge so it never overwrites manual edits.
 */
export async function seedAIConfig(): Promise<{ success: true }> {
  const callable = httpsCallable<void, { success: true }>(
    getFirebaseFunctions(),
    'seedAIConfig',
  );
  const response = await callable();
  return response.data;
}

/**
 * Runs the platform dependency health check immediately (no need to wait for the weekly schedule).
 * Writes results to platform/health/dependencies.
 */
export async function checkPlatformHealth(): Promise<{ success: true }> {
  const callable = httpsCallable<void, { success: true }>(
    getFirebaseFunctions(),
    'runPlatformHealthCheck',
  );
  const response = await callable();
  return response.data;
}

/**
 * One-time migration: generate stable UUIDs for all existing clients.
 * Run this FIRST before any other migrations.
 * Idempotent — skips clients that already have a clientId field.
 * Requires platform admin privileges.
 */
export async function backfillClientIds(): Promise<{ success: boolean; migrated: number; skipped: number }> {
  const callable = httpsCallable<void, { success: boolean; migrated: number; skipped: number }>(
    getFirebaseFunctions(),
    'backfillClientIds',
    { timeout: 540_000 },
  );
  const response = await callable();
  return response.data;
}

/**
 * One-time migration: copy achievements from legacy publicReports/{token}/achievements
 * to the new org-scoped path organizations/{orgId}/clients/{clientId}/achievements.
 * Run AFTER backfillClientIds.
 * Idempotent — skips docs that already exist at the destination.
 * Requires platform admin privileges.
 */
export async function migrateAchievements(): Promise<{ success: boolean; migrated: number; skipped: number; errors: number }> {
  const callable = httpsCallable<void, { success: boolean; migrated: number; skipped: number; errors: number }>(
    getFirebaseFunctions(),
    'migrateAchievements',
    { timeout: 540_000 },
  );
  const response = await callable();
  return response.data;
}

/**
 * One-time cleanup: delete legacy achievement docs from publicReports/{token}/achievements
 * that were left behind by migrateAchievements (data already exists at the org-scoped path).
 * Run AFTER migrateAchievements has completed successfully.
 * Idempotent — safe to run again if needed.
 * Requires platform admin privileges.
 */
export async function cleanupLegacyAchievements(): Promise<{ success: boolean; deleted: number; reportsScanned: number }> {
  const callable = httpsCallable<void, { success: boolean; deleted: number; reportsScanned: number }>(
    getFirebaseFunctions(),
    'cleanupLegacyAchievements',
    { timeout: 540_000 },
  );
  const response = await callable();
  return response.data;
}

/**
 * One-time migration: move root-level clientSubmissions/{uid}/items docs
 * to organizations/{orgId}/clientSubmissions/{uid}/items.
 * Idempotent — skips docs already at the destination.
 * Requires platform admin privileges.
 */
export async function migrateClientSubmissions(): Promise<{ success: boolean; migrated: number; skipped: number }> {
  const callable = httpsCallable<void, { success: boolean; migrated: number; skipped: number }>(
    getFirebaseFunctions(),
    'migrateClientSubmissions',
    { timeout: 540_000 },
  );
  const response = await callable();
  return response.data;
}

/**
 * Hard-delete an organization and all its data.
 * Run from the browser console: await deleteOrg('your-org-id')
 * Requires platform admin privileges.
 */
export async function deleteOrg(orgId: string, deleteAuthUsers = false): Promise<{ success: boolean; message: string }> {
  const callable = httpsCallable<{ orgId: string; deleteAuthUsers: boolean }, { success: boolean; message: string }>(
    getFirebaseFunctions(),
    'deleteOrganizationCallable',
    { timeout: 540_000 },
  );
  const response = await callable({ orgId, deleteAuthUsers });
  return response.data;
}

/**
 * Full platform data audit — reads actual Firestore counts and prints a
 * human-readable table to the console.
 * Run from the browser console: await platformAudit()
 */
export async function platformAudit(): Promise<void> {
  const db = getDb();

  // Orgs
  const orgsSnap = await getDocs(getOrganizationsCollection());
  const orgs = orgsSnap.docs.map(d => ({ id: d.id, name: d.data().name ?? d.id }));

  logger.debug('Platform Data Audit');
  logger.debug(`Organisations: ${orgs.length}`);
  for (const org of orgs) {
    logger.debug(`📁 ${org.name} (${org.id})`);

    const clientsSnap = await getDocs(
      query(getOrgClientsCollection(org.id), limit(ORG_CLIENT_PROFILES_QUERY_LIMIT)),
    );
    const clients = clientsSnap.docs.map(d => ({ id: d.id, name: d.data().clientName ?? d.id }));
    logger.debug(`Clients: ${clients.length}`);

    const coachesSnap = await getDocs(
      query(collection(db, `organizations/${org.id}/coaches`), limit(ORG_COACHES_SUBCOLLECTION_LIMIT)),
    );
    logger.debug(`Coaches: ${coachesSnap.size}`);

    const assessmentsSnap = await getDocs(
      query(getOrgAssessmentsCollection(org.id), limit(ORG_CLIENT_PROFILES_QUERY_LIMIT)),
    );
    logger.debug(`Current assessment docs: ${assessmentsSnap.size}`);

    // Count snapshots per client
    let totalSnapshots = 0;
    const snapshotBreakdown: string[] = [];
    for (const client of clients) {
      const slug = client.id;
      const snapRef = collection(db, `organizations/${org.id}/assessmentHistory/${slug}/snapshots`);
      const snapSnap = await getDocs(query(snapRef, limit(500)));
      totalSnapshots += snapSnap.size;
      if (snapSnap.size > 0) snapshotBreakdown.push(`  ${client.name}: ${snapSnap.size} snapshots`);
    }
    logger.debug(`Assessment snapshots total: ${totalSnapshots}`);
    if (snapshotBreakdown.length) logger.debug(snapshotBreakdown.join('\n'));

    // Public reports
    const reportsSnap = await getDocs(
      query(
        collection(db, 'publicReports'),
        where('organizationId', '==', org.id),
        limit(100),
      ),
    );
    logger.debug(`Public reports: ${reportsSnap.size}`);

    // Count report version docs (formerly 'snapshots' subcollection)
    let totalReportVersions = 0;
    for (const reportDoc of reportsSnap.docs) {
      const versionsSnap = await getDocs(
        query(collection(db, `publicReports/${reportDoc.id}/reportVersions`), limit(200)),
      );
      const legacySnap = await getDocs(
        query(collection(db, `publicReports/${reportDoc.id}/snapshots`), limit(200)),
      );
      totalReportVersions += versionsSnap.size + legacySnap.size;
    }
    logger.debug(`Report version docs (incl. legacy): ${totalReportVersions}`);
  }

  // Platform-level orphan check
  const publicReportsAll = await getDocs(query(collection(db, 'publicReports'), limit(500)));
  logger.debug(`\nPublicReports total (all orgs): ${publicReportsAll.size}`);
  logger.debug('✅ Audit complete.');
}

/**
 * Export all platform data worth preserving into a clean JSON structure
 * that maps directly to the new data model. Downloads as a file.
 * Run: await exportPlatformData()
 *
 * Captures: org config, coaches, client profiles, and all assessment snapshots
 * per client (sorted oldest → newest). Drops: AI costs, usage logs, orphan docs.
 */
export async function exportPlatformData(): Promise<void> {
  const db = getDb();

  const output: {
    exportedAt: string;
    orgs: {
      orgId: string;
      name: string;
      adminEmail: string;
      brandColor: string | null;
      settings: Record<string, unknown>;
      coaches: {
        coachId: string;
        name: string;
        email: string;
        role: string;
      }[];
      clients: {
        slug: string;
        clientName: string;
        coachUid: string;
        status: string;
        archivedAt: string | null;
        archiveReason: string | null;
        shareToken: string | null;
        dateOfBirth: string | null;
        gender: string | null;
        goals: string[];
        joinedAt: string | null;
        sessions: {
          sessionId: string;
          type: string;
          timestamp: string;
          overallScore: number;
          scoresSummary: unknown;
          formData: unknown;
        }[];
      }[];
    }[];
  } = { exportedAt: new Date().toISOString(), orgs: [] };

  const orgsSnap = await getDocs(getOrganizationsCollection());

  for (const orgDoc of orgsSnap.docs) {
    const orgId = orgDoc.id;
    const orgData = orgDoc.data();

    const orgEntry: (typeof output.orgs)[0] = {
      orgId,
      name: orgData.name ?? orgId,
      adminEmail: orgData.adminEmail ?? '',
      brandColor: orgData.brandColor ?? null,
      settings: (orgData.settings as Record<string, unknown>) ?? {},
      coaches: [],
      clients: [],
    };

    // Coaches
    const coachesSnap = await getDocs(collection(db, `organizations/${orgId}/coaches`));
    for (const c of coachesSnap.docs) {
      const d = c.data();
      orgEntry.coaches.push({ coachId: c.id, name: d.name ?? '', email: d.email ?? '', role: d.role ?? 'coach' });
    }

    // Clients + their snapshots
    const clientsSnap = await getDocs(getOrgClientsCollection(orgId));
    for (const clientDoc of clientsSnap.docs) {
      const slug = clientDoc.id;
      if (!/^[a-z][a-z0-9\-._]+$/.test(slug)) continue; // skip non-slug docs

      const d = clientDoc.data();
      const clientEntry: (typeof output.orgs)[0]['clients'][0] = {
        slug,
        clientName: d.clientName ?? slug,
        coachUid: d.coachUid ?? d.assignedCoachUid ?? '',
        status: d.status ?? 'active',
        archivedAt: d.archivedAt ? (d.archivedAt as { toDate(): Date }).toDate().toISOString() : null,
        archiveReason: d.archiveReason ?? null,
        shareToken: d.shareToken ?? null,
        dateOfBirth: d.dateOfBirth ?? null,
        gender: d.gender ?? null,
        goals: Array.isArray(d.goals) ? d.goals : [],
        joinedAt: d.createdAt ? (d.createdAt as { toDate(): Date }).toDate().toISOString() : null,
        sessions: [],
      };

      // Read ALL snapshots for this client, sorted oldest → newest
      const snapshotsRef = collection(db, `organizations/${orgId}/assessmentHistory/${slug}/snapshots`);
      const snapshotsQ = query(snapshotsRef, orderBy('timestamp', 'asc'));
      const snapshotsSnap = await getDocs(snapshotsQ);

      for (const snap of snapshotsSnap.docs) {
        const s = snap.data();
        const ts = s.timestamp as { toDate(): Date } | null;
        const isoTs = ts?.toDate ? ts.toDate().toISOString() : new Date().toISOString();
        // Use ISO timestamp as sessionId — sorts chronologically, human-readable
        const sessionId = isoTs.replace(/[:.]/g, '-').replace('Z', 'Z');
        clientEntry.sessions.push({
          sessionId,
          type: s.type ?? 'full',
          timestamp: isoTs,
          overallScore: typeof s.overallScore === 'number' ? s.overallScore : 0,
          scoresSummary: s.scoresSummary ?? null,
          formData: s.formData ?? {},
        });
      }

      // If no snapshots found, scan the flat assessments collection (legacy UUID-keyed docs).
      // Do NOT break — a client can have multiple assessment docs here.
      if (clientEntry.sessions.length === 0) {
        const assessmentsSnap = await getDocs(getOrgAssessmentsCollection(orgId));
        const legacySessions: (typeof clientEntry.sessions) = [];

        for (const a of assessmentsSnap.docs) {
          const ad = a.data();
          // Match by slug-format doc ID, clientId field, clientNameLower → slug, or clientName → slug
          const bySlug = a.id === slug;
          const byClientId = typeof ad.clientId === 'string' &&
            ad.clientId.trim().toLowerCase() === slug;
          const byNameLower = typeof ad.clientNameLower === 'string' &&
            ad.clientNameLower.trim().toLowerCase().replace(/\s+/g, '-') === slug;
          const byClientName = typeof ad.clientName === 'string' &&
            ad.clientName.trim().toLowerCase().replace(/\s+/g, '-') === slug;
          if (!bySlug && !byClientId && !byNameLower && !byClientName) continue;

          const ts = (ad.createdAt as { toDate(): Date } | null);
          const isoTs = ts?.toDate ? ts.toDate().toISOString() : new Date().toISOString();
          legacySessions.push({
            sessionId: isoTs.replace(/[:.]/g, '-').replace('Z', 'Z'),
            type: ad.assessmentType === 'pillar' ? `partial-${ad.pillar ?? 'unknown'}` : 'full',
            timestamp: isoTs,
            overallScore: typeof ad.overallScore === 'number' ? ad.overallScore : 0,
            scoresSummary: ad.scoresSummary ?? null,
            formData: ad.formData ?? {},
          });
        }

        // Sort oldest → newest before pushing
        legacySessions.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        clientEntry.sessions.push(...legacySessions);
      }

      orgEntry.clients.push(clientEntry);
      logger.debug(`  ✅ ${slug}: ${clientEntry.sessions.length} session(s) exported`);
    }

    output.orgs.push(orgEntry);
  }

  // Download as JSON file
  const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `platform-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);

  logger.debug('Platform Export Complete');
  for (const org of output.orgs) {
    logger.debug(`Org: ${org.name} (${org.orgId})`);
    logger.debug(`  Coaches: ${org.coaches.length}`);
    logger.debug(`  Clients: ${org.clients.length}`);
    for (const c of org.clients) {
      logger.debug(`  └─ ${c.slug}: ${c.sessions.length} sessions`);
    }
  }
  logger.debug('\n📁 JSON file downloaded to your Downloads folder.');
}

/**
 * Detailed audit showing every doc ID in clients and assessments collections.
 * Run: await inspectCollections()
 */
export async function inspectCollections(): Promise<void> {
  const db = getDb();
  const orgsSnap = await getDocs(getOrganizationsCollection());

  logger.debug('Collection Inspector');
  for (const orgDoc of orgsSnap.docs) {
    const orgId = orgDoc.id;
    const orgName = orgDoc.data().name ?? orgId;
    logger.debug(`📁 ${orgName} (${orgId})`);

    logger.debug('clients/');
    const clientsSnap = await getDocs(
      query(getOrgClientsCollection(orgId), limit(ORG_CLIENT_PROFILES_QUERY_LIMIT)),
    );
    for (const c of clientsSnap.docs) {
      const d = c.data();
      const isSlug = /^[a-z][a-z0-9-._]+$/.test(c.id);
      logger.debug(`${isSlug ? '✅' : '❌'} ${c.id}  →  clientName: "${d.clientName ?? '—'}"  archived: ${d.archived ?? false}`);
    }
    logger.debug('assessments/');
    const assessmentsSnap = await getDocs(
      query(getOrgAssessmentsCollection(orgId), limit(ORG_CLIENT_PROFILES_QUERY_LIMIT)),
    );
    for (const a of assessmentsSnap.docs) {
      const d = a.data();
      const isSlug = /^[a-z][a-z0-9-._]+$/.test(a.id);
      logger.debug(`${isSlug ? '✅' : '❌'} ${a.id}  →  clientNameLower: "${d.clientNameLower ?? '—'}"  overallScore: ${d.overallScore ?? 0}`);
    }
  }
  logger.debug('✅ Inspection complete.');
}

/**
 * Remove orphan docs from the clients and assessments collections.
 * Orphans are: auto-generated Firebase IDs (not slug-format) and the "latest" sentinel doc.
 * Safe by default — pass dryRun=false to actually delete.
 * Run: await cleanupOrphanDocs()          ← preview what would be deleted
 * Run: await cleanupOrphanDocs(false)     ← delete for real
 */
export async function cleanupOrphanDocs(dryRun = true): Promise<{
  toDelete: { collection: string; id: string }[];
  deleted: number;
}> {
  const db = getDb();
  const orgsSnap = await getDocs(getOrganizationsCollection());
  const toDelete: { collection: string; id: string }[] = [];

  // A valid client/assessment doc ID is a human-readable slug:
  // starts with lowercase letter, contains only lowercase letters, digits, hyphens, dots, underscores
  const SLUG_RE = /^[a-z][a-z0-9\-._]+$/;

  for (const orgDoc of orgsSnap.docs) {
    const orgId = orgDoc.id;

    // Clients
    const clientsSnap = await getDocs(getOrgClientsCollection(orgId));
    for (const c of clientsSnap.docs) {
      if (!SLUG_RE.test(c.id)) {
        toDelete.push({ collection: `organizations/${orgId}/clients`, id: c.id });
      }
    }

    // Assessments
    const assessmentsSnap = await getDocs(getOrgAssessmentsCollection(orgId));
    for (const a of assessmentsSnap.docs) {
      if (!SLUG_RE.test(a.id)) {
        toDelete.push({ collection: `organizations/${orgId}/assessments`, id: a.id });
      }
    }
  }

  if (dryRun) {
    logger.debug(`cleanupOrphanDocs — DRY RUN (${toDelete.length} would be deleted)`);
    for (const d of toDelete) logger.debug(`  🗑  ${d.collection}/${d.id}`);
    logger.debug('Run await cleanupOrphanDocs(false) to delete for real.');
    return { toDelete, deleted: 0 };
  }

  let deleted = 0;
  for (const d of toDelete) {
    await deleteDoc(doc(db, d.collection, d.id));
    deleted++;
    logger.debug(`Deleted: ${d.collection}/${d.id}`);
  }
  logger.debug(`✅ Deleted ${deleted} orphan docs.`);
  return { toDelete, deleted };
}

/**
 * One-time migration: for every org, find UUID-ID assessment docs that have real data
 * (overallScore > 0) and re-save them under the canonical slug ID. Then deletes the UUID doc.
 * Also creates slug docs for clients whose data lives only in snapshots (no assessment doc at all).
 * Run: await migrateAssessmentsToSlugIds()
 */
export async function migrateAssessmentsToSlugIds(): Promise<{ migrated: string[]; skipped: string[] }> {
  const db = getDb();
  const { generateClientSlug } = await import('@/services/clientProfiles');
  const orgsSnap = await getDocs(getOrganizationsCollection());
  const migrated: string[] = [];
  const skipped: string[] = [];

  for (const orgDoc of orgsSnap.docs) {
    const orgId = orgDoc.id;

    // 1. Migrate UUID assessment docs that have real scores
    const assessmentsSnap = await getDocs(getOrgAssessmentsCollection(orgId));
    for (const aDoc of assessmentsSnap.docs) {
      // Skip docs already using slug format (lowercase + hyphens)
      if (/^[a-z][a-z0-9\-._]+$/.test(aDoc.id)) {
        skipped.push(`${orgId}/${aDoc.id} (already slug)`);
        continue;
      }
      const data = aDoc.data();
      const overallScore = typeof data.overallScore === 'number' ? data.overallScore : 0;
      const clientNameLower = typeof data.clientNameLower === 'string' ? data.clientNameLower : '';
      if (overallScore <= 0 || !clientNameLower) {
        // Empty stub — cleanupOrphanDocs handles these
        skipped.push(`${orgId}/${aDoc.id} (no score/name, skip)`);
        continue;
      }
      const slug = generateClientSlug(clientNameLower);
      const slugRef = doc(db, `organizations/${orgId}/assessments`, slug);
      const slugSnap = await getDoc(slugRef);
      if (slugSnap.exists()) {
        // Slug doc already present — UUID doc is superseded
        await deleteDoc(aDoc.ref);
        migrated.push(`${orgId}/${aDoc.id} → deleted (slug doc exists)`);
      } else {
        await setDoc(slugRef, { ...data });
        await deleteDoc(aDoc.ref);
        migrated.push(`${orgId}/${aDoc.id} → ${orgId}/${slug}`);
      }
    }

    // 2. For clients with snapshots but no assessment slug doc, create one from the latest snapshot
    const clientsSnap = await getDocs(getOrgClientsCollection(orgId));
    for (const clientDoc of clientsSnap.docs) {
      const slug = clientDoc.id;
      if (!/^[a-z][a-z0-9\-._]+$/.test(slug)) continue;
      const slugRef = doc(db, `organizations/${orgId}/assessments`, slug);
      const slugSnap = await getDoc(slugRef);
      if (slugSnap.exists()) continue; // already has a current-state doc

      // Find their latest snapshot
      const snapshotsRef = collection(db, `organizations/${orgId}/assessmentHistory/${slug}/snapshots`);
      const snapshotQ = query(snapshotsRef, orderBy('timestamp', 'desc'), limit(1));
      const snapshotSnap = await getDocs(snapshotQ);
      if (snapshotSnap.empty) {
        skipped.push(`${orgId}/${slug} (no snapshots)`);
        continue;
      }
      const latestSnapshot = snapshotSnap.docs[0].data();
      const overallScore = typeof latestSnapshot.overallScore === 'number' ? latestSnapshot.overallScore : 0;
      if (overallScore <= 0) {
        skipped.push(`${orgId}/${slug} (latest snapshot unscored)`);
        continue;
      }
      const clientData = clientDoc.data();
      await setDoc(slugRef, {
        clientName: clientData.clientName ?? slug,
        clientNameLower: (clientData.clientName ?? slug).toLowerCase(),
        coachUid: latestSnapshot.coachUid ?? clientData.coachUid ?? '',
        coachEmail: latestSnapshot.coachEmail ?? null,
        organizationId: orgId,
        overallScore,
        scoresSummary: latestSnapshot.scoresSummary ?? null,
        formData: latestSnapshot.formData ?? {},
        assessmentCount: 1,
        goals: Array.isArray(latestSnapshot.formData?.clientGoals) ? latestSnapshot.formData.clientGoals : [],
        isSummary: true,
        isPartial: false,
        assessmentType: 'full' as const,
        category: 'all',
        createdAt: latestSnapshot.timestamp ?? serverTimestamp(),
        updatedAt: latestSnapshot.timestamp ?? serverTimestamp(),
      });
      migrated.push(`${orgId}/${slug} (created from latest snapshot)`);
    }
  }

  logger.debug('migrateAssessmentsToSlugIds');
  logger.debug('Migrated:', migrated);
  logger.debug('Skipped:', skipped);
  return { migrated, skipped };
}

export async function purgeOrphanOrgs(): Promise<{ success: boolean; purged: number; totalDeleted: number; orgIds: string[] }> {
  const callable = httpsCallable<void, { success: boolean; purged: number; totalDeleted: number; orgIds: string[] }>(
    getFirebaseFunctions(),
    'purgeOrphanOrgs',
    { timeout: 540_000 },
  );
  const response = await callable();
  return response.data;
}

// ---------------------------------------------------------------------------
// Phase 3: Import v2 platform data
// ---------------------------------------------------------------------------

interface ExportSession {
  sessionId: string;
  type: string;
  timestamp: string;
  overallScore: number;
  scoresSummary: unknown;
  formData: unknown;
}

interface ExportClient {
  slug: string;
  clientName: string;
  coachUid: string;
  status: string;
  archivedAt: string | null;
  archiveReason: string | null;
  shareToken: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  goals: string[];
  joinedAt: string | null;
  sessions: ExportSession[];
}

interface ExportOrg {
  orgId: string;
  name: string;
  clients: ExportClient[];
}

interface ExportPayload {
  exportedAt: string;
  orgs: ExportOrg[];
}

function pickJsonFile(): Promise<File> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) resolve(file);
      else reject(new Error('No file selected'));
    };
    input.oncancel = () => reject(new Error('File picker cancelled'));
    input.click();
  });
}

/**
 * Import a platform export JSON into the v2 Firestore schema.
 *
 * Run from the browser console after deploying new code:
 *   await importPlatformData()
 *
 * Idempotent — safe to run multiple times. Existing sessions are not overwritten.
 * Client profile docs are merged so manually assigned fields are preserved.
 */
export async function importPlatformData(): Promise<void> {
  const file = await pickJsonFile();
  const raw = await file.text();
  const payload = JSON.parse(raw) as ExportPayload;

  if (!payload?.orgs || !Array.isArray(payload.orgs)) {
    throw new Error('Invalid export file: expected { orgs: [...] }');
  }

  const db = getDb();
  let totalClients = 0;
  let totalSessions = 0;

  for (const org of payload.orgs) {
    const { orgId, clients } = org;
    if (!orgId || !Array.isArray(clients)) continue;

    logger.debug(`Org: ${org.name} (${orgId})`);

    for (const client of clients) {
      const { slug, sessions } = client;
      if (!slug || !Array.isArray(sessions)) continue;

      // createdAt must be a Firestore Timestamp so orderBy('createdAt') queries work
      const createdAtTs = client.joinedAt
        ? Timestamp.fromDate(new Date(client.joinedAt))
        : serverTimestamp();

      // Write client profile (merge so we don't stomp existing coach assignments)
      await setDoc(
        doc(db, `organizations/${orgId}/clients/${slug}`),
        {
          clientName: client.clientName ?? slug,
          clientNameLower: (client.clientName ?? slug).toLowerCase(),
          coachUid: client.coachUid ?? '',
          assignedCoachUid: client.coachUid ?? '',
          status: client.status ?? 'active',
          shareToken: client.shareToken ?? null,
          goals: client.goals ?? [],
          dateOfBirth: client.dateOfBirth ?? null,
          gender: client.gender ?? null,
          archivedAt: client.archivedAt ?? null,
          archiveReason: client.archiveReason ?? null,
          joinedAt: client.joinedAt ?? null,
          createdAt: createdAtTs,
          organizationId: orgId,
          schemaVersion: 2,
        },
        { merge: true },
      );

      // Sessions are sorted by their ISO-timestamp IDs; ascending = oldest first
      const sortedSessions = [...sessions].sort((a, b) =>
        a.sessionId.localeCompare(b.sessionId),
      );

      for (const session of sortedSessions) {
        const sessionRef = doc(
          db,
          `organizations/${orgId}/clients/${slug}/sessions/${session.sessionId}`,
        );
        // Use merge:false — sessions are immutable; skip if already written
        const existing = await getDoc(sessionRef);
        if (!existing.exists()) {
          await setDoc(sessionRef, {
            schemaVersion: 2,
            type: session.type ?? 'full',
            timestamp: Timestamp.fromDate(new Date(session.timestamp)),
            overallScore: session.overallScore ?? 0,
            scoresSummary: session.scoresSummary ?? null,
            formData: session.formData ?? {},
            organizationId: orgId,
          });
        }
        totalSessions++;
      }

      // Derive current/state from the latest scored session
      const latestScored = [...sortedSessions]
        .reverse()
        .find(s => (s.overallScore ?? 0) > 0);

      if (latestScored) {
        await setDoc(
          doc(db, `organizations/${orgId}/clients/${slug}/current/state`),
          {
            schemaVersion: 2,
            formData: latestScored.formData ?? {},
            overallScore: latestScored.overallScore ?? 0,
            scoresSummary: latestScored.scoresSummary ?? null,
            lastUpdated: serverTimestamp(),
            organizationId: orgId,
          },
          { merge: true },
        );

        // Patch the client profile doc with score fields so the analytics Cloud Function
        // can read overallScore > 0 and include this client in population counts.
        await setDoc(
          doc(db, `organizations/${orgId}/clients/${slug}`),
          {
            overallScore: latestScored.overallScore ?? 0,
            scoresSummary: latestScored.scoresSummary ?? null,
            formData: latestScored.formData ?? {},
            assessmentCount: sessions.length,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }

      totalClients++;
      logger.debug(`  ✅ ${slug}: ${sessions.length} session(s)`);
    }
  }

  logger.debug(`\n✅ Import complete: ${totalClients} client(s), ${totalSessions} session(s) written to v2 paths.`);
}

// ---------------------------------------------------------------------------
// Post-import helpers — scoped to the currently logged-in user's org
// ---------------------------------------------------------------------------

/**
 * Resolve the org ID for the currently authenticated user.
 * Reads userProfiles/{uid} which every authenticated user can read.
 */
async function resolveCallerOrgId(): Promise<string> {
  const { getAuth } = await import('firebase/auth');
  const currentUser = getAuth().currentUser;
  if (!currentUser) throw new Error('No authenticated user — please log in first.');

  const profileSnap = await getDoc(doc(getDb(), `userProfiles/${currentUser.uid}`));
  if (!profileSnap.exists()) throw new Error('User profile not found.');

  const orgId = (profileSnap.data() as { organizationId?: string }).organizationId;
  if (!orgId) throw new Error('No organizationId on user profile.');

  return orgId;
}

/**
 * Evaluate and unlock achievements for all clients based on their existing session history.
 * Run this after importPlatformData() so imported assessments count toward badges.
 *
 * Run from the browser console: await backfillAchievements()
 */
export async function backfillAchievements(): Promise<void> {
  const orgId = await resolveCallerOrgId();
  const { evaluateAchievements } = await import('@/services/achievements');
  const { computeScores } = await import('@/lib/scoring');
  const db = getDb();

  const clientsSnap = await getDocs(getOrgClientsCollection(orgId));

  logger.debug(`Backfilling achievements — Org: ${orgId}`);

  let totalClients = 0;
  let totalUnlocked = 0;

  for (const clientDoc of clientsSnap.docs) {
    const slug = clientDoc.id;
    if (!/^[a-z][a-z0-9\-._]+$/.test(slug)) continue;

    const d = clientDoc.data() as { clientName?: string };
    const clientName = d.clientName ?? slug;

    const sessionsCol = collection(db, `organizations/${orgId}/clients/${slug}/sessions`);
    const sessionsSnap = await getDocs(query(sessionsCol, orderBy('timestamp', 'asc')));
    if (sessionsSnap.empty) {
      logger.debug(`  — ${clientName}: no sessions, skipping`);
      continue;
    }

    const sessions = sessionsSnap.docs.map(docSnap => ({
      id: docSnap.id,
      ...(docSnap.data() as { formData?: Record<string, unknown>; overallScore?: number }),
    }));

    const latestSession = [...sessions].reverse().find(
      s => s.formData && Object.keys(s.formData).length > 0,
    );
    if (!latestSession?.formData) {
      logger.debug(`  — ${clientName}: sessions have no formData, skipping`);
      continue;
    }

    const { formData } = latestSession as unknown as {
      formData: import('@/contexts/FormContext').FormData;
      overallScore?: number;
    };
    const scores = computeScores(formData);
    const categoryScores = scores.categories.map((c) => ({
      id: c.id,
      score: c.score,
      assessed: c.assessed,
    }));
    const overallScore = latestSession.overallScore ?? scores.overall;

    const prevSession = sessions.length > 1
      ? (sessions[sessions.length - 2] as unknown as {
          formData?: import('@/contexts/FormContext').FormData;
          overallScore?: number;
        })
      : null;
    let prevCategoryScores:
      | Array<{ id: string; score: number; assessed: boolean }>
      | undefined;
    let previousFullProfileScore: number | null | undefined;
    if (prevSession?.formData && Object.keys(prevSession.formData).length > 0) {
      const prevScores = computeScores(prevSession.formData as import('@/contexts/FormContext').FormData);
      previousFullProfileScore = prevScores.fullProfileScore;
      prevCategoryScores = prevScores.categories.map((c) => ({
        id: c.id,
        score: c.score,
        assessed: c.assessed,
      }));
    }

    const unlocked = await evaluateAchievements({
      organizationId: orgId,
      clientId: slug,
      overallScore,
      fullProfileScore: scores.fullProfileScore,
      categoryScores,
      previousOverallScore: prevSession?.overallScore ?? undefined,
      previousFullProfileScore,
      previousCategoryScores: prevCategoryScores,
      assessmentCount: sessions.length,
    });

    totalClients++;
    totalUnlocked += unlocked.length;

    if (unlocked.length > 0) {
      logger.debug(`  🏆 ${clientName}: ${unlocked.length} achievement(s) unlocked`);
      unlocked.forEach(a => logger.debug(`    - ${a.title}: ${a.description}`));
    } else {
      logger.debug(`  ✓ ${clientName}: no new achievements (score: ${Math.round(overallScore)})`);
    }
  }
  logger.debug(`\n✅ Backfill complete: ${totalClients} client(s), ${totalUnlocked} achievement(s) unlocked.`);
}

// ---------------------------------------------------------------------------
// Repair: patch missing current/state docs and client profile score fields
// ---------------------------------------------------------------------------

/**
 * Calls the repairClientProfiles Cloud Function (admin SDK — bypasses Firestore rules).
 * Works whether you are logged in as platform admin or org admin.
 *
 * Run from the browser console: await repairCurrentState()
 */
export async function repairCurrentState(): Promise<void> {
  const { getApp } = await import('firebase/app');
  const { getFunctions, httpsCallable } = await import('firebase/functions');
  const fns = getFunctions(getApp(), 'us-central1');
  const repairFn = httpsCallable<
    { orgId?: string },
    { success: boolean; fixed: number; skipped: number; results: { slug: string; status: string; score?: number }[] }
  >(fns, 'repairClientProfiles');

  logger.debug('repairCurrentState');
  logger.debug('Calling server-side repair (admin SDK)…');

  const { data } = await repairFn({});

  for (const r of data.results) {
    if (r.status === 'repaired') {
      logger.debug(`  ✅ ${r.slug}: repaired (score=${r.score ?? '?'})`);
    } else if (r.status === 'ok') {
      logger.debug(`  — ${r.slug}: already OK`);
    } else {
      logger.warn(`  ⚠️  ${r.slug}: ${r.status}`);
    }
  }
  logger.debug(`\n✅ Repair complete: ${data.fixed} fixed, ${data.skipped} already OK or skipped.`);
}

// ---------------------------------------------------------------------------
// Diagnostic: inspect current/state for every client in the caller's org
// ---------------------------------------------------------------------------

/**
 * Logs what's stored in current/state for each client to help debug blank reports.
 * Run from the browser console: await diagnoseCurrentState()
 */
export async function diagnoseCurrentState(): Promise<void> {
  const orgId = await resolveCallerOrgId();
  const db = getDb();
  const clientsSnap = await getDocs(getOrgClientsCollection(orgId));

  logger.debug(`Diagnosing current/state — Org: ${orgId}`);

  for (const clientDoc of clientsSnap.docs) {
    const slug = clientDoc.id;
    if (!/^[a-z][a-z0-9\-._]+$/.test(slug)) continue;

    const d = clientDoc.data() as { clientName?: string };
    const clientName = d.clientName ?? slug;

    const currentRef = doc(db, `organizations/${orgId}/clients/${slug}/current/state`);
    const currentSnap = await getDoc(currentRef);

    if (!currentSnap.exists()) {
      logger.warn(`  ❌ ${clientName}: current/state MISSING`);
      continue;
    }

    const data = currentSnap.data() as { formData?: Record<string, unknown>; overallScore?: number; scoresSummary?: unknown };
    const fdKeys = data.formData ? Object.keys(data.formData).length : 0;

    if (fdKeys === 0) {
      logger.warn(`  ⚠️  ${clientName}: current/state exists but formData is EMPTY`);
    } else {
      logger.debug(`  ✅ ${clientName}: overallScore=${data.overallScore ?? 0} | formData fields=${fdKeys} | scoresSummary=${data.scoresSummary ? 'yes' : 'no'}`);
    }
  }
  logger.debug('✅ Diagnosis complete.');
}

// ---------------------------------------------------------------------------
// Phase 4: Delete v1 Firestore paths (run ONLY after importPlatformData confirms success)
// ---------------------------------------------------------------------------

/**
 * Delete all v1 Firestore data (assessments, assessmentHistory, roadmaps, assessmentDrafts).
 * Run this ONLY after importPlatformData() has completed and you've manually verified
 * that all clients and sessions are visible in the v2 UI.
 *
 * Idempotent — safe to run if collections are already empty.
 * Run from the browser console: await deleteV1Paths()
 */
export async function deleteV1Paths(): Promise<void> {
  const db = getDb();
  const orgsSnap = await getDocs(getOrganizationsCollection());

  let totalDeleted = 0;

  for (const orgDoc of orgsSnap.docs) {
    const orgId = orgDoc.id;
    logger.debug(`Org: ${orgId}`);

    const v1Collections = ['assessments', 'roadmaps', 'assessmentDrafts'];

    for (const colName of v1Collections) {
      const colSnap = await getDocs(collection(db, `organizations/${orgId}/${colName}`));
      if (colSnap.empty) continue;

      for (const d of colSnap.docs) {
        await deleteDoc(d.ref);
        totalDeleted++;
      }
      logger.debug(`  🗑 Deleted ${colSnap.size} doc(s) from ${colName}`);
    }

    // assessmentHistory has nested subcollections (current, history, snapshots)
    const ahSnap = await getDocs(collection(db, `organizations/${orgId}/assessmentHistory`));
    for (const clientDoc of ahSnap.docs) {
      for (const sub of ['current', 'history', 'snapshots']) {
        try {
          const subSnap = await getDocs(
            collection(db, `organizations/${orgId}/assessmentHistory/${clientDoc.id}/${sub}`),
          );
          for (const d of subSnap.docs) {
            await deleteDoc(d.ref);
            totalDeleted++;
          }
          if (!subSnap.empty) {
            logger.debug(`  🗑 Deleted ${subSnap.size} doc(s) from assessmentHistory/${clientDoc.id}/${sub}`);
          }
        } catch {
          // subcollection may not exist
        }
      }
      await deleteDoc(clientDoc.ref);
      totalDeleted++;
    }
  }

  logger.debug(`\n✅ v1 cleanup complete: ${totalDeleted} legacy doc(s) deleted.`);
}

if (typeof window !== 'undefined') {
  const win = window as unknown as {
    auditCanonicalData?: typeof auditCanonicalData;
    exportPlatformData?: typeof exportPlatformData;
    importPlatformData?: typeof importPlatformData;
    deleteV1Paths?: typeof deleteV1Paths;
    backfillAchievements?: typeof backfillAchievements;
    repairCurrentState?: typeof repairCurrentState;
    diagnoseCurrentState?: typeof diagnoseCurrentState;
    cleanupOrphanDocs?: typeof cleanupOrphanDocs;
    inspectCollections?: typeof inspectCollections;
    migrateAssessmentsToSlugIds?: typeof migrateAssessmentsToSlugIds;
    platformAudit?: typeof platformAudit;
    backfillClientIds?: typeof backfillClientIds;
    checkPlatformHealth?: typeof checkPlatformHealth;
    cleanupActivityFeed?: typeof cleanupActivityFeed;
    cleanupLegacyAchievements?: typeof cleanupLegacyAchievements;
    deleteOrg?: typeof deleteOrg;
    deleteLegacyCollections?: typeof deleteLegacyCollections;
    mergeDuplicateClient?: typeof mergeDuplicateClient;
    migrateAchievements?: typeof migrateAchievements;
    migrateClientSubmissions?: typeof migrateClientSubmissions;
    normalizeAIUsageLogs?: typeof normalizeAIUsageLogs;
    purgeOrphanOrgs?: typeof purgeOrphanOrgs;
    rebuildPlatformMetricsHistory?: typeof rebuildPlatformMetricsHistory;
    rebuildSystemStats?: typeof rebuildSystemStats;
    reconcilePlatformData?: typeof reconcilePlatformData;
    seedAIConfig?: typeof seedAIConfig;
    verifyPlatformCutover?: typeof verifyPlatformCutover;
  };
  win.auditCanonicalData = auditCanonicalData;
  win.exportPlatformData = exportPlatformData;
  win.importPlatformData = importPlatformData;
  win.deleteV1Paths = deleteV1Paths;
  win.backfillAchievements = backfillAchievements;
  win.repairCurrentState = repairCurrentState;
  win.diagnoseCurrentState = diagnoseCurrentState;
  win.cleanupOrphanDocs = cleanupOrphanDocs;
  win.inspectCollections = inspectCollections;
  win.migrateAssessmentsToSlugIds = migrateAssessmentsToSlugIds;
  win.platformAudit = platformAudit;
  win.backfillClientIds = backfillClientIds;
  win.checkPlatformHealth = checkPlatformHealth;
  win.cleanupActivityFeed = cleanupActivityFeed;
  win.cleanupLegacyAchievements = cleanupLegacyAchievements;
  win.deleteOrg = deleteOrg;
  win.deleteLegacyCollections = deleteLegacyCollections;
  win.mergeDuplicateClient = mergeDuplicateClient;
  win.migrateAchievements = migrateAchievements;
  win.migrateClientSubmissions = migrateClientSubmissions;
  win.normalizeAIUsageLogs = normalizeAIUsageLogs;
  win.purgeOrphanOrgs = purgeOrphanOrgs;
  win.rebuildPlatformMetricsHistory = rebuildPlatformMetricsHistory;
  win.rebuildSystemStats = rebuildSystemStats;
  win.reconcilePlatformData = reconcilePlatformData;
  win.seedAIConfig = seedAIConfig;
  win.verifyPlatformCutover = verifyPlatformCutover;
  logger.info('[PlatformDataReconciler] Ready: exportPlatformData, importPlatformData, backfillAchievements, diagnoseCurrentState, and more.');
}
