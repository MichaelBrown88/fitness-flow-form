import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { formatGoal } from '../DashboardConstants';
import type { CoachAssessmentSummary } from '@/services/coachAssessments';

interface AssessmentsTableProps {
  loadingData: boolean;
  filtered: CoachAssessmentSummary[];
  search: string;
  visibleCount: number;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onDelete: (id: string, name: string) => void;
}

export const AssessmentsTable: React.FC<AssessmentsTableProps> = ({
  loadingData,
  filtered,
  search,
  visibleCount,
  hasMore,
  loadingMore,
  onLoadMore,
  onDelete,
}) => {
  return (
    <section className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm -mx-4 sm:mx-0">
        <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
          <thead className="bg-slate-50/50">
            <tr>
              <th className="px-3 sm:px-4 md:px-6 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                Client
              </th>
              <th className="px-3 sm:px-4 md:px-6 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 hidden sm:table-cell">
                Date
              </th>
              <th className="px-3 sm:px-4 md:px-6 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                Overall
              </th>
              <th className="px-3 sm:px-4 md:px-6 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 hidden md:table-cell">
                Goals
              </th>
              <th className="px-3 sm:px-4 md:px-6 py-3 text-right text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loadingData ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400 font-medium">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    <span>Loading assessments...</span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400 font-medium">
                  {search
                    ? 'No assessments match that name.'
                    : 'No assessments saved yet. Run an assessment to see it here.'}
                </td>
              </tr>
            ) : (
              filtered.slice(0, visibleCount).map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-3 sm:px-4 md:px-6 py-4 text-xs sm:text-sm text-slate-900 font-semibold">
                    <div className="flex flex-col">
                      <span>{item.clientName}</span>
                      <span className="text-[10px] sm:hidden text-slate-400 font-medium mt-1">
                        {item.createdAt
                          ? item.createdAt.toDate().toLocaleDateString()
                          : '—'}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 md:px-6 py-4 text-xs sm:text-sm text-slate-500 font-medium hidden sm:table-cell">
                    {item.createdAt
                      ? item.createdAt.toDate().toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-3 sm:px-4 md:px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-bold group-hover:scale-105 transition-transform">
                      {item.overallScore || '—'}
                    </span>
                  </td>
                  <td className="px-3 sm:px-4 md:px-6 py-4 text-[10px] sm:text-xs text-slate-500 font-medium hidden md:table-cell italic">
                    {item.goals && item.goals.length
                      ? item.goals.map(formatGoal).slice(0, 2).join(', ')
                      : '—'}
                  </td>
                  <td className="px-3 sm:px-4 md:px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 sm:gap-3">
                      <Button variant="outline" size="sm" asChild className="h-9 sm:h-8 px-3 sm:px-4 rounded-lg text-xs font-bold border-slate-200 hover:border-slate-900 hover:bg-slate-900 hover:text-white transition-all">
                        <Link to={`/coach/assessments/${item.id}`}>
                          <span className="hidden sm:inline">Open Report</span>
                          <span className="sm:hidden">Open</span>
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(item.id, item.clientName)}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 h-9 w-9 sm:h-8 sm:w-8 p-0 rounded-lg group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {(filtered.length > visibleCount || hasMore) && (
        <div className="flex justify-center pt-4 sm:pt-6">
          <Button 
            variant="outline" 
            onClick={onLoadMore}
            disabled={loadingMore}
            className="text-slate-500 font-semibold text-xs px-8 rounded-xl border-slate-200 hover:border-slate-900 hover:text-slate-900 transition-all"
          >
            {loadingMore ? 'Loading...' : hasMore ? 'Load More from Database' : 'Show More Assessments'}
          </Button>
        </div>
      )}
    </section>
  );
};
