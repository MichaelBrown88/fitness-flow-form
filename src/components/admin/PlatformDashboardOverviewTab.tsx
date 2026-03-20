/**
 * Platform Dashboard – Overview Tab
 *
 * Top KPIs, health-signal cards, key charts, and platform totals.
 */

import { DollarSign, Building2, FileText, Cpu, TrendingUp, Users, AlertTriangle, Zap, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { PlatformMetrics, PlatformMetricsHistoryEntry, OrganizationSummary } from '@/types/platform';
import type { ChartDataPoint } from '@/hooks/usePlatformDashboard';
import type { AIErrorRate } from '@/services/platformAdmin';

export interface PlatformDashboardOverviewTabProps {
  metrics: PlatformMetrics | null;
  assessmentChartData: ChartDataPoint[];
  metricsHistory: PlatformMetricsHistoryEntry[];
  silentOrgs: OrganizationSummary[];
  activationFunnel: { newOrgs: number; activated: number; rate: number };
  aiErrorRate: AIErrorRate;
  formatCurrency: (amountInSmallestUnit: number, currency?: 'GBP' | 'USD' | 'KWD') => string;
  formatNumber: (num: number) => string;
}

const chartTooltipStyle = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 'var(--radius)',
  color: '#fff',
};

function getErrorRateColor(rate: number): string {
  if (rate < 2) return 'text-emerald-400';
  if (rate <= 10) return 'text-amber-400';
  return 'text-red-400';
}

export function PlatformDashboardOverviewTab({
  metrics,
  assessmentChartData,
  metricsHistory,
  silentOrgs,
  activationFunnel,
  aiErrorRate,
  formatCurrency,
  formatNumber,
}: PlatformDashboardOverviewTabProps) {
  return (
    <div className="space-y-8">
      {/* Top KPI cards: MRR, Orgs, Assessments, AI Costs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-admin-card/50 border border-admin-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              MRR (GBP)
            </span>
          </div>
          <p className="text-2xl font-bold text-admin-fg">{formatCurrency(metrics?.mrrCents ?? 0, 'GBP')}</p>
          <p className="text-xs text-admin-fg-muted mt-1">ARR: {formatCurrency(metrics?.arrCents ?? 0, 'GBP')}</p>
        </div>

        <div className="bg-admin-card/50 border border-admin-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-admin-fg">{formatNumber(metrics?.totalOrganizations ?? 0)}</p>
          <p className="text-xs text-admin-fg-muted mt-1">
            {metrics?.activeOrganizations ?? 0} active · {metrics?.trialOrganizations ?? 0} trial
          </p>
        </div>

        <div className="bg-admin-card/50 border border-admin-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-violet-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-admin-fg">{formatNumber(metrics?.totalAssessments ?? 0)}</p>
          <p className="text-xs text-admin-fg-muted mt-1">Total assessments</p>
        </div>

        <div className="bg-admin-card/50 border border-admin-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-xs text-admin-fg-muted">MTD</span>
          </div>
          <p className="text-2xl font-bold text-admin-fg">{formatCurrency(metrics?.aiCostsMtdCents ?? 0, 'GBP')}</p>
          <p className="text-xs text-admin-fg-muted mt-1">All time: {formatCurrency(metrics?.totalAiCostsCents ?? 0, 'GBP')}</p>
        </div>
      </div>

      {/* Health Signal cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Churn Risk */}
        <div className="bg-admin-card/50 border border-admin-border rounded-2xl p-5 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/15 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <h3 className="text-sm font-semibold text-admin-fg">At-Risk Orgs</h3>
          </div>
          {silentOrgs.length === 0 ? (
            <p className="text-2xl font-bold text-emerald-400">0</p>
          ) : (
            <>
              <p className="text-2xl font-bold text-red-400">{silentOrgs.length}</p>
              <ul className="mt-2 space-y-1">
                {silentOrgs.slice(0, 5).map((org) => (
                  <li key={org.id} className="text-xs text-admin-fg-muted truncate">{org.name}</li>
                ))}
                {silentOrgs.length > 5 && (
                  <li className="text-xs text-admin-fg-muted">+{silentOrgs.length - 5} more</li>
                )}
              </ul>
            </>
          )}
          <p className="text-xs text-admin-fg-muted mt-2">Active orgs silent 14+ days</p>
        </div>

        {/* Activation Funnel */}
        <div className="bg-admin-card/50 border border-admin-border rounded-2xl p-5 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/15 flex items-center justify-center">
              <Zap className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-sm font-semibold text-admin-fg">Activation (This Month)</h3>
          </div>
          {activationFunnel.newOrgs === 0 ? (
            <p className="text-2xl font-bold text-admin-fg-muted">—</p>
          ) : (
            <p className="text-2xl font-bold text-admin-fg">
              {activationFunnel.activated}
              <span className="text-sm font-normal text-admin-fg-muted"> / {activationFunnel.newOrgs}</span>
            </p>
          )}
          <p className="text-xs text-admin-fg-muted mt-2">
            {activationFunnel.newOrgs === 0
              ? 'No new orgs this month'
              : `${activationFunnel.rate}% of new orgs ran an assessment`}
          </p>
        </div>

        {/* AI Error Rate */}
        <div className="bg-admin-card/50 border border-admin-border rounded-2xl p-5 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600/15 flex items-center justify-center">
              <Activity className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-sm font-semibold text-admin-fg">AI Error Rate (MTD)</h3>
          </div>
          <p className={`text-2xl font-bold ${getErrorRateColor(aiErrorRate.errorRate)}`}>
            {aiErrorRate.errorRate.toFixed(1)}%
          </p>
          <p className="text-xs text-admin-fg-muted mt-2">
            {aiErrorRate.errors} errors · {aiErrorRate.total} total calls
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MRR Trend */}
        {metricsHistory.length > 0 && (
          <div className="bg-admin-card/50 border border-admin-border rounded-2xl p-6">
            <h3 className="text-admin-fg font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              MRR Trend (Last 30 Days)
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={metricsHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => {
                    const parts = (value as string).split('-');
                    return `${parts[1]}/${parts[2]}`;
                  }}
                />
                <YAxis
                  stroke="#64748b"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(v) => formatCurrency(v as number, 'GBP')}
                />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => [formatCurrency(value, 'GBP'), 'MRR']} />
                <Line type="monotone" dataKey="mrrCents" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Assessments over time */}
        <div className="bg-admin-card/50 border border-admin-border rounded-2xl p-6">
          <h3 className="text-admin-fg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-admin-fg-muted" />
            Assessments (Last 30 Days)
          </h3>
          {assessmentChartData.length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-admin-fg-muted text-sm">No assessment data</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={assessmentChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => {
                    const parts = (value as string).split('-');
                    return `${parts[1]}/${parts[2]}`;
                  }}
                />
                <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Line type="monotone" dataKey="assessments" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Org growth */}
        {metricsHistory.length > 0 && (
          <div className="bg-admin-card/50 border border-admin-border rounded-2xl p-6 lg:col-span-2">
            <h3 className="text-admin-fg font-semibold mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              Org Growth (Last 30 Days)
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={metricsHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => {
                    const parts = (value as string).split('-');
                    return `${parts[1]}/${parts[2]}`;
                  }}
                />
                <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Line type="monotone" dataKey="totalOrgs" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 3 }} name="Total" />
                <Line type="monotone" dataKey="activeOrgs" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} name="Active" />
                <Line type="monotone" dataKey="trialOrgs" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} name="Trial" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Platform Overview totals */}
      <div className="bg-admin-card/50 border border-admin-border rounded-2xl p-6">
        <h3 className="text-admin-fg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-admin-fg-muted" />
          Platform Overview
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="flex flex-col p-3 bg-slate-800/30 rounded-lg">
            <span className="text-xs text-admin-fg-muted">Users</span>
            <span className="text-lg font-semibold text-admin-fg">{formatNumber(metrics?.totalUsers ?? 0)}</span>
          </div>
          <div className="flex flex-col p-3 bg-slate-800/30 rounded-lg">
            <span className="text-xs text-admin-fg-muted">Coaches</span>
            <span className="text-lg font-semibold text-admin-fg">{formatNumber(metrics?.totalCoaches ?? 0)}</span>
          </div>
          <div className="flex flex-col p-3 bg-slate-800/30 rounded-lg">
            <span className="text-xs text-admin-fg-muted">Clients</span>
            <span className="text-lg font-semibold text-admin-fg">{formatNumber(metrics?.totalClients ?? 0)}</span>
          </div>
          <div className="flex flex-col p-3 bg-slate-800/30 rounded-lg">
            <span className="text-xs text-admin-fg-muted">Assessments</span>
            <span className="text-lg font-semibold text-admin-fg">{formatNumber(metrics?.totalAssessments ?? 0)}</span>
          </div>
          <div className="flex flex-col p-3 bg-slate-800/30 rounded-lg">
            <span className="text-xs text-admin-fg-muted">This Month</span>
            <span className="text-lg font-semibold text-admin-fg">{formatNumber(metrics?.assessmentsThisMonth ?? 0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
