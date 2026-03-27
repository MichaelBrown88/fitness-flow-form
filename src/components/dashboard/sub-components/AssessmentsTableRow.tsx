import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { formatGoal } from '../DashboardConstants';
import type { CoachAssessmentSummary } from '@/services/coachAssessments';
import { formatClientDisplayName } from '@/lib/utils/clientDisplayName';

export interface AssessmentsTableRowProps {
  item: CoachAssessmentSummary;
  onDelete: (id: string, name: string) => void;
}

export const AssessmentsTableRow: React.FC<AssessmentsTableRowProps> = ({ item, onDelete }) => {
  return (
    <tr className="group transition-colors hover:bg-muted/50">
      <td className="px-3 py-4 text-xs font-semibold text-foreground sm:px-4 sm:text-sm md:px-6">
        <div className="flex flex-col">
          <span>{formatClientDisplayName(item.clientName)}</span>
          <span className="mt-1 text-[10px] font-medium text-muted-foreground sm:hidden">
            {item.createdAt ? item.createdAt.toDate().toLocaleDateString() : '—'}
          </span>
        </div>
      </td>
      <td className="hidden px-3 py-4 text-xs font-medium text-muted-foreground sm:table-cell sm:px-4 sm:text-sm md:px-6">
        {item.createdAt ? item.createdAt.toDate().toLocaleDateString() : '—'}
      </td>
      <td className="px-3 sm:px-4 md:px-6 py-4">
        <span className="inline-flex items-center rounded-lg bg-foreground px-2.5 py-1 text-xs font-bold text-background transition-transform group-hover:scale-105">
          {item.overallScore || '—'}
        </span>
      </td>
      <td className="hidden px-3 py-4 text-[10px] font-medium italic text-muted-foreground sm:px-4 sm:text-xs md:table-cell md:px-6">
        {item.goals && item.goals.length ? item.goals.map(formatGoal).slice(0, 2).join(', ') : '—'}
      </td>
      <td className="px-3 sm:px-4 md:px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-1 sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-9 rounded-lg border-border px-3 text-xs font-bold transition-all hover:border-foreground hover:bg-foreground hover:text-background sm:h-8 sm:px-4"
          >
            <Link to={`/coach/assessments/${item.id}`}>
              <span className="hidden sm:inline">Open Report</span>
              <span className="sm:hidden">Open</span>
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(item.id, item.clientName)}
            className="h-9 w-9 rounded-lg p-0 text-red-400 transition-opacity hover:bg-red-500/10 hover:text-red-600 group-hover:opacity-100 sm:h-8 sm:w-8 dark:hover:bg-red-950/40"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
};
