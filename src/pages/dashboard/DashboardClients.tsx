import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Users, AlertTriangle, ClipboardCheck, CheckCircle2, TrendingUp } from 'lucide-react';
import { UnifiedClientTable } from '@/components/dashboard/sub-components/UnifiedClientTable';
import type { DashboardOutletContext } from './DashboardLayout';

export default function DashboardClients() {
  const ctx = useOutletContext<DashboardOutletContext>();

  const total = ctx.analytics?.totalClients ?? 0;
  const totalAssessments = ctx.analytics?.totalAssessments ?? 0;
  const overdue = ctx.reassessmentQueue?.summary?.overdue ?? 0;
  const dueSoon = ctx.reassessmentQueue?.summary?.dueSoon ?? 0;
  const onTrack = useMemo(() => {
    if (!ctx.reassessmentQueue) return 0;
    return ctx.reassessmentQueue.queue.filter(q => q.status === 'up-to-date').length;
  }, [ctx.reassessmentQueue]);
  const sharedCount = useMemo(() => {
    return (ctx.clientGroups ?? []).filter(c => c.shareToken).length;
  }, [ctx.clientGroups]);

  return (
    <div className="flex flex-col gap-6 py-6 sm:py-8 lg:py-10 px-4 sm:px-6 lg:px-8">
      {/* Metrics dashboard */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-3 rounded-xl bg-muted px-5 py-4 min-w-[120px]">
          <Users className="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Clients</div>
            <div className="text-2xl font-bold text-foreground">{total}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-muted px-5 py-4 min-w-[120px]">
          <ClipboardCheck className="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Assessments</div>
            <div className="text-2xl font-bold text-foreground">{totalAssessments}</div>
          </div>
        </div>
        {overdue > 0 && (
          <div className="flex items-center gap-3 rounded-xl bg-score-red-muted/40 border border-score-red/30 px-5 py-4 min-w-[120px]">
            <AlertTriangle className="h-5 w-5 text-score-red-fg shrink-0" />
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.15em] text-score-red-fg">Overdue</div>
              <div className="text-2xl font-bold text-score-red-fg">{overdue}</div>
            </div>
          </div>
        )}
        {dueSoon > 0 && (
          <div className="flex items-center gap-3 rounded-xl bg-score-amber-muted/40 border border-score-amber/30 px-5 py-4 min-w-[120px]">
            <AlertTriangle className="h-5 w-5 text-score-amber-fg shrink-0" />
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.15em] text-score-amber-fg">Due Soon</div>
              <div className="text-2xl font-bold text-score-amber-fg">{dueSoon}</div>
            </div>
          </div>
        )}
        {onTrack > 0 && (
          <div className="flex items-center gap-3 rounded-xl bg-score-green-muted/40 border border-score-green/30 px-5 py-4 min-w-[120px]">
            <CheckCircle2 className="h-5 w-5 text-score-green-fg shrink-0" />
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.15em] text-score-green-fg">On Track</div>
              <div className="text-2xl font-bold text-score-green-fg">{onTrack}</div>
            </div>
          </div>
        )}
        {sharedCount > 0 && (
          <div className="flex items-center gap-3 rounded-xl bg-muted px-5 py-4 min-w-[120px]">
            <TrendingUp className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Reports Shared</div>
              <div className="text-2xl font-bold text-foreground">{sharedCount}</div>
            </div>
          </div>
        )}
      </div>

      {/* Client table fills remaining space */}
      <div className="w-full flex-1 min-h-0">
        <UnifiedClientTable
          loadingData={ctx.loadingData}
          clients={ctx.filteredClients}
          search={ctx.search}
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
        />
      </div>
    </div>
  );
}
