import { NavLink, useLocation } from 'react-router-dom';
import { Users, CalendarRange } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { UI_TABS } from '@/constants/ui';
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
}

export function CoachWorkspacePills({
  scheduleCount = 0,
  variant = 'page',
}: CoachWorkspacePillsProps) {
  const isToolbar = variant === 'toolbar';
  const location = useLocation();
  /** The bare /dashboard index renders the Work (Today) tab, so highlight it. */
  const isIndexRoute = location.pathname === ROUTES.DASHBOARD;

  const tabClass = (isActive: boolean) =>
    `${
      isToolbar
        ? 'flex-none px-3 py-1.5 min-h-[32px] sm:min-h-[30px] text-[11px] sm:text-xs font-semibold'
        : 'flex-1 sm:flex-none px-4 sm:px-6 py-2 min-h-[44px] sm:min-h-0 text-xs sm:text-sm font-bold'
    } rounded-full transition-colors duration-150 touch-manipulation flex flex-row flex-nowrap items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap ${
      isToolbar
        ? isActive
          ? 'bg-background text-foreground shadow-sm dark:bg-background-secondary'
          : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
        : isActive
          ? 'bg-background text-foreground shadow-sm dark:bg-background-secondary'
          : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
    }`;

  const iconClass = isToolbar ? 'w-3 h-3 shrink-0' : 'w-3.5 h-3.5 shrink-0';

  const workTabContent = (isActive: boolean) => (
    <span className={TAB_ROW}>
      <CalendarRange className={iconClass} />
      {UI_TABS.WORK}
      {scheduleCount > 0 && (
        <span
          className={`shrink-0 rounded-full px-1 text-[10px] font-bold leading-none ${
            isActive
              ? 'bg-score-amber-fg/20 text-score-amber-fg'
              : 'bg-score-amber-fg/15 text-score-amber-fg/80'
          }`}
          aria-label={`${scheduleCount} overdue`}
        >
          {scheduleCount}
        </span>
      )}
    </span>
  );

  /** Today tab is active when at /dashboard (index) OR /dashboard/work */
  const workTabClass = (navIsActive: boolean) => tabClass(navIsActive || isIndexRoute);

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={
          isToolbar
            ? 'inline-flex w-max max-w-full min-w-0 items-center gap-0.5 overflow-x-auto overscroll-x-contain rounded-full border border-border/50 bg-muted/40 p-1 dark:border-border/40 dark:bg-muted/20'
            : 'flex w-full max-w-xl mx-auto items-center gap-0.5 overflow-x-auto rounded-full border border-border/70 bg-muted/30 p-1 dark:border-border/50 dark:bg-muted/15 sm:gap-1'
        }
      >
        {/* Today (queue + calendar) — first tab, default landing */}
        {scheduleCount > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <NavLink to={ROUTES.DASHBOARD_WORK} className={({ isActive }) => workTabClass(isActive)}>
                {({ isActive }) => workTabContent(isActive || isIndexRoute)}
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              {DASHBOARD_TASKS.TAB_BADGE_TOOLTIP}
            </TooltipContent>
          </Tooltip>
        ) : (
          <NavLink to={ROUTES.DASHBOARD_WORK} className={({ isActive }) => workTabClass(isActive)}>
            <span className={TAB_ROW}>
              <CalendarRange className={iconClass} />
              {UI_TABS.WORK}
            </span>
          </NavLink>
        )}
        {/* Clients roster */}
        <NavLink to={ROUTES.DASHBOARD_CLIENTS} className={({ isActive }) => tabClass(isActive)}>
          <span className={TAB_ROW}>
            <Users className={iconClass} />
            {UI_TABS.CLIENTS}
          </span>
        </NavLink>
      </div>
    </TooltipProvider>
  );
}
