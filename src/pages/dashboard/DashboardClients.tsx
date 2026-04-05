import { useOutletContext } from 'react-router-dom';
import { UnifiedClientTable } from '@/components/dashboard/sub-components/UnifiedClientTable';
import { RecentAssessmentsList } from '@/components/dashboard/sub-components/RecentAssessmentsList';
import type { DashboardOutletContext } from './DashboardLayout';

export default function DashboardClients() {
  const ctx = useOutletContext<DashboardOutletContext>();
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
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
