import React from 'react';
import { Input } from '@/components/ui/input';
import { Calendar, Users, BarChart3 } from 'lucide-react';
import { UI_TABS } from '@/constants/ui';
import type { DashboardView } from '@/hooks/dashboard/types';

interface DashboardViewTabsProps {
  view: DashboardView;
  setView: (view: DashboardView) => void;
  search: string;
  setSearch: (search: string) => void;
  scheduleCount?: number;
  showTeamTab?: boolean;
}

export const DashboardViewTabs: React.FC<DashboardViewTabsProps> = ({
  view,
  setView,
  search,
  setSearch,
  scheduleCount = 0,
  showTeamTab = false,
}) => {
  const tabClass = (tab: DashboardView) =>
    `flex-1 sm:flex-none px-3 sm:px-5 py-2 min-h-[44px] sm:min-h-0 text-xs sm:text-sm font-bold rounded-lg transition-all duration-200 touch-manipulation flex items-center justify-center gap-1.5 whitespace-nowrap ${
      view === tab
        ? 'bg-white text-slate-900 shadow-sm scale-[1.02]'
        : 'text-slate-500 hover:text-slate-700'
    }`;

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 sm:mb-6">
      <div className="flex items-center gap-1 sm:gap-2 bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
        <button onClick={() => setView('clients')} className={tabClass('clients')}>
          <Users className="w-3.5 h-3.5" />
          {UI_TABS.CLIENTS}
        </button>
        <button onClick={() => setView('schedule')} className={tabClass('schedule')}>
          <Calendar className="w-3.5 h-3.5" />
          {UI_TABS.SCHEDULE}
          {scheduleCount > 0 && (
            <span className={`ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
              view === 'schedule' 
                ? 'bg-score-amber-muted text-score-amber-fg' 
                : 'bg-score-amber text-white'
            }`}>
              {scheduleCount}
            </span>
          )}
        </button>
        {showTeamTab && (
          <button onClick={() => setView('team')} className={tabClass('team')}>
            <BarChart3 className="w-3.5 h-3.5" />
            {UI_TABS.TEAM}
          </button>
        )}
      </div>
      <div className="relative w-full sm:w-64">
        <Input
          placeholder={view === 'team' ? 'Search coaches…' : 'Search clients…'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 sm:h-11 w-full pl-4 pr-10 text-sm rounded-xl border-slate-200 focus:border-slate-900 transition-colors bg-white/50 backdrop-blur-sm shadow-sm"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
    </div>
  );
};
