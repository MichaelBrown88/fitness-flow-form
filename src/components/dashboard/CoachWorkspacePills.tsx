import { NavLink, useLocation } from 'react-router-dom';
import { MessageSquare, Users, CalendarRange, LayoutGrid, BarChart3 } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { UI_COMMAND_MENU, UI_TABS } from '@/constants/ui';
import { DASHBOARD_TASKS } from '@/constants/dashboardTasksCopy';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const TAB_ROW =
  'inline-flex min-w-0 flex-row flex-nowrap items-center justify-center gap-1.5';

interface CoachWorkspacePillsProps {
  scheduleCount?: number;
  /** `toolbar` = compact strip for AppShell header; `page` = larger centered row in content */
  variant?: 'toolbar' | 'page';
  /** Org admins on multi-coach orgs — same rule as profile footer / sidebar */
  showTeamTab?: boolean;
}

export function CoachWorkspacePills({
  scheduleCount = 0,
  variant = 'page',
  showTeamTab = false,
}: CoachWorkspacePillsProps) {
  const location = useLocation();
  const path = location.pathname;

  const isToolbar = variant === 'toolbar';

  const tabClass = (isActive: boolean) =>
    `${
      isToolbar
        ? 'flex-none px-2.5 py-1 min-h-[32px] sm:min-h-[30px] text-[11px] sm:text-xs font-medium'
        : 'flex-1 sm:flex-none px-3 sm:px-5 py-2 min-h-[44px] sm:min-h-0 text-xs sm:text-sm font-bold'
    } rounded-md transition-colors duration-150 touch-manipulation flex flex-row flex-nowrap items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap ${
      isToolbar
        ? isActive
          ? 'bg-background text-foreground dark:bg-background-secondary'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        : isActive
          ? 'bg-background text-foreground ring-1 ring-border/60 dark:bg-background-secondary'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
    }`;

  const scheduleBadge =
    scheduleCount > 0 ? (
      <span
        className={`shrink-0 px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
          path.startsWith(ROUTES.DASHBOARD_WORK)
            ? 'bg-score-amber-muted text-score-amber-fg'
            : 'bg-score-amber text-white'
        }`}
      >
        {scheduleCount}
      </span>
    ) : null;

  const workLink = ({ isActive }: { isActive: boolean }) => tabClass(isActive);

  const iconClass = isToolbar ? 'w-3 h-3 shrink-0' : 'w-3.5 h-3.5 shrink-0';

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={
          isToolbar
            ? 'inline-flex w-max max-w-full min-w-0 items-center gap-0.5 overflow-x-auto overscroll-x-contain rounded-md border border-border/50 bg-muted/30 p-0.5 dark:border-border/40 dark:bg-muted/20'
            : 'flex w-full max-w-xl mx-auto items-center gap-0.5 overflow-x-auto rounded-lg border border-border/70 bg-muted/25 p-0.5 dark:border-border/50 dark:bg-muted/15 sm:gap-1'
        }
      >
        <NavLink to={ROUTES.DASHBOARD} end className={({ isActive }) => tabClass(isActive)}>
          <span className={TAB_ROW}>
            <MessageSquare className={iconClass} />
            {UI_TABS.ASSISTANT}
          </span>
        </NavLink>
        <NavLink to={ROUTES.DASHBOARD_CLIENTS} className={({ isActive }) => tabClass(isActive)}>
          <span className={TAB_ROW}>
            <Users className={iconClass} />
            {UI_TABS.CLIENTS}
          </span>
        </NavLink>
        {scheduleCount > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <NavLink to={ROUTES.DASHBOARD_WORK} className={workLink}>
                <span className={TAB_ROW}>
                  <CalendarRange className={iconClass} />
                  {UI_TABS.WORK}
                  {scheduleBadge}
                </span>
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              {DASHBOARD_TASKS.TAB_BADGE_TOOLTIP}
            </TooltipContent>
          </Tooltip>
        ) : (
          <NavLink to={ROUTES.DASHBOARD_WORK} className={workLink}>
            <span className={TAB_ROW}>
              <CalendarRange className={iconClass} />
              {UI_TABS.WORK}
            </span>
          </NavLink>
        )}
        <NavLink to={ROUTES.DASHBOARD_ARTIFACTS} className={({ isActive }) => tabClass(isActive)}>
          <span className={TAB_ROW}>
            <LayoutGrid className={iconClass} />
            {UI_COMMAND_MENU.ARTIFACTS}
          </span>
        </NavLink>
        {showTeamTab ? (
          <NavLink to={ROUTES.DASHBOARD_TEAM} className={({ isActive }) => tabClass(isActive)}>
            <span className={TAB_ROW}>
              <BarChart3 className={iconClass} />
              {UI_TABS.TEAM}
            </span>
          </NavLink>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
