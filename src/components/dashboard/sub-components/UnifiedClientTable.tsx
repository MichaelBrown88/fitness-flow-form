/**
 * Unified Client Table
 *
 * One row per client with score, trend, last assessed, and next due info.
 * Supports status filtering (Active / Paused / Archived / All).
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ClientActionsDropdown } from './ClientActionsDropdown';
import type { ClientGroup } from '@/hooks/dashboard/types';
import { scoreGrade, SCORE_COLORS } from '@/lib/scoring/scoreColor';
import { BASE_CADENCE_INTERVALS } from '@/types/client';
import type { PartialAssessmentCategory } from '@/types/client';
import { getPillarLabel } from '@/constants/pillars';

type SortKey = 'name' | 'lastAssessed' | 'score';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'active' | 'paused' | 'archived' | 'all';

interface UnifiedClientTableProps {
  loadingData: boolean;
  clients: ClientGroup[];
  search: string;
  showCoachColumn?: boolean;
  coachMap?: Map<string, string>;
  orgDefaultIntervals?: Record<string, number>;
  orgDefaultActivePillars?: PartialAssessmentCategory[];
}

const ALL_PILLARS: PartialAssessmentCategory[] = ['bodycomp', 'posture', 'fitness', 'strength', 'lifestyle'];

const PILLAR_DATE_MAP: Record<string, string> = {
  bodycomp: 'lastInBodyDate',
  posture: 'lastPostureDate',
  fitness: 'lastFitnessDate',
  strength: 'lastStrengthDate',
  lifestyle: 'lastLifestyleDate',
};

interface NextDueInfo {
  pillar: string;
  label: string;
  color: string;
  daysFromDue: number;
}

function computeNextDue(
  client: ClientGroup,
  orgIntervals?: Record<string, number>,
  orgActivePillars?: PartialAssessmentCategory[],
): NextDueInfo | null {
  const pillars = client.activePillars ?? orgActivePillars ?? ALL_PILLARS;
  if (pillars.length === 0) return null;

  // If training hasn't started yet, nothing is due
  if (client.trainingStartDate && client.trainingStartDate > new Date()) {
    const daysUntil = Math.ceil((client.trainingStartDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const weeks = Math.ceil(daysUntil / 7);
    return {
      pillar: pillars[0],
      label: `Starts in ${weeks} wk`,
      color: 'text-slate-400',
      daysFromDue: -daysUntil,
    };
  }

  let nearest: NextDueInfo | null = null;

  const profileDate = client.lastAssessmentDate ?? client.latestDate;
  const effectiveLatest = profileDate
    ? (client.trainingStartDate && client.trainingStartDate > profileDate ? client.trainingStartDate : profileDate)
    : null;

  for (const pillar of pillars) {
    const customInterval = client.retestSchedule?.custom?.[pillar]?.intervalDays;
    const orgInterval = orgIntervals?.[pillar];
    const interval = (customInterval && customInterval > 0)
      ? customInterval
      : (orgInterval && orgInterval > 0)
      ? orgInterval
      : BASE_CADENCE_INTERVALS[pillar];

    const baseDate = client.pillarDates?.[pillar] ?? effectiveLatest;
    if (!baseDate) continue;

    const dueDate = new Date(baseDate.getTime() + interval * 24 * 60 * 60 * 1000);
    const daysFromDue = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    if (!nearest || daysFromDue > nearest.daysFromDue) {
      let label: string;
      let color: string;

      if (daysFromDue > 0) {
        const weeks = Math.ceil(daysFromDue / 7);
        label = `${getPillarLabel(pillar)} — overdue`;
        color = 'text-score-red-fg';
        if (weeks > 1) label = `${getPillarLabel(pillar)} — ${weeks}wk overdue`;
      } else if (Math.abs(daysFromDue) <= 7) {
        label = `${getPillarLabel(pillar)} — this week`;
        color = 'text-score-amber-fg';
      } else {
        const weeks = Math.ceil(Math.abs(daysFromDue) / 7);
        label = `${getPillarLabel(pillar)} — in ${weeks} wk`;
        color = 'text-slate-500';
      }

      nearest = { pillar, label, color, daysFromDue };
    }
  }

  return nearest;
}

const ScoreBadge: React.FC<{ score: number }> = ({ score }) => {
  const grade = scoreGrade(score);
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${SCORE_COLORS[grade].badge}`}>
      {score || '—'}
    </span>
  );
};

const TrendIndicator: React.FC<{ trend?: number }> = ({ trend }) => {
  if (trend === undefined || trend === null) return null;
  if (trend > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
        <TrendingUp className="h-3 w-3" />+{trend}
      </span>
    );
  }
  if (trend < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
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

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All' },
];

export const UnifiedClientTable: React.FC<UnifiedClientTableProps> = ({
  loadingData,
  clients,
  search,
  showCoachColumn = false,
  coachMap,
  orgDefaultIntervals,
  orgDefaultActivePillars,
}) => {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>('lastAssessed');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [visibleCount, setVisibleCount] = useState(20);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const filtered = useMemo(() => {
    return clients.filter(c => {
      const status = c.clientStatus || 'active';
      if (statusFilter === 'all') return true;
      if (statusFilter === 'active') return status === 'active' || status === 'paused';
      return status === statusFilter;
    });
  }, [clients, statusFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
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
  }, [filtered, sortKey, sortDir]);

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  const thClass =
    'px-3 sm:px-4 md:px-6 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 cursor-pointer select-none hover:text-slate-600 transition-colors';
  const colCount = (showCoachColumn ? 7 : 6);

  return (
    <section className="space-y-4">
      {/* Status filter */}
      <div className="flex items-center gap-1">
        {STATUS_FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === opt.value
                ? 'bg-slate-900 text-white'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Desktop / Tablet table */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
          <thead className="bg-slate-50/50">
            <tr>
              <th className={thClass} onClick={() => toggleSort('name')}>
                Client{sortIcon('name')}
              </th>
              {showCoachColumn && (
                <th className={`${thClass} hidden md:table-cell`}>Coach</th>
              )}
              <th className={thClass} onClick={() => toggleSort('lastAssessed')}>
                Last Assessed{sortIcon('lastAssessed')}
              </th>
              <th className={thClass} onClick={() => toggleSort('score')}>
                Score{sortIcon('score')}
              </th>
              <th className="px-3 sm:px-4 md:px-6 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 hidden lg:table-cell">
                Trend
              </th>
              <th className="px-3 sm:px-4 md:px-6 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 hidden md:table-cell">
                Next Due
              </th>
              <th className="px-3 sm:px-4 md:px-6 py-3 text-right text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loadingData ? (
              <tr>
                <td colSpan={colCount} className="px-6 py-12 text-center text-sm text-slate-400 font-medium">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    <span>Loading clients...</span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-6 py-12 text-center text-sm text-slate-400 font-medium">
                  {search ? 'No clients match that name.' : 'No clients found.'}
                </td>
              </tr>
            ) : (
              sorted.slice(0, visibleCount).map((client) => {
                const isPaused = client.clientStatus === 'paused';
                const isArchived = client.clientStatus === 'archived';
                const nextDue = computeNextDue(client, orgDefaultIntervals, orgDefaultActivePillars);
                const dimClass = (isPaused || isArchived) ? 'opacity-60' : '';

                return (
                  <tr
                    key={client.id}
                    className={`hover:bg-slate-50/80 transition-colors group cursor-pointer ${dimClass}`}
                    onClick={() => navigate(`/client/${encodeURIComponent(client.name)}`)}
                  >
                    <td className="px-3 sm:px-4 md:px-6 py-4 text-xs sm:text-sm text-slate-900 font-semibold">
                      <span className="flex items-center gap-2">
                        {client.name}
                        {isPaused && <span className="text-[10px] text-slate-400 font-bold">Paused</span>}
                        {isArchived && <span className="text-[10px] text-slate-400 font-bold">Archived</span>}
                      </span>
                    </td>
                    {showCoachColumn && (
                      <td className="px-3 sm:px-4 md:px-6 py-4 text-xs text-slate-500 font-medium hidden md:table-cell">
                        {client.coachUid && coachMap?.get(client.coachUid) ? coachMap.get(client.coachUid) : '—'}
                      </td>
                    )}
                    <td className="px-3 sm:px-4 md:px-6 py-4 text-xs sm:text-sm text-slate-500 font-medium">
                      {client.latestDate ? client.latestDate.toLocaleDateString() : '—'}
                    </td>
                    <td className="px-3 sm:px-4 md:px-6 py-4">
                      <ScoreBadge score={client.latestScore} />
                    </td>
                    <td className="px-3 sm:px-4 md:px-6 py-4 hidden lg:table-cell">
                      <TrendIndicator trend={client.scoreChange} />
                    </td>
                    <td className="px-3 sm:px-4 md:px-6 py-4 hidden md:table-cell">
                      {nextDue ? (
                        <span className={`text-xs font-semibold ${nextDue.color}`}>{nextDue.label}</span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-3 sm:px-4 md:px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <ClientActionsDropdown
                        clientName={client.name}
                        latestAssessmentId={client.assessments[0]?.id}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card layout */}
      <div className="sm:hidden space-y-2">
        {loadingData ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-slate-400 font-medium">Loading clients...</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400 font-medium">
            {search ? 'No clients match that name.' : 'No clients found.'}
          </div>
        ) : (
          sorted.slice(0, visibleCount).map((client) => {
            const isPaused = client.clientStatus === 'paused';
            const isArchived = client.clientStatus === 'archived';
            const nextDue = computeNextDue(client, orgDefaultIntervals, orgDefaultActivePillars);
            const dimClass = (isPaused || isArchived) ? 'opacity-60' : '';

            return (
              <div
                key={client.id}
                role="button"
                tabIndex={0}
                className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50 transition-colors cursor-pointer ${dimClass}`}
                style={{ minHeight: 44 }}
                onClick={() => navigate(`/client/${encodeURIComponent(client.name)}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/client/${encodeURIComponent(client.name)}`);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {client.name}
                      {isPaused && <span className="text-[10px] text-slate-400 font-bold ml-2">Paused</span>}
                      {isArchived && <span className="text-[10px] text-slate-400 font-bold ml-2">Archived</span>}
                    </p>
                    {showCoachColumn && (
                      <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">
                        {client.coachUid && coachMap?.get(client.coachUid)
                          ? coachMap.get(client.coachUid) : 'No coach assigned'}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <ClientActionsDropdown clientName={client.name} latestAssessmentId={client.assessments[0]?.id} />
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-2">
                  <ScoreBadge score={client.latestScore} />
                  <TrendIndicator trend={client.scoreChange} />
                  <span className="ml-auto text-xs text-slate-400 font-medium">
                    {client.latestDate ? client.latestDate.toLocaleDateString() : 'Not assessed'}
                  </span>
                </div>

                {nextDue && (
                  <p className={`text-xs font-semibold mt-2 ${nextDue.color}`}>
                    {nextDue.label}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {!loadingData && filtered.length > visibleCount && (
        <div className="flex justify-center pt-4 sm:pt-6">
          <Button
            variant="outline"
            onClick={() => setVisibleCount((prev) => prev + 20)}
            className="text-slate-500 font-semibold text-xs px-8 rounded-xl border-slate-200 hover:border-slate-900 hover:text-slate-900 transition-all"
          >
            Show More Clients
          </Button>
        </div>
      )}
    </section>
  );
};
