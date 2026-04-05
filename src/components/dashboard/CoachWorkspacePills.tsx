import { NavLink } from 'react-router-dom';
import { MessageSquare, Users, CalendarRange } from 'lucide-react';
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

  const iconClass = isToolbar ? 'w-3 h-3 shrink-0' : 'w-3.5 h-3.5 shrink-0';

  const workTabContent = (isActive: boolean) => (
    <span className={TAB_ROW}>
      <CalendarRange className={iconClass} />
      {UI_TABS.WORK}
      {scheduleCount > 0 && (
        <span
          className={`shrink-0 rounded-full px-1 text-[9px] font-bold leading-none ${
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

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={
          isToolbar
            ? 'inline-flex w-max max-w-full min-w-0 items-center gap-0.5 overflow-x-auto overscroll-x-contain rounded-md border border-border/50 bg-muted/30 p-0.5 dark:border-border/40 dark:bg-muted/20'
            : 'flex w-full max-w-xl mx-auto items-center gap-0.5 overflow-x-auto rounded-lg border border-border/70 bg-muted/25 p-0.5 dark:border-border/50 dark:bg-muted/15 sm:gap-1'
        }
      >
        <NavLink to={ROUTES.DASHBOARD_ASSISTANT} className={({ isActive }) => tabClass(isActive)}>
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
              <NavLink to={ROUTES.DASHBOARD_WORK} className={({ isActive }) => tabClass(isActive)}>
                {({ isActive }) => workTabContent(isActive)}
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              {DASHBOARD_TASKS.TAB_BADGE_TOOLTIP}
            </TooltipContent>
          </Tooltip>
        ) : (
          <NavLink to={ROUTES.DASHBOARD_WORK} className={({ isActive }) => tabClass(isActive)}>
            <span className={TAB_ROW}>
              <CalendarRange className={iconClass} />
              {UI_TABS.WORK}
            </span>
          </NavLink>
        )}
      </div>
    </TooltipProvider>
  );
}
