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
} from './platform/platformAdmin';

// Platform Metrics & Organization Management
export {
  getLiveMetrics,
  getDefaultMetrics,
  getAssessmentChartData,
  getOrgCoachesWithStats,
  getOrganizations,
  getOrganizationDetails,
  updateOrganizationDetails,
  deleteOrganization,
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
  getOrgAICostsByFeature,
  getAICostBreakdown,
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
