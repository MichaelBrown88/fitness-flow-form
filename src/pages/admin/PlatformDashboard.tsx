/**
 * Platform Dashboard
 * 
 * Business metrics and organization overview for platform administrators.
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirebaseAuth } from '@/services/firebase';
import { 
  getPlatformAdmin, 
  getLiveMetrics, 
  getOrganizations 
} from '@/services/platformAdmin';
import type { PlatformAdmin, PlatformMetrics, OrganizationSummary } from '@/types/platform';
import { 
  Shield, 
  LogOut, 
  Building2, 
  Users, 
  DollarSign, 
  Cpu,
  TrendingUp,
  Clock,
  Activity,
  ChevronRight,
  RefreshCw,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/utils/logger';

const PlatformDashboard = () => {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null);
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);

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
      const [metricsData, orgsData] = await Promise.all([
        getLiveMetrics(),
        getOrganizations(20)
      ]);
      setMetrics(metricsData);
      setOrganizations(orgsData);
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
    return new Intl.NumberFormat('en-KW', {
      style: 'currency',
      currency: 'KWD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(fils / 1000);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'trial': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'past_due': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
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
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* MRR */}
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
            <p className="text-xs text-slate-500 mt-1">Monthly recurring</p>
          </div>

          {/* Organizations */}
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

          {/* Users */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-violet-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{formatNumber(metrics?.totalUsers || 0)}</p>
            <p className="text-xs text-slate-500 mt-1">
              {metrics?.totalCoaches || 0} coaches · {metrics?.totalClients || 0} clients
            </p>
          </div>

          {/* AI Costs */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600/20 flex items-center justify-center">
                <Cpu className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-xs text-slate-500">MTD</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(metrics?.aiCostsMtdCents || 0)}</p>
            <p className="text-xs text-slate-500 mt-1">AI usage this month</p>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <FileText className="w-4 h-4" />
              <span className="text-xs">Total Assessments</span>
            </div>
            <p className="text-xl font-semibold text-white">{formatNumber(metrics?.totalAssessments || 0)}</p>
          </div>
          <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Activity className="w-4 h-4" />
              <span className="text-xs">This Month</span>
            </div>
            <p className="text-xl font-semibold text-white">{formatNumber(metrics?.assessmentsThisMonth || 0)}</p>
          </div>
          <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs">ARR</span>
            </div>
            <p className="text-xl font-semibold text-white">{formatCurrency(metrics?.arrCents || 0)}</p>
          </div>
          <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs">Last Updated</span>
            </div>
            <p className="text-sm font-medium text-white">
              {metrics?.updatedAt ? new Date(metrics.updatedAt).toLocaleTimeString() : 'Just now'}
            </p>
          </div>
        </div>

        {/* Organizations List */}
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
            <div className="divide-y divide-slate-800">
              {organizations.map((org) => (
                <div key={org.id}>
                  <button 
                    onClick={() => setExpandedOrgId(expandedOrgId === org.id ? null : org.id)}
                    className="w-full px-5 py-4 hover:bg-slate-800/30 transition-colors flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{org.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-500 capitalize">{org.type.replace('_', ' ')}</span>
                          <span className="text-slate-700">·</span>
                          <span className="text-xs text-slate-500">{org.plan}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm text-slate-400">
                          {org.coachCount} coaches · {org.clientCount} clients
                        </p>
                        <p className="text-xs text-slate-600">
                          {org.assessmentCount} assessments
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(org.status)}`}>
                        {org.status}
                      </span>
                      <ChevronRight className={`w-4 h-4 text-slate-600 transition-transform ${expandedOrgId === org.id ? 'rotate-90' : ''}`} />
                    </div>
                  </button>
                  
                  {/* Expanded Details */}
                  {expandedOrgId === org.id && (
                    <div className="px-5 pb-4 bg-slate-800/20 border-t border-slate-800/50">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Organization ID</p>
                          <p className="text-sm text-slate-300 font-mono">{org.id}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Created</p>
                          <p className="text-sm text-slate-300">{org.createdAt.toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Trial Ends</p>
                          <p className="text-sm text-slate-300">{org.trialEndsAt?.toLocaleDateString() || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">AI Costs (MTD)</p>
                          <p className="text-sm text-slate-300">{formatCurrency(org.aiCostsMtdCents)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2 border-t border-slate-800/50">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs border-slate-700 text-slate-300 hover:bg-slate-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Future: Navigate to org detail page
                            logger.info('View org details:', org.id);
                          }}
                        >
                          View Details
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs border-slate-700 text-slate-300 hover:bg-slate-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Future: Manage subscription
                            logger.info('Manage subscription:', org.id);
                          }}
                        >
                          Manage Subscription
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link 
            to="/"
            className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-4 hover:bg-slate-800/30 transition-colors group"
          >
            <p className="text-sm font-medium text-slate-300 group-hover:text-white">View Public Site</p>
            <p className="text-xs text-slate-600">fitnessflow.app</p>
          </Link>
          <button 
            className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-4 hover:bg-slate-800/30 transition-colors text-left group"
            onClick={() => logger.info('Export metrics clicked')}
          >
            <p className="text-sm font-medium text-slate-300 group-hover:text-white">Export Metrics</p>
            <p className="text-xs text-slate-600">Download CSV report</p>
          </button>
          <button 
            className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-4 hover:bg-slate-800/30 transition-colors text-left group"
            onClick={() => logger.info('AI costs clicked')}
          >
            <p className="text-sm font-medium text-slate-300 group-hover:text-white">AI Cost Breakdown</p>
            <p className="text-xs text-slate-600">View by organization</p>
          </button>
        </div>
      </main>
    </div>
  );
};

export default PlatformDashboard;

