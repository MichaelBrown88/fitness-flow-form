/**
 * Dashboard Data Orchestrator
 *
 * Main hook that combines all dashboard functionality.
 */

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAssessmentList } from './useAssessmentList';
import { useClientList } from './useClientList';
import { useDashboardActions } from './useDashboardActions';
import { useReassessmentQueue } from '@/hooks/useReassessmentQueue';
import type { DashboardView } from './types';

export function useDashboardData() {
  const { user, profile, loading, effectiveOrgId } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [view, setView] = useState<DashboardView>('clients');

  // Assessment list and pagination (uses effectiveOrgId for impersonation support)
  const {
    items,
    loadingData,
    analytics,
    visibleAssessmentsCount,
    hasMore,
    loadingMore,
    loadMoreAssessments,
  } = useAssessmentList({
    user,
    profile,
    loading,
    effectiveOrgId,
  });

  // Client grouping (enriched with retestSchedule from client profiles)
  const { clientGroups, filteredClients, refreshSchedules } = useClientList(items, search, effectiveOrgId);
  
  // Reassessment queue (priority view)
  const reassessmentQueue = useReassessmentQueue(clientGroups);

  // Action handlers (uses effectiveOrgId for read paths, profile.organizationId for writes)
  const {
    deleteDialog,
    setDeleteDialog,
    clientHistoryDialog,
    setClientHistoryDialog,
    clientHistory,
    loadingHistory,
    handleDelete,
    handleViewHistory,
    handleNewAssessmentForClient,
  } = useDashboardActions(user, profile, effectiveOrgId);

  // Filtered assessments
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => item.clientName.toLowerCase().includes(term));
  }, [items, search]);

  // Onboarding redirect
  useEffect(() => {
    if (!loading && user && profile && profile.onboardingCompleted === false) {
      if (window.location.pathname === '/dashboard') {
        navigate('/onboarding', { replace: true });
      }
    }
  }, [loading, user, profile, navigate]);

  return {
    user,
    profile,
    loading,
    loadingData,
    items,
    search,
    setSearch,
    view,
    setView,
    deleteDialog,
    setDeleteDialog,
    clientHistoryDialog,
    setClientHistoryDialog,
    clientHistory,
    loadingHistory,
    analytics,
    visibleAssessmentsCount,
    hasMore,
    loadingMore,
    filtered,
    filteredClients,
    clientGroups,
    reassessmentQueue,
    refreshSchedules,
    handleDelete,
    handleViewHistory,
    handleNewAssessmentForClient,
    loadMoreAssessments,
  };
}
