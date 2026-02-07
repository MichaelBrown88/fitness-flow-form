/**
 * usePlatformDashboard Hook
 * 
 * Extracted from PlatformDashboard.tsx to separate logic from UI.
 * Handles all state management, data fetching, and handlers for the
 * platform admin dashboard.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { getFirebaseAuth } from '@/services/firebase';
import { 
  getPlatformAdmin, 
  getLiveMetrics, 
  getOrganizations,
  getAssessmentChartData,
  getAICostsByFeature,
  getOrgAICostsByFeature,
  getOrgCoachesWithStats,
  subscribeToPlatformConfig,
  updateFeatureFlag,
} from '@/services/platformAdmin';
import type { PlatformAdmin, PlatformMetrics, OrganizationSummary, PlatformConfig, PlatformFeatureFlags } from '@/types/platform';
import { DEFAULT_PLATFORM_CONFIG } from '@/types/platform';
import { logger } from '@/lib/utils/logger';

// Types
export type SortField = 'name' | 'assessments' | 'aiCost' | 'lastActive';
export type SortDirection = 'asc' | 'desc';

export interface ChartDataPoint {
  date: string;
  assessments: number;
}

export interface FeatureCost {
  feature: string;
  count: number;
  costFils: number;
}

export interface CoachStats {
  uid: string;
  displayName: string;
  email?: string;
  role: string;
  assessmentCount: number;
  clientCount: number;
}

export interface UnitEconomics {
  avgCostPerAssessment: number;
  assessmentsPerCoach: number;
  activeRatio: number;
}

export interface UsePlatformDashboardResult {
  // Auth
  admin: PlatformAdmin | null;
  
  // Loading states
  loading: boolean;
  refreshing: boolean;
  
  // Data
  metrics: PlatformMetrics | null;
  organizations: OrganizationSummary[];
  sortedOrganizations: OrganizationSummary[];
  hasMoreOrganizations: boolean;
  assessmentChartData: ChartDataPoint[];
  aiCostsByFeature: FeatureCost[];
  orgAiCostsByFeature: Record<string, FeatureCost[]>;
  orgCoachesWithStats: Record<string, CoachStats[]>;
  unitEconomics: UnitEconomics | null;
  
  // Platform Config (Feature Flags)
  platformConfig: PlatformConfig;
  updatingFeature: keyof PlatformFeatureFlags | null;
  
  // UI State
  expandedOrgId: string | null;
  selectedOrg: OrganizationSummary | null;
  sortField: SortField;
  sortDirection: SortDirection;
  
  // Setters
  setExpandedOrgId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedOrg: React.Dispatch<React.SetStateAction<OrganizationSummary | null>>;
  
  // Handlers
  handleRefresh: () => Promise<void>;
  handleSignOut: () => Promise<void>;
  handleSort: (field: SortField) => void;
  navigateToOrg: (orgId: string) => void;
  loadMoreOrganizations: () => Promise<void>;
  handleToggleFeature: (featureKey: keyof PlatformFeatureFlags, enabled: boolean) => Promise<void>;
  
  // Utility functions
  formatCurrency: (fils: number) => string;
  formatNumber: (num: number) => string;
  formatFeatureName: (feature: string) => string;
  getStatusColor: (status: string, isComped?: boolean) => string;
  getStatusLabel: (status: string, isComped?: boolean) => string;
  getActivityColor: (daysSince: number) => string;
  getDaysSince: (date?: Date) => number;
}

export function usePlatformDashboard(): UsePlatformDashboardResult {
  const navigate = useNavigate();
  
  // Auth state
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data state
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [organizationsCursor, setOrganizationsCursor] = useState<QueryDocumentSnapshot<DocumentData> | undefined>(undefined);
  const [hasMoreOrganizations, setHasMoreOrganizations] = useState(false);
  const [assessmentChartData, setAssessmentChartData] = useState<ChartDataPoint[]>([]);
  const [aiCostsByFeature, setAiCostsByFeature] = useState<FeatureCost[]>([]);
  const [orgAiCostsByFeature, setOrgAiCostsByFeature] = useState<Record<string, FeatureCost[]>>({});
  const [orgCoachesWithStats, setOrgCoachesWithStats] = useState<Record<string, CoachStats[]>>({});
  
  // UI state
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<OrganizationSummary | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Platform config (feature flags)
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig>(DEFAULT_PLATFORM_CONFIG);
  const [updatingFeature, setUpdatingFeature] = useState<keyof PlatformFeatureFlags | null>(null);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      const [metricsData, orgsResponse, chartData, featureCosts] = await Promise.all([
        getLiveMetrics(),
        getOrganizations(50),
        getAssessmentChartData(),
        getAICostsByFeature()
      ]);
      const orgsData = orgsResponse.organizations;
      setMetrics(metricsData);
      setOrganizations(orgsData);
      setOrganizationsCursor(orgsResponse.lastDoc);
      setHasMoreOrganizations(orgsData.length === 50 && !!orgsResponse.lastDoc);
      setAssessmentChartData(chartData);
      setAiCostsByFeature(featureCosts);
      
      // Load AI costs by feature and coaches with stats for each organization
      const orgCosts: Record<string, FeatureCost[]> = {};
      const coachesStats: Record<string, CoachStats[]> = {};
      
      for (const org of orgsData) {
        try {
          const [costs, coaches] = await Promise.all([
            getOrgAICostsByFeature(org.id).catch(() => []),
            (org.dataAccessPermission?.platformAdminAccess === true || org.isComped === true
              ? getOrgCoachesWithStats(org.id).catch(() => [])
              : Promise.resolve([]))
          ]);
          orgCosts[org.id] = costs;
          coachesStats[org.id] = coaches;
        } catch (e) {
          logger.warn(`Failed to load data for org ${org.id}:`, e);
        }
      }
      setOrgAiCostsByFeature(orgCosts);
      setOrgCoachesWithStats(coachesStats);
    } catch (error) {
      logger.error('Failed to load dashboard data:', error);
    }
  }, []);

  const loadMoreOrganizations = useCallback(async () => {
    if (!organizationsCursor) return;
    try {
      const orgsResponse = await getOrganizations(50, organizationsCursor);
      if (orgsResponse.organizations.length === 0) {
        setHasMoreOrganizations(false);
        return;
      }
      setOrganizations(prev => [...prev, ...orgsResponse.organizations]);
      setOrganizationsCursor(orgsResponse.lastDoc);
      setHasMoreOrganizations(orgsResponse.organizations.length === 50 && !!orgsResponse.lastDoc);
    } catch (error) {
      logger.error('Failed to load more organizations:', error);
    }
  }, [organizationsCursor]);

  // Auth and initial load
  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/admin/login', { replace: true });
        return;
      }

      const adminData = await getPlatformAdmin(user.uid);
      if (!adminData) {
        logger.warn('User is not a platform admin:', user.email);
        await signOut(auth);
        navigate('/admin/login', { replace: true });
        return;
      }

      setAdmin(adminData);
      await loadDashboardData();
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate, loadDashboardData]);

  // Subscribe to platform config changes (real-time)
  useEffect(() => {
    const unsubscribe = subscribeToPlatformConfig((config) => {
      setPlatformConfig(config);
    });

    return () => unsubscribe();
  }, []);

  // Calculate unit economics
  const unitEconomics = useMemo<UnitEconomics | null>(() => {
    if (!metrics) return null;

    const avgCostPerAssessment = metrics.totalAssessments > 0
      ? metrics.aiCostsMtdCents / metrics.totalAssessments
      : 0;

    const assessmentsPerCoach = metrics.totalCoaches > 0
      ? metrics.totalAssessments / metrics.totalCoaches
      : 0;

    const activeRatio = metrics.totalCoaches > 0
      ? (metrics.totalOrganizations / metrics.totalCoaches) * 100
      : 0;

    return {
      avgCostPerAssessment,
      assessmentsPerCoach,
      activeRatio,
    };
  }, [metrics]);

  // Sorted organizations
  const sortedOrganizations = useMemo(() => {
    const sorted = [...organizations].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'assessments':
          aVal = a.assessmentCount;
          bVal = b.assessmentCount;
          break;
        case 'aiCost':
          aVal = a.aiCostsMtdCents;
          bVal = b.aiCostsMtdCents;
          break;
        case 'lastActive':
          aVal = a.lastActiveDate?.getTime() || 0;
          bVal = b.lastActiveDate?.getTime() || 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [organizations, sortField, sortDirection]);

  // Handlers
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  const handleSignOut = useCallback(async () => {
    const auth = getFirebaseAuth();
    await signOut(auth);
    navigate('/admin/login', { replace: true });
  }, [navigate]);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  const navigateToOrg = useCallback((orgId: string) => {
    navigate(`/admin/organizations/${orgId}`);
  }, [navigate]);

  // Handle toggling feature flags
  const handleToggleFeature = useCallback(async (
    featureKey: keyof PlatformFeatureFlags,
    enabled: boolean
  ) => {
    if (!admin) return;
    
    setUpdatingFeature(featureKey);
    try {
      await updateFeatureFlag(featureKey, enabled, admin.uid);
      // Config will update via real-time subscription
    } catch (error) {
      logger.error(`Failed to toggle feature ${featureKey}:`, error);
    } finally {
      setUpdatingFeature(null);
    }
  }, [admin]);

  // Utility functions
  const formatCurrency = useCallback((fils: number) => {
    const kwd = fils / 1000;
    return new Intl.NumberFormat('en-KW', {
      style: 'currency',
      currency: 'KWD',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(kwd);
  }, []);

  const formatNumber = useCallback((num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  }, []);

  const formatFeatureName = useCallback((feature: string) => {
    return feature
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }, []);

  const getStatusColor = useCallback((status: string, isComped?: boolean) => {
    if (isComped) return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
    switch (status) {
      case 'active': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'trial': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'past_due': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  }, []);

  const getStatusLabel = useCallback((status: string, isComped?: boolean) => {
    if (isComped) return 'Comped';
    return status;
  }, []);

  const getActivityColor = useCallback((daysSince: number) => {
    if (daysSince < 2) return 'text-emerald-400';
    if (daysSince < 7) return 'text-amber-400';
    if (daysSince < 30) return 'text-orange-400';
    return 'text-red-400';
  }, []);

  const getDaysSince = useCallback((date?: Date) => {
    if (!date) return 999;
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }, []);

  return {
    // Auth
    admin,
    
    // Loading states
    loading,
    refreshing,
    
    // Data
    metrics,
    organizations,
    sortedOrganizations,
    hasMoreOrganizations,
    assessmentChartData,
    aiCostsByFeature,
    orgAiCostsByFeature,
    orgCoachesWithStats,
    unitEconomics,
    
    // Platform Config (Feature Flags)
    platformConfig,
    updatingFeature,
    
    // UI State
    expandedOrgId,
    selectedOrg,
    sortField,
    sortDirection,
    
    // Setters
    setExpandedOrgId,
    setSelectedOrg,
    
    // Handlers
    handleRefresh,
    handleSignOut,
    handleSort,
    navigateToOrg,
    loadMoreOrganizations,
    handleToggleFeature,
    
    // Utility functions
    formatCurrency,
    formatNumber,
    formatFeatureName,
    getStatusColor,
    getStatusLabel,
    getActivityColor,
    getDaysSince,
  };
}
