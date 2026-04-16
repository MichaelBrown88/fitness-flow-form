import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import {
  MessageSquarePlus,
  Search,
  Link2,
  Trash2,
  Share2,
  AlertCircle,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  FileText,
  Route,
  Trophy,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { COACH_ASSISTANT_COPY } from '@/constants/coachAssistantCopy';
import { UI_EVENTS } from '@/constants/uiEvents';
import type { CoachAssistantThread } from '@/types/coachAssistant';
import type {
  CoachAchievementShareRow,
  CoachArtifactRow,
  CoachRoadmapShareRow,
  CoachShareablePreview,
} from '@/hooks/useCoachArtifacts';
import { CoachWorkspaceProfileFooter } from '@/components/dashboard/CoachWorkspaceProfileFooter';
import { coachShareablePublicUrl } from '@/lib/utils/coachShareableUrls';
import { formatClientDisplayName } from '@/lib/utils/clientDisplayName';
import { cn } from '@/lib/utils';

type UnifiedArtifact =
  | { kind: 'report'; token: string; clientName: string; updatedAt: Date | null; report: CoachArtifactRow }
  | { kind: 'roadmap'; token: string; clientName: string; updatedAt: Date | null; row: CoachRoadmapShareRow }
  | { kind: 'achievements'; token: string; clientName: string; updatedAt: Date | null; row: CoachAchievementShareRow };

const ARTIFACT_KIND_ICON: Record<UnifiedArtifact['kind'], typeof FileText> = {
  report: FileText,
  roadmap: Route,
  achievements: Trophy,
};

function mergeAndSortArtifacts(
  reports: CoachArtifactRow[],
  roadmaps: CoachRoadmapShareRow[],
  achievements: CoachAchievementShareRow[],
  limit: number,
): UnifiedArtifact[] {
  const all: UnifiedArtifact[] = [
    ...reports.map((r): UnifiedArtifact => ({ kind: 'report', token: r.token, clientName: r.clientName, updatedAt: r.updatedAt, report: r })),
    ...roadmaps.map((r): UnifiedArtifact => ({ kind: 'roadmap', token: r.token, clientName: r.clientName, updatedAt: r.updatedAt, row: r })),
    ...achievements.map((r): UnifiedArtifact => ({ kind: 'achievements', token: r.token, clientName: r.clientName, updatedAt: r.updatedAt, row: r })),
  ];
  all.sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0));
  return all.slice(0, limit);
}

function artifactPreview(item: UnifiedArtifact): CoachShareablePreview {
  switch (item.kind) {
    case 'report': return { kind: 'report', report: item.report };
    case 'roadmap': return { kind: 'roadmap', row: item.row };
    case 'achievements': return { kind: 'achievements', row: item.row };
  }
}

interface CoachWorkspaceSidebarProps {
  threads: CoachAssistantThread[];
  activeThreadId: string | null;
  onNewChat: () => void;
  onSelectThread: (id: string) => void;
  onDeleteThread: (id: string) => void;
  reportShares: CoachArtifactRow[];
  roadmapShares: CoachRoadmapShareRow[];
  achievementShares: CoachAchievementShareRow[];
  shareablesLoading: boolean;
  onShareablePreview: (preview: CoachShareablePreview) => void;
  recentClients: { name: string }[];
  showTeamTab: boolean;
  onNewClient: () => void;
  onToggleCollapse: () => void;
  className?: string;
}

export function CoachWorkspaceSidebar({
  threads,
  activeThreadId,
  onNewChat,
  onSelectThread,
  onDeleteThread,
  reportShares,
  roadmapShares,
  achievementShares,
  shareablesLoading,
  onShareablePreview,
  recentClients,
  showTeamTab,
  onNewClient,
  onToggleCollapse,
  className,
}: CoachWorkspaceSidebarProps) {
  const { pathname } = useLocation();
  const onArtifactsPage = pathname === ROUTES.DASHBOARD_ARTIFACTS;
  const [threadPendingDelete, setThreadPendingDelete] = useState<string | null>(null);

  const openCommandMenu = () => {
    window.dispatchEvent(new Event(UI_EVENTS.OPEN_COMMAND_MENU));
  };

  const confirmDelete = () => {
    if (threadPendingDelete) {
      onDeleteThread(threadPendingDelete);
    }
    setThreadPendingDelete(null);
  };

  return (
    <aside
      className={cn(
        'flex min-h-0 w-[260px] shrink-0 flex-col self-stretch bg-card text-foreground',
        className,
      )}
      aria-label="Workspace"
    >
      {/* Header: brand + collapse */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-sm font-bold text-foreground tracking-tight">One Assess</span>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex h-7 w-7 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Collapse sidebar"
        >
          <PanelLeftClose className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Quick actions */}
      <div className="flex gap-1.5 px-3 pb-3">
        <button
          type="button"
          onClick={onNewClient}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" />
          New Client
        </button>
        <button
          type="button"
          onClick={onNewChat}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={COACH_ASSISTANT_COPY.NEW_CHAT}
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={openCommandMenu}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={COACH_ASSISTANT_COPY.SIDEBAR_SEARCH}
        >
          <Search className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-2">
        {/* Artefacts */}
        <div className="pb-4">
          <section aria-label={COACH_ASSISTANT_COPY.SIDEBAR_ARTIFACTS_REGION_LABEL}>
            <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
              <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Artefacts
              </h2>
              {!onArtifactsPage && (
                <Link
                  to={ROUTES.DASHBOARD_ARTIFACTS}
                  className="shrink-0 text-[10px] font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                >
                  View all
                </Link>
              )}
            </div>
            {onArtifactsPage ? (
              <p className="px-1 text-xs leading-snug text-muted-foreground">
                {COACH_ASSISTANT_COPY.SIDEBAR_ARTIFACTS_STUB_ON_GRID_PAGE}
              </p>
            ) : shareablesLoading ? (
              <p className="px-1 text-xs text-muted-foreground/60">Loading…</p>
            ) : (() => {
              const recent = mergeAndSortArtifacts(reportShares, roadmapShares, achievementShares, 4);
              if (recent.length === 0) {
                return <p className="px-1 text-xs text-muted-foreground/60">No shared links yet</p>;
              }
              return (
                <ul className="space-y-0.5">
                  {recent.map((item) => {
                    const Icon = ARTIFACT_KIND_ICON[item.kind];
                    return (
                      <li key={`${item.kind}-${item.token}`} className="group flex items-center gap-0.5">
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-3 py-2 text-left text-foreground/60 transition-colors hover:bg-muted/60 hover:text-foreground"
                          onClick={() => onShareablePreview(artifactPreview(item))}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate text-xs font-medium">
                            {item.clientName}
                          </span>
                        </button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 rounded-xl text-muted-foreground opacity-0 group-hover:opacity-100 transition-all"
                          title={COACH_ASSISTANT_COPY.COPY_LINK}
                          aria-label={COACH_ASSISTANT_COPY.COPY_LINK}
                          onClick={(e) => {
                            e.stopPropagation();
                            const url = item.kind === 'report'
                              ? coachShareablePublicUrl('report', item.token)
                              : item.kind === 'roadmap'
                                ? coachShareablePublicUrl('roadmap', item.token)
                                : coachShareablePublicUrl('achievements', item.token);
                            void navigator.clipboard.writeText(url);
                          }}
                        >
                          <Link2 className="h-3 w-3" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              );
            })()}
          </section>
        </div>

        {/* Needs Attention removed — shown on Today tab */}
      </div>

      {/* Footer */}
      <div className="z-10 shrink-0 border-t border-border/30 bg-card px-3 py-2">
        <CoachWorkspaceProfileFooter variant="sidebar" showTeamTab={showTeamTab} />
      </div>

      <AlertDialog open={threadPendingDelete !== null} onOpenChange={(open) => !open && setThreadPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{COACH_ASSISTANT_COPY.DELETE_THREAD_CONFIRM_TITLE}</AlertDialogTitle>
            <AlertDialogDescription>{COACH_ASSISTANT_COPY.DELETE_THREAD_CONFIRM_DESC}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{COACH_ASSISTANT_COPY.DELETE_THREAD_CANCEL}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              {COACH_ASSISTANT_COPY.DELETE_THREAD_CONFIRM_ACTION}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}

/** Narrow icon-only strip shown when the workspace sidebar is collapsed. */
export function CoachWorkspaceSidebarCollapsed({
  onNewChat,
  onNewClient,
  onToggleCollapse,
  hasAttention,
}: {
  onNewChat: () => void;
  onNewClient: () => void;
  onToggleCollapse: () => void;
  hasAttention: boolean;
}) {
  const openCommandMenu = () => window.dispatchEvent(new Event('openCommandMenu'));

  return (
    <aside
      className="hidden lg:flex w-12 shrink-0 flex-col self-stretch bg-card items-center gap-1.5 py-3"
      aria-label="Workspace (collapsed)"
    >
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onToggleCollapse}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="h-3.5 w-3.5" aria-hidden />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Expand sidebar</TooltipContent>
        </Tooltip>

        <div className="h-px w-6 bg-border/30" />

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onNewClient}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
              aria-label="New client"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">New client</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onNewChat}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="New chat"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">New chat</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={openCommandMenu}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Search"
            >
              <Search className="h-3.5 w-3.5" aria-hidden />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Search</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to={ROUTES.DASHBOARD_ARTIFACTS}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Artifacts"
            >
              <Share2 className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">Artifacts</TooltipContent>
        </Tooltip>

        {hasAttention && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="flex h-8 w-8 items-center justify-center rounded-xl text-score-amber-fg"
                role="img"
                aria-label="Clients need attention"
              >
                <AlertCircle className="h-3.5 w-3.5" aria-hidden />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">Clients need attention</TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>
    </aside>
  );
}
