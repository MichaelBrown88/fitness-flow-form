/**
 * Platform Dashboard
 * 
 * Business metrics and organization overview for platform administrators.
 * Uses aggregated system_stats for efficient single-document reads.
 */

import { usePlatformDashboard } from '@/hooks/usePlatformDashboard';
import { formatMonthlyFee } from '@/lib/pricing';
import { 
  Shield, 
  LogOut, 
  Building2, 
  Users, 
  DollarSign, 
  Cpu,
  TrendingUp,
  Activity,
  RefreshCw,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Settings,
  Power,
  Camera,
  ScanLine,
  FileBarChart,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FEATURE_NAMES, FEATURE_DESCRIPTIONS } from '@/constants/platform';
import type { PlatformFeatureFlags } from '@/types/platform';

/** Feature toggle card for kill switches */
interface FeatureToggleCardProps {
  featureKey: keyof PlatformFeatureFlags;
  icon: React.ReactNode;
  enabled: boolean;
  updating: boolean;
  onToggle: (key: keyof PlatformFeatureFlags, enabled: boolean) => void;
}

const FeatureToggleCard: React.FC<FeatureToggleCardProps> = ({
  featureKey,
  icon,
  enabled,
  updating,
  onToggle,
}) => {
  // Map feature keys to constant keys
  const constantKey = featureKey.toUpperCase() as keyof typeof FEATURE_NAMES;
  const name = FEATURE_NAMES[constantKey] || featureKey;
  const description = FEATURE_DESCRIPTIONS[constantKey] || '';

  return (
    <div className={`p-4 rounded-xl border transition-colors ${
      enabled 
        ? 'bg-emerald-500/10 border-emerald-500/30' 
        : 'bg-red-500/10 border-red-500/30'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {icon}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{name}</p>
            <p className={`text-xs ${enabled ? 'text-emerald-400' : 'text-red-400'}`}>
              {enabled ? 'Enabled' : 'Disabled'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {updating && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
          <Switch
            checked={enabled}
            onCheckedChange={(checked) => onToggle(featureKey, checked)}
            disabled={updating}
          />
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-3">{description}</p>
    </div>
  );
};

const PlatformDashboard = () => {
  const {
    admin,
    loading,
    refreshing,
    metrics,
    sortedOrganizations,
    assessmentChartData,
    aiCostsByFeature,
    orgAiCostsByFeature,
    orgCoachesWithStats,
    unitEconomics,
    platformConfig,
    updatingFeature,
    selectedOrg,
    sortField,
    sortDirection,
    setSelectedOrg,
    handleRefresh,
    handleSignOut,
    handleSort,
    navigateToOrg,
    handleToggleFeature,
    formatCurrency,
    formatNumber,
    formatFeatureName,
    getStatusColor,
    getStatusLabel,
    getActivityColor,
    getDaysSince,
  } = usePlatformDashboard();

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

        {/* System Controls - Feature Kill Switches */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 flex items-center justify-center">
                <Power className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">System Controls</h3>
                <p className="text-xs text-slate-500">Feature kill switches for AI services</p>
              </div>
            </div>
            {platformConfig.maintenance.is_maintenance_mode && (
              <span className="px-3 py-1.5 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full border border-amber-500/30 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" />
                Maintenance Mode
              </span>
            )}
          </div>

          {/* Maintenance Banner */}
          {platformConfig.maintenance.message && (
            <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-sm text-amber-400">{platformConfig.maintenance.message}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Posture Analysis Toggle */}
            <FeatureToggleCard
              featureKey="posture_enabled"
              icon={<Camera className="w-5 h-5" />}
              enabled={platformConfig.features.posture_enabled}
              updating={updatingFeature === 'posture_enabled'}
              onToggle={handleToggleFeature}
            />
            
            {/* OCR Scanning Toggle */}
            <FeatureToggleCard
              featureKey="ocr_enabled"
              icon={<ScanLine className="w-5 h-5" />}
              enabled={platformConfig.features.ocr_enabled}
              updating={updatingFeature === 'ocr_enabled'}
              onToggle={handleToggleFeature}
            />
            
            {/* Report Generation Toggle */}
            <FeatureToggleCard
              featureKey="report_generation_enabled"
              icon={<FileBarChart className="w-5 h-5" />}
              enabled={platformConfig.features.report_generation_enabled}
              updating={updatingFeature === 'report_generation_enabled'}
              onToggle={handleToggleFeature}
            />
          </div>

          <p className="text-xs text-slate-600 mt-4">
            Last updated: {platformConfig.updatedAt.toLocaleString()} by {platformConfig.updatedBy}
          </p>
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
            <span className="text-xs text-slate-500">{sortedOrganizations.length} total</span>
          </div>
          
          {sortedOrganizations.length === 0 ? (
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
                <div className="col-span-1">Plan</div>
                <div className="col-span-1">Fee</div>
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
                        <div className="col-span-1">
                          <span className="text-xs text-slate-400 capitalize">{org.plan || 'free'}</span>
                        </div>

                        {/* Monthly Fee */}
                        <div className="col-span-1">
                          {org.isComped ? (
                            <span className="text-violet-400 text-xs">Comped</span>
                          ) : (
                            <span className="text-sm text-white">{formatCurrency(org.monthlyFeeKwd * 1000)}</span>
                          )}
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
                                  
                                  {/* Coaches with Assessment Counts */}
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
                                            Data access restricted. Visit organization details to request access.
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
                                      onClick={() => navigateToOrg(selectedOrg.id)}
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
