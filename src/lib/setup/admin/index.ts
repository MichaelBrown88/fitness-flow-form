/**
 * Admin Tools Index
 *
 * This file exports all admin database tools for easy access.
 * Import from '@/lib/setup/admin' to use any of these tools.
 *
 * All tools are also exposed to the browser window for console access.
 *
 * Usage from console:
 *   await window.auditDatabase()
 *   await window.createMissingClients({ dryRun: true })
 *   await window.cleanupUnusedFields({ dryRun: true })
 *   await window.deleteTestData({ dryRun: true })
 *   await window.migrateToSaas({ dryRun: true })
 *   await window.migrateAssessmentHistory({ dryRun: true })
 */

// Database Audit Tool
export { auditDatabase, formatAuditReport } from './auditDatabase';
export type { AuditResult } from './auditDatabase';

// Create Missing Clients Tool
export { createMissingClients, findMissingClientByName } from './createMissingClients';

// Cleanup Unused Fields Tool
export {
  cleanupUnusedFields,
  getFieldUsageReport,
  listDeprecatedFields,
  CONFIRMED_DEPRECATED_FIELDS,
  POTENTIALLY_DEPRECATED_FIELDS,
} from './cleanupUnusedFields';

// Delete Test Data Tool
export { deleteTestData, listAllAccounts } from './deleteTestData';

// SaaS Migration Tool
export { migrateToSaas, verifyMigration, rollbackMigration } from './migrateToSaas';

// Assessment History Migration Tool
export { migrateAssessmentHistory, verifyAssessmentHistoryMigration } from './migrateAssessmentHistory';

// Client Merge & Dedup Tool
export { mergeClients } from './mergeClients';

// One Fitness Migration (one-time)
export { migrateOneFitness } from './migrateOneFitness';

// Existing Admin Tools
export { diagnoseData } from './diagnoseData';
export { fixRealDataAndStats } from './fixRealDataAndStats';
export { backfillAIUsageOrganizationId } from './backfillAIUsageOrganizationId';
export { fixOrgCreatedAt } from './fixOrgCreatedAt';

// Client Data Repair & Dedup Tools
export { repairClientData, diagnoseClientDashboard, deduplicateAssessments } from './repairClientData';

// Re-export for convenience
export { verifyDatabaseIntegrity } from '../verifyDatabaseIntegrity';
