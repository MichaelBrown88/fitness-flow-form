import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import {
  MessageSquarePlus,
  Search,
  Link2,
  Trash2,
  ChevronDown,
  Share2,
  AlertCircle,
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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

const SHAREABLE_ROW =
  'text-xs font-medium text-foreground/80 truncate flex-1 min-w-0 text-left underline-offset-2 hover:underline py-1';

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
  className?: string;
}

function ShareableCategory({
  title,
  hint,
  emptyLabel,
  loading,
  hasItems,
  defaultOpen,
  children,
}: {
  title: string;
  hint: string;
  emptyLabel: React.ReactNode;
  loading: boolean;
  hasItems: boolean;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        type="button"
        className="group flex w-full items-center gap-2 py-1.5 text-left text-xs font-medium text-foreground/90 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span className="min-w-0 flex-1">{title}</span>
        <ChevronDown
          className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-transform duration-200 group-data-[state=open]:rotate-180"
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-0.5">
        <p className="mb-1 text-[10px] leading-snug text-muted-foreground/80">{hint}</p>
        {loading ? (
          <p className="text-xs text-muted-foreground">…</p>
        ) : hasItems ? (
          children
        ) : (
          <p className="text-xs text-muted-foreground">{emptyLabel}</p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
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
        'flex min-h-0 w-[260px] shrink-0 flex-col self-stretch border-r border-border/60 bg-card text-foreground',
        className,
      )}
      aria-label="Workspace"
    >
      <div className="flex flex-col gap-2 border-b border-border/80 p-3">
        <Button type="button" variant="outline" size="sm" className="w-full justify-start gap-2 rounded-md" onClick={onNewChat}>
          <MessageSquarePlus className="h-4 w-4 shrink-0" />
          {COACH_ASSISTANT_COPY.NEW_CHAT}
        </Button>
        <Button type="button" variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={openCommandMenu}>
          <Search className="h-4 w-4 shrink-0" />
          {COACH_ASSISTANT_COPY.SIDEBAR_SEARCH}
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-3 py-2">
          <p className="text-xs font-semibold text-muted-foreground mb-1.5">
            {COACH_ASSISTANT_COPY.SIDEBAR_CHATS}
          </p>
          <ul className="space-y-0.5">
            {threads.map((t) => (
              <li key={t.id} className="flex items-stretch gap-0.5">
                <button
                  type="button"
                  onClick={() => onSelectThread(t.id)}
                  className={cn(
                    'min-w-0 flex-1 text-left rounded-md px-2 py-1.5 text-xs font-medium truncate transition-colors',
                    t.id === activeThreadId
                      ? 'bg-muted text-foreground'
                      : 'hover:bg-muted/60 text-foreground/70 hover:text-foreground',
                  )}
                >
                  {t.title}
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  title={COACH_ASSISTANT_COPY.DELETE_THREAD}
                  aria-label={COACH_ASSISTANT_COPY.DELETE_THREAD}
                  onClick={(e) => {
                    e.stopPropagation();
                    setThreadPendingDelete(t.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-border px-3 py-3">
          <section aria-label={COACH_ASSISTANT_COPY.SIDEBAR_ARTIFACTS_REGION_LABEL}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2
                id="sidebar-artifacts-heading"
                className="text-xs font-semibold text-muted-foreground"
              >
                {COACH_ASSISTANT_COPY.SIDEBAR_ARTIFACTS_SECTION}
              </h2>
              {!onArtifactsPage ? (
                <Link
                  to={ROUTES.DASHBOARD_ARTIFACTS}
                  className="shrink-0 text-[10px] font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                >
                  {COACH_ASSISTANT_COPY.SIDEBAR_ARTIFACTS_VIEW_ALL}
                </Link>
              ) : null}
            </div>
            {onArtifactsPage ? (
              <p className="text-xs leading-snug text-muted-foreground">
                {COACH_ASSISTANT_COPY.SIDEBAR_ARTIFACTS_STUB_ON_GRID_PAGE}
              </p>
            ) : (
            <div className="flex flex-col gap-1">
            <ShareableCategory
              title={COACH_ASSISTANT_COPY.SIDEBAR_CATEGORY_REPORTS}
              hint={COACH_ASSISTANT_COPY.SIDEBAR_CATEGORY_REPORTS_HINT}
              emptyLabel={COACH_ASSISTANT_COPY.EMPTY_SHAREABLE_REPORTS}
              loading={shareablesLoading}
              hasItems={reportShares.length > 0}
              defaultOpen={false}
            >
              <ul className="space-y-0.5">
                {reportShares.slice(0, 8).map((a) => (
                  <li key={a.token} className="flex items-center gap-0.5">
                    <button
                      type="button"
                      className={SHAREABLE_ROW}
                      onClick={() => onShareablePreview({ kind: 'report', report: a })}
                    >
                      {a.clientName}
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 rounded-sm text-muted-foreground"
                      title={COACH_ASSISTANT_COPY.COPY_LINK}
                      aria-label={COACH_ASSISTANT_COPY.COPY_LINK}
                      onClick={(e) => {
                        e.stopPropagation();
                        void navigator.clipboard.writeText(coachShareablePublicUrl('report', a.token));
                      }}
                    >
                      <Link2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </ShareableCategory>

            <ShareableCategory
              title={COACH_ASSISTANT_COPY.SIDEBAR_CATEGORY_ROADMAPS}
              hint={COACH_ASSISTANT_COPY.SIDEBAR_CATEGORY_ROADMAPS_HINT}
              emptyLabel={
                <span>
                  No published ARC™ links yet.{' '}
                  <Link to={ROUTES.DASHBOARD_CLIENTS} className="underline underline-offset-2 hover:text-foreground">
                    Open a client
                  </Link>{' '}
                  to build one.
                </span>
              }
              loading={shareablesLoading}
              hasItems={roadmapShares.length > 0}
              defaultOpen={false}
            >
              <ul className="space-y-0.5">
                {roadmapShares.slice(0, 8).map((r) => (
                  <li key={r.token} className="flex items-center gap-0.5">
                    <button
                      type="button"
                      className={SHAREABLE_ROW}
                      onClick={() => onShareablePreview({ kind: 'roadmap', row: r })}
                    >
                      {r.clientName}
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 rounded-sm text-muted-foreground"
                      title={COACH_ASSISTANT_COPY.COPY_LINK}
                      aria-label={COACH_ASSISTANT_COPY.COPY_LINK}
                      onClick={(e) => {
                        e.stopPropagation();
                        void navigator.clipboard.writeText(coachShareablePublicUrl('roadmap', r.token));
                      }}
                    >
                      <Link2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </ShareableCategory>

            <ShareableCategory
              title={COACH_ASSISTANT_COPY.SIDEBAR_CATEGORY_ACHIEVEMENTS}
              hint={COACH_ASSISTANT_COPY.SIDEBAR_CATEGORY_ACHIEVEMENTS_HINT}
              emptyLabel={COACH_ASSISTANT_COPY.EMPTY_SHAREABLE_ACHIEVEMENTS}
              loading={shareablesLoading}
              hasItems={achievementShares.length > 0}
              defaultOpen={false}
            >
              <ul className="space-y-0.5">
                {achievementShares.slice(0, 8).map((r) => (
                  <li key={`${r.token}-ach`} className="flex items-center gap-0.5">
                    <button
                      type="button"
                      className={SHAREABLE_ROW}
                      onClick={() => onShareablePreview({ kind: 'achievements', row: r })}
                    >
                      {r.clientName}
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 rounded-sm text-muted-foreground"
                      title={COACH_ASSISTANT_COPY.COPY_LINK}
                      aria-label={COACH_ASSISTANT_COPY.COPY_LINK}
                      onClick={(e) => {
                        e.stopPropagation();
                        void navigator.clipboard.writeText(coachShareablePublicUrl('achievements', r.token));
                      }}
                    >
                      <Link2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </ShareableCategory>
            </div>
            )}
          </section>
        </div>

        <div className="border-t border-border px-3 py-2">
          <p className="text-xs font-semibold text-muted-foreground mb-1.5">
            Needs Attention
          </p>
          {recentClients.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-1">All clients on track</p>
          ) : (
            <ul className="space-y-0.5">
              {recentClients.map((c) => (
                <li key={c.name}>
                  <Link
                    to={`/client/${encodeURIComponent(c.name)}`}
                    className="block rounded-lg px-2 py-1 text-xs font-medium text-foreground-secondary hover:bg-muted/60 hover:text-foreground truncate"
                  >
                    {formatClientDisplayName(c.name)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="z-10 shrink-0 border-t border-border/80 bg-background/95 p-2 supports-[backdrop-filter]:backdrop-blur-sm">
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
  hasAttention,
}: {
  onNewChat: () => void;
  hasAttention: boolean;
}) {
  const openCommandMenu = () => window.dispatchEvent(new Event('openCommandMenu'));

  return (
    <aside
      className="hidden lg:flex w-12 shrink-0 flex-col self-stretch border-r border-border/60 bg-card items-center gap-1 py-2"
      aria-label="Workspace (collapsed)"
    >
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onNewChat}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="New chat"
            >
              <MessageSquarePlus className="h-4 w-4" aria-hidden />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">New chat</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={openCommandMenu}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Search"
            >
              <Search className="h-4 w-4" aria-hidden />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Search</TooltipContent>
        </Tooltip>

        <div className="my-1 h-px w-8 bg-border/60" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to={ROUTES.DASHBOARD_ARTIFACTS}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Artifacts"
            >
              <Share2 className="h-4 w-4" aria-hidden />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">Artifacts</TooltipContent>
        </Tooltip>

        {hasAttention && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="flex h-8 w-8 items-center justify-center rounded-md text-score-amber-fg"
                role="img"
                aria-label="Clients need attention"
              >
                <AlertCircle className="h-4 w-4" aria-hidden />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">Clients need attention</TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>
    </aside>
  );
}
