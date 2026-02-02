/**
 * AI Usage Tracking Service
 *
 * Handles AI cost calculations and tracking:
 * - MTD (Month-To-Date) cost calculations
 * - Cost breakdown by feature
 * - Organization-specific cost tracking
 */

import {
  getDocs,
  query,
  where,
  Timestamp,
  orderBy,
  limit as firestoreLimit,
} from 'firebase/firestore';
import type { AICostBreakdown } from '@/types/platform';
import { logger } from '@/lib/utils/logger';
import { getAIUsageLogsCollection } from '@/lib/database/collections';

const AI_LOGS_LIMIT = 5000;

/**
 * Calculate AI costs MTD (Month-To-Date) from actual usage logs
 * This ensures we have accurate costs even if aggregation hasn't run
 */
export async function calculateAICostsMTD(): Promise<number> {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Query all AI usage logs from current month
    const aiLogsRef = getAIUsageLogsCollection();
    const aiLogsQuery = query(
      aiLogsRef,
      where('timestamp', '>=', Timestamp.fromDate(startOfMonth)),
      orderBy('timestamp', 'desc'),
      firestoreLimit(AI_LOGS_LIMIT)
    );

    const aiLogsSnapshot = await getDocs(aiLogsQuery);
    let totalCostsFils = 0;

    aiLogsSnapshot.docs.forEach(logDoc => {
      const logData = logDoc.data();
      // Handle both new (costFils) and legacy (costEstimate) fields
      let costFils = logData.costFils || 0;

      // Backward compatibility: convert legacy costEstimate (USD) to fils
      // costEstimate is in USD (0.000675 per request typically)
      if (costFils === 0 && logData.costEstimate) {
        // Convert USD to KWD, then to fils: USD * 0.305 KWD/USD * 1000 fils/KWD
        // Use Math.ceil to ensure we don't lose cost (0.205875 fils rounds to 1, not 0)
        costFils = Math.ceil(logData.costEstimate * 0.305 * 1000);
      }

      totalCostsFils += costFils;
    });

    return totalCostsFils;
  } catch (error) {
    logger.error('Error calculating AI costs MTD:', error);
    return 0;
  }
}

/**
 * Get AI costs breakdown by feature type for platform
 */
export async function getAICostsByFeature(): Promise<Array<{
  feature: string;
  count: number;
  costFils: number;
}>> {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Query all AI usage logs from current month
    const aiLogsRef = getAIUsageLogsCollection();
    const aiLogsQuery = query(
      aiLogsRef,
      where('timestamp', '>=', Timestamp.fromDate(startOfMonth)),
      orderBy('timestamp', 'desc'),
      firestoreLimit(AI_LOGS_LIMIT)
    );

    const aiLogsSnapshot = await getDocs(aiLogsQuery);
    const costsByFeature = new Map<string, { count: number; costFils: number }>();

    aiLogsSnapshot.docs.forEach(logDoc => {
      const logData = logDoc.data();
      const feature = logData.type || 'unknown';

      // Handle both new (costFils) and legacy (costEstimate) fields
      let costFils = logData.costFils || 0;
      // Backward compatibility: convert legacy costEstimate (USD) to fils
      if (costFils === 0 && logData.costEstimate) {
        // Convert USD to KWD, then to fils: USD * 0.305 KWD/USD * 1000 fils/KWD
        // Use Math.ceil to ensure we don't lose cost
        costFils = Math.ceil(logData.costEstimate * 0.305 * 1000);
      }

      const current = costsByFeature.get(feature) || { count: 0, costFils: 0 };
      costsByFeature.set(feature, {
        count: current.count + 1,
        costFils: current.costFils + costFils,
      });
    });

    // Convert to array
    return Array.from(costsByFeature.entries())
      .map(([feature, data]) => ({
        feature,
        ...data,
      }))
      .sort((a, b) => b.costFils - a.costFils);
  } catch (error) {
    logger.error('Error fetching AI costs by feature:', error);
    return [];
  }
}

/**
 * Get AI costs breakdown by feature for a specific organization
 */
export async function getOrgAICostsByFeature(orgId: string): Promise<Array<{
  feature: string;
  count: number;
  costFils: number;
}>> {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Query AI usage logs for this organization from current month
    const aiLogsRef = getAIUsageLogsCollection();
    const aiLogsQuery = query(
      aiLogsRef,
      where('organizationId', '==', orgId),
      where('timestamp', '>=', Timestamp.fromDate(startOfMonth)),
      orderBy('timestamp', 'desc'),
      firestoreLimit(AI_LOGS_LIMIT)
    );

    const aiLogsSnapshot = await getDocs(aiLogsQuery);
    const costsByFeature = new Map<string, { count: number; costFils: number }>();

    aiLogsSnapshot.docs.forEach(logDoc => {
      const logData = logDoc.data();
      const feature = logData.type || 'unknown';

      // Handle both new (costFils) and legacy (costEstimate) fields
      let costFils = logData.costFils || 0;
      // Backward compatibility: convert legacy costEstimate (USD) to fils
      if (costFils === 0 && logData.costEstimate) {
        // Convert USD to KWD, then to fils: USD * 0.305 KWD/USD * 1000 fils/KWD
        // Use Math.ceil to ensure we don't lose cost
        costFils = Math.ceil(logData.costEstimate * 0.305 * 1000);
      }

      const current = costsByFeature.get(feature) || { count: 0, costFils: 0 };
      costsByFeature.set(feature, {
        count: current.count + 1,
        costFils: current.costFils + costFils,
      });
    });

    // Convert to array
    return Array.from(costsByFeature.entries())
      .map(([feature, data]) => ({
        feature,
        ...data,
      }))
      .sort((a, b) => b.costFils - a.costFils);
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
