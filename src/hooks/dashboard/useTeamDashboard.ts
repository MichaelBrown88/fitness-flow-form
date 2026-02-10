/**
 * Team Dashboard Hook
 *
 * Provides org-wide coach performance data for the admin Team tab.
 * Fetches team metrics on mount and exposes loading/error state.
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getTeamMetrics, type TeamMetrics, type CoachMetrics, type TeamSummary } from '@/services/teamMetrics';
import { logger } from '@/lib/utils/logger';

const EMPTY_SUMMARY: TeamSummary = {
  totalClients: 0,
  totalCoaches: 0,
  assessmentsThisMonth: 0,
  avgScoreChange: 0,
};

export function useTeamDashboard() {
  const { effectiveOrgId } = useAuth();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<TeamSummary>(EMPTY_SUMMARY);
  const [coaches, setCoaches] = useState<CoachMetrics[]>([]);

  const refresh = useCallback(async () => {
    if (!effectiveOrgId) return;
    setLoading(true);
    try {
      const metrics = await getTeamMetrics(effectiveOrgId);
      setSummary(metrics.summary);
      setCoaches(metrics.coaches);
    } catch (err) {
      logger.error('Failed to load team metrics:', err);
    } finally {
      setLoading(false);
    }
  }, [effectiveOrgId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    loading,
    summary,
    coaches,
    refresh,
  };
}
