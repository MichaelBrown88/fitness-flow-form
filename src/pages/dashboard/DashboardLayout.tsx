/**
 * Dashboard layout: shared data, header, checklist, tabs (NavLinks), and Outlet for child routes.
 */

import { useMemo, useState, useEffect } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { OfflineBanner } from '@/components/OfflineBanner';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Plus } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { clearDraft } from '@/hooks/useAssessmentDraft';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAuth } from '@/hooks/useAuth';
import { getRoadmapForClient } from '@/services/roadmaps';
import { getClientProfile } from '@/services/clientProfiles';
import { DashboardHeader } from '@/components/dashboard/sub-components/DashboardHeader';
import { DashboardViewTabs } from '@/components/dashboard/sub-components/DashboardViewTabs';
import { DashboardDialogs } from '@/components/dashboard/sub-components/DashboardDialogs';
import { GettingStartedChecklist } from '@/components/dashboard/GettingStartedChecklist';
import { generateTasks, type QueueEntry, type RoadmapNeededInfo, type ProfileGapInfo } from '@/lib/tasks/generateTasks';
import type { CoachTask } from '@/lib/tasks/generateTasks';

export type DashboardOutletContext = ReturnType<typeof useDashboardData> & {
  tasks: CoachTask[];
};

export default function DashboardLayout() {
  const dashboardData = useDashboardData();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, effectiveOrgId } = useAuth();

  const {
    loading,
    user: dataUser,
    analytics,
    filteredClients,
    reassessmentQueue,
  } = dashboardData;

  const [roadmapsNeeded, setRoadmapsNeeded] = useState<RoadmapNeededInfo[]>([]);
  const [incompleteProfiles, setIncompleteProfiles] = useState<ProfileGapInfo[]>([]);

  useEffect(() => {
    if (!effectiveOrgId || !dataUser || !filteredClients || filteredClients.length === 0) return;
    let cancelled = false;

    const timeoutId = window.setTimeout(() => {
      const run = async () => {
        const needed: RoadmapNeededInfo[] = [];
        const gaps: ProfileGapInfo[] = [];

        const clientsWithAssessments = filteredClients.filter((c) => c.assessments.length > 0);
        const checks = clientsWithAssessments.slice(0, 50).map(async (client) => {
          try {
            const roadmap = await getRoadmapForClient(effectiveOrgId, client.name);
            if (!roadmap && client.latestDate) {
              needed.push({ clientName: client.name, assessmentDate: client.latestDate });
            }
          } catch { /* skip */ }
        });

        const profileChecks = filteredClients.slice(0, 50).map(async (client) => {
          try {
            const p = await getClientProfile(dataUser.uid, client.name, effectiveOrgId);
            if (!p) return;
            const missing: string[] = [];
            if (!p.email) missing.push('email');
            if (!p.phone) missing.push('phone');
            if (!p.dateOfBirth) missing.push('date of birth');
            if (missing.length > 2) gaps.push({ clientName: client.name, missingFields: missing });
          } catch { /* skip */ }
        });

        await Promise.all([...checks, ...profileChecks]);
        if (!cancelled) {
          setRoadmapsNeeded(needed);
          setIncompleteProfiles(gaps);
        }
      };

      run();
    }, 800);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [effectiveOrgId, dataUser, filteredClients]);

  const tasks = useMemo(() => {
    if (!reassessmentQueue) return [];
    const queueEntries: QueueEntry[] = reassessmentQueue.queue.flatMap((client) =>
      client.pillarSchedules
        .filter((ps) => ps.status !== 'up-to-date')
        .map((ps) => ({
          clientName: client.clientName,
          pillar: ps.pillar,
          dueDate: ps.dueDate,
          status: ps.status === 'overdue' ? 'overdue' : 'due_soon',
          coachUid: client.coachUid ?? undefined,
        })),
    );
    return generateTasks({
      reassessmentQueue: queueEntries,
      draftAssessments: [],
      roadmapsDueForReview: [],
      roadmapsNeeded,
      incompleteProfiles,
    });
  }, [reassessmentQueue, roadmapsNeeded, incompleteProfiles]);

  const handleGlobalNewAssessment = () => {
    sessionStorage.removeItem(STORAGE_KEYS.PARTIAL_ASSESSMENT);
    sessionStorage.removeItem(STORAGE_KEYS.IS_DEMO);
    sessionStorage.removeItem(STORAGE_KEYS.PREFILL_CLIENT);
    sessionStorage.removeItem(STORAGE_KEYS.EDIT_ASSESSMENT);
    clearDraft();
    navigate(ROUTES.ASSESSMENT);
  };

  const overdueCountVal = reassessmentQueue?.summary?.overdue ?? 0;

  if (loading || !dataUser) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-400 font-medium">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
          <span>Loading your dashboard…</span>
        </div>
      </div>
    );
  }

  const coachFirstName = dataUser?.displayName ? dataUser.displayName.split(' ')[0] : 'Coach';

  return (
    <ErrorBoundary>
      <OfflineBanner />
      <AppShell
        title="Dashboard"
        hideTitle
        actions={
          <Button
            onClick={handleGlobalNewAssessment}
            className="h-9 px-4 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 gap-2 text-xs"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Assessment</span>
          </Button>
        }
      >
        <div className="max-w-[1400px] mx-auto space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-12 pb-12 overflow-x-hidden">
          <DashboardHeader
            coachFirstName={coachFirstName}
            totalClients={analytics?.totalClients ?? 0}
            totalAssessments={analytics?.totalAssessments ?? 0}
          />

          <GettingStartedChecklist
            hasClients={(analytics?.totalClients ?? 0) > 0}
            hasAssessments={(analytics?.totalAssessments ?? 0) > 0}
            hasSharedReport={false}
          />

          <div className="bg-white rounded-2xl p-3 sm:p-4 md:p-6 lg:p-8 overflow-hidden">
            <DashboardViewTabs
              search={dashboardData.search}
              setSearch={dashboardData.setSearch}
              scheduleCount={overdueCountVal}
              showTeamTab={dashboardData.showTeamTab}
              useRouterLinks
            />

            <Outlet context={{ ...dashboardData, tasks } satisfies DashboardOutletContext} />
          </div>
        </div>

        <DashboardDialogs
          deleteDialog={dashboardData.deleteDialog}
          setDeleteDialog={dashboardData.setDeleteDialog}
          onDelete={dashboardData.handleDelete}
          clientHistoryDialog={dashboardData.clientHistoryDialog}
          setClientHistoryDialog={dashboardData.setClientHistoryDialog}
          clientHistory={dashboardData.clientHistory}
          clientSummaryId={dashboardData.clientSummaryId}
          loadingHistory={dashboardData.loadingHistory}
          onNewAssessment={dashboardData.handleNewAssessmentForClient}
          onEditSnapshot={dashboardData.handleEditSnapshot}
          deleteSnapshotDialog={dashboardData.deleteSnapshotDialog}
          setDeleteSnapshotDialog={dashboardData.setDeleteSnapshotDialog}
          onDeleteSnapshot={dashboardData.handleDeleteSnapshot}
        />
      </AppShell>
    </ErrorBoundary>
  );
}
