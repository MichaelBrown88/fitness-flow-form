/**
 * Dashboard Data Orchestrator
 *
 * Main hook that combines all dashboard functionality.
 */

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardAnalytics } from './useDashboardAnalytics';
import { useAssessmentList } from './useAssessmentList';
import { useClientList } from './useClientList';
import { useDashboardActions } from './useDashboardActions';
import { useReassessmentQueue } from '@/hooks/useReassessmentQueue';

export function useDashboardData() {
  const { user, profile, loading, effectiveOrgId } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [view, setView] = useState<'assessments' | 'clients' | 'priority'>('assessments');
  const [visibleClientsCount, setVisibleClientsCount] = useState(12);

  // Analytics computation (uses effectiveOrgId for impersonation support)
  const { computeAnalytics } = useDashboardAnalytics(profile, effectiveOrgId);

  // Assessment list and pagination (uses effectiveOrgId for impersonation support)
  const {
    items,
    loadingData,
    analytics,
    visibleAssessmentsCount,
    hasMore,
    loadingMore,
    recentChanges,
    loadMoreAssessments,
  } = useAssessmentList({
    user,
    profile,
    loading,
    computeAnalytics,
    effectiveOrgId,
  });

  // Client grouping
  const { clientGroups, filteredClients } = useClientList(items, search);
  
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
    visibleClientsCount,
    setVisibleClientsCount,
    hasMore,
    loadingMore,
    recentChanges,
    filtered,
    filteredClients,
    clientGroups,
    reassessmentQueue,
    handleDelete,
    handleViewHistory,
    handleNewAssessmentForClient,
    loadMoreAssessments,
  };
}
