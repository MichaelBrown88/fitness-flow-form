/**
 * Platform Dashboard – Financial Tab
 *
 * Reporting currency GBP (MRR/ARR, AI costs) + regional billable amounts in Stripe currencies.
 */

import { DollarSign, Cpu, Info } from 'lucide-react';
import type { PlatformMetrics, RevenueByRegionSnapshot } from '@/types/platform';
import type { FeatureCost } from '@/hooks/usePlatformDashboard';
import { REGION_LABELS, type Region } from '@/constants/pricing';
import { REPORTING_CURRENCY } from '@/constants/pricing';
import { PLATFORM_FINANCIAL_REPORTING } from '@/constants/platform';

const REGION_SORT_PRIORITY: string[] = ['GB', 'US', 'KW'];

function sortRegionKeys(keys: string[]): string[] {
  const set = new Set(keys);
  const head = REGION_SORT_PRIORITY.filter((k) => set.has(k));
  const rest = keys.filter((k) => !REGION_SORT_PRIORITY.includes(k)).sort((a, b) => a.localeCompare(b));
  return [...head, ...rest];
}

export interface PlatformDashboardFinancialTabProps {
  metrics: PlatformMetrics | null;
  revenueByRegion: RevenueByRegionSnapshot | null;
  aiCostsByFeature: FeatureCost[];
  aiCostsByFeatureAllTime: FeatureCost[];
  formatCurrency: (amountInSmallestUnit: number, currency?: string) => string;
  formatNumber: (num: number) => string;
  formatFeatureName: (feature: string) => string;
}

export function PlatformDashboardFinancialTab({
  metrics,
  revenueByRegion,
  aiCostsByFeature,
  aiCostsByFeatureAllTime,
  formatCurrency,
  formatNumber,
  formatFeatureName,
}: PlatformDashboardFinancialTabProps) {
  const regionKeys = revenueByRegion ? sortRegionKeys(Object.keys(revenueByRegion.byRegion)) : [];

  return (
    <div className="space-y-8">
      <div
        className="rounded-xl border border-admin-border/80 bg-admin-surface-inset/50 px-4 py-3 flex gap-3 text-sm text-admin-fg-muted"
        role="note"
      >
        <Info className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" aria-hidden />
        <p className="leading-relaxed">{PLATFORM_FINANCIAL_REPORTING.FOOTNOTE}</p>
      </div>

      {/* MRR / ARR (reporting) */}
      <div className="rounded-2xl border border-admin-border bg-admin-card/80 p-6">
        <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          {PLATFORM_FINANCIAL_REPORTING.REPORTING_LABEL}
        </h3>
        <p className="text-xs text-admin-fg-muted mb-4">{PLATFORM_FINANCIAL_REPORTING.MRR_CARD_HINT}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="rounded-xl border border-admin-border/80 bg-admin-surface-inset p-4">
            <p className="mb-1 text-xs text-admin-fg-muted">
              Monthly recurring revenue ({REPORTING_CURRENCY})
            </p>
            <p className="text-2xl font-bold text-white">{formatCurrency(metrics?.mrrCents ?? 0, REPORTING_CURRENCY)}</p>
          </div>
          <div className="rounded-xl border border-admin-border/80 bg-admin-surface-inset p-4">
            <p className="mb-1 text-xs text-admin-fg-muted">
              Annual recurring revenue ({REPORTING_CURRENCY})
            </p>
            <p className="text-2xl font-bold text-white">{formatCurrency(metrics?.arrCents ?? 0, REPORTING_CURRENCY)}</p>
          </div>
        </div>
      </div>

      {/* Revenue by region (Stripe local + GBP equivalent) */}
      {revenueByRegion && regionKeys.length > 0 && (
        <div className="rounded-2xl border border-admin-border bg-admin-card/80 p-6">
          <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            {PLATFORM_FINANCIAL_REPORTING.STRIPE_LOCAL_LABEL}
          </h3>
          <p className="text-xs text-admin-fg-muted mb-4">{PLATFORM_FINANCIAL_REPORTING.REGION_SCAN_HINT}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {regionKeys.map((code) => {
              const row = revenueByRegion.byRegion[code];
              if (!row) return null;
              return (
                <div
                  key={code}
                  className="rounded-xl border border-admin-border/80 bg-admin-surface-inset p-4 space-y-2"
                >
                  <p className="text-xs text-admin-fg-muted">
                    {REGION_LABELS[code as Region] ?? code}
                    <span className="text-admin-fg-muted/70"> · {code}</span>
                  </p>
                  <p className="text-xl font-bold text-white">
                    {formatCurrency(row.amountLocal, row.currency)}
                    <span className="text-xs font-normal text-admin-fg-muted ml-1">/mo (sum)</span>
                  </p>
                  <p className="text-sm text-emerald-400/90">
                    ≈ {formatCurrency(row.gbpPence, REPORTING_CURRENCY)}{' '}
                    <span className="text-xs text-admin-fg-muted">({REPORTING_CURRENCY} normalized)</span>
                  </p>
                  <p className="text-xs text-admin-fg-muted">
                    {row.activePayingOrgCount} active paying org
                    {row.activePayingOrgCount === 1 ? '' : 's'}
                  </p>
                </div>
              );
            })}
            <div className="rounded-xl border border-emerald-500/35 bg-admin-surface-inset p-4 space-y-1 md:col-span-2 xl:col-span-1">
              <p className="text-xs text-emerald-400 mb-1">Scan total ({REPORTING_CURRENCY})</p>
              <p className="text-xl font-bold text-emerald-400">
                {formatCurrency(revenueByRegion.totalGbpPence, REPORTING_CURRENCY)}
              </p>
              <p className="text-xs text-admin-fg-muted leading-relaxed">
                Sum of regional ≈{REPORTING_CURRENCY} above. Compare to MRR card; small drift can occur if rates
                changed mid-period.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-admin-border bg-admin-card/80 p-6">
          <p className="mb-1 text-xs text-admin-fg-muted">AI costs MTD ({REPORTING_CURRENCY})</p>
          <p className="text-2xl font-bold text-amber-400">{formatCurrency(metrics?.aiCostsMtdCents ?? 0, REPORTING_CURRENCY)}</p>
        </div>
        <div className="rounded-2xl border border-admin-border bg-admin-card/80 p-6">
          <p className="mb-1 text-xs text-admin-fg-muted">AI costs all time ({REPORTING_CURRENCY})</p>
          <p className="text-2xl font-bold text-amber-400">{formatCurrency(metrics?.totalAiCostsCents ?? 0, REPORTING_CURRENCY)}</p>
        </div>
      </div>

      {/* AI Costs by Feature */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-admin-border bg-admin-card/80 p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-400" />
            AI costs by feature (MTD, {REPORTING_CURRENCY})
          </h3>
          {aiCostsByFeature.length === 0 ? (
            <p className="text-sm text-slate-300">No AI cost data this month</p>
          ) : (
            <div className="space-y-3">
              {aiCostsByFeature.map((item) => (
                <div
                  key={item.feature}
                  className="flex items-center justify-between rounded-lg border border-admin-border/60 bg-admin-surface-inset p-3"
                >
                  <span className="text-sm text-slate-300">{formatFeatureName(item.feature)}</span>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-amber-400">
                      {formatCurrency(item.costGbpPence, REPORTING_CURRENCY)}
                    </span>
                    <span className="ml-2 text-xs text-admin-fg-muted">({formatNumber(item.count)} requests)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-admin-border bg-admin-card/80 p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-400" />
            AI costs by feature (all time, {REPORTING_CURRENCY})
          </h3>
          {aiCostsByFeatureAllTime.length === 0 ? (
            <p className="text-sm text-slate-300">No AI cost data recorded</p>
          ) : (
            <div className="space-y-3">
              {aiCostsByFeatureAllTime.map((item) => (
                <div
                  key={item.feature}
                  className="flex items-center justify-between rounded-lg border border-admin-border/60 bg-admin-surface-inset p-3"
                >
                  <span className="text-sm text-slate-300">{formatFeatureName(item.feature)}</span>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-amber-400">
                      {formatCurrency(item.costGbpPence, REPORTING_CURRENCY)}
                    </span>
                    <span className="ml-2 text-xs text-admin-fg-muted">({formatNumber(item.count)} requests)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
