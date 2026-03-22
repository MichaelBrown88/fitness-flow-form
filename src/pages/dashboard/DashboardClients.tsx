import { useOutletContext } from 'react-router-dom';
import { UnifiedClientTable } from '@/components/dashboard/sub-components/UnifiedClientTable';
import type { DashboardOutletContext } from './DashboardLayout';

export default function DashboardClients() {
  const ctx = useOutletContext<DashboardOutletContext>();
  return (
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
  );
}
