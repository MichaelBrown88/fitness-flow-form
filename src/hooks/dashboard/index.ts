/**
 * Dashboard Hooks Module
 *
 * Re-exports all dashboard-related hooks.
 */

// Types
export type { Analytics, ClientGroup, RecentChange } from './types';

// Main orchestrator (primary export)
export { useDashboardData } from './useDashboardDataOrchestrator';

// Individual hooks (for advanced usage)
export { useDashboardAnalytics } from './useDashboardAnalytics';
export { useAssessmentList } from './useAssessmentList';
export { useClientList } from './useClientList';
export { useDashboardActions } from './useDashboardActions';
