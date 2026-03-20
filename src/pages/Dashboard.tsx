import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Plus } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { clearDraft } from '@/hooks/useAssessmentDraft';

import { useMemo, useState, useEffect } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAuth } from '@/hooks/useAuth';
import { getRoadmapForClient } from '@/services/roadmaps';
import { getClientProfile } from '@/services/clientProfiles';

import { DashboardHeader } from '@/components/dashboard/sub-components/DashboardHeader';
import { DashboardViewTabs } from '@/components/dashboard/sub-components/DashboardViewTabs';
import { UnifiedClientTable } from '@/components/dashboard/sub-components/UnifiedClientTable';
import { DashboardDialogs } from '@/components/dashboard/sub-components/DashboardDialogs';
import { TaskListView } from '@/components/dashboard/sub-components/TaskListView';
import { CalendarView } from '@/components/dashboard/sub-components/CalendarView';
import { TeamView } from '@/components/dashboard/sub-components/TeamView';
import { GettingStartedChecklist } from '@/components/dashboard/GettingStartedChecklist';
import { generateTasks, type QueueEntry, type RoadmapNeededInfo, type ProfileGapInfo } from '@/lib/tasks/generateTasks';

const Dashboard = () => {
  const {
    user,
    profile,
    loading,
    loadingData,
    search,
    setSearch,
    view,
    setView,
    deleteDialog,
    setDeleteDialog,
    clientHistoryDialog,
    setClientHistoryDialog,
    clientHistory,
    clientSummaryId,
    loadingHistory,
    handleViewHistory,
    deleteSnapshotDialog,
    setDeleteSnapshotDialog,
    handleEditSnapshot,
    handleDeleteSnapshot,
    analytics,
    filteredClients,
    reassessmentQueue,
    refreshSchedules,
    handleDelete,
    handleNewAssessmentForClient,
    showTeamTab,
    showCoachColumn,
    coachMap,
    orgSettings,
  } = useDashboardData();

  const navigate = useNavigate();
  const { effectiveOrgId } = useAuth();
  const overdueCount = reassessmentQueue?.summary?.overdue || 0;

  const [roadmapsNeeded, setRoadmapsNeeded] = useState<RoadmapNeededInfo[]>([]);
  const [incompleteProfiles, setIncompleteProfiles] = useState<ProfileGapInfo[]>([]);

  useEffect(() => {
    if (!effectiveOrgId || !user || !filteredClients || filteredClients.length === 0) return;
    let cancelled = false;

    (async () => {
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
          const p = await getClientProfile(user.uid, client.name, effectiveOrgId);
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
    })();

    return () => { cancelled = true; };
  }, [effectiveOrgId, user, filteredClients]);

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

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-400 font-medium">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
          <span>Loading your dashboard…</span>
        </div>
      </div>
    );
  }

  const coachFirstName = user?.displayName ? user.displayName.split(' ')[0] : 'Coach';

  return (
    <ErrorBoundary>
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
            overdueCount={overdueCount}
          />

          <GettingStartedChecklist
            hasClients={(analytics?.totalClients ?? 0) > 0}
            hasAssessments={(analytics?.totalAssessments ?? 0) > 0}
            hasSharedReport={false}
          />

          {/* Main Content */}
          <div className="bg-white rounded-2xl p-3 sm:p-4 md:p-6 lg:p-8 overflow-hidden">
            <DashboardViewTabs 
              view={view}
              setView={setView}
              search={search}
              setSearch={setSearch}
              scheduleCount={overdueCount}
              showTeamTab={showTeamTab}
            />

            {/* Clients View */}
            {view === 'clients' && (
              <UnifiedClientTable
                loadingData={loadingData}
                clients={filteredClients}
                search={search}
                showCoachColumn={showCoachColumn}
                coachMap={coachMap}
                orgDefaultIntervals={orgSettings?.defaultCadence?.intervals}
                orgDefaultActivePillars={orgSettings?.defaultCadence?.activePillars}
                onViewHistory={handleViewHistory}
              />
            )}

            {/* Tasks View */}
            {view === 'schedule' && (
              <TaskListView tasks={tasks} search={search} />
            )}

            {/* Calendar View */}
            {view === 'calendar' && reassessmentQueue && (
              <CalendarView
                reassessmentQueue={reassessmentQueue}
                onNewAssessmentForClient={handleNewAssessmentForClient}
                organizationId={profile?.organizationId}
                onScheduleChanged={refreshSchedules}
              />
            )}

            {/* Team View (Admin Only) */}
            {view === 'team' && showTeamTab && (
              <TeamView search={search} />
            )}
          </div>
        </div>

        <DashboardDialogs
          deleteDialog={deleteDialog}
          setDeleteDialog={setDeleteDialog}
          onDelete={handleDelete}
          clientHistoryDialog={clientHistoryDialog}
          setClientHistoryDialog={setClientHistoryDialog}
          clientHistory={clientHistory}
          clientSummaryId={clientSummaryId}
          loadingHistory={loadingHistory}
          onNewAssessment={handleNewAssessmentForClient}
          onEditSnapshot={handleEditSnapshot}
          deleteSnapshotDialog={deleteSnapshotDialog}
          setDeleteSnapshotDialog={setDeleteSnapshotDialog}
          onDeleteSnapshot={handleDeleteSnapshot}
        />
      </AppShell>
    </ErrorBoundary>
  );
};

export default Dashboard;
