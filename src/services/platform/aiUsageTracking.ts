/**
 * AI Usage Tracking Service
 *
 * Handles AI cost calculations and tracking:
 * - MTD (Month-To-Date) cost calculations
 * - Cost breakdown by feature
 * - Organization-specific cost tracking
 *
 * All costs returned in GBP pence (base currency for platform reporting).
 */

import {
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type DocumentData,
  getDocs,
  query,
  where,
  Timestamp,
  orderBy,
  limit as firestoreLimit,
  startAfter,
} from 'firebase/firestore';
import type { AICostBreakdown } from '@/types/platform';
import { filsToGbpPence } from '@/lib/utils/currency';
import { getLogCostFils } from '@/lib/ai/aiPricing';
import { logger } from '@/lib/utils/logger';
import { getAIUsageLogsCollection, getOrganizationsCollection } from '@/lib/database/collections';

const AI_LOGS_PAGE_SIZE = 1000;

async function fetchPagedAiLogs(constraints: QueryConstraint[]): Promise<Array<{ data: () => Record<string, unknown> }>> {
  const aiLogsRef = getAIUsageLogsCollection();
  const docs: Array<{ data: () => Record<string, unknown> }> = [];
  let cursor: QueryDocumentSnapshot<DocumentData> | undefined;

  while (true) {
    const pageQuery = cursor
      ? query(aiLogsRef, ...constraints, startAfter(cursor), firestoreLimit(AI_LOGS_PAGE_SIZE))
      : query(aiLogsRef, ...constraints, firestoreLimit(AI_LOGS_PAGE_SIZE));
    const snapshot = await getDocs(pageQuery);
    docs.push(...snapshot.docs);
    if (snapshot.docs.length < AI_LOGS_PAGE_SIZE) {
      break;
    }
    cursor = snapshot.docs[snapshot.docs.length - 1];
  }

  return docs;
}

/**
 * Calculate AI costs MTD (Month-To-Date) from actual usage logs
 * This ensures we have accurate costs even if aggregation hasn't run
 */
export async function calculateAICostsMTD(): Promise<number> {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const aiLogsRef = getAIUsageLogsCollection();
    let totalCostsFils = 0;

    try {
      const pagedDocs = await fetchPagedAiLogs([
        where('timestamp', '>=', Timestamp.fromDate(startOfMonth)),
        orderBy('timestamp', 'desc'),
      ]);
      pagedDocs.forEach((logDoc) => {
        totalCostsFils += getLogCostFils(logDoc.data() as Record<string, unknown>);
      });
    } catch {
      const allLogs = await fetchPagedAiLogs([]);
      allLogs.forEach((logDoc) => {
        const log = logDoc.data() as Record<string, unknown>;
        const timestamp = effectiveTimestamp(log);
        if (!timestamp || timestamp < startOfMonth) return;
        totalCostsFils += getLogCostFils(log);
      });
    }

    return filsToGbpPence(totalCostsFils);
  } catch (error) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    logger.error('Error calculating AI costs MTD:', {
      error,
      startOfMonth: startOfMonth.toISOString(),
      hint: 'Ensure Firestore index exists for ai_usage_logs (timestamp DESC)',
    });
    return 0;
  }
}

/**
 * Get AI costs breakdown by feature type for platform (returns GBP pence)
 */
export async function getAICostsByFeature(): Promise<Array<{
  feature: string;
  count: number;
  costGbpPence: number;
}>> {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    try {
      const pagedDocs = await fetchPagedAiLogs([
        where('timestamp', '>=', Timestamp.fromDate(startOfMonth)),
        orderBy('timestamp', 'desc'),
      ]);
      return aggregateLogsToCostsByFeature(pagedDocs);
    } catch {
      const fallbackDocs = await fetchPagedAiLogs([]);
      const filteredDocs = fallbackDocs.filter((docSnap) => {
        const timestamp = effectiveTimestamp(docSnap.data() as Record<string, unknown>);
        return !!timestamp && timestamp >= startOfMonth;
      });
      return aggregateLogsToCostsByFeature(filteredDocs);
    }
  } catch (error) {
    logger.error('Error fetching AI costs by feature:', {
      error,
      hint: 'Ensure Firestore index exists for ai_usage_logs (timestamp DESC or organizationId+timestamp)',
    });
    return [];
  }
}

/** Resolve org id from root or metadata (some logs have it only in metadata). */
function effectiveOrgId(log: Record<string, unknown>): string | null | undefined {
  const root = log.organizationId;
  if (root != null && root !== '') return root as string;
  const meta = log.metadata as Record<string, unknown> | undefined;
  const fromMeta = meta?.organizationId;
  return fromMeta != null && fromMeta !== '' ? (fromMeta as string) : null;
}

/** Resolve type from root or metadata. */
function effectiveType(log: Record<string, unknown>): string {
  const root = log.type;
  if (root != null && root !== '') return root as string;
  const meta = log.metadata as Record<string, unknown> | undefined;
  return (meta?.type as string) || 'unknown';
}

/** Resolve timestamp as Date from root or metadata (for month filter). */
function effectiveTimestamp(log: Record<string, unknown>): Date | null {
  const root = log.timestamp as { toDate?: () => Date } | undefined;
  if (root?.toDate) return root.toDate();
  const meta = log.metadata as Record<string, unknown> | undefined;
  const metaTs = meta?.timestamp as { toDate?: () => Date } | undefined;
  if (metaTs?.toDate) return metaTs.toDate();
  return null;
}

/**
 * Aggregate logs into costs-by-feature map (shared logic).
 * Uses effective org/type so root or metadata fields both work.
 */
function aggregateLogsToCostsByFeature(
  docs: Array<{ data: () => Record<string, unknown> }>,
  filter?: (log: Record<string, unknown>) => boolean
): Array<{ feature: string; count: number; costGbpPence: number }> {
  const costsByFeature = new Map<string, { count: number; costFils: number }>();
  docs.forEach((logDoc) => {
    const logData = logDoc.data();
    if (filter && !filter(logData)) return;
    const rawFeature = effectiveType(logData);
    const feature = rawFeature === 'ocr_inbody' ? 'ocr_body_comp' : rawFeature;
    const costFils = getLogCostFils(logData);
    const current = costsByFeature.get(feature) || { count: 0, costFils: 0 };
    costsByFeature.set(feature, {
      count: current.count + 1,
      costFils: current.costFils + costFils,
    });
  });
  return Array.from(costsByFeature.entries())
    .map(([feature, data]) => ({
      feature,
      count: data.count,
      costGbpPence: filsToGbpPence(data.costFils),
    }))
    .sort((a, b) => b.costGbpPence - a.costGbpPence);
}

/**
 * Get ALL-TIME AI costs breakdown by feature for the platform (returns GBP pence).
 */
export async function getAICostsByFeatureAllTime(): Promise<Array<{
  feature: string;
  count: number;
  costGbpPence: number;
}>> {
  try {
    const allDocs = await fetchPagedAiLogs([]);
    return aggregateLogsToCostsByFeature(allDocs);
  } catch (error) {
    logger.error('Error fetching all-time AI costs by feature:', error);
    return [];
  }
}

/**
 * Get AI costs breakdown by feature for a specific organization (returns GBP pence).
 * Uses root + metadata for organizationId and type so logs with either shape are counted.
 */
export async function getOrgAICostsByFeature(orgId: string): Promise<Array<{
  feature: string;
  count: number;
  costGbpPence: number;
}>> {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    try {
      const docsWithOrg = await fetchPagedAiLogs([
        where('organizationId', '==', orgId),
        where('timestamp', '>=', Timestamp.fromDate(startOfMonth)),
        orderBy('timestamp', 'desc'),
      ]);
      if (docsWithOrg.length > 0) {
        return aggregateLogsToCostsByFeature(docsWithOrg);
      }
    } catch {
      // Fall back to metadata-aware scan below.
    }

    try {
      const allSnapshotDocs = await fetchPagedAiLogs([
        where('timestamp', '>=', Timestamp.fromDate(startOfMonth)),
        orderBy('timestamp', 'desc'),
      ]);
      const orgsSnap = await getDocs(query(getOrganizationsCollection(), firestoreLimit(2)));
      const isSingleOrg = orgsSnap.size === 1 && orgsSnap.docs[0].id === orgId;
      const belongsToOrg = (log: Record<string, unknown>) => {
        const oid = effectiveOrgId(log);
        return oid === orgId || (isSingleOrg && (oid == null || oid === ''));
      };

      return aggregateLogsToCostsByFeature(
        allSnapshotDocs.filter((docSnap) => belongsToOrg(docSnap.data())),
        undefined,
      );
    } catch {
      const noFilterSnap = await fetchPagedAiLogs([]);
      const orgsSnap = await getDocs(query(getOrganizationsCollection(), firestoreLimit(2)));
      const isSingleOrg = orgsSnap.size === 1 && orgsSnap.docs[0].id === orgId;
      const belongsToOrg = (log: Record<string, unknown>) => {
        const oid = effectiveOrgId(log);
        return oid === orgId || (isSingleOrg && (oid == null || oid === ''));
      };
      const docsToUse = noFilterSnap.filter((d) => {
        const log = d.data();
        const ts = effectiveTimestamp(log);
        if (!ts || ts < startOfMonth) return false;
        return belongsToOrg(log);
      });
      return aggregateLogsToCostsByFeature(docsToUse, undefined);
    }
  } catch (error) {
    logger.error('Error fetching org AI costs by feature:', error);
    return [];
  }
}

/**
 * Get AI cost breakdown by organization
 */
export async function getAICostBreakdown(_period: string): Promise<AICostBreakdown[]> {
  return [];
}

export interface AIErrorRate {
  total: number;
  errors: number;
  errorRate: number;
}

/**
 * Get the AI error rate for the current month.
 * Reads all ai_usage_logs for the current month, groups by status field.
 * Returns { total, errors, errorRate } where errorRate is 0–100.
 */
export async function getAIErrorRateMTD(): Promise<AIErrorRate> {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const docs = await fetchPagedAiLogs([
      where('timestamp', '>=', Timestamp.fromDate(startOfMonth)),
    ]);

    let total = 0;
    let errors = 0;
    for (const d of docs) {
      const log = d.data();
      total += 1;
      const status = typeof log.status === 'string' ? log.status : '';
      if (status === 'error' || status === 'failed') {
        errors += 1;
      }
    }

    if (total === 0) return { total: 0, errors: 0, errorRate: 0 };
    return { total, errors, errorRate: Math.round((errors / total) * 1000) / 10 };
  } catch {
    try {
      const docs = await fetchPagedAiLogs([]);
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthDocs = docs.filter((d) => {
        const ts = effectiveTimestamp(d.data());
        return ts != null && ts >= startOfMonth;
      });
      const total = monthDocs.length;
      const errors = monthDocs.filter((d) => {
        const s = d.data().status;
        return s === 'error' || s === 'failed';
      }).length;
      if (total === 0) return { total: 0, errors: 0, errorRate: 0 };
      return { total, errors, errorRate: Math.round((errors / total) * 1000) / 10 };
    } catch (err) {
      logger.error('Error computing AI error rate MTD:', err);
      return { total: 0, errors: 0, errorRate: 0 };
    }
  }
}
