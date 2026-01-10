/**
 * Platform Dashboard
 * 
 * Business metrics and organization overview for platform administrators.
 * Uses aggregated system_stats for efficient single-document reads.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirebaseAuth } from '@/services/firebase';
import { 
  getPlatformAdmin, 
  getLiveMetrics, 
  getOrganizations,
  getAssessmentChartData,
  getAICostsByFeature,
  getOrgAICostsByFeature,
  getOrgCoachesWithStats,
} from '@/services/platformAdmin';
import { formatMonthlyFee } from '@/lib/pricing';
import type { PlatformAdmin, PlatformMetrics, OrganizationSummary } from '@/types/platform';
import { 
  Shield, 
  LogOut, 
  Building2, 
  Users, 
  DollarSign, 
  Cpu,
  TrendingUp,
  TrendingDown,
  Clock,
  Activity,
  ChevronRight,
  RefreshCw,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { logger } from '@/lib/utils/logger';

type SortField = 'name' | 'assessments' | 'aiCost' | 'lastActive';
type SortDirection = 'asc' | 'desc';

const PlatformDashboard = () => {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null);
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<OrganizationSummary | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [assessmentChartData, setAssessmentChartData] = useState<Array<{ date: string; assessments: number }>>([]);
  const [aiCostsByFeature, setAiCostsByFeature] = useState<Array<{ feature: string; count: number; costFils: number }>>([]);
  const [orgAiCostsByFeature, setOrgAiCostsByFeature] = useState<Record<string, Array<{ feature: string; count: number; costFils: number }>>>({});
  const [orgCoachesWithStats, setOrgCoachesWithStats] = useState<Record<string, Array<{ uid: string; displayName: string; email?: string; role: string; assessmentCount: number; clientCount: number }>>>({});

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/admin/login', { replace: true });
        return;
      }

      // Verify this user is a platform admin
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
  }, [navigate]);

  const loadDashboardData = async () => {
    try {
      const [metricsData, orgsData, chartData, featureCosts] = await Promise.all([
        getLiveMetrics(),
        getOrganizations(50),
        getAssessmentChartData(),
        getAICostsByFeature()
      ]);
      setMetrics(metricsData);
      setOrganizations(orgsData);
      setAssessmentChartData(chartData);
      setAiCostsByFeature(featureCosts);
      
      // Load AI costs by feature and coaches with stats for each organization
      // GDPR/HIPAA: Only load detailed data if permission granted
      const orgCosts: Record<string, Array<{ feature: string; count: number; costFils: number }>> = {};
      const coachesStats: Record<string, Array<{ uid: string; displayName: string; email?: string; role: string; assessmentCount: number; clientCount: number }>> = {};
      for (const org of orgsData) {
        try {
          const [costs, coaches] = await Promise.all([
            getOrgAICostsByFeature(org.id).catch(() => []), // AI costs don't require permission (aggregated)
            // Only fetch coach stats if data access permission granted OR org is comped
            (org.dataAccessPermission?.platformAdminAccess === true || 
             org.isComped === true
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
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleSignOut = async () => {
    const auth = getFirebaseAuth();
    await signOut(auth);
    navigate('/admin/login', { replace: true });
  };

  const formatCurrency = (fils: number) => {
    // Kuwait uses fils (1 KWD = 1000 fils)
    // Input is in fils, convert to KWD and show 3 decimal places to display fils
    const kwd = fils / 1000;
    return new Intl.NumberFormat('en-KW', {
      style: 'currency',
      currency: 'KWD',
      minimumFractionDigits: 3, // Show 3 decimal places (fils precision)
      maximumFractionDigits: 3,
    }).format(kwd);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getStatusColor = (status: string, isComped?: boolean) => {
    if (isComped) return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
    switch (status) {
      case 'active': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'trial': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'past_due': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getStatusLabel = (status: string, isComped?: boolean) => {
    if (isComped) return 'Comped';
    return status;
  };

  const getActivityColor = (daysSince: number) => {
    if (daysSince < 2) return 'text-emerald-400';
    if (daysSince < 7) return 'text-amber-400';
    if (daysSince < 30) return 'text-orange-400';
    return 'text-red-400';
  };

  const getDaysSince = (date?: Date) => {
    if (!date) return 999;
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  // Calculate unit economics
  const unitEconomics = useMemo(() => {
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

  // Format feature names for display
  const formatFeatureName = (feature: string) => {
    return feature
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-white font-semibold">Platform Dashboard</h1>
              <p className="text-xs text-slate-500">{admin?.email}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-slate-400 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-slate-400 hover:text-white"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Primary KPI Cards with Unit Economics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* MRR with Growth Indicator */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                MRR
              </span>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(metrics?.mrrCents || 0)}</p>
            <p className="text-xs text-slate-500 mt-1">
              ARR: {formatCurrency(metrics?.arrCents || 0)}
            </p>
          </div>

          {/* Active Users with Ratio */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{formatNumber(metrics?.totalOrganizations || 0)}</p>
            <p className="text-xs text-slate-500 mt-1">
              {metrics?.activeOrganizations || 0} active · {metrics?.trialOrganizations || 0} trial
            </p>
          </div>

          {/* AI Efficiency */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600/20 flex items-center justify-center">
                <Cpu className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-xs text-slate-500">Efficiency</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {unitEconomics ? formatCurrency(unitEconomics.avgCostPerAssessment) : 'N/A'}
            </p>
            <p className="text-xs text-slate-500 mt-1">Avg cost per assessment</p>
          </div>

          {/* Stickiness - Assessments per Coach */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-violet-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">
              {formatNumber(metrics?.totalAssessments || 0)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Total assessments</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Assessments Over Time */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Assessments Generated (Last 30 Days)
            </h3>
            {assessmentChartData.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-slate-500 text-sm">
                No assessment data for the last 30 days
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={assessmentChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(value) => {
                      // Format YYYY-MM-DD to MM/DD
                      const parts = value.split('-');
                      return `${parts[1]}/${parts[2]}`;
                    }}
                  />
                  <YAxis 
                    stroke="#64748b"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="assessments" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    dot={{ fill: '#8b5cf6', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Organization Stats */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              Platform Overview
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                <span className="text-slate-400 text-sm">Total Users</span>
                <span className="text-white font-semibold">{formatNumber(metrics?.totalUsers || 0)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                <span className="text-slate-400 text-sm">Coaches</span>
                <span className="text-white font-semibold">{formatNumber(metrics?.totalCoaches || 0)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                <span className="text-slate-400 text-sm">Clients</span>
                <span className="text-white font-semibold">{formatNumber(metrics?.totalClients || 0)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                <span className="text-slate-400 text-sm">Total Assessments</span>
                <span className="text-white font-semibold">{formatNumber(metrics?.totalAssessments || 0)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                <span className="text-slate-400 text-sm">This Month</span>
                <span className="text-white font-semibold">{formatNumber(metrics?.assessmentsThisMonth || 0)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border-t border-slate-700">
                <span className="text-slate-400 text-sm">AI Costs (MTD)</span>
                <span className="text-amber-400 font-semibold">{formatCurrency(metrics?.aiCostsMtdCents || 0)}</span>
              </div>
            </div>
            
            {/* AI Costs by Feature */}
            {aiCostsByFeature.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <h4 className="text-xs font-medium text-slate-400 mb-2">AI Costs by Feature (MTD)</h4>
                <div className="space-y-1.5">
                  {aiCostsByFeature.slice(0, 5).map((item) => (
                    <div key={item.feature} className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">{formatFeatureName(item.feature)}</span>
                      <span className="text-amber-400">{formatCurrency(item.costFils)}</span>
                    </div>
                  ))}
                  {aiCostsByFeature.length > 5 && (
                    <div className="text-xs text-slate-600 pt-1">
                      +{aiCostsByFeature.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Organizations Table */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-white font-semibold">Organizations</h2>
            <span className="text-xs text-slate-500">{organizations.length} total</span>
          </div>
          
          {organizations.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Building2 className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500">No organizations yet</p>
              <p className="text-xs text-slate-600 mt-1">Organizations will appear here as they sign up</p>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="px-5 py-3 border-b border-slate-800 grid grid-cols-12 gap-4 text-xs text-slate-500 font-medium">
                <button 
                  onClick={() => handleSort('name')}
                  className="col-span-3 text-left hover:text-slate-400 flex items-center gap-1"
                >
                  Organization
                  {sortField === 'name' && (sortDirection === 'asc' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />)}
                </button>
                <div className="col-span-2">Plan</div>
                <div className="col-span-1">Monthly Fee</div>
                <div className="col-span-1">Coaches</div>
                <div className="col-span-1">Clients</div>
                <button 
                  onClick={() => handleSort('assessments')}
                  className="col-span-1 text-left hover:text-slate-400 flex items-center gap-1"
                >
                  Assessments
                  {sortField === 'assessments' && (sortDirection === 'asc' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />)}
                </button>
                <button 
                  onClick={() => handleSort('aiCost')}
                  className="col-span-1 text-left hover:text-slate-400 flex items-center gap-1"
                >
                  AI Cost
                  {sortField === 'aiCost' && (sortDirection === 'asc' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />)}
                </button>
                <button 
                  onClick={() => handleSort('lastActive')}
                  className="col-span-1 text-left hover:text-slate-400 flex items-center gap-1"
                >
                  Last Active
                  {sortField === 'lastActive' && (sortDirection === 'asc' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />)}
                </button>
                <div className="col-span-1">Status</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>

              <div className="divide-y divide-slate-800">
                {sortedOrganizations.map((org) => {
                  const daysSince = getDaysSince(org.lastActiveDate);
                  return (
                    <div key={org.id} className="px-5 py-4 hover:bg-slate-800/30 transition-colors">
                      <div className="grid grid-cols-12 gap-4 items-center">
                        {/* Organization Name */}
                        <div className="col-span-3 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-slate-500" />
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">{org.name}</p>
                            <p className="text-xs text-slate-500 capitalize">{org.type.replace('_', ' ')}</p>
                          </div>
                        </div>

                        {/* Plan */}
                        <div className="col-span-2">
                          <span className="text-xs text-slate-400">{org.plan || 'free'}</span>
                        </div>

                        {/* Coaches */}
                        <div className="col-span-1">
                          <span className="text-sm text-white">{org.coachCount}</span>
                        </div>

                        {/* Clients */}
                        <div className="col-span-1">
                          <span className="text-sm text-white">{org.clientCount}</span>
                        </div>

                        {/* Assessments */}
                        <div className="col-span-1">
                          <span className="text-sm text-white">{org.assessmentCount}</span>
                        </div>

                        {/* AI Cost */}
                        <div className="col-span-1">
                          <span className="text-sm text-amber-400">{formatCurrency(org.aiCostsMtdCents)}</span>
                        </div>

                        {/* Last Active */}
                        <div className="col-span-1">
                          {org.lastActiveDate ? (
                            <span className={`text-xs ${getActivityColor(daysSince)}`}>
                              {daysSince === 0 ? 'Today' : daysSince === 1 ? 'Yesterday' : `${daysSince}d ago`}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-600">Never</span>
                          )}
                        </div>

                        {/* Status */}
                        <div className="col-span-1">
                          <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(org.status, org.isComped)}`}>
                            {getStatusLabel(org.status, org.isComped)}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="col-span-1 flex items-center justify-end gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                                onClick={() => setSelectedOrg(org)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl">
                              <DialogHeader>
                                <DialogTitle className="text-white">{org.name} - Details</DialogTitle>
                              </DialogHeader>
                              {selectedOrg && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-xs text-slate-500 mb-1">Organization ID</p>
                                      <p className="text-sm text-slate-300 font-mono">{selectedOrg.id}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-500 mb-1">Type</p>
                                      <p className="text-sm text-slate-300 capitalize">{selectedOrg.type.replace('_', ' ')}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-500 mb-1">Plan</p>
                                      <p className="text-sm text-slate-300 capitalize">{selectedOrg.plan}</p>
                                      {selectedOrg.clientSeats && selectedOrg.clientSeats > 0 && (
                                        <p className="text-xs text-slate-500 mt-1">{selectedOrg.clientSeats} client seats</p>
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-500 mb-1">Monthly Fee</p>
                                      <p className="text-sm text-slate-300">
                                        {selectedOrg.isComped ? (
                                          <span className="text-violet-400 font-medium">Comped (Free)</span>
                                        ) : (
                                          selectedOrg.monthlyFeeKwd !== undefined ? formatMonthlyFee(selectedOrg.monthlyFeeKwd) : '—'
                                        )}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-500 mb-1">Status</p>
                                      <p className="text-sm text-slate-300 capitalize">{selectedOrg.status}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-500 mb-1">Created</p>
                                      <p className="text-sm text-slate-300">{selectedOrg.createdAt.toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-500 mb-1">Trial Ends</p>
                                      <p className="text-sm text-slate-300">{selectedOrg.trialEndsAt?.toLocaleDateString() || 'N/A'}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-500 mb-1">Coaches</p>
                                      <p className="text-sm text-slate-300">{selectedOrg.coachCount}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-500 mb-1">Clients</p>
                                      <p className="text-sm text-slate-300">{selectedOrg.clientCount}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-500 mb-1">Assessments</p>
                                      <p className="text-sm text-slate-300">{selectedOrg.assessmentCount}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-500 mb-1">AI Costs (MTD)</p>
                                      <p className="text-sm text-amber-400">{formatCurrency(selectedOrg.aiCostsMtdCents)}</p>
                                    </div>
                                  </div>
                                  
                                  {/* Coaches with Assessment Counts - GDPR/HIPAA: Only show if permission granted */}
                                  {orgCoachesWithStats[selectedOrg.id] && orgCoachesWithStats[selectedOrg.id].length > 0 ? (
                                    <div className="pt-4 border-t border-slate-800">
                                      <h4 className="text-sm font-medium text-slate-300 mb-3">Coaches & Activity</h4>
                                      <div className="space-y-2">
                                        {orgCoachesWithStats[selectedOrg.id].map((coach) => (
                                          <div key={coach.uid} className="flex items-center justify-between p-2 bg-slate-800/30 rounded-lg">
                                            <div className="flex-1">
                                              <p className="text-xs text-slate-300 font-medium">{coach.displayName}</p>
                                              <p className="text-xs text-slate-500">
                                                {coach.role === 'org_admin' ? 'Admin' : 'Coach'} • {coach.clientCount} client{coach.clientCount !== 1 ? 's' : ''}
                                              </p>
                                            </div>
                                            <div className="text-right">
                                              <p className="text-xs text-white font-semibold">{coach.assessmentCount}</p>
                                              <p className="text-xs text-slate-500">assessment{coach.assessmentCount !== 1 ? 's' : ''}</p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    (selectedOrg.dataAccessPermission?.platformAdminAccess !== true && 
                                     selectedOrg.isComped !== true) && (
                                      <div className="pt-4 border-t border-slate-800">
                                        <div className="p-3 bg-slate-800/30 rounded-lg border border-amber-500/30">
                                          <p className="text-xs text-amber-400">
                                            🔒 Data access restricted. Visit organization details to request access.
                                          </p>
                                        </div>
                                      </div>
                                    )
                                  )}

                                  {/* AI Costs by Feature */}
                                  {orgAiCostsByFeature[selectedOrg.id] && orgAiCostsByFeature[selectedOrg.id].length > 0 && (
                                    <div className="pt-4 border-t border-slate-800">
                                      <h4 className="text-sm font-medium text-slate-300 mb-3">AI Costs by Feature (MTD)</h4>
                                      <div className="space-y-2">
                                        {orgAiCostsByFeature[selectedOrg.id].map((item) => (
                                          <div key={item.feature} className="flex items-center justify-between p-2 bg-slate-800/30 rounded-lg">
                                            <div>
                                              <p className="text-xs text-slate-300 font-medium">{formatFeatureName(item.feature)}</p>
                                              <p className="text-xs text-slate-500">{item.count} requests</p>
                                            </div>
                                            <p className="text-xs text-amber-400 font-medium">{formatCurrency(item.costFils)}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  <div className="flex gap-2 pt-4 border-t border-slate-800">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs border-slate-700 text-slate-300 hover:bg-slate-700"
                                      onClick={() => {
                                        navigate(`/admin/organizations/${selectedOrg.id}`);
                                      }}
                                    >
                                      <Settings className="w-3 h-3 mr-1" />
                                      Manage Subscription
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default PlatformDashboard;
