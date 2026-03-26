/**
 * Platform Dashboard
 *
 * Business metrics and organization overview for platform administrators.
 * Uses tabs: Overview, Organizations, Financial, Admin.
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { usePlatformDashboard } from '@/hooks/usePlatformDashboard';
import { PLATFORM_DASHBOARD_TABS } from '@/constants/platform';
import { FEATURE_NAMES, FEATURE_DESCRIPTIONS } from '@/constants/platform';
import { REGIONS, REGION_LABELS } from '@/constants/pricing';
import { PlatformDashboardOverviewTab } from '@/components/admin/PlatformDashboardOverviewTab';
import { PlatformDashboardOrganizationsTab } from '@/components/admin/PlatformDashboardOrganizationsTab';
import { PlatformDashboardFinancialTab } from '@/components/admin/PlatformDashboardFinancialTab';
import { PlatformDashboardAdminTab } from '@/components/admin/PlatformDashboardAdminTab';
import { PlatformDashboardDataIntelligenceTab } from '@/components/admin/PlatformDashboardDataIntelligenceTab';
import { PlatformDashboardPlatformIntelligenceTab } from '@/components/admin/PlatformDashboardPlatformIntelligenceTab';
import { fetchMilestoneBadgeState } from '@/hooks/usePlatformDataIntelligence';
import type { PlatformFeatureFlags } from '@/types/platform';

const FEATURE_KEYS: (keyof PlatformFeatureFlags)[] = ['posture_enabled', 'ocr_enabled', 'report_generation_enabled'];

const PlatformDashboard = () => {
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [maintenanceFeatures, setMaintenanceFeatures] = useState<(keyof PlatformFeatureFlags)[]>([]);

  const { data: serverMilestoneUnseen = false } = useQuery({
    queryKey: ['platformMilestoneBadge'],
    queryFn: fetchMilestoneBadgeState,
    staleTime: 60_000,
  });
  const [milestoneBadgeDismissed, setMilestoneBadgeDismissed] = useState(false);
  const hasUnseenMilestone = serverMilestoneUnseen && !milestoneBadgeDismissed;

  const dashboard = usePlatformDashboard();

  const {
    admin,
    loading,
    refreshing,
    metrics,
    sortedOrganizations,
    filteredOrganizations,
    assessmentChartData,
    revenueByRegion,
    metricsHistory,
    silentOrgs,
    activationFunnel,
    aiErrorRate,
    aiCostsByFeature,
    aiCostsByFeatureAllTime,
    orgAiCostsByFeature,
    orgCoachesWithStats,
    platformConfig,
    updatingFeature,
    selectedOrg,
    sortField,
    sortDirection,
    setSelectedOrg,
    searchQuery,
    filterStatus,
    filterRegion,
    filterIncomplete,
    filterTest,
    setSearchQuery,
    setFilterStatus,
    setFilterRegion,
    setFilterIncomplete,
    setFilterTest,
    handleRefresh,
    handleSignOut,
    handleSort,
    navigateToOrg,
    loadMoreOrganizations,
    hasMoreOrganizations,
    handleToggleFeature,
    handleSetMaintenanceMode,
    updatingMaintenance,
    platformAdmins,
    handleRemovePlatformAdmin,
    handleUpdatePlatformAdminPermissions,
    handleAddPlatformAdmin,
    auditLogEntries,
    hasMoreAuditLogs,
    loadMoreAuditLogs,
    platformHealth,
    formatCurrency,
    formatNumber,
    formatFeatureName,
    getStatusColor,
    getStatusLabel,
    getActivityColor,
    getDaysSince,
  } = dashboard;

  useEffect(() => {
    if (platformConfig.maintenance.is_maintenance_mode) {
      if (maintenanceMessage === '' && platformConfig.maintenance.message) setMaintenanceMessage(platformConfig.maintenance.message);
      if (maintenanceFeatures.length === 0 && platformConfig.maintenance.affected_features?.length) {
        setMaintenanceFeatures(platformConfig.maintenance.affected_features);
      }
    }
  }, [
    platformConfig.maintenance.is_maintenance_mode,
    platformConfig.maintenance.message,
    platformConfig.maintenance.affected_features,
    maintenanceMessage,
    maintenanceFeatures.length,
  ]);

  if (loading) {
    return (
      <div className="min-h-screen bg-admin-bg flex items-center justify-center">
        <div className="text-muted-foreground flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-admin-bg">
      <header className="border-b border-admin-border bg-admin-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-white font-semibold">Platform Dashboard</h1>
              <p className="text-xs text-muted-foreground">{admin?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing} className="text-muted-foreground hover:text-white">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-white">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue={PLATFORM_DASHBOARD_TABS.OVERVIEW}>
          <TabsList className="bg-admin-card border border-admin-border mb-8 p-1 h-auto">
            <TabsTrigger
              value={PLATFORM_DASHBOARD_TABS.OVERVIEW}
              className="data-[state=active]:bg-admin-border data-[state=active]:text-admin-fg text-admin-fg-muted"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value={PLATFORM_DASHBOARD_TABS.ORGANIZATIONS}
              className="data-[state=active]:bg-admin-border data-[state=active]:text-admin-fg text-admin-fg-muted"
            >
              Organizations
            </TabsTrigger>
            <TabsTrigger
              value={PLATFORM_DASHBOARD_TABS.FINANCIAL}
              className="data-[state=active]:bg-admin-border data-[state=active]:text-admin-fg text-admin-fg-muted"
            >
              Financial
            </TabsTrigger>
            <TabsTrigger
              value={PLATFORM_DASHBOARD_TABS.ADMIN}
              className="data-[state=active]:bg-admin-border data-[state=active]:text-admin-fg text-admin-fg-muted"
            >
              Admin
            </TabsTrigger>
            <TabsTrigger
              value={PLATFORM_DASHBOARD_TABS.DATA_INTELLIGENCE}
              className="data-[state=active]:bg-admin-border data-[state=active]:text-admin-fg text-admin-fg-muted relative"
              onClick={() => setMilestoneBadgeDismissed(true)}
            >
              Data Intelligence
              {hasUnseenMilestone && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-indigo-400" />
              )}
            </TabsTrigger>
            <TabsTrigger
              value={PLATFORM_DASHBOARD_TABS.PLATFORM_INTELLIGENCE}
              className="data-[state=active]:bg-admin-border data-[state=active]:text-admin-fg text-admin-fg-muted"
            >
              Platform Intelligence
            </TabsTrigger>
          </TabsList>

          <TabsContent value={PLATFORM_DASHBOARD_TABS.OVERVIEW} className="mt-0">
            <PlatformDashboardOverviewTab
              metrics={metrics}
              assessmentChartData={assessmentChartData}
              metricsHistory={metricsHistory}
              silentOrgs={silentOrgs}
              activationFunnel={activationFunnel}
              aiErrorRate={aiErrorRate}
              formatCurrency={formatCurrency}
              formatNumber={formatNumber}
            />
          </TabsContent>

          <TabsContent value={PLATFORM_DASHBOARD_TABS.ORGANIZATIONS} className="mt-0">
            <PlatformDashboardOrganizationsTab
              metrics={metrics}
              formatNumber={formatNumber}
              filteredOrganizations={filteredOrganizations}
              sortedOrganizations={sortedOrganizations}
              searchQuery={searchQuery}
              filterStatus={filterStatus}
              filterRegion={filterRegion}
              filterIncomplete={filterIncomplete}
              filterTest={filterTest}
              setSearchQuery={setSearchQuery}
              setFilterStatus={setFilterStatus}
              setFilterRegion={setFilterRegion}
              setFilterIncomplete={setFilterIncomplete}
              setFilterTest={setFilterTest}
              handleSort={handleSort}
              sortField={sortField}
              sortDirection={sortDirection}
              setSelectedOrg={setSelectedOrg}
              selectedOrg={selectedOrg}
              formatCurrency={formatCurrency}
              formatFeatureName={formatFeatureName}
              getStatusColor={getStatusColor}
              getStatusLabel={getStatusLabel}
              getActivityColor={getActivityColor}
              getDaysSince={getDaysSince}
              loadMoreOrganizations={loadMoreOrganizations}
              hasMoreOrganizations={hasMoreOrganizations}
              orgAiCostsByFeature={orgAiCostsByFeature}
              orgCoachesWithStats={orgCoachesWithStats}
              navigateToOrg={navigateToOrg}
              REGIONS={REGIONS}
              REGION_LABELS={REGION_LABELS}
            />
          </TabsContent>

          <TabsContent value={PLATFORM_DASHBOARD_TABS.FINANCIAL} className="mt-0">
            <PlatformDashboardFinancialTab
              metrics={metrics}
              revenueByRegion={revenueByRegion}
              aiCostsByFeature={aiCostsByFeature}
              aiCostsByFeatureAllTime={aiCostsByFeatureAllTime}
              formatCurrency={formatCurrency}
              formatNumber={formatNumber}
              formatFeatureName={formatFeatureName}
            />
          </TabsContent>

          <TabsContent value={PLATFORM_DASHBOARD_TABS.ADMIN} className="mt-0">
            <PlatformDashboardAdminTab
              platformConfig={platformConfig}
              updatingFeature={updatingFeature}
              handleToggleFeature={handleToggleFeature}
              handleSetMaintenanceMode={handleSetMaintenanceMode}
              updatingMaintenance={updatingMaintenance}
              maintenanceMessage={maintenanceMessage}
              setMaintenanceMessage={setMaintenanceMessage}
              maintenanceFeatures={maintenanceFeatures}
              setMaintenanceFeatures={setMaintenanceFeatures}
              auditLogEntries={auditLogEntries}
              hasMoreAuditLogs={hasMoreAuditLogs}
              loadMoreAuditLogs={loadMoreAuditLogs}
              platformAdmins={platformAdmins}
              handleRemovePlatformAdmin={handleRemovePlatformAdmin}
              handleUpdatePlatformAdminPermissions={handleUpdatePlatformAdminPermissions}
              handleAddPlatformAdmin={handleAddPlatformAdmin}
              admin={admin}
              FEATURE_KEYS={FEATURE_KEYS}
              FEATURE_NAMES={FEATURE_NAMES}
              FEATURE_DESCRIPTIONS={FEATURE_DESCRIPTIONS}
              platformHealth={platformHealth}
            />
          </TabsContent>

          <TabsContent value={PLATFORM_DASHBOARD_TABS.DATA_INTELLIGENCE} className="mt-0">
            <PlatformDashboardDataIntelligenceTab />
          </TabsContent>

          <TabsContent value={PLATFORM_DASHBOARD_TABS.PLATFORM_INTELLIGENCE} className="mt-0">
            <PlatformDashboardPlatformIntelligenceTab
              metrics={metrics}
              revenueByRegion={revenueByRegion}
              metricsHistory={metricsHistory}
              sortedOrganizations={sortedOrganizations}
              silentOrgs={silentOrgs}
              assessmentChartData={assessmentChartData}
              formatCurrency={formatCurrency}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default PlatformDashboard;
