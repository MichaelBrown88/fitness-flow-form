/**
 * Platform Admin Service
 *
 * This file re-exports the refactored platform services for backwards compatibility.
 * The actual implementation has been split into smaller, focused modules in ./platform/
 */

// Platform Admin CRUD
export {
  isPlatformAdmin,
  getPlatformAdminByEmail,
  getPlatformAdmin,
  createPlatformAdmin,
  markPasswordSet,
  updateLastLogin,
  seedPlatformAdmin,
  listPlatformAdmins,
  removePlatformAdmin,
  updatePlatformAdminPermissions,
} from './platform/platformAdmin';

export { getAuditLogs } from './platform/auditLog';

// Platform Metrics & Organization Management
export {
  getLiveMetrics,
  getDefaultMetrics,
  getRevenueByRegion,
  type RevenueByRegionResult,
  getMetricsHistory,
  getOnboardingFunnel,
  getAssessmentChartData,
  getOrgCoachesWithStats,
  getOrganizations,
  getOrganizationDetails,
  updateOrganizationDetails,
  deleteOrganization,
  callDeleteOrganization,
  pauseSubscription,
  cancelSubscription,
  reactivateSubscription,
  grantDataAccess,
  revokeDataAccess,
} from './platform/platformMetrics';

// AI Usage Tracking
export {
  calculateAICostsMTD,
  getAICostsByFeature,
  getAICostsByFeatureAllTime,
  getOrgAICostsByFeature,
  getAICostBreakdown,
  getAIErrorRateMTD,
  type AIErrorRate,
} from './platform/aiUsageTracking';

// Platform Configuration (Feature Flags & Maintenance)
export {
  getPlatformConfig,
  subscribeToPlatformConfig,
  updateFeatureFlag,
  updateFeatureFlags,
  setMaintenanceMode,
  isFeatureEnabled,
} from './platform/platformConfig';
