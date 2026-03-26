import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Calendar, CalendarDays, Users, BarChart3 } from 'lucide-react';
import { UI_TABS } from '@/constants/ui';
import { ROUTES } from '@/constants/routes';
import { DASHBOARD_TASKS } from '@/constants/dashboardTasksCopy';
import type { DashboardView } from '@/hooks/dashboard/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/** Radix TooltipTrigger + asChild can flatten flex layout; inner row keeps icon + label + badge aligned. */
const TAB_ROW_INNER = 'inline-flex min-w-0 flex-row flex-nowrap items-center justify-center gap-1.5';

interface DashboardViewTabsProps {
  view?: DashboardView;
  setView?: (view: DashboardView) => void;
  search: string;
  setSearch: (search: string) => void;
  scheduleCount?: number;
  showTeamTab?: boolean;
  /** When true, tabs are NavLinks and active state comes from URL pathname. */
  useRouterLinks?: boolean;
}

export const DashboardViewTabs: React.FC<DashboardViewTabsProps> = ({
  view: viewProp,
  setView,
  search,
  setSearch,
  scheduleCount = 0,
  showTeamTab = false,
  useRouterLinks = false,
}) => {
  const location = useLocation();
  const pathname = location.pathname;

  const derivedView: DashboardView = useRouterLinks
    ? pathname.includes('/schedule')
      ? 'schedule'
      : pathname.includes('/calendar')
        ? 'calendar'
        : pathname.includes('/team')
          ? 'team'
          : 'clients'
    : (viewProp ?? 'clients');

  const view = viewProp ?? derivedView;

  const tabClass = (tab: DashboardView, isActive: boolean) =>
    `flex-1 sm:flex-none px-3 sm:px-5 py-2 min-h-[44px] sm:min-h-0 text-xs sm:text-sm font-bold rounded-lg transition-all duration-200 touch-manipulation flex flex-row flex-nowrap items-center justify-center gap-1.5 whitespace-nowrap ${
      isActive
        ? 'scale-[1.02] bg-background text-foreground shadow-sm ring-1 ring-border dark:bg-card'
        : 'text-muted-foreground hover:text-foreground'
    }`;

  const scheduleBadge =
    scheduleCount > 0 ? (
      <span
        className={`shrink-0 px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
          view === 'schedule' ? 'bg-score-amber-muted text-score-amber-fg' : 'bg-score-amber text-white'
        }`}
      >
        {scheduleCount}
      </span>
    ) : null;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div className="flex w-full items-center gap-1 overflow-x-auto rounded-xl bg-muted/80 p-1 dark:bg-background-secondary sm:w-auto sm:gap-2">
          {useRouterLinks ? (
            <>
              <NavLink
                to={ROUTES.DASHBOARD}
                end
                className={({ isActive }) => tabClass('clients', isActive)}
              >
                <span className={TAB_ROW_INNER}>
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  {UI_TABS.CLIENTS}
                </span>
              </NavLink>
              {scheduleCount > 0 ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <NavLink
                      to={ROUTES.DASHBOARD_SCHEDULE}
                      className={({ isActive }) => tabClass('schedule', isActive)}
                    >
                      <span className={TAB_ROW_INNER}>
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        {UI_TABS.SCHEDULE}
                        {scheduleBadge}
                      </span>
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs">
                    {DASHBOARD_TASKS.TAB_BADGE_TOOLTIP}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <NavLink
                  to={ROUTES.DASHBOARD_SCHEDULE}
                  className={({ isActive }) => tabClass('schedule', isActive)}
                >
                  <span className={TAB_ROW_INNER}>
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    {UI_TABS.SCHEDULE}
                  </span>
                </NavLink>
              )}
              <NavLink
                to={ROUTES.DASHBOARD_CALENDAR}
                className={({ isActive }) => tabClass('calendar', isActive)}
              >
                <span className={TAB_ROW_INNER}>
                  <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                  {UI_TABS.CALENDAR}
                </span>
              </NavLink>
              {showTeamTab && (
                <NavLink
                  to={ROUTES.DASHBOARD_TEAM}
                  className={({ isActive }) => tabClass('team', isActive)}
                >
                  <span className={TAB_ROW_INNER}>
                    <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                    {UI_TABS.TEAM}
                  </span>
                </NavLink>
              )}
            </>
          ) : (
          <>
            <button onClick={() => setView!('clients')} className={tabClass('clients', view === 'clients')}>
              <span className={TAB_ROW_INNER}>
                <Users className="w-3.5 h-3.5 shrink-0" />
                {UI_TABS.CLIENTS}
              </span>
            </button>
            {scheduleCount > 0 ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setView!('schedule')}
                    className={tabClass('schedule', view === 'schedule')}
                  >
                    <span className={TAB_ROW_INNER}>
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      {UI_TABS.SCHEDULE}
                      {scheduleBadge}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  {DASHBOARD_TASKS.TAB_BADGE_TOOLTIP}
                </TooltipContent>
              </Tooltip>
            ) : (
              <button onClick={() => setView!('schedule')} className={tabClass('schedule', view === 'schedule')}>
                <span className={TAB_ROW_INNER}>
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  {UI_TABS.SCHEDULE}
                </span>
              </button>
            )}
            <button onClick={() => setView!('calendar')} className={tabClass('calendar', view === 'calendar')}>
              <span className={TAB_ROW_INNER}>
                <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                {UI_TABS.CALENDAR}
              </span>
            </button>
            {showTeamTab && (
              <button onClick={() => setView!('team')} className={tabClass('team', view === 'team')}>
                <span className={TAB_ROW_INNER}>
                  <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                  {UI_TABS.TEAM}
                </span>
              </button>
            )}
          </>
          )}
        </div>
        <div className="relative w-full sm:w-64">
          <Input
            placeholder={view === 'team' ? 'Search coaches…' : 'Search clients…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border-input bg-background pl-4 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-ring sm:h-11"
          />
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};
