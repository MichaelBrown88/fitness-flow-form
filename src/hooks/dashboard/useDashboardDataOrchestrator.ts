/**
 * Dashboard Data Orchestrator
 *
 * Main hook that combines all dashboard functionality.
 * Scope-aware: non-coaching admins see ALL org assessments,
 * coaching admins and coaches see only their own.
 */

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAssessmentList } from './useAssessmentList';
import { useClientList } from './useClientList';
import { useDashboardActions } from './useDashboardActions';
import { useReassessmentQueue, type OrgCadenceDefaults } from '@/hooks/useReassessmentQueue';
import { getOrgCoaches } from '@/services/coachManagement';
import { logger } from '@/lib/utils/logger';
import type { DashboardView } from './types';

export function useDashboardData() {
  const { user, profile, loading, effectiveOrgId, orgSettings } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [view, setView] = useState<DashboardView>('assistant');

  // Derive scope: non-coaching admins see all org data; everyone else sees own
  const isAdmin = profile?.role === 'org_admin';
  const isActiveCoach = profile?.isActiveCoach ?? true; // default true for legacy profiles
  const isSoloCoach = orgSettings?.type === 'solo_coach';
  const showTeamTab = isAdmin && !isSoloCoach;

  // coachUidFilter: null = all org assessments; undefined = use current user (default)
  const coachUidFilter: string | null | undefined = (isAdmin && !isActiveCoach) ? null : undefined;

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
    coachUidFilter,
  });

  // Client grouping (enriched with retestSchedule from client profiles)
  const { clientGroups, filteredClients, refreshSchedules } = useClientList(items, search, effectiveOrgId);
  
  const orgCadenceDefaults = useMemo<OrgCadenceDefaults | undefined>(() => {
    const dc = orgSettings?.defaultCadence;
    if (!dc) return undefined;
    return {
      intervals: dc.intervals,
      activePillars: dc.activePillars,
      lifestyleCadencePreset: orgSettings?.lifestyleCadencePreset,
    };
  }, [orgSettings?.defaultCadence, orgSettings?.lifestyleCadencePreset]);

  const reassessmentQueue = useReassessmentQueue(clientGroups, orgCadenceDefaults);

  // Action handlers (uses effectiveOrgId for read paths, profile.organizationId for writes)
  const {
    deleteDialog,
    setDeleteDialog,
    clientHistoryDialog,
    setClientHistoryDialog,
    clientHistory,
    clientSummaryId,
    loadingHistory,
    deleteSnapshotDialog,
    setDeleteSnapshotDialog,
    handleDelete,
    handleViewHistory,
    handleEditSnapshot,
    handleDeleteSnapshot,
    handleNewAssessmentForClient,
  } = useDashboardActions(user, profile, effectiveOrgId);

  // Filtered assessments
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => item.clientName.toLowerCase().includes(term));
  }, [items, search]);

  const hasSharedReport = useMemo(
    () => clientGroups.some((g) => typeof g.shareToken === 'string' && g.shareToken.trim().length > 0),
    [clientGroups],
  );

  // Coach name map for admin views (uid -> displayName)
  const [coachMap, setCoachMap] = useState<Map<string, string>>(new Map());
  const showCoachColumn = isAdmin && !isActiveCoach;

  useEffect(() => {
    if (!showTeamTab || !effectiveOrgId) return;
    let cancelled = false;
    getOrgCoaches(effectiveOrgId)
      .then(coaches => {
        if (cancelled) return;
        const map = new Map<string, string>();
        for (const c of coaches) map.set(c.uid, c.displayName);
        setCoachMap(map);
      })
      .catch(err => logger.warn('[Dashboard] Failed to load coach names:', err));
    return () => { cancelled = true; };
  }, [showTeamTab, effectiveOrgId]);

  // Onboarding redirect
  useEffect(() => {
    if (!loading && user && profile && profile.onboardingCompleted === false) {
      if (window.location.pathname === '/dashboard' || window.location.pathname.startsWith('/dashboard/')) {
        navigate('/onboarding', { replace: true });
      }
    }
  }, [loading, user, profile, navigate]);

  return {
    user,
    profile,
    orgSettings,
    effectiveOrgId,
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
    clientSummaryId,
    loadingHistory,
    deleteSnapshotDialog,
    setDeleteSnapshotDialog,
    handleEditSnapshot,
    handleDeleteSnapshot,
    analytics,
    visibleAssessmentsCount,
    hasMore,
    loadingMore,
    filtered,
    filteredClients,
    hasSharedReport,
    clientGroups,
    reassessmentQueue,
    refreshSchedules,
    handleDelete,
    handleViewHistory,
    handleNewAssessmentForClient,
    loadMoreAssessments,
    // Scope flags for UI
    isAdmin,
    isActiveCoach,
    showTeamTab,
    showCoachColumn,
    isSoloCoach,
    coachMap,
  };
}
