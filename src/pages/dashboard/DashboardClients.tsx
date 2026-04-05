import { useOutletContext } from 'react-router-dom';
import { Users, AlertTriangle } from 'lucide-react';
import { UnifiedClientTable } from '@/components/dashboard/sub-components/UnifiedClientTable';
import { RecentAssessmentsList } from '@/components/dashboard/sub-components/RecentAssessmentsList';
import type { DashboardOutletContext } from './DashboardLayout';

export default function DashboardClients() {
  const ctx = useOutletContext<DashboardOutletContext>();

  const total = ctx.analytics?.totalClients ?? 0;
  const overdue = ctx.reassessmentQueue?.summary?.overdue ?? 0;
  const dueSoon = ctx.reassessmentQueue?.summary?.dueSoon ?? 0;

  return (
    <div className="flex flex-col gap-5 pt-3 pb-6">
      {/* Stats row */}
      <div className="mx-auto w-full max-w-5xl px-3 sm:px-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-3 rounded-xl bg-muted px-4 py-3 min-w-[110px]">
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Clients</div>
              <div className="text-xl font-bold text-foreground">{total}</div>
            </div>
          </div>
          {overdue > 0 && (
            <div className="flex items-center gap-3 rounded-xl bg-score-red-muted/40 border border-score-red/30 px-4 py-3 min-w-[110px]">
              <AlertTriangle className="h-4 w-4 text-score-red-fg shrink-0" />
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.15em] text-score-red-fg">Overdue</div>
                <div className="text-xl font-bold text-score-red-fg">{overdue}</div>
              </div>
            </div>
          )}
          {dueSoon > 0 && overdue === 0 && (
            <div className="flex items-center gap-3 rounded-xl bg-score-amber-muted/40 border border-score-amber/30 px-4 py-3 min-w-[110px]">
              <AlertTriangle className="h-4 w-4 text-score-amber-fg shrink-0" />
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.15em] text-score-amber-fg">Due Soon</div>
                <div className="text-xl font-bold text-score-amber-fg">{dueSoon}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl shrink-0">
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
      <div className="mx-auto w-full max-w-5xl min-h-0 shrink-0">
        <RecentAssessmentsList clients={ctx.clientGroups ?? []} />
      </div>
    </div>
  );
}
