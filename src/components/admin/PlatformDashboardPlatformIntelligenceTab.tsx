/**
 * Platform Dashboard – Platform Intelligence Tab
 *
 * Acquisition-relevant business KPIs derived from live platform data.
 * No Firestore reads — all data comes from usePlatformDashboard.
 */

import { BarChart3 } from 'lucide-react';
import { PlatformIntelligenceSection } from './data-intelligence/PlatformIntelligenceSection';
import type { PlatformMetrics, PlatformMetricsHistoryEntry, OrganizationSummary } from '@/types/platform';
import type { ChartDataPoint } from '@/hooks/usePlatformDashboard';

interface Props {
  metrics: PlatformMetrics | null;
  revenueByRegion: { byRegion: Record<string, { amountLocal: number; currency: string; gbpPence: number }>; totalGbpPence: number } | null;
  metricsHistory: PlatformMetricsHistoryEntry[];
  sortedOrganizations: OrganizationSummary[];
  silentOrgs: OrganizationSummary[];
  assessmentChartData: ChartDataPoint[];
  formatCurrency: (pence: number) => string;
}

export function PlatformDashboardPlatformIntelligenceTab(props: Props) {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-white font-semibold text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            Platform Intelligence
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Business metrics for acquisition due diligence — derived from live platform data
          </p>
        </div>
      </div>
      <PlatformIntelligenceSection {...props} />
    </div>
  );
}
