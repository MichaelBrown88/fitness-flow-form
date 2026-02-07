// Platform Admin CRUD
export {
  isPlatformAdmin,
  getPlatformAdminByEmail,
  getPlatformAdmin,
  createPlatformAdmin,
  markPasswordSet,
  updateLastLogin,
  seedPlatformAdmin,
} from './platformAdmin';

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
} from './platformMetrics';

// AI Usage Tracking
export {
  calculateAICostsMTD,
  getAICostsByFeature,
  getOrgAICostsByFeature,
  getAICostBreakdown,
} from './aiUsageTracking';

// Platform Configuration (Feature Flags & Maintenance)
export {
  getPlatformConfig,
  subscribeToPlatformConfig,
  updateFeatureFlag,
  updateFeatureFlags,
  setMaintenanceMode,
  isFeatureEnabled,
} from './platformConfig';

// Impersonation (Platform Admin Support Tool)
export {
  startImpersonation,
  endImpersonation,
  getImpersonationSession,
  isImpersonating,
  getImpersonatedOrgId,
  logImpersonationAction,
  type ImpersonationSession,
  type ImpersonationAuditLog,
} from './impersonation';
