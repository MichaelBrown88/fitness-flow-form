/**
 * Dashboard Hooks Module
 *
 * Re-exports all dashboard-related hooks.
 */

// Types
export type { Analytics, ClientGroup, DashboardView } from './types';

// Main orchestrator (primary export)
export { useDashboardData } from './useDashboardDataOrchestrator';

// Individual hooks (for advanced usage)
export { useAssessmentList } from './useAssessmentList';
export { useClientList } from './useClientList';
export { useDashboardActions } from './useDashboardActions';
