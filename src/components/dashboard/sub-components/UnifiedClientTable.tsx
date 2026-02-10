/**
 * Unified Client Table
 *
 * Replaces the split AssessmentsTable + ClientsGrid with a single
 * table showing one row per client (the upsert model).
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ClientActionsDropdown } from './ClientActionsDropdown';
import type { ClientGroup } from '@/hooks/dashboard/types';
import { scoreGrade } from '@/lib/scoring/scoreColor';

type SortKey = 'name' | 'lastAssessed' | 'score';
type SortDir = 'asc' | 'desc';

interface UnifiedClientTableProps {
  loadingData: boolean;
  clients: ClientGroup[];
  search: string;
  onNewAssessment: (clientName: string, category?: string) => void;
}

/** Score badge with contextual color */
const ScoreBadge: React.FC<{ score: number }> = ({ score }) => {
  const grade = scoreGrade(score);
  const bg =
    grade === 'green'
      ? 'bg-emerald-900 text-emerald-50'
      : grade === 'amber'
        ? 'bg-amber-800 text-amber-50'
        : 'bg-red-900 text-red-50';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black shadow-sm ${bg}`}
    >
      {score || '—'}
    </span>
  );
};

/** Trend indicator */
const TrendIndicator: React.FC<{ trend?: number }> = ({ trend }) => {
  if (trend === undefined || trend === null) return null;

  if (trend > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
        <TrendingUp className="h-3 w-3" />+{trend}
      </span>
    );
  }
  if (trend < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
        <TrendingDown className="h-3 w-3" />{trend}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-full">
      <Minus className="h-3 w-3" />0
    </span>
  );
};

export const UnifiedClientTable: React.FC<UnifiedClientTableProps> = ({
  loadingData,
  clients,
  search,
  onNewAssessment,
}) => {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>('lastAssessed');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [visibleCount, setVisibleCount] = useState(20);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = useMemo(() => {
    const copy = [...clients];
    const dir = sortDir === 'asc' ? 1 : -1;
    copy.sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return dir * a.name.localeCompare(b.name);
        case 'lastAssessed': {
          const da = a.latestDate?.getTime() || 0;
          const db = b.latestDate?.getTime() || 0;
          return dir * (da - db);
        }
        case 'score':
          return dir * ((a.latestScore || 0) - (b.latestScore || 0));
        default:
          return 0;
      }
    });
    return copy;
  }, [clients, sortKey, sortDir]);

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  const thClass =
    'px-3 sm:px-4 md:px-6 py-3 text-left text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400 cursor-pointer select-none hover:text-slate-600 transition-colors';

  return (
    <section className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm -mx-4 sm:mx-0">
        <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
          <thead className="bg-slate-50/50">
            <tr>
              <th className={thClass} onClick={() => toggleSort('name')}>
                Client{sortIcon('name')}
              </th>
              <th
                className={`${thClass} hidden sm:table-cell`}
                onClick={() => toggleSort('lastAssessed')}
              >
                Last Assessed{sortIcon('lastAssessed')}
              </th>
              <th className={thClass} onClick={() => toggleSort('score')}>
                Score{sortIcon('score')}
              </th>
              <th className="px-3 sm:px-4 md:px-6 py-3 text-left text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400 hidden lg:table-cell">
                Trend
              </th>
              <th className="px-3 sm:px-4 md:px-6 py-3 text-right text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400">
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
                    <span>Loading clients...</span>
                  </div>
                </td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400 font-medium">
                  {search
                    ? 'No clients match that name.'
                    : 'No clients found. Run an assessment to see them here.'}
                </td>
              </tr>
            ) : (
              sorted.slice(0, visibleCount).map((client) => (
                <tr
                  key={client.id}
                  className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  onClick={() => navigate(`/client/${encodeURIComponent(client.name)}`)}
                >
                  <td className="px-3 sm:px-4 md:px-6 py-4 text-xs sm:text-sm text-slate-900 font-semibold uppercase tracking-tight">
                    <div className="flex flex-col">
                      <span>{client.name}</span>
                      <span className="text-[10px] sm:hidden text-slate-400 font-medium mt-1">
                        {client.latestDate
                          ? client.latestDate.toLocaleDateString()
                          : '—'}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 md:px-6 py-4 text-xs sm:text-sm text-slate-500 font-medium hidden sm:table-cell">
                    {client.latestDate
                      ? client.latestDate.toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-3 sm:px-4 md:px-6 py-4">
                    <ScoreBadge score={client.latestScore} />
                  </td>
                  <td className="px-3 sm:px-4 md:px-6 py-4 hidden lg:table-cell">
                    <TrendIndicator trend={client.scoreChange} />
                  </td>
                  <td
                    className="px-3 sm:px-4 md:px-6 py-4 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ClientActionsDropdown
                      clientName={client.name}
                      latestAssessmentId={client.assessments[0]?.id}
                      onNewAssessment={onNewAssessment}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loadingData && clients.length > visibleCount && (
        <div className="flex justify-center pt-4 sm:pt-6">
          <Button
            variant="outline"
            onClick={() => setVisibleCount((prev) => prev + 20)}
            className="text-slate-500 font-bold text-xs uppercase tracking-widest px-8 rounded-xl border-slate-200 hover:border-slate-900 hover:text-slate-900 transition-all"
          >
            Show More Clients
          </Button>
        </div>
      )}
    </section>
  );
};
