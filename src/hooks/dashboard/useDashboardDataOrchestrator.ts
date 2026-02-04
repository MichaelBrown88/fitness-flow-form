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

export function useDashboardData() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [view, setView] = useState<'assessments' | 'clients'>('assessments');
  const [visibleClientsCount, setVisibleClientsCount] = useState(12);

  // Analytics computation
  const { computeAnalytics } = useDashboardAnalytics(profile);

  // Assessment list and pagination
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
    computeAnalytics
  });

  // Client grouping
  const { clientGroups, filteredClients } = useClientList(items, search);

  // Action handlers
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
  } = useDashboardActions(user, profile);

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
    handleDelete,
    handleViewHistory,
    handleNewAssessmentForClient,
    loadMoreAssessments,
  };
}
