/**
 * Unified Client Table
 *
 * One row per client with score, trend, last assessed, and next due info.
 * Supports status filtering (Active / Paused / Archived / All).
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus, Pin } from 'lucide-react';
import { ClientActionsDropdown } from './ClientActionsDropdown';
import { ClientTableBulkActions } from './unifiedClientTableBulk';
import type { ClientGroup } from '@/hooks/dashboard/types';
import type { UserProfile } from '@/types/auth';
import { scoreGrade, SCORE_COLORS } from '@/lib/scoring/scoreColor';
import { BASE_CADENCE_INTERVALS } from '@/types/client';
import type { PartialAssessmentCategory } from '@/types/client';
import { getPillarLabel } from '@/constants/pillars';
import { ROUTES } from '@/constants/routes';
import { UI_DASHBOARD_CLIENTS } from '@/constants/ui';
import { formatClientDisplayName } from '@/lib/utils/clientDisplayName';

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
  onViewHistory?: (clientName: string) => void;
  /** Bulk pause/archive writes (real org id, not impersonation read scope) */
  writeOrganizationId?: string;
  coachUid?: string;
  profile?: UserProfile | null;
  onBulkComplete?: () => void;
}

const ALL_PILLARS: PartialAssessmentCategory[] = ['bodycomp', 'posture', 'fitness', 'strength', 'lifestyle'];

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
      color: 'text-muted-foreground',
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

    const pillarSpecific = client.pillarDates?.[pillar];
    let baseDate = pillarSpecific ?? effectiveLatest;
    if (
      pillarSpecific &&
      effectiveLatest &&
      pillarSpecific.getTime() < effectiveLatest.getTime()
    ) {
      baseDate = effectiveLatest;
    }
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
        color = 'text-muted-foreground';
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
  if (trend === undefined || trend === null) {
    return (
      <span className="text-[10px] font-medium text-muted-foreground tabular-nums" aria-label="No trend data yet">
        —
      </span>
    );
  }
  if (trend > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
        <TrendingUp className="h-3 w-3" />+{trend}
      </span>
    );
  }
  if (trend < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950/50 dark:text-red-300">
        <TrendingDown className="h-3 w-3" />{trend}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
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
  onViewHistory,
  writeOrganizationId,
  coachUid,
  profile,
  onBulkComplete,
}) => {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>('lastAssessed');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [visibleCount, setVisibleCount] = useState(20);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const visible = sorted.slice(0, visibleCount);
    if (selected.size === visible.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(visible.map((c) => c.id)));
    }
  };

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
    'px-3 sm:px-4 md:px-6 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors';
  const colCount = (showCoachColumn ? 8 : 7);

  return (
    <section className="space-y-4" aria-live="polite">
      {/* Status filter */}
      <div className="flex items-center gap-1">
        {STATUS_FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              statusFilter === opt.value
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Desktop / Tablet table */}
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card shadow-sm sm:block">
        <table className="min-w-full divide-y divide-border text-xs sm:text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-2 sm:px-3 py-3 w-10" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={sorted.slice(0, visibleCount).length > 0 && selected.size === sorted.slice(0, visibleCount).length}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 cursor-pointer rounded border-border text-primary focus:ring-ring"
                />
              </th>
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
              <th className="hidden px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground sm:px-4 md:px-6 lg:table-cell">
                Trend
              </th>
              <th className="hidden px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground sm:px-4 md:table-cell md:px-6">
                Next Due
              </th>
              <th className="px-3 py-3 text-right text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground sm:px-4 md:px-6">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loadingData ? (
              <tr>
                <td colSpan={colCount} className="px-6 py-12 text-center text-sm font-medium text-muted-foreground">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                    <span>Loading clients...</span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-6 py-12 text-center">
                  {search ? (
                    <p className="text-sm text-muted-foreground font-medium">
                      {UI_DASHBOARD_CLIENTS.SEARCH_NO_MATCH}
                    </p>
                  ) : (
                    <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
                      <p className="text-sm font-semibold text-foreground">{UI_DASHBOARD_CLIENTS.EMPTY_TITLE}</p>
                      <p className="text-sm text-muted-foreground">{UI_DASHBOARD_CLIENTS.EMPTY_BODY}</p>
                      <Button
                        type="button"
                        className="rounded-xl font-bold"
                        onClick={() => navigate(ROUTES.ASSESSMENT)}
                      >
                        {UI_DASHBOARD_CLIENTS.EMPTY_CTA}
                      </Button>
                    </div>
                  )}
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
                    className={`group cursor-pointer transition-colors hover:bg-muted/60 ${dimClass} ${selected.has(client.id) ? 'bg-primary/10 dark:bg-primary/20' : ''}`}
                    onClick={() => navigate(`/client/${encodeURIComponent(client.name)}`)}
                  >
                    <td className="px-2 sm:px-3 py-4 w-10" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(client.id)}
                        onChange={() => toggleSelect(client.id)}
                        className="h-4 w-4 cursor-pointer rounded border-border text-primary focus:ring-ring"
                      />
                    </td>
                    <td className="px-3 py-4 text-xs font-semibold text-foreground sm:px-4 sm:text-sm md:px-6">
                      <span className="flex items-center gap-2">
                        {formatClientDisplayName(client.name)}
                        {isPaused && <span className="text-[10px] font-bold text-muted-foreground">Paused</span>}
                        {isArchived && <span className="text-[10px] font-bold text-muted-foreground">Archived</span>}
                      </span>
                      {client.notes && (
                        <span className="mt-0.5 flex items-center gap-1">
                          <Pin className="h-2.5 w-2.5 shrink-0 text-amber-400" />
                          <span className="max-w-[200px] truncate text-[10px] font-normal text-muted-foreground">
                            {client.notes.length > 80 ? `${client.notes.slice(0, 80)}…` : client.notes}
                          </span>
                        </span>
                      )}
                    </td>
                    {showCoachColumn && (
                      <td className="hidden px-3 py-4 text-xs font-medium text-muted-foreground sm:px-4 md:table-cell md:px-6">
                        {client.coachUid && coachMap?.get(client.coachUid) ? coachMap.get(client.coachUid) : '—'}
                      </td>
                    )}
                    <td className="px-3 py-4 text-xs font-medium text-muted-foreground sm:px-4 sm:text-sm md:px-6">
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
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 sm:px-4 md:px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <ClientActionsDropdown
                        clientName={client.name}
                        latestAssessmentId={client.assessments[0]?.id}
                        onViewHistory={onViewHistory}
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
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex flex-col items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
              <span className="text-sm font-medium text-muted-foreground">Loading clients...</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            {search ? (
              <p className="text-sm text-muted-foreground font-medium">
                {UI_DASHBOARD_CLIENTS.SEARCH_NO_MATCH}
              </p>
            ) : (
              <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
                <p className="text-sm font-semibold text-foreground">{UI_DASHBOARD_CLIENTS.EMPTY_TITLE}</p>
                <p className="text-sm text-muted-foreground">{UI_DASHBOARD_CLIENTS.EMPTY_BODY}</p>
                <Button
                  type="button"
                  className="rounded-xl font-bold w-full sm:w-auto"
                  onClick={() => navigate(ROUTES.ASSESSMENT)}
                >
                  {UI_DASHBOARD_CLIENTS.EMPTY_CTA}
                </Button>
              </div>
            )}
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
                className={`cursor-pointer rounded-xl border border-border bg-card p-4 shadow-sm transition-colors active:bg-muted/50 ${dimClass}`}
                style={{ minHeight: 44 }}
                onClick={() => navigate(`/client/${encodeURIComponent(client.name)}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/client/${encodeURIComponent(client.name)}`);
                  }
                }}
              >
                {/* Line 1: checkbox + name + status + actions */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(client.id)}
                      onChange={() => toggleSelect(client.id)}
                      className="h-4 w-4 shrink-0 cursor-pointer rounded border-border text-primary focus:ring-ring"
                    />
                    <p className="truncate text-sm font-semibold text-foreground">
                      {formatClientDisplayName(client.name)}
                      {isPaused && <span className="ml-2 text-[10px] font-bold text-muted-foreground">Paused</span>}
                      {isArchived && <span className="ml-2 text-[10px] font-bold text-muted-foreground">Archived</span>}
                    </p>
                  </div>
                  <div className="shrink-0" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <ClientActionsDropdown
                      clientName={client.name}
                      latestAssessmentId={client.assessments[0]?.id}
                      onViewHistory={onViewHistory}
                    />
                  </div>
                </div>

                {client.notes && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <Pin className="h-2.5 w-2.5 text-amber-400 shrink-0" />
                    <span className="truncate text-[10px] text-muted-foreground">
                      {client.notes.length > 80 ? `${client.notes.slice(0, 80)}…` : client.notes}
                    </span>
                  </div>
                )}

                {/* Line 2: score, trend, coach, date, next due — all visible */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <ScoreBadge score={client.latestScore} />
                  <TrendIndicator trend={client.scoreChange} />
                  {showCoachColumn && client.coachUid && coachMap?.get(client.coachUid) && (
                    <span className="max-w-[80px] truncate text-[10px] font-medium text-muted-foreground">
                      {coachMap.get(client.coachUid)}
                    </span>
                  )}
                  {nextDue && (
                    <span className={`text-[10px] font-semibold ${nextDue.color}`}>
                      {nextDue.label}
                    </span>
                  )}
                  <span className="ml-auto shrink-0 text-[10px] font-medium text-muted-foreground">
                    {client.latestDate ? client.latestDate.toLocaleDateString() : 'Not assessed'}
                  </span>
                </div>
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
            className="rounded-xl border-border px-8 text-xs font-semibold text-muted-foreground transition-all hover:border-foreground hover:text-foreground"
          >
            Show More Clients
          </Button>
        </div>
      )}

      <ClientTableBulkActions
        selected={selected}
        clients={clients}
        onClearSelection={() => setSelected(new Set())}
        writeOrganizationId={writeOrganizationId}
        coachUid={coachUid}
        profile={profile}
        onBulkComplete={onBulkComplete}
        navigate={navigate}
      />
    </section>
  );
};
