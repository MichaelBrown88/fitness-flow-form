/**
 * Dashboard Data Hook (re-export wrapper)
 *
 * This file re-exports from the refactored dashboard module
 * for backwards compatibility.
 */

export type { Analytics, ClientGroup } from './dashboard/types';
export { useDashboardData } from './dashboard/useDashboardDataOrchestrator';
