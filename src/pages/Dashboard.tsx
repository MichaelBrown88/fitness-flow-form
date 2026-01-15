import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { AnalyticsDashboard } from '@/components/dashboard/AnalyticsDashboard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';

// Hook
import { useDashboardData } from '@/hooks/useDashboardData';

// Sub-components
import { DashboardHeader } from '@/components/dashboard/sub-components/DashboardHeader';
import { DashboardViewTabs } from '@/components/dashboard/sub-components/DashboardViewTabs';
import { AssessmentsTable } from '@/components/dashboard/sub-components/AssessmentsTable';
import { ClientsGrid } from '@/components/dashboard/sub-components/ClientsGrid';
import { DashboardDialogs } from '@/components/dashboard/sub-components/DashboardDialogs';

const Dashboard = () => {
  const navigate = useNavigate();
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
    visibleAssessmentsCount,
    visibleClientsCount,
    setVisibleClientsCount,
    hasMore,
    loadingMore,
    recentChanges,
    filtered,
    filteredClients,
    handleDelete,
    handleViewHistory,
    handleNewAssessmentForClient,
    loadMoreAssessments,
  } = useDashboardData();

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-400 font-bold uppercase tracking-widest">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
          <span>Syncing Coach Session…</span>
        </div>
      </div>
    );
  }

  const coachFirstName = user?.displayName ? user.displayName.split(' ')[0] : 'Coach';

  return (
    <ErrorBoundary>
      <AppShell title="Dashboard">
        <div className="max-w-[1400px] mx-auto space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-12 pb-12">
          
          <DashboardHeader coachFirstName={coachFirstName} />

          {/* Analytics Section */}
          <AnalyticsDashboard analytics={analytics} />

          {/* Recent Activity Section */}
          <RecentActivity recentChanges={recentChanges} />

          {/* Main Content Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 md:p-8 shadow-sm">
            <DashboardViewTabs 
              view={view}
              setView={setView}
              search={search}
              setSearch={setSearch}
            />

            {/* Assessments View */}
            {view === 'assessments' && (
              <AssessmentsTable 
                loadingData={loadingData}
                filtered={filtered}
                search={search}
                visibleCount={visibleAssessmentsCount}
                hasMore={hasMore}
                loadingMore={loadingMore}
                onLoadMore={loadMoreAssessments}
                onDelete={(id, name) => setDeleteDialog({ id, name })}
              />
            )}

            {/* Clients View */}
            {view === 'clients' && (
              <ClientsGrid 
                loadingData={loadingData}
                filteredClients={filteredClients}
                search={search}
                visibleCount={visibleClientsCount}
                setVisibleCount={setVisibleClientsCount}
                onNewAssessment={handleNewAssessmentForClient}
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
