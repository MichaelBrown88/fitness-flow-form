import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import {
  Activity,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  Users,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CoachWorkspaceProfileFooter } from '@/components/dashboard/CoachWorkspaceProfileFooter';
import { UI_EVENTS } from '@/constants/uiEvents';
import { cn } from '@/lib/utils';

// ─── Sidebar (expanded) ─────────────────────────────────────────────────

interface CoachWorkspaceSidebarProps {
  /** Total active clients in the org — used as the Clients nav badge. */
  clientCount: number;
  /** Total shared artefacts (reports + roadmaps + achievements) — Artefacts badge. */
  artefactCount: number;
  /** Whether to show the Team Members tab in the footer profile area. */
  showTeamTab: boolean;
  onNewClient: () => void;
  onToggleCollapse: () => void;
  className?: string;
}

interface NavItem {
  label: string;
  to: string;
  icon: typeof Activity;
  badge?: number;
  match?: (pathname: string) => boolean;
}

export function CoachWorkspaceSidebar({
  clientCount,
  artefactCount,
  showTeamTab,
  onNewClient,
  onToggleCollapse,
  className,
}: CoachWorkspaceSidebarProps) {
  const { pathname } = useLocation();

  const openCommandMenu = () => {
    window.dispatchEvent(new Event(UI_EVENTS.OPEN_COMMAND_MENU));
  };

  const workspaceNav: NavItem[] = [
    { label: 'Today', to: ROUTES.DASHBOARD_WORK, icon: Activity, match: (p) => p.startsWith(ROUTES.DASHBOARD_WORK) },
    { label: 'Clients', to: ROUTES.DASHBOARD_CLIENTS, icon: Users, badge: clientCount, match: (p) => p.startsWith(ROUTES.DASHBOARD_CLIENTS) },
    { label: 'Artifacts', to: ROUTES.DASHBOARD_ARTIFACTS, icon: FileText, badge: artefactCount },
  ];

  const studioNav: NavItem[] = [
    { label: 'Studio settings', to: ROUTES.SETTINGS, icon: Settings },
  ];

  return (
    <aside
      className={cn(
        'flex min-h-0 w-[260px] shrink-0 flex-col self-stretch bg-card-elevated text-foreground',
        'border-r border-border',
        className,
      )}
      aria-label="Workspace"
    >
      {/* ─── Brand + collapse ─────────────────────────────── */}
      <div className="flex items-center justify-between px-3 pt-3.5 pb-2">
        <div className="flex items-center gap-2.5 px-1">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
            OA
          </div>
          <span className="text-[15px] font-bold tracking-[-0.01em] text-foreground">One Assess</span>
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Collapse sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* ─── Primary action ───────────────────────────────── */}
      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={onNewClient}
          className="flex w-full items-center gap-2.5 rounded-xl bg-foreground px-3 py-2.5 text-[13px] font-semibold text-background transition-colors hover:bg-foreground/90"
        >
          <Plus className="h-4 w-4" />
          New assessment
        </button>
      </div>

      {/* ─── Search (opens command menu) ──────────────────── */}
      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={openCommandMenu}
          className="flex w-full items-center gap-2 rounded-[10px] bg-muted px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
          aria-label="Search clients"
        >
          <Search className="h-3.5 w-3.5" />
          Search clients
        </button>
      </div>

      {/* ─── Nav ─────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-2.5">
        <NavSection label="Workspace" items={workspaceNav} pathname={pathname} />
        <NavSection label="Studio" items={studioNav} pathname={pathname} className="mt-3" />
      </nav>

      {/* ─── Footer (user) ───────────────────────────────── */}
      <div className="z-10 shrink-0 border-t border-border bg-card-elevated px-3 py-2">
        <CoachWorkspaceProfileFooter variant="sidebar" showTeamTab={showTeamTab} />
      </div>
    </aside>
  );
}

interface NavSectionProps {
  label: string;
  items: NavItem[];
  pathname: string;
  className?: string;
}

function NavSection({ label, items, pathname, className }: NavSectionProps) {
  return (
    <div className={className}>
      <div className="px-3 pt-2.5 pb-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </span>
      </div>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = item.match ? item.match(pathname) : pathname === item.to;
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={cn(
                  'flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] font-medium transition-colors',
                  active
                    ? 'border border-border bg-card font-semibold text-foreground shadow-sm'
                    : 'text-foreground-secondary hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span className="flex-1">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 ? (
                  <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Sidebar (collapsed icon strip) ─────────────────────────────────────

interface CoachWorkspaceSidebarCollapsedProps {
  onNewClient: () => void;
  onToggleCollapse: () => void;
  hasAttention: boolean;
}

export function CoachWorkspaceSidebarCollapsed({
  onNewClient,
  onToggleCollapse,
  hasAttention,
}: CoachWorkspaceSidebarCollapsedProps) {
  const openCommandMenu = () => window.dispatchEvent(new Event(UI_EVENTS.OPEN_COMMAND_MENU));

  return (
    <aside
      className="hidden w-12 shrink-0 flex-col items-center gap-1.5 self-stretch border-r border-border bg-card-elevated py-3 lg:flex"
      aria-label="Workspace (collapsed)"
    >
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onToggleCollapse}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Expand sidebar</TooltipContent>
        </Tooltip>

        <div className="h-px w-6 bg-border" />

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onNewClient}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background transition-colors hover:bg-foreground/90"
              aria-label="New assessment"
            >
              <Plus className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">New assessment</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={openCommandMenu}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Search</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to={ROUTES.DASHBOARD_WORK}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Today"
            >
              <Activity className="h-4 w-4" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">Today</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to={ROUTES.DASHBOARD_CLIENTS}
              className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Clients"
            >
              <Users className="h-4 w-4" />
              {hasAttention ? (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-score-amber" />
              ) : null}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">Clients{hasAttention ? ' · attention needed' : ''}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to={ROUTES.DASHBOARD_ARTIFACTS}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Artifacts"
            >
              <FileText className="h-4 w-4" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">Artifacts</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </aside>
  );
}
