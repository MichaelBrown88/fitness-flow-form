import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { AnalyticsDashboard } from '@/components/dashboard/AnalyticsDashboard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { AlertCircle, X, Plus } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { STORAGE_KEYS } from '@/constants/storageKeys';

// Hook
import { useDashboardData } from '@/hooks/useDashboardData';

// Sub-components
import { DashboardHeader } from '@/components/dashboard/sub-components/DashboardHeader';
import { DashboardViewTabs } from '@/components/dashboard/sub-components/DashboardViewTabs';
import { UnifiedClientTable } from '@/components/dashboard/sub-components/UnifiedClientTable';
import { DashboardDialogs } from '@/components/dashboard/sub-components/DashboardDialogs';
import { PriorityView } from '@/components/dashboard/sub-components/PriorityView';

const Dashboard = () => {
  const {
    user,
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
    loadingHistory,
    analytics,
    recentChanges,
    filteredClients,
    clientGroups,
    reassessmentQueue,
    refreshSchedules,
    handleDelete,
    handleNewAssessmentForClient,
  } = useDashboardData();

  const navigate = useNavigate();
  const [alertDismissed, setAlertDismissed] = useState(false);
  const overdueCount = reassessmentQueue?.summary?.overdue || 0;

  const handleGlobalNewAssessment = () => {
    sessionStorage.removeItem(STORAGE_KEYS.PARTIAL_ASSESSMENT);
    sessionStorage.removeItem(STORAGE_KEYS.IS_DEMO);
    sessionStorage.removeItem('prefillClientData');
    sessionStorage.removeItem('editAssessment');
    navigate(ROUTES.ASSESSMENT);
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-400 font-bold uppercase tracking-widest">
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
        <div className="max-w-[1400px] mx-auto space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-12 pb-12">
          
          <DashboardHeader coachFirstName={coachFirstName} />

        {/* Analytics & Recent Activity — only on Clients tab */}
        {view === 'clients' && (
          <>
            <AnalyticsDashboard analytics={analytics} />
            <RecentActivity recentChanges={recentChanges} />
          </>
        )}

          {/* Overdue Alert */}
          {view === 'clients' && overdueCount > 0 && !alertDismissed && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800 flex-1">
                <span className="font-bold">{overdueCount} client{overdueCount > 1 ? 's' : ''}</span> {overdueCount > 1 ? 'have' : 'has'} overdue reassessments.{' '}
                <button onClick={() => setView('priority')} className="underline font-semibold hover:text-amber-900">
                  View priority list
                </button>
              </p>
              <button onClick={() => setAlertDismissed(true)} className="text-amber-400 hover:text-amber-600 shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Main Content Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 md:p-8 shadow-sm">
            <DashboardViewTabs 
              view={view}
              setView={setView}
              search={search}
              setSearch={setSearch}
              priorityCount={overdueCount}
            />

          {/* Clients View (Unified Table) */}
          {view === 'clients' && (
              <UnifiedClientTable 
                loadingData={loadingData}
                clients={filteredClients}
                search={search}
                onNewAssessment={handleNewAssessmentForClient}
              />
          )}

          {/* Priority View */}
          {view === 'priority' && reassessmentQueue && (
              <PriorityView 
                reassessmentQueue={reassessmentQueue}
                onNewAssessmentForClient={handleNewAssessmentForClient}
                onScheduleChanged={refreshSchedules}
                search={search}
              />
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
          loadingHistory={loadingHistory}
          onNewAssessment={handleNewAssessmentForClient}
        />
    </AppShell>
    </ErrorBoundary>
  );
};

export default Dashboard;
