/**
 * Recalculate AI Costs from costEstimate to costFils
 * 
 * This script recalculates costFils for all AI usage logs that have costEstimate
 * but missing or incorrect costFils values. This ensures all historical costs
 * are accurately converted from USD to KWD fils.
 * 
 * Run from browser console: await window.recalculateAICosts()
 */

import { getDocs, updateDoc } from 'firebase/firestore';
import { getAIUsageLogsCollection, getAIUsageLogDoc } from '@/lib/database/collections';

const logger = {
  info: (...args: unknown[]) => console.log('✅', ...args),
  warn: (...args: unknown[]) => console.warn('⚠️', ...args),
  error: (...args: unknown[]) => console.error('❌', ...args),
};

/**
 * Convert USD costEstimate to KWD fils
 */
function usdToFils(usdAmount: number): number {
  // USD to KWD: 1 USD ≈ 0.305 KWD
  // KWD to fils: 1 KWD = 1000 fils
  // Use Math.ceil to ensure we don't lose cost (0.205875 fils rounds to 1, not 0)
  return Math.ceil(usdAmount * 0.305 * 1000);
}

export async function recalculateAICosts(): Promise<{
  success: boolean;
  totalLogs: number;
  logsUpdated: number;
  logsSkipped: number;
  logsFixed: Array<{ id: string; oldCostFils: number; newCostFils: number; costEstimate: number }>;
  errors: string[];
}> {
  const result = {
    success: false,
    totalLogs: 0,
    logsUpdated: 0,
    logsSkipped: 0,
    logsFixed: [] as Array<{ id: string; oldCostFils: number; newCostFils: number; costEstimate: number }>,
    errors: [] as string[],
  };

  try {
    logger.info('🔄 Starting AI cost recalculation...');
    
    const aiLogsRef = getAIUsageLogsCollection();
    const aiLogsSnapshot = await getDocs(aiLogsRef);
    
    result.totalLogs = aiLogsSnapshot.size;
    logger.info(`📊 Found ${result.totalLogs} AI usage logs to check`);

    const updatePromises: Promise<void>[] = [];

    for (const logDoc of aiLogsSnapshot.docs) {
      try {
        const logData = logDoc.data();
        const logId = logDoc.id;
        const costEstimate = logData.costEstimate as number | undefined;
        const currentCostFils = logData.costFils as number | undefined;

        // Skip if no costEstimate
        if (!costEstimate || costEstimate === 0) {
          result.logsSkipped++;
          continue;
        }

        // Calculate correct costFils from costEstimate
        const correctCostFils = usdToFils(costEstimate);

        // Only update if costFils is missing, 0, or different from calculated value
        if (currentCostFils === undefined || currentCostFils === 0 || currentCostFils !== correctCostFils) {
          const updatePromise = updateDoc(getAIUsageLogDoc(logId), {
            costFils: correctCostFils,
          }).then(() => {
            result.logsUpdated++;
            result.logsFixed.push({
              id: logId,
              oldCostFils: currentCostFils || 0,
              newCostFils: correctCostFils,
              costEstimate: costEstimate,
            });
          }).catch((error) => {
            result.errors.push(`Failed to update log ${logId}: ${error.message}`);
            logger.error(`Failed to update log ${logId}:`, error);
          });

          updatePromises.push(updatePromise);
        } else {
          result.logsSkipped++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push(`Error processing log ${logDoc.id}: ${errorMessage}`);
        logger.error(`Error processing log ${logDoc.id}:`, error);
      }
    }

    // Wait for all updates to complete
    await Promise.all(updatePromises);

    result.success = result.errors.length === 0;

    logger.info('✅ Recalculation complete!');
    logger.info(`📝 Summary:`);
    logger.info(`   - Total logs checked: ${result.totalLogs}`);
    logger.info(`   - Logs updated: ${result.logsUpdated}`);
    logger.info(`   - Logs skipped (already correct): ${result.logsSkipped}`);
    logger.info(`   - Errors: ${result.errors.length}`);

    if (result.logsFixed.length > 0) {
      logger.info(`\n📋 Sample of fixed logs (first 10):`);
      result.logsFixed.slice(0, 10).forEach(log => {
        logger.info(`   - Log ${log.id.substring(0, 8)}...: ${log.costEstimate} USD → ${log.oldCostFils} → ${log.newCostFils} fils`);
      });
    }

    if (result.errors.length > 0) {
      logger.warn(`\n⚠️ Errors encountered:`);
      result.errors.slice(0, 10).forEach(error => {
        logger.warn(`   - ${error}`);
      });
    }

    return result;
  } catch (error) {
    logger.error('❌ Fatal error during recalculation:', error);
    result.errors.push(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
    result.success = false;
    return result;
  }
}

// Expose to window for browser console access
if (typeof window !== 'undefined') {
  (window as unknown as { recalculateAICosts: typeof recalculateAICosts }).recalculateAICosts = recalculateAICosts;
}
