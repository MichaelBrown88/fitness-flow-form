/**
 * Platform Dashboard – Financial Tab
 *
 * MRR/ARR, trial conversions, churns, revenue by region, AI costs by feature.
 */

import { DollarSign, Cpu } from 'lucide-react';
import type { PlatformMetrics } from '@/types/platform';
import type { FeatureCost } from '@/hooks/usePlatformDashboard';

export interface PlatformDashboardFinancialTabProps {
  metrics: PlatformMetrics | null;
  revenueByRegion: { byRegion: Record<string, { amountLocal: number; currency: string; gbpPence: number }>; totalGbpPence: number } | null;
  aiCostsByFeature: FeatureCost[];
  aiCostsByFeatureAllTime: FeatureCost[];
  formatCurrency: (amountInSmallestUnit: number, currency?: 'GBP' | 'USD' | 'KWD') => string;
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
  return (
    <div className="space-y-8">
      {/* Revenue by Region */}
      {revenueByRegion && (
        <div className="bg-foreground/50 border border-border rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Revenue by Region
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {revenueByRegion.byRegion.GB && (
              <div className="p-4 bg-muted/40 border border-border rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">UK</p>
                <p className="text-xl font-bold text-white">{formatCurrency(revenueByRegion.byRegion.GB.amountLocal, 'GBP')}</p>
              </div>
            )}
            {revenueByRegion.byRegion.US && (
              <div className="p-4 bg-muted/40 border border-border rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">US</p>
                <p className="text-xl font-bold text-white">{formatCurrency(revenueByRegion.byRegion.US.amountLocal, 'USD')}</p>
              </div>
            )}
            {revenueByRegion.byRegion.KW && (
              <div className="p-4 bg-muted/40 border border-border rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">Kuwait</p>
                <p className="text-xl font-bold text-white">{formatCurrency(revenueByRegion.byRegion.KW.amountLocal, 'KWD')}</p>
              </div>
            )}
            <div className="p-4 bg-muted/40 border border-emerald-500/30 rounded-xl">
              <p className="text-xs text-emerald-400 mb-1">Total (GBP)</p>
              <p className="text-xl font-bold text-emerald-400">{formatCurrency(revenueByRegion.totalGbpPence, 'GBP')}</p>
            </div>
          </div>
        </div>
      )}

      {/* MRR / ARR */}
      <div className="bg-foreground/50 border border-border rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          MRR & ARR
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="p-4 bg-muted/40 border border-border rounded-xl">
            <p className="text-xs text-muted-foreground mb-1">Monthly Recurring Revenue (GBP)</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(metrics?.mrrCents ?? 0, 'GBP')}</p>
          </div>
          <div className="p-4 bg-muted/40 border border-border rounded-xl">
            <p className="text-xs text-muted-foreground mb-1">Annual Recurring Revenue (GBP)</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(metrics?.arrCents ?? 0, 'GBP')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-foreground/50 border border-border rounded-2xl p-6">
          <p className="text-xs text-muted-foreground mb-1">AI Costs (MTD)</p>
          <p className="text-2xl font-bold text-amber-400">{formatCurrency(metrics?.aiCostsMtdCents ?? 0, 'GBP')}</p>
        </div>
        <div className="bg-foreground/50 border border-border rounded-2xl p-6">
          <p className="text-xs text-muted-foreground mb-1">AI Costs (All Time)</p>
          <p className="text-2xl font-bold text-amber-400">{formatCurrency(metrics?.totalAiCostsCents ?? 0, 'GBP')}</p>
        </div>
      </div>

      {/* AI Costs by Feature */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-foreground/50 border border-border rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-400" />
            AI Costs by Feature (MTD)
          </h3>
          {aiCostsByFeature.length === 0 ? (
            <p className="text-sm text-muted-foreground">No AI cost data this month</p>
          ) : (
            <div className="space-y-3">
              {aiCostsByFeature.map((item) => (
                <div key={item.feature} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm text-muted-foreground/60">{formatFeatureName(item.feature)}</span>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-amber-400">{formatCurrency(item.costGbpPence, 'GBP')}</span>
                    <span className="text-xs text-muted-foreground ml-2">({formatNumber(item.count)} requests)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-foreground/50 border border-border rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-400" />
            AI Costs by Feature (All Time)
          </h3>
          {aiCostsByFeatureAllTime.length === 0 ? (
            <p className="text-sm text-muted-foreground">No AI cost data recorded</p>
          ) : (
            <div className="space-y-3">
              {aiCostsByFeatureAllTime.map((item) => (
                <div key={item.feature} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm text-muted-foreground/60">{formatFeatureName(item.feature)}</span>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-amber-400">{formatCurrency(item.costGbpPence, 'GBP')}</span>
                    <span className="text-xs text-muted-foreground ml-2">({formatNumber(item.count)} requests)</span>
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
