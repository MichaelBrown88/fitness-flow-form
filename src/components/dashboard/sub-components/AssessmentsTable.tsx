import React from 'react';
import { Button } from '@/components/ui/button';
import type { CoachAssessmentSummary } from '@/services/coachAssessments';
import { AssessmentsTableRow } from './AssessmentsTableRow';

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
      <div className="-mx-4 overflow-x-auto rounded-xl border border-border bg-card shadow-sm sm:mx-0">
        <table className="min-w-full divide-y divide-border text-xs sm:text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground sm:px-4 md:px-6">
                Client
              </th>
              <th className="hidden px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground sm:table-cell sm:px-4 md:px-6">
                Date
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground sm:px-4 md:px-6">
                Overall
              </th>
              <th className="hidden px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground sm:px-4 md:table-cell md:px-6">
                Goals
              </th>
              <th className="px-3 py-3 text-right text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground sm:px-4 md:px-6">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loadingData ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm font-medium text-muted-foreground">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                    <span>Loading assessments...</span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm font-medium text-muted-foreground">
                  {search
                    ? 'No assessments match that name.'
                    : 'No assessments saved yet. Run an assessment to see it here.'}
                </td>
              </tr>
            ) : (
              filtered.slice(0, visibleCount).map((item) => (
                <AssessmentsTableRow key={item.id} item={item} onDelete={onDelete} />
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
            className="rounded-xl border-border px-8 text-xs font-semibold text-muted-foreground transition-all hover:border-foreground hover:text-foreground"
          >
            {loadingMore ? 'Loading...' : hasMore ? 'Load More from Database' : 'Show More Assessments'}
          </Button>
        </div>
      )}
    </section>
  );
};
