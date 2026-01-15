import React from 'react';
import { Input } from '@/components/ui/input';

interface DashboardViewTabsProps {
  view: 'assessments' | 'clients';
  setView: (view: 'assessments' | 'clients') => void;
  search: string;
  setSearch: (search: string) => void;
}

export const DashboardViewTabs: React.FC<DashboardViewTabsProps> = ({
  view,
  setView,
  search,
  setSearch,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 sm:mb-6">
      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
        <button
          onClick={() => setView('assessments')}
          className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all duration-200 ${
            view === 'assessments'
              ? 'bg-white text-slate-900 shadow-sm scale-[1.02]'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          All Assessments
        </button>
        <button
          onClick={() => setView('clients')}
          className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all duration-200 ${
            view === 'clients'
              ? 'bg-white text-slate-900 shadow-sm scale-[1.02]'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          By Client
        </button>
      </div>
      <div className="relative w-full sm:w-64">
        <Input
          placeholder={view === 'assessments' ? "Search assessments…" : "Search clients…"}
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
