/**
 * Coach workspace layout: sidebar, pills, conditional search, assistant provider, Outlet.
 */

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { Timestamp } from 'firebase/firestore';
import AppShell from '@/components/layout/AppShell';
import { OfflineBanner } from '@/components/OfflineBanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Plus, Menu, PanelLeftClose, PanelLeftOpen, Search, AlertTriangle } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { COACH_ASSISTANT_COPY } from '@/constants/coachAssistantCopy';
import {
  writePrefillClientPayload,
} from '@/lib/assessment/assessmentSessionStorage';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAuth } from '@/hooks/useAuth';
import { getRoadmapForClient } from '@/services/roadmaps';
import { getClientProfile, resolveClientDisplayNameFromOrgClientDoc } from '@/services/clientProfiles';
import { formatClientDisplayName } from '@/lib/utils/clientDisplayName';
import { useToast } from '@/hooks/use-toast';
import { DashboardHeader } from '@/components/dashboard/sub-components/DashboardHeader';
import { CoachWorkspacePills } from '@/components/dashboard/CoachWorkspacePills';
import { CoachWorkspaceSidebar, CoachWorkspaceSidebarCollapsed } from '@/components/dashboard/CoachWorkspaceSidebar';
import { CoachWorkspaceProfileFooter } from '@/components/dashboard/CoachWorkspaceProfileFooter';
import { DashboardDialogs } from '@/components/dashboard/sub-components/DashboardDialogs';
import { GettingStartedChecklist } from '@/components/dashboard/GettingStartedChecklist';
import { generateTasks, type QueueEntry, type RoadmapNeededInfo, type ProfileGapInfo } from '@/lib/tasks/generateTasks';
import { DASHBOARD_TASKS } from '@/constants/dashboardTasksCopy';
import type { CoachTask } from '@/lib/tasks/generateTasks';
import { staffPreferredFirstName } from '@/lib/utils/staffDisplayName';
import { Seo } from '@/components/seo/Seo';
import { getDashboardSeoForPathname } from '@/constants/seo';
import { CoachAssistantProvider } from '@/contexts/CoachAssistantContext';
import { useCoachAssistant } from '@/hooks/useCoachAssistant';
import {
  useCoachArtifacts,
  type CoachAchievementShareRow,
  type CoachArtifactRow,
  type CoachRoadmapShareRow,
  type CoachShareablePreview,
} from '@/hooks/useCoachArtifacts';
import { CoachArtifactPreviewSheet } from '@/components/dashboard/CoachArtifactPreviewSheet';
import { NewClientModal } from '@/components/dashboard/NewClientModal';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DASHBOARD_SHELL_COPY } from '@/constants/dashboardShellCopy';
import { cn } from '@/lib/utils';
import { useOrgHealthCheck } from '@/hooks/useOrgHealthCheck';
import { OrgSetupWizard } from '@/components/onboarding/OrgSetupWizard';

export type DashboardOutletContext = ReturnType<typeof useDashboardData> & {
  tasks: CoachTask[];
  openShareablePreview: (preview: CoachShareablePreview) => void;
  reportShares: CoachArtifactRow[];
  roadmapShares: CoachRoadmapShareRow[];
  achievementShares: CoachAchievementShareRow[];
  shareablesLoading: boolean;
  shareablesError: string | null;
};

function trialEndedAt(trialEndsAt: unknown): boolean {
  const d =
    trialEndsAt instanceof Timestamp
      ? trialEndsAt.toDate()
      : trialEndsAt instanceof Date
        ? trialEndsAt
        : null;
  if (!d) return false;
  return d.getTime() < Date.now();
}

export default function DashboardLayout() {
  const dashboardData = useDashboardData();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, effectiveOrgId, orgSettings, profile } = useAuth();
  const { loading: healthLoading, allHealthy } = useOrgHealthCheck();
  const dashboardClientQueryHandledRef = useRef<string>('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [assistantSidebarCollapsed, setAssistantSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.COACH_ASSISTANT_SIDEBAR_COLLAPSED) === '1';
    } catch {
      return false;
    }
  });
  const [shareablePreview, setShareablePreview] = useState<CoachShareablePreview | null>(null);

  const toggleAssistantSidebarCollapsed = useCallback(() => {
    setAssistantSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEYS.COACH_ASSISTANT_SIDEBAR_COLLAPSED, next ? '1' : '0');
      } catch {
        /* localStorage unavailable */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const p = location.pathname;
    const inWorkspace =
      p === ROUTES.DASHBOARD ||
      p === ROUTES.DASHBOARD_ARTIFACTS ||
      p.startsWith(ROUTES.DASHBOARD_ASSISTANT) ||
      p.startsWith(ROUTES.DASHBOARD_CLIENTS) ||
      p.startsWith(ROUTES.DASHBOARD_WORK) ||
      p.startsWith(ROUTES.DASHBOARD_TEAM);
    if (!inWorkspace) setMobileSidebarOpen(false);
  }, [location.pathname]);

  const {
    loading,
    user: dataUser,
    analytics,
    filteredClients,
    hasSharedReport,
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
          } catch {
            /* skip */
          }
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
          } catch {
            /* skip */
          }
        });

        await Promise.all([...checks, ...profileChecks]);
        if (!cancelled) {
          setRoadmapsNeeded(needed);
          setIncompleteProfiles(gaps);
        }
      };

      void run();
    }, 800);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [effectiveOrgId, dataUser, filteredClients]);

  const trialDaysRemaining = useMemo(() => {
    const sub = orgSettings?.subscription;
    if (!sub || sub.planKind === 'solo_free' || sub.status !== 'trial') return null;
    const d =
      sub.trialEndsAt instanceof Timestamp
        ? sub.trialEndsAt.toDate()
        : sub.trialEndsAt instanceof Date
          ? sub.trialEndsAt
          : null;
    if (!d) return null;
    const ms = d.getTime() - Date.now();
    if (ms <= 0) return null; // already ended — redirect handles this
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  }, [orgSettings]);

  useEffect(() => {
    if (!orgSettings || !profile?.onboardingCompleted) return;
    const path = location.pathname;
    if (
      path.startsWith(ROUTES.SUBSCRIBE) ||
      path.startsWith(ROUTES.BILLING) ||
      path.startsWith(ROUTES.ONBOARDING)
    ) {
      return;
    }
    const sub = orgSettings.subscription;
    if (!sub || sub.planKind === 'solo_free') return;
    if (sub.status !== 'trial') return;
    if (!trialEndedAt(sub.trialEndsAt)) return;
    navigate(ROUTES.SUBSCRIBE, { replace: true, state: { from: path } });
  }, [orgSettings, profile?.onboardingCompleted, location.pathname, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get('client');
    if (!raw?.trim() || !effectiveOrgId) return;
    const dedupeKey = `${effectiveOrgId}|${location.pathname}|${raw}`;
    if (dashboardClientQueryHandledRef.current === dedupeKey) return;
    dashboardClientQueryHandledRef.current = dedupeKey;
    let cancelled = false;
    void (async () => {
      const decoded = decodeURIComponent(raw.trim());
      let fullName = await resolveClientDisplayNameFromOrgClientDoc(effectiveOrgId, decoded);
      if (cancelled) return;
      if (!fullName) {
        fullName = formatClientDisplayName(decoded);
      }
      writePrefillClientPayload({ fullName });
      params.delete('client');
      const nextSearch = params.toString();
      navigate(
        {
          pathname: location.pathname,
          search: nextSearch ? `?${nextSearch}` : '',
          hash: location.hash,
        },
        { replace: true },
      );
      toast({
        title: DASHBOARD_TASKS.CLIENT_QUERY_TOAST_TITLE,
        description: DASHBOARD_TASKS.CLIENT_QUERY_TOAST_DESC(fullName),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveOrgId, location.pathname, location.search, location.hash, navigate, toast]);

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

  const assistantApi = useCoachAssistant({
    coachUid: dataUser?.uid,
    organizationId: effectiveOrgId ?? undefined,
    tasks,
    /** Full roster — assistant matching and AI context must not depend on the clients-tab search box. */
    clients: dashboardData.clientGroups,
    reassessmentQueue: dashboardData.reassessmentQueue,
    orgSubscription: orgSettings?.subscription,
    isOrgAdmin: dashboardData.isAdmin,
    isActiveCoach: dashboardData.isActiveCoach,
    coachMap: dashboardData.coachMap,
  });

  const {
    reportRows,
    roadmapRows,
    achievementRows,
    loading: shareablesLoading,
    error: shareablesError,
  } = useCoachArtifacts(dataUser?.uid, effectiveOrgId ?? undefined);

  const openShareablePreview = useCallback((preview: CoachShareablePreview) => {
    setShareablePreview(preview);
  }, []);

  const [newClientModalOpen, setNewClientModalOpen] = useState(false);

  const overdueCountVal = reassessmentQueue?.summary?.overdue ?? 0;

  if (loading || !dataUser) {
    return (
      <div
        className="flex min-h-screen items-center justify-center text-sm text-muted-foreground font-medium"
        aria-busy="true"
        aria-live="polite"
        role="status"
      >
        <div className="flex flex-col items-center gap-4">
          <span className="sr-only">Loading your dashboard</span>
          <div className="w-8 h-8 border-4 border-muted-foreground/25 border-t-primary rounded-full motion-safe:animate-spin" />
          <span aria-hidden>Loading your dashboard…</span>
        </div>
      </div>
    );
  }

  const coachFirstName = staffPreferredFirstName(profile, dataUser);
  const dashboardSeo = getDashboardSeoForPathname(location.pathname);
  const path = location.pathname;
  const isWorkspaceShell =
    path === ROUTES.DASHBOARD ||
    path === ROUTES.DASHBOARD_ARTIFACTS ||
    path.startsWith(ROUTES.DASHBOARD_ASSISTANT) ||
    path.startsWith(ROUTES.DASHBOARD_CLIENTS) ||
    path.startsWith(ROUTES.DASHBOARD_WORK) ||
    path.startsWith(ROUTES.DASHBOARD_TEAM);
  // Assistant tab manages its own scroll; other workspace tabs use the outer container
  const isAssistantTab =
    path === ROUTES.DASHBOARD ||
    path === ROUTES.DASHBOARD_ARTIFACTS ||
    path.startsWith(ROUTES.DASHBOARD_ASSISTANT);
  const showClientSearch =
    path.startsWith(ROUTES.DASHBOARD_CLIENTS) ||
    path.startsWith(ROUTES.DASHBOARD_TEAM);

  const sidebarProps = {
    threads: assistantApi.threads,
    activeThreadId: assistantApi.activeThreadId,
    onNewChat: assistantApi.createNewThread,
    onSelectThread: (id: string) => {
      assistantApi.selectThread(id);
      setMobileSidebarOpen(false);
    },
    onDeleteThread: assistantApi.deleteThread,
    reportShares: reportRows,
    roadmapShares: roadmapRows,
    achievementShares: achievementRows,
    shareablesLoading,
    onShareablePreview: (p: CoachShareablePreview) => {
      openShareablePreview(p);
      setMobileSidebarOpen(false);
    },
    recentClients: (reassessmentQueue?.queue ?? [])
      .filter((item) => item.status === 'overdue' || item.status === 'due-soon')
      .slice(0, 8)
      .map((item) => ({ name: item.clientName })),
    showTeamTab: dashboardData.showTeamTab,
  };

  // Org health check: show catch-up wizard for legacy orgs missing required fields.
  // Wait until both auth and orgSettings have loaded before deciding.
  if (!healthLoading && !allHealthy) {
    return <OrgSetupWizard onComplete={() => { /* AuthContext onSnapshot auto-updates after Firestore write */ }} />;
  }

  return (
    <ErrorBoundary>
      <Seo
        pathname={location.pathname}
        title={dashboardSeo.title}
        description={dashboardSeo.description}
        noindex={dashboardSeo.noindex}
      />
      <OfflineBanner />
      <CoachAssistantProvider value={assistantApi}>
        <AppShell
          title="Dashboard"
          hideTitle
          variant="full-width"
          hideCoachBrandAndUser
          lockViewportHeight={isWorkspaceShell}
          headerLeading={
            isWorkspaceShell ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground lg:hidden"
                  onClick={() => setMobileSidebarOpen(true)}
                  aria-label={COACH_ASSISTANT_COPY.MOBILE_SIDEBAR}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="hidden h-9 w-9 text-muted-foreground lg:flex"
                  onClick={toggleAssistantSidebarCollapsed}
                  aria-label={
                    assistantSidebarCollapsed
                      ? COACH_ASSISTANT_COPY.SIDEBAR_EXPAND_ARIA
                      : COACH_ASSISTANT_COPY.SIDEBAR_COLLAPSE_ARIA
                  }
                  aria-expanded={!assistantSidebarCollapsed}
                >
                  {assistantSidebarCollapsed ? (
                    <PanelLeftOpen className="h-5 w-5" />
                  ) : (
                    <PanelLeftClose className="h-5 w-5" />
                  )}
                </Button>
              </>
            ) : undefined
          }
          headerCenter={
            <CoachWorkspacePills
              variant="toolbar"
              scheduleCount={overdueCountVal}
            />
          }
          actions={
            <Button
              type="button"
              onClick={() => setNewClientModalOpen(true)}
              className="h-9 px-4 font-bold gap-2 text-xs"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Client</span>
            </Button>
          }
        >
          <a
            href="#workspace-main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-16 focus:z-[60] focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:ring-2 focus:ring-ring"
          >
            {COACH_ASSISTANT_COPY.SKIP_MAIN}
          </a>

          <div
            className={cn(
              'flex min-h-0 w-full flex-1 items-stretch',
              isWorkspaceShell && 'overflow-hidden',
            )}
          >
            {isWorkspaceShell ? (
              <>
                {assistantSidebarCollapsed ? (
                  <CoachWorkspaceSidebarCollapsed
                    onNewChat={sidebarProps.onNewChat}
                    hasAttention={sidebarProps.recentClients.length > 0}
                  />
                ) : (
                  <CoachWorkspaceSidebar {...sidebarProps} className="hidden lg:flex" />
                )}
                <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
                  <SheetContent
                    side="left"
                    className="flex h-full max-h-[100dvh] w-[280px] flex-col overflow-hidden border-r-0 p-0"
                  >
                    <CoachWorkspaceSidebar
                      {...sidebarProps}
                      className="flex min-h-0 w-full flex-1 flex-col border-0"
                    />
                  </SheetContent>
                </Sheet>
              </>
            ) : null}

            <div
              className={cn(
                'flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden',
                isWorkspaceShell
                  ? 'pt-2 sm:pt-3 px-0 pb-0 sm:px-2 lg:px-3'
                  : 'px-3 pb-20 sm:px-4 sm:pb-6 md:px-5 lg:px-6',
              )}
            >
              {trialDaysRemaining !== null && trialDaysRemaining <= 7 && (
                <div className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm mb-3 border ${
                  trialDaysRemaining <= 1
                    ? 'bg-score-red-muted/60 border-score-red-fg/30 text-score-red-fg'
                    : trialDaysRemaining <= 3
                      ? 'bg-score-amber-muted/60 border-score-amber-fg/30 text-score-amber-fg'
                      : 'bg-muted/60 border-border text-foreground'
                }`}>
                  <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="flex-1 font-medium">
                    {trialDaysRemaining === 1
                      ? 'Your free trial ends tomorrow.'
                      : `Your free trial ends in ${trialDaysRemaining} days.`}
                    {' '}Choose a plan to keep your data and continue using the platform.
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => navigate(ROUTES.BILLING)}
                    className="shrink-0 h-8 px-3 text-xs font-semibold"
                    variant={trialDaysRemaining !== null && trialDaysRemaining <= 1 ? 'destructive' : 'default'}
                  >
                    See plans
                  </Button>
                </div>
              )}

              {!isWorkspaceShell && (
                <DashboardHeader
                  variant="default"
                  coachFirstName={coachFirstName}
                  totalClients={analytics?.totalClients ?? 0}
                  totalAssessments={analytics?.totalAssessments ?? 0}
                  overdueCount={reassessmentQueue?.summary?.overdue ?? 0}
                />
              )}

              <div
                className={cn(
                  'flex min-h-0 flex-1 flex-col',
                  isWorkspaceShell ? 'mt-0 gap-0' : 'gap-4 sm:gap-6 mt-4 sm:mt-6 md:mt-8',
                )}
              >
                <div
                  className={cn(
                    'flex flex-col flex-1 min-h-0 min-w-0 text-foreground',
                    isAssistantTab
                      ? 'overflow-hidden'
                      : isWorkspaceShell
                        ? 'overflow-y-auto overscroll-contain'
                        : 'overflow-x-hidden pt-3 sm:pt-4',
                  )}
                  id="workspace-main"
                >
                  {showClientSearch && (
                    <TooltipProvider delayDuration={300}>
                      <div className="mx-auto w-full max-w-5xl px-3 pt-6 pb-2 sm:px-4 sm:pt-12">
                        <div className="relative max-w-xs">
                          <Input
                            placeholder={
                              path.startsWith(ROUTES.DASHBOARD_TEAM)
                                ? DASHBOARD_SHELL_COPY.SEARCH_COACHES_PLACEHOLDER
                                : DASHBOARD_SHELL_COPY.SEARCH_CLIENTS_PLACEHOLDER
                            }
                            value={dashboardData.search}
                            onChange={(e) => dashboardData.setSearch(e.target.value)}
                            className="h-10 w-full rounded-lg border-input bg-background pl-4 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-ring sm:h-11"
                            aria-label={
                              path.startsWith(ROUTES.DASHBOARD_TEAM)
                                ? DASHBOARD_SHELL_COPY.SEARCH_COACHES_PLACEHOLDER
                                : DASHBOARD_SHELL_COPY.SEARCH_CLIENTS_PLACEHOLDER
                            }
                          />
                          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" aria-hidden>
                            <Search className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
                          </div>
                        </div>
                      </div>
                    </TooltipProvider>
                  )}

                  <div className={cn('flex flex-col min-w-0', isAssistantTab ? 'flex-1 min-h-0' : isWorkspaceShell ? 'flex-1' : 'flex-none')}>
                    <Outlet
                      context={
                        {
                          ...dashboardData,
                          tasks,
                          openShareablePreview,
                          reportShares: reportRows,
                          roadmapShares: roadmapRows,
                          achievementShares: achievementRows,
                          shareablesLoading,
                          shareablesError,
                        } satisfies DashboardOutletContext
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <GettingStartedChecklist
            hasClients={(analytics?.totalClients ?? 0) > 0}
            hasAssessments={(analytics?.totalAssessments ?? 0) > 0}
            hasSharedReport={hasSharedReport}
            primaryAssessmentIdForShare={
              filteredClients.find((c) => c.assessments.length > 0)?.assessments[0]?.id ?? null
            }
            primaryClientNameForShare={
              filteredClients.find((c) => c.assessments.length > 0)?.name ?? null
            }
            businessProfileComplete={Boolean(orgSettings?.name?.trim() && orgSettings?.region)}
            equipmentDetailsDone={Boolean(orgSettings?.onboardingCompletedAt)}
            isOrgAdmin={profile?.role === 'org_admin'}
            showTrialSubscribeNudge={orgSettings?.subscription?.planKind === 'gym_trial'}
            showBrandingNudge={orgSettings?.customBrandingEnabled === false}
          />

          <CoachArtifactPreviewSheet preview={shareablePreview} onClose={() => setShareablePreview(null)} />

          <NewClientModal
            open={newClientModalOpen}
            onOpenChange={setNewClientModalOpen}
            organizationId={effectiveOrgId ?? profile?.organizationId ?? ''}
          />

          {!isWorkspaceShell && (
            <CoachWorkspaceProfileFooter
              variant="floating"
              showTeamTab={dashboardData.showTeamTab}
            />
          )}

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
      </CoachAssistantProvider>
    </ErrorBoundary>
  );
}
