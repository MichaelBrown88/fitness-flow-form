/**
 * Platform Intelligence Section
 *
 * Acquisition-relevant business metrics derived entirely from data already
 * fetched by usePlatformDashboard — zero additional Firestore reads.
 *
 * Metrics shown:
 *   Row 1 (KPIs)  : MRR, ARR, active org rate, assessments per coach
 *   Row 2 (Signals): assessment velocity trend, platform retention (GRR proxy),
 *                    engagement concentration risk
 */

import type {
  PlatformMetrics,
  PlatformMetricsHistoryEntry,
  OrganizationSummary,
  RevenueByRegionSnapshot,
} from '@/types/platform';
import type { ChartDataPoint } from '@/hooks/usePlatformDashboard';
import { TrendingUp, TrendingDown, Minus, Users, Activity, Target } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  metrics: PlatformMetrics | null;
  revenueByRegion: RevenueByRegionSnapshot | null;
  metricsHistory: PlatformMetricsHistoryEntry[];
  sortedOrganizations: OrganizationSummary[];
  silentOrgs: OrganizationSummary[];
  assessmentChartData: ChartDataPoint[];
  formatCurrency: (pence: number) => string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function TrendIcon({ delta }: { delta: number }) {
  if (delta > 0) return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (delta < 0) return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
}

function KpiCard({
  label, value, sub, icon: Icon, accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent?: boolean;
}) {
  return (
    <div className="bg-admin-card border border-admin-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-admin-fg-muted">{label}</span>
        <Icon className={`w-4 h-4 ${accent ? 'text-indigo-400' : 'text-muted-foreground'}`} />
      </div>
      <p className={`text-2xl font-semibold ${accent ? 'text-indigo-300' : 'text-admin-fg'}`}>{value}</p>
      {sub && <p className="text-xs text-admin-fg-muted">{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section component
// ---------------------------------------------------------------------------

export function PlatformIntelligenceSection({ metrics, revenueByRegion, metricsHistory, sortedOrganizations, silentOrgs, assessmentChartData, formatCurrency }: Props) {
  const mrrPence = revenueByRegion?.totalGbpPence ?? 0;
  const arrPence = mrrPence * 12;

  const totalOrgs = metrics?.totalOrganizations ?? 0;
  const activeOrgs = metrics?.activeOrganizations ?? 0;
  const activeRate = totalOrgs > 0 ? Math.round((activeOrgs / totalOrgs) * 100) : 0;

  const totalCoaches = metrics?.totalCoaches ?? 0;
  const totalAssessments = metrics?.totalAssessments ?? 0;
  const assessmentsPerCoach = totalCoaches > 0 ? (totalAssessments / totalCoaches).toFixed(1) : '—';

  // Assessment velocity: sum of last 30-day deltas vs previous 30-day period
  const recentTotal = assessmentChartData.slice(-30).reduce((s, d) => s + d.assessments, 0);
  const prevTotal = assessmentChartData.slice(-60, -30).reduce((s, d) => s + d.assessments, 0);
  const velocityDelta = prevTotal > 0 ? Math.round(((recentTotal - prevTotal) / prevTotal) * 100) : 0;

  // MRR trend from history (last entry vs 30 days prior)
  const sorted = [...metricsHistory].sort((a, b) => a.date.localeCompare(b.date));
  const mrrNow = sorted[sorted.length - 1]?.mrrCents ?? 0;
  const mrrPrev = sorted[0]?.mrrCents ?? 0;
  const mrrDelta = mrrPrev > 0 ? Math.round(((mrrNow - mrrPrev) / mrrPrev) * 100) : 0;

  // GRR proxy: % of orgs older than 90 days that have been active in the last 90 days
  const now = Date.now();
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
  const matureOrgs = sortedOrganizations.filter(o => now - (o.createdAt?.getTime?.() ?? now) > ninetyDaysMs);
  const matureActive = matureOrgs.filter(o => o.lastActiveDate && now - o.lastActiveDate.getTime() < ninetyDaysMs);
  const grrProxy = matureOrgs.length > 0 ? Math.round((matureActive.length / matureOrgs.length) * 100) : null;

  // Engagement concentration: % of total assessments in top 3 most active orgs
  const byAssessments = [...sortedOrganizations].sort((a, b) => (b.assessmentCount ?? 0) - (a.assessmentCount ?? 0));
  const top3Count = byAssessments.slice(0, 3).reduce((s, o) => s + (o.assessmentCount ?? 0), 0);
  const concentration = totalAssessments > 0 ? Math.round((top3Count / totalAssessments) * 100) : null;
  const concentrationRisk = concentration !== null && concentration > 60;

  return (
    <div className="space-y-4">
      {/* Row 1: KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Monthly Recurring Revenue" value={formatCurrency(mrrPence)} sub={mrrDelta !== 0 ? `${mrrDelta > 0 ? '+' : ''}${mrrDelta}% vs 30d ago` : 'No prior period'} icon={TrendingUp} accent />
        <KpiCard label="Annual Run Rate" value={formatCurrency(arrPence)} sub="MRR × 12" icon={Target} />
        <KpiCard label="Active Org Rate" value={`${activeRate}%`} sub={`${activeOrgs} of ${totalOrgs} orgs`} icon={Users} />
        <KpiCard label="Assessments / Coach" value={assessmentsPerCoach} sub={`${totalAssessments.toLocaleString()} total`} icon={Activity} />
      </div>

      {/* Row 2: Signal cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Assessment velocity */}
        <div className="bg-admin-card border border-admin-border rounded-xl p-4 space-y-2">
          <span className="text-xs text-admin-fg-muted">Assessment Velocity (30d)</span>
          <div className="flex items-end gap-2">
            <span className="text-xl font-semibold text-admin-fg">{recentTotal.toLocaleString()}</span>
            <div className="flex items-center gap-1 mb-0.5">
              <TrendIcon delta={velocityDelta} />
              <span className={`text-xs ${velocityDelta > 0 ? 'text-emerald-400' : velocityDelta < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                {velocityDelta !== 0 ? `${velocityDelta > 0 ? '+' : ''}${velocityDelta}% vs prev 30d` : 'No prior data'}
              </span>
            </div>
          </div>
          <p className="text-xs text-admin-fg-muted">New sessions in last 30 days</p>
        </div>

        {/* GRR proxy */}
        <div className="bg-admin-card border border-admin-border rounded-xl p-4 space-y-2">
          <span className="text-xs text-admin-fg-muted">Platform Retention Signal</span>
          {grrProxy !== null ? (
            <>
              <div className="flex items-end gap-2">
                <span className={`text-xl font-semibold ${grrProxy >= 80 ? 'text-emerald-400' : grrProxy >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{grrProxy}%</span>
              </div>
              <p className="text-xs text-admin-fg-muted">{matureActive.length}/{matureOrgs.length} mature orgs active in last 90d</p>
            </>
          ) : (
            <p className="text-sm text-slate-300 pt-1 leading-snug">
              Not enough data yet — needs orgs older than 90 days
            </p>
          )}
        </div>

        {/* Concentration risk */}
        <div className="bg-admin-card border border-admin-border rounded-xl p-4 space-y-2">
          <span className="text-xs text-admin-fg-muted">Engagement Concentration</span>
          {concentration !== null ? (
            <>
              <div className="flex items-end gap-2">
                <span
                  className={`text-xl font-semibold ${
                    concentrationRisk ? 'text-amber-400' : 'text-slate-200'
                  }`}
                >
                  {concentration}%
                </span>
              </div>
              <p className="text-xs text-admin-fg-muted">
                {concentrationRisk ? 'Top 3 orgs drive most volume — concentration risk' : 'Top 3 orgs — healthy distribution'}
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-300 pt-1">No assessment data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
