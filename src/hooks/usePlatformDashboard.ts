/**
 * usePlatformDashboard Hook
 * 
 * Extracted from PlatformDashboard.tsx to separate logic from UI.
 * Handles all state management, data fetching, and handlers for the
 * platform admin dashboard.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { getFirebaseAuth } from '@/services/firebase';
import { 
  getPlatformAdmin, 
  getMetricsHistory,
  getAuditLogs,
  getAIErrorRateMTD,
  listPlatformAdmins,
  removePlatformAdmin,
  updatePlatformAdminPermissions,
  seedPlatformAdmin,
  getLiveMetrics,
  getRevenueByRegion,
  getOrganizations,
  getAICostsByFeature,
  getAICostsByFeatureAllTime,
  getOrgAICostsByFeature,
  getOrgCoachesWithStats,
  subscribeToPlatformConfig,
  updateFeatureFlag,
  setMaintenanceMode,
} from '@/services/platformAdmin';
import type { AIErrorRate } from '@/services/platformAdmin';
import { getPlatformHealth } from '@/services/platform/platformHealth';
import type { PlatformHealth } from '@/services/platform/platformHealth';
import type {
  PlatformAdmin,
  PlatformMetrics,
  OrganizationSummary,
  PlatformConfig,
  PlatformFeatureFlags,
  PlatformPermission,
  PlatformMetricsHistoryEntry,
} from '@/types/platform';
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
  costGbpPence: number;
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
  filteredOrganizations: OrganizationSummary[];
  hasMoreOrganizations: boolean;
  assessmentChartData: ChartDataPoint[];
  revenueByRegion: { byRegion: Record<string, { amountLocal: number; currency: string; gbpPence: number }>; totalGbpPence: number } | null;
  aiCostsByFeature: FeatureCost[];
  aiCostsByFeatureAllTime: FeatureCost[];
  orgAiCostsByFeature: Record<string, FeatureCost[]>;
  orgCoachesWithStats: Record<string, CoachStats[]>;
  unitEconomics: UnitEconomics | null;
  platformAdmins: PlatformAdmin[];
  metricsHistory: PlatformMetricsHistoryEntry[];
  silentOrgs: OrganizationSummary[];
  activationFunnel: { newOrgs: number; activated: number; rate: number };
  aiErrorRate: AIErrorRate;
  platformHealth: PlatformHealth | null;
  auditLogEntries: Array<{ id: string; timestamp: Date; adminUid: string; action: string; target?: string; details?: Record<string, unknown> }>;
  hasMoreAuditLogs: boolean;
  
  // Platform Config (Feature Flags)
  platformConfig: PlatformConfig;
  updatingFeature: keyof PlatformFeatureFlags | null;
  updatingMaintenance: boolean;
  
  // UI State
  expandedOrgId: string | null;
  selectedOrg: OrganizationSummary | null;
  sortField: SortField;
  sortDirection: SortDirection;
  searchQuery: string;
  filterStatus: string;
  filterRegion: string;
  filterIncomplete: boolean;
  filterTest: boolean;
  
  // Setters
  setExpandedOrgId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedOrg: React.Dispatch<React.SetStateAction<OrganizationSummary | null>>;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  setFilterStatus: React.Dispatch<React.SetStateAction<string>>;
  setFilterRegion: React.Dispatch<React.SetStateAction<string>>;
  setFilterIncomplete: React.Dispatch<React.SetStateAction<boolean>>;
  setFilterTest: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Handlers
  handleRefresh: () => Promise<void>;
  handleSignOut: () => Promise<void>;
  handleSort: (field: SortField) => void;
  navigateToOrg: (orgId: string) => void;
  loadMoreOrganizations: () => Promise<void>;
  handleToggleFeature: (featureKey: keyof PlatformFeatureFlags, enabled: boolean) => Promise<void>;
  handleSetMaintenanceMode: (isEnabled: boolean, message?: string, affectedFeatures?: (keyof PlatformFeatureFlags)[]) => Promise<void>;
  handleRemovePlatformAdmin: (uid: string) => Promise<void>;
  handleUpdatePlatformAdminPermissions: (uid: string, permissions: PlatformPermission[]) => Promise<void>;
  handleAddPlatformAdmin: (email: string, displayName: string) => Promise<void>;
  loadMoreAuditLogs: () => Promise<void>;
  
  // Utility functions
  formatCurrency: (amountInSmallestUnit: number, currency?: 'GBP' | 'USD' | 'KWD') => string;
  formatNumber: (num: number) => string;
  formatFeatureName: (feature: string) => string;
  getStatusColor: (status: string, isComped?: boolean) => string;
  getStatusLabel: (status: string, isComped?: boolean) => string;
  getActivityColor: (daysSince: number) => string;
  getDaysSince: (date?: Date) => number;
}

export function usePlatformDashboard(): UsePlatformDashboardResult {
  const navigate = useNavigate();
  const { toast } = useToast();
  
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
  const [revenueByRegion, setRevenueByRegion] = useState<{ byRegion: Record<string, { amountLocal: number; currency: string; gbpPence: number }>; totalGbpPence: number } | null>(null);
  const [aiCostsByFeature, setAiCostsByFeature] = useState<FeatureCost[]>([]);
  const [aiCostsByFeatureAllTime, setAiCostsByFeatureAllTime] = useState<FeatureCost[]>([]);
  const [orgAiCostsByFeature, setOrgAiCostsByFeature] = useState<Record<string, FeatureCost[]>>({});
  const [orgCoachesWithStats, setOrgCoachesWithStats] = useState<Record<string, CoachStats[]>>({});
  const [platformAdmins, setPlatformAdmins] = useState<PlatformAdmin[]>([]);
  const [metricsHistory, setMetricsHistory] = useState<PlatformMetricsHistoryEntry[]>([]);
  const [aiErrorRate, setAiErrorRate] = useState<AIErrorRate>({ total: 0, errors: 0, errorRate: 0 });
  const [platformHealth, setPlatformHealth] = useState<PlatformHealth | null>(null);
  const [auditLogEntries, setAuditLogEntries] = useState<Array<{ id: string; timestamp: Date; adminUid: string; action: string; target?: string; details?: Record<string, unknown> }>>([]);
  const [auditLogCursor, setAuditLogCursor] = useState<QueryDocumentSnapshot<DocumentData> | undefined>(undefined);
  const [hasMoreAuditLogs, setHasMoreAuditLogs] = useState(false);
  
  // UI state
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<OrganizationSummary | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [filterIncomplete, setFilterIncomplete] = useState(false);
  const [filterTest, setFilterTest] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  
  // Platform config (feature flags)
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig>(DEFAULT_PLATFORM_CONFIG);
  const [updatingFeature, setUpdatingFeature] = useState<keyof PlatformFeatureFlags | null>(null);
  const [updatingMaintenance, setUpdatingMaintenance] = useState(false);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      const [metricsData, orgsResponse, featureCosts, featureCostsAllTime, revenueByRegionData] = await Promise.all([
        getLiveMetrics(),
        getOrganizations(50),
        getAICostsByFeature(),
        getAICostsByFeatureAllTime(),
        getRevenueByRegion(),
      ]);
      const orgsData = orgsResponse.organizations;
      setMetrics(metricsData);
      setOrganizations(orgsData);
      setOrganizationsCursor(orgsResponse.lastDoc);
      setHasMoreOrganizations(orgsData.length === 50 && !!orgsResponse.lastDoc);
      setAiCostsByFeature(featureCosts);
      setAiCostsByFeatureAllTime(featureCostsAllTime);
      setRevenueByRegion(revenueByRegionData);
      
      // Load AI costs by feature and coaches with stats for each organization
      const orgCosts: Record<string, FeatureCost[]> = {};
      const coachesStats: Record<string, CoachStats[]> = {};
      
      for (const org of orgsData) {
        try {
          const [costs, coaches] = await Promise.all([
            getOrgAICostsByFeature(org.id).catch((): FeatureCost[] => []),
            (org.dataAccessPermission?.platformAdminAccess === true || org.isComped === true
              ? getOrgCoachesWithStats(org.id).catch((): CoachStats[] => [])
              : Promise.resolve([] as CoachStats[]))
          ]);
          orgCosts[org.id] = costs;
          coachesStats[org.id] = coaches;
        } catch (e) {
          logger.warn(`Failed to load data for org ${org.id}:`, e);
        }
      }
      setOrgAiCostsByFeature(orgCosts);
      setOrgCoachesWithStats(coachesStats);

      const [admins, history, errorRate, auditResult, health] = await Promise.all([
        listPlatformAdmins(),
        getMetricsHistory(31),
        getAIErrorRateMTD(),
        getAuditLogs(50),
        getPlatformHealth().catch((): PlatformHealth => ({ aiConfig: null, dependencies: null })),
      ]);
      setPlatformAdmins(admins);
      setMetricsHistory(history);
      setAiErrorRate(errorRate);
      setAuditLogEntries(auditResult.entries);
      setAuditLogCursor(auditResult.lastDoc);
      setHasMoreAuditLogs(auditResult.hasMore);
      setPlatformHealth(health);

      // Compute assessment chart data from history deltas (no callable needed)
      const chartData: ChartDataPoint[] = [];
      const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
      for (let i = 1; i < sorted.length; i++) {
        const today = sorted[i];
        const yesterday = sorted[i - 1];
        chartData.push({
          date: today.date,
          assessments: Math.max(0, (today.totalAssessments ?? 0) - (yesterday.totalAssessments ?? 0)),
        });
      }
      setAssessmentChartData(chartData);
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

  const loadMoreAuditLogs = useCallback(async () => {
    if (!auditLogCursor) return;
    try {
      const result = await getAuditLogs(50, auditLogCursor);
      setAuditLogEntries((prev) => [...prev, ...result.entries]);
      setAuditLogCursor(result.lastDoc);
      setHasMoreAuditLogs(result.hasMore);
    } catch (error) {
      logger.error('Failed to load more audit logs:', error);
    }
  }, [auditLogCursor]);

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

  // Subscribe to platform config changes (real-time) — only when admin is confirmed (auth ready)
  useEffect(() => {
    if (!admin) return;
    const unsubscribe = subscribeToPlatformConfig((config) => {
      setPlatformConfig(config);
    });
    return () => unsubscribe();
  }, [admin]);

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

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setDebouncedSearchQuery(searchQuery), 250);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchQuery]);

  const filteredOrganizations = useMemo(() => {
    let filtered = sortedOrganizations;
    const q = debouncedSearchQuery.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((org) =>
        org.name.toLowerCase().includes(q) || org.id.toLowerCase().includes(q)
      );
    }
    if (filterStatus) {
      if (filterStatus === 'comped') {
        filtered = filtered.filter((org) => org.isComped === true);
      } else {
        filtered = filtered.filter((org) => org.status === filterStatus);
      }
    }
    if (filterRegion) {
      filtered = filtered.filter((org) => org.region === filterRegion);
    }
    if (filterIncomplete) {
      filtered = filtered.filter((org) => {
        const o = org as { onboardingCompletedAt?: Date; name?: string };
        return !o.onboardingCompletedAt || !o.name || o.name === 'Unnamed Organization';
      });
    }
    if (filterTest) {
      filtered = filtered.filter((org) => (org as { isTest?: boolean }).isTest === true);
    }
    return filtered;
  }, [sortedOrganizations, debouncedSearchQuery, filterStatus, filterRegion, filterIncomplete, filterTest]);

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
      toast({ title: enabled ? 'Feature enabled' : 'Feature disabled', description: `Updated ${featureKey}` });
    } catch (error) {
      logger.error(`Failed to toggle feature ${featureKey}:`, error);
      toast({ title: 'Failed to update feature', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setUpdatingFeature(null);
    }
  }, [admin, toast]);

  const handleSetMaintenanceMode = useCallback(async (
    isEnabled: boolean,
    message?: string,
    affectedFeatures?: (keyof PlatformFeatureFlags)[]
  ) => {
    if (!admin) return;

    setUpdatingMaintenance(true);
    try {
      await setMaintenanceMode(isEnabled, admin.uid, message, affectedFeatures);
      toast({ title: isEnabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled' });
    } catch (error) {
      logger.error('Failed to set maintenance mode:', error);
      toast({ title: 'Failed to update maintenance mode', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
      throw error;
    } finally {
      setUpdatingMaintenance(false);
    }
  }, [admin, toast]);

  const loadPlatformAdmins = useCallback(async () => {
    try {
      const admins = await listPlatformAdmins();
      setPlatformAdmins(admins);
    } catch (error) {
      logger.error('Failed to load platform admins:', error);
    }
  }, []);

  const handleRemovePlatformAdmin = useCallback(async (uid: string) => {
    if (!admin) return;
    if (uid === admin.uid) {
      toast({ title: 'Cannot remove yourself', variant: 'destructive' });
      return;
    }
    try {
      await removePlatformAdmin(uid);
      setPlatformAdmins((prev) => prev.filter((a) => a.uid !== uid));
      toast({ title: 'Platform admin removed' });
    } catch (error) {
      logger.error('Failed to remove platform admin:', error);
      toast({ title: 'Failed to remove admin', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    }
  }, [admin, toast]);

  const handleUpdatePlatformAdminPermissions = useCallback(async (uid: string, permissions: PlatformPermission[]) => {
    if (!admin) return;
    try {
      await updatePlatformAdminPermissions(uid, permissions);
      setPlatformAdmins((prev) =>
        prev.map((a) => (a.uid === uid ? { ...a, permissions } : a))
      );
      toast({ title: 'Permissions updated' });
    } catch (error) {
      logger.error('Failed to update platform admin permissions:', error);
      toast({ title: 'Failed to update permissions', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    }
  }, [admin, toast]);

  const handleAddPlatformAdmin = useCallback(async (email: string, displayName: string) => {
    if (!admin) return;
    try {
      await seedPlatformAdmin(email, displayName);
      await loadPlatformAdmins();
      toast({ title: 'Admin added', description: `Invitation sent to ${email}` });
    } catch (error) {
      logger.error('Failed to add platform admin:', error);
      toast({ title: 'Failed to add admin', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    }
  }, [admin, toast, loadPlatformAdmins]);

  // Utility: format amount in smallest unit (pence/cents/fils) to display string
  const formatCurrency = useCallback((amountInSmallestUnit: number, currency: 'GBP' | 'USD' | 'KWD' = 'GBP') => {
    const n = Number(amountInSmallestUnit);
    if (Number.isNaN(n)) return '—';
    if (currency === 'GBP') {
      const showPence = Math.abs(n) < 100 || n % 100 !== 0;
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: showPence ? 2 : 0,
        maximumFractionDigits: 2,
      }).format(n / 100);
    }
    if (currency === 'USD') {
      const showCents = Math.abs(n) < 100 || n % 100 !== 0;
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: showCents ? 2 : 0,
        maximumFractionDigits: 2,
      }).format(n / 100);
    }
    const kwd = n / 1000;
    return new Intl.NumberFormat('en-KW', { style: 'currency', currency: 'KWD', minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(kwd);
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

  // Churn risk signal — active orgs with no activity for 14+ days
  const silentOrgs = useMemo<OrganizationSummary[]>(() => {
    return organizations.filter((org) => {
      if (org.status !== 'active' && org.isComped !== true) return false;
      return getDaysSince(org.lastActiveDate) > 14;
    });
  }, [organizations, getDaysSince]);

  // Activation funnel — new orgs this month, how many ran at least one assessment
  const activationFunnel = useMemo<{ newOrgs: number; activated: number; rate: number }>(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newOrgs = organizations.filter((org) => org.createdAt >= startOfMonth);
    const activated = newOrgs.filter((org) => org.assessmentCount > 0).length;
    const rate = newOrgs.length > 0 ? Math.round((activated / newOrgs.length) * 100) : 0;
    return { newOrgs: newOrgs.length, activated, rate };
  }, [organizations]);

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
    filteredOrganizations,
    hasMoreOrganizations,
    assessmentChartData,
    revenueByRegion,
    aiCostsByFeature,
    aiCostsByFeatureAllTime,
    orgAiCostsByFeature,
    orgCoachesWithStats,
    unitEconomics,
    platformAdmins,
    metricsHistory,
    silentOrgs,
    activationFunnel,
    aiErrorRate,
    platformHealth,
    auditLogEntries,
    hasMoreAuditLogs,
    
    // Platform Config (Feature Flags)
    platformConfig,
    updatingFeature,
    updatingMaintenance,
    
    // UI State
    expandedOrgId,
    selectedOrg,
    sortField,
    sortDirection,
    searchQuery,
    filterStatus,
    filterRegion,
    
    // Setters
    setExpandedOrgId,
    setSelectedOrg,
    setSearchQuery,
    setFilterStatus,
    setFilterRegion,
    filterIncomplete,
    filterTest,
    setFilterIncomplete,
    setFilterTest,

    // Handlers
    handleRefresh,
    handleSignOut,
    handleSort,
    navigateToOrg,
    loadMoreOrganizations,
    handleToggleFeature,
    handleSetMaintenanceMode,
    handleRemovePlatformAdmin,
    handleUpdatePlatformAdminPermissions,
    handleAddPlatformAdmin,
    loadMoreAuditLogs,
    
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
