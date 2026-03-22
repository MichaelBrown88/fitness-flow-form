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
  const [error, setError] = useState<string | null>(null);
  const [missingOrganization, setMissingOrganization] = useState(false);
  const [summary, setSummary] = useState<TeamSummary>(EMPTY_SUMMARY);
  const [coaches, setCoaches] = useState<CoachMetrics[]>([]);

  const refresh = useCallback(async () => {
    if (!effectiveOrgId) {
      setMissingOrganization(true);
      setError(null);
      setSummary(EMPTY_SUMMARY);
      setCoaches([]);
      setLoading(false);
      return;
    }
    setMissingOrganization(false);
    setLoading(true);
    setError(null);
    try {
      const metrics = await getTeamMetrics(effectiveOrgId);
      setSummary(metrics.summary);
      setCoaches(metrics.coaches);
    } catch (err) {
      logger.error('Failed to load team metrics:', err);
      setSummary(EMPTY_SUMMARY);
      setCoaches([]);
      setError('Team metrics could not be loaded. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [effectiveOrgId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    loading,
    error,
    missingOrganization,
    summary,
    coaches,
    refresh,
  };
}
