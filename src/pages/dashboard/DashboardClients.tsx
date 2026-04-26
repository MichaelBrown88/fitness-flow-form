import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { UnifiedClientTable } from '@/components/dashboard/sub-components/UnifiedClientTable';
import { WorkspaceBreadcrumb } from '@/components/dashboard/WorkspaceBreadcrumb';
import { WorkspaceKpiCard } from '@/components/dashboard/WorkspaceKpiCard';
import type { DashboardOutletContext } from './DashboardLayout';

export default function DashboardClients() {
  const ctx = useOutletContext<DashboardOutletContext>();

  const total = ctx.analytics?.totalClients ?? 0;
  const overdue = ctx.reassessmentQueue?.summary?.overdue ?? 0;
  const dueSoon = ctx.reassessmentQueue?.summary?.dueSoon ?? 0;
  const attentionCount = overdue + dueSoon;
  const onTrack = useMemo(() => {
    if (!ctx.reassessmentQueue) return 0;
    return ctx.reassessmentQueue.queue.filter((q) => q.status === 'up-to-date').length;
  }, [ctx.reassessmentQueue]);
  const reportsSharedPct = useMemo(() => {
    const eligible = (ctx.clientGroups ?? []).filter((c) => c.assessments.length > 0);
    if (eligible.length === 0) return null;
    const shared = eligible.filter((c) => c.shareToken).length;
    return Math.round((shared / eligible.length) * 100);
  }, [ctx.clientGroups]);

  // Per-client reassessment status, keyed by clientName for the table to look
  // up when rendering the kit status pill (On track / Needs attention / Overdue).
  const attentionMap = useMemo(() => {
    const map = new Map<string, 'overdue' | 'due-soon' | 'up-to-date'>();
    for (const item of ctx.reassessmentQueue?.queue ?? []) {
      map.set(item.clientName, item.status);
    }
    return map;
  }, [ctx.reassessmentQueue]);

  return (
    <div className="mx-auto flex w-full min-h-0 flex-1 flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <WorkspaceBreadcrumb current="Clients" />

      <header className="space-y-1.5">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Clients</h1>
        <p className="text-sm text-muted-foreground">
          {total === 0
            ? 'No clients yet — create one from the New assessment button to get started.'
            : `${total} client${total === 1 ? '' : 's'} on your roster${attentionCount > 0 ? ` · ${attentionCount} need${attentionCount === 1 ? 's' : ''} attention` : ''}.`}
        </p>
      </header>

      {/* Kit stat-row: 4 cards, 12px gap */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <WorkspaceKpiCard label="Active clients" value={total > 0 ? String(total) : '—'} />
        <WorkspaceKpiCard
          label="On track"
          value={total === 0 ? '—' : String(onTrack)}
          trend={total > 0 && onTrack === total ? { dir: 'up', label: 'all on track' } : undefined}
        />
        <WorkspaceKpiCard
          label="Needs attention"
          value={total === 0 ? '—' : String(attentionCount)}
          trend={
            overdue > 0
              ? { dir: 'down', label: `${overdue} overdue` }
              : attentionCount === 0 && total > 0
              ? { dir: 'up', label: 'all caught up' }
              : undefined
          }
        />
        <WorkspaceKpiCard
          label="Reports shared"
          value={reportsSharedPct === null ? '—' : `${reportsSharedPct}%`}
        />
      </div>

      {/* Client table wrapped in the kit's panel container */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-[20px] border border-border bg-card">
        <UnifiedClientTable
          loadingData={ctx.loadingData}
          clients={ctx.filteredClients}
          search={ctx.search}
          onSearchChange={ctx.setSearch}
          showCoachColumn={ctx.showCoachColumn}
          coachMap={ctx.coachMap}
          orgDefaultIntervals={ctx.orgSettings?.defaultCadence?.intervals}
          orgDefaultActivePillars={ctx.orgSettings?.defaultCadence?.activePillars}
          onViewHistory={ctx.handleViewHistory}
          onStartAssessment={(name) => void ctx.handleNewAssessmentForClient(name)}
          writeOrganizationId={ctx.profile?.organizationId}
          coachUid={ctx.user?.uid}
          profile={ctx.profile}
          onBulkComplete={ctx.refreshSchedules}
          attentionMap={attentionMap}
        />
      </div>
    </div>
  );
}

