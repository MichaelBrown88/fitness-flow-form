/**
 * Unified Client Table
 *
 * One row per client with score, trend, last assessed, and next due info.
 * Supports status filtering (Active / Paused / Archived / All).
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Pin, Link as LinkIcon, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ClientActionsDropdown } from './ClientActionsDropdown';
import { ClientTableBulkActions } from './unifiedClientTableBulk';
import { PauseClientDialog } from '@/components/client/PauseClientDialog';
import { generateClientSlug } from '@/services/clientProfiles';
import type { ClientGroup } from '@/hooks/dashboard/types';
import type { UserProfile } from '@/types/auth';
import type { PartialAssessmentCategory } from '@/types/client';
import type { ScheduleStatus } from '@/hooks/useReassessmentQueue';
import { ROUTES } from '@/constants/routes';
import {
  UI_DASHBOARD_CLIENTS,
  clientDirectorySelectRowAria,
} from '@/constants/ui';
import { formatClientDisplayName } from '@/lib/utils/clientDisplayName';
import { cn } from '@/lib/utils';

type SortKey = 'name' | 'lastAssessed' | 'score';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'active' | 'paused' | 'archived' | 'deleted' | 'all';

interface UnifiedClientTableProps {
  loadingData: boolean;
  clients: ClientGroup[];
  search: string;
  onSearchChange?: (value: string) => void;
  showCoachColumn?: boolean;
  coachMap?: Map<string, string>;
  orgDefaultIntervals?: Record<string, number>;
  orgDefaultActivePillars?: PartialAssessmentCategory[];
  onViewHistory?: (clientName: string) => void;
  onStartAssessment?: (clientName: string) => void;
  /** Bulk pause/archive writes (real org id, not impersonation read scope) */
  writeOrganizationId?: string;
  coachUid?: string;
  profile?: UserProfile | null;
  onBulkComplete?: () => void;
  /** Per-client reassessment status (clientName → status). Used to render
   *  the kit status pill. If absent, status pill renders as "No data". */
  attentionMap?: Map<string, ScheduleStatus>;
}

const GOAL_LABELS: Record<string, string> = {
  'build-muscle': 'Build muscle',
  'weight-loss': 'Weight loss',
  'body-recomposition': 'Body recomp',
  'build-strength': 'Build strength',
  'improve-fitness': 'Improve fitness',
  'general-health': 'General health',
};

function primaryGoalLabel(goals: string[] | undefined): string | null {
  if (!goals || goals.length === 0) return null;
  return GOAL_LABELS[goals[0]] ?? goals[0];
}

// ─── Kit row helpers ────────────────────────────────────────────────

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function axisTone(score: number): 'green' | 'amber' | 'red' | 'muted' {
  if (!score) return 'muted';
  if (score >= 75) return 'green';
  if (score >= 50) return 'amber';
  return 'red';
}

const AXIS_PILL_CLASS: Record<'green' | 'amber' | 'red' | 'muted', string> = {
  green: 'bg-score-green-muted text-score-green-bold',
  amber: 'bg-score-amber-muted text-score-amber-bold',
  red: 'bg-score-red-muted text-score-red-bold',
  muted: 'bg-muted text-muted-foreground',
};

const AxisScorePill: React.FC<{ score: number }> = React.memo(({ score }) => {
  const tone = axisTone(score);
  if (tone === 'muted') {
    return (
      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        No data
      </span>
    );
  }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold tabular-nums', AXIS_PILL_CLASS[tone])}>
      AXIS {score}
    </span>
  );
});

const STATUS_PILL: Record<ScheduleStatus | 'no-data', { label: string; dot: string }> = {
  overdue: { label: 'Overdue', dot: 'bg-score-red' },
  'due-soon': { label: 'Needs attention', dot: 'bg-score-amber' },
  'up-to-date': { label: 'On track', dot: 'bg-score-green' },
  'no-data': { label: 'No data', dot: 'bg-muted-foreground/40' },
};

const ClientStatusPill: React.FC<{ status?: ScheduleStatus }> = React.memo(({ status }) => {
  const config = STATUS_PILL[status ?? 'no-data'];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-foreground-secondary">
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} aria-hidden />
      {config.label}
    </span>
  );
});

/** Subtle trend indicator — text + arrow, no background pill. */
const TrendIndicator: React.FC<{ trend?: number }> = React.memo(({ trend }) => {
  if (trend === undefined || trend === null || trend === 0) {
    return <span className="text-xs font-medium text-muted-foreground tabular-nums">—</span>;
  }
  const Icon = trend > 0 ? TrendingUp : TrendingDown;
  const tone = trend > 0 ? 'text-score-green-fg' : 'text-score-red-fg';
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-semibold tabular-nums', tone)}>
      <Icon className="h-3 w-3" />
      {trend > 0 ? `+${trend}` : trend}
    </span>
  );
});

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'archived', label: 'Archived' },
  { value: 'deleted', label: 'Trash' },
  { value: 'all', label: 'All' },
];

export const UnifiedClientTable: React.FC<UnifiedClientTableProps> = ({
  loadingData,
  clients,
  search,
  onSearchChange,
  showCoachColumn = false,
  coachMap,
  orgDefaultIntervals,
  orgDefaultActivePillars,
  onViewHistory,
  onStartAssessment,
  writeOrganizationId,
  coachUid,
  profile,
  onBulkComplete,
  attentionMap,
}) => {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>('lastAssessed');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [visibleCount, setVisibleCount] = useState(20);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pauseTarget, setPauseTarget] = useState<{ name: string; isPaused: boolean } | null>(null);

  const handlePauseConfirm = useCallback(async (reason?: string) => {
    if (!pauseTarget || !writeOrganizationId) return;
    const { pauseClient } = await import('@/services/clientProfiles');
    await pauseClient({
      organizationId: writeOrganizationId,
      clientSlug: generateClientSlug(pauseTarget.name),
      pausedBy: coachUid ?? 'unknown',
      reason,
    });
    setPauseTarget(null);
    onBulkComplete?.();
  }, [pauseTarget, writeOrganizationId, coachUid, onBulkComplete]);

  const handleUnpauseConfirm = useCallback(async (mode: 'resume' | 'reset') => {
    if (!pauseTarget || !writeOrganizationId) return;
    const { unpauseClient } = await import('@/services/clientProfiles');
    await unpauseClient({
      organizationId: writeOrganizationId,
      clientSlug: generateClientSlug(pauseTarget.name),
      mode,
    });
    setPauseTarget(null);
    onBulkComplete?.();
  }, [pauseTarget, writeOrganizationId, onBulkComplete]);

  const handleRestore = useCallback(async (name: string) => {
    if (!writeOrganizationId) return;
    const { restoreClient } = await import('@/services/clientProfiles');
    await restoreClient({
      organizationId: writeOrganizationId,
      clientSlug: generateClientSlug(name),
      profile,
    });
    onBulkComplete?.();
  }, [writeOrganizationId, profile, onBulkComplete]);

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

  // Pre-format dates once per sort change, not on every render
  const formattedDates = useMemo(() => {
    const map = new Map<string, string>();
    for (const client of sorted) {
      map.set(client.id, client.latestDate ? client.latestDate.toLocaleDateString() : '—');
    }
    return map;
  }, [sorted]);

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  // Kit table head: 11px / 600 / uppercase / tracking 0.12em / muted.
  // Lighter weight than the previous font-black to match kit micro-labels.
  const thClass =
    'px-3 sm:px-4 md:px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors';
  const thStaticClass =
    'px-3 sm:px-4 md:px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground';
  // Columns: checkbox + client + [coach] + score + status + trend + actions
  const colCount = (showCoachColumn ? 7 : 6);

  return (
    <section className="space-y-3" aria-live="polite">
      {/* Status filter + search — padded so the bar has breathing room from
          the outer workspace panel edge (no more flush-to-corner). */}
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-1 sm:px-5">
        <div className="flex items-center gap-1">
          {STATUS_FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === opt.value
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {onSearchChange && (
          <div className="relative w-full max-w-[220px]">
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-9 w-full rounded-full border-transparent bg-muted pl-3 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-foreground focus-visible:ring-0"
            />
            <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Desktop / Tablet table — edge-to-edge inside the outer workspace
          panel; outer panel provides the card surface + border. */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="min-w-full divide-y divide-border text-xs sm:text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-2 sm:px-3 py-3 w-10" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={sorted.slice(0, visibleCount).length > 0 && selected.size === sorted.slice(0, visibleCount).length}
                  onChange={toggleSelectAll}
                  aria-label={UI_DASHBOARD_CLIENTS.TABLE_SELECT_ALL_VISIBLE_ARIA}
                  className="h-4 w-4 cursor-pointer rounded border-border text-primary focus:ring-ring"
                />
              </th>
              <th className={thClass} onClick={() => toggleSort('name')}>
                Client{sortIcon('name')}
              </th>
              {showCoachColumn && (
                <th className={`${thStaticClass} hidden md:table-cell`}>Coach</th>
              )}
              <th className={thClass} onClick={() => toggleSort('score')}>
                AXIS{sortIcon('score')}
              </th>
              <th className={`${thStaticClass} hidden md:table-cell`}>Status</th>
              <th className={`${thStaticClass} hidden lg:table-cell`}>Trend</th>
              <th className={`${thStaticClass} text-right`}>Actions</th>
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
                        className="rounded-lg font-bold"
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
                const goalLabel = primaryGoalLabel(client.assessments[0]?.goals);
                const isDeleted = client.clientStatus === 'deleted';
                const dimClass = (isPaused || isArchived || isDeleted) ? 'opacity-60' : '';

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
                        aria-label={clientDirectorySelectRowAria(formatClientDisplayName(client.name))}
                        className="h-4 w-4 cursor-pointer rounded border-border text-primary focus:ring-ring"
                      />
                    </td>
                    <td className="px-3 py-3 sm:px-4 md:px-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-[12px] font-semibold text-muted-foreground" aria-hidden>
                          {initials(client.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-sm font-semibold tracking-[-0.005em] text-foreground">
                            <span className="truncate">{formatClientDisplayName(client.name)}</span>
                            {client.shareToken && (
                              <LinkIcon className="h-3 w-3 shrink-0 text-muted-foreground/60" aria-label="Report shared" />
                            )}
                            {isPaused && <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Paused</span>}
                            {isArchived && <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Archived</span>}
                            {isDeleted && <span className="text-[10px] font-bold uppercase tracking-wider text-destructive">Deleted</span>}
                            {client.remoteIntakeAwaitingStudio && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-score-amber-muted/60 px-2 py-0.5 text-[10px] font-bold text-score-amber-fg">
                                <span className="h-1.5 w-1.5 rounded-full bg-score-amber shrink-0" />
                                Awaiting studio
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 truncate text-[12px] text-muted-foreground">
                            {(() => {
                              const date = formattedDates.get(client.id);
                              const dateLabel = date && date !== '—' ? `Last assessed ${date}` : 'Not yet assessed';
                              return goalLabel ? `${dateLabel} · ${goalLabel}` : dateLabel;
                            })()}
                          </div>
                          {client.notes && (
                            <div className="mt-1 flex items-center gap-1">
                              <Pin className="h-2.5 w-2.5 shrink-0 text-amber-400" />
                              <span className="max-w-[260px] truncate text-[11px] font-normal text-muted-foreground">
                                {client.notes.length > 80 ? `${client.notes.slice(0, 80)}…` : client.notes}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    {showCoachColumn && (
                      <td className="hidden px-3 py-3 text-xs font-medium text-muted-foreground sm:px-4 md:table-cell md:px-6">
                        {client.coachUid && coachMap?.get(client.coachUid) ? coachMap.get(client.coachUid) : '—'}
                      </td>
                    )}
                    <td className="px-3 py-3 sm:px-4 md:px-6">
                      <AxisScorePill score={client.latestScore} />
                    </td>
                    <td className="hidden px-3 py-3 sm:px-4 md:table-cell md:px-6">
                      <ClientStatusPill status={attentionMap?.get(client.name)} />
                    </td>
                    <td className="hidden px-3 py-3 sm:px-4 lg:table-cell lg:px-6">
                      <TrendIndicator trend={client.scoreChange} />
                    </td>
                    <td className="px-3 py-3 text-right sm:px-4 md:px-6" onClick={(e) => e.stopPropagation()}>
                      <ClientActionsDropdown
                        clientName={client.name}
                        latestAssessmentId={client.assessments[0]?.id}
                        clientStatus={client.clientStatus}
                        onViewHistory={onViewHistory}
                        onStartAssessment={onStartAssessment}
                        onPauseToggle={() => setPauseTarget({ name: client.name, isPaused: client.clientStatus === 'paused' })}
                        onRestore={handleRestore}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card layout — inset from the outer panel edges */}
      <div className="space-y-2 px-3 pb-3 sm:hidden">
        {loadingData ? (
          <div className="rounded-2xl bg-card shadow-sm p-6">
            <div className="flex flex-col items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
              <span className="text-sm font-medium text-muted-foreground">Loading clients...</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-border/70 bg-background p-6 text-center">
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
                  className="font-bold w-full sm:w-auto"
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
            const goalLabel = primaryGoalLabel(client.assessments[0]?.goals);
            const dimClass = (isPaused || isArchived) ? 'opacity-60' : '';

            return (
              <div
                key={client.id}
                role="button"
                tabIndex={0}
                className={`cursor-pointer rounded-2xl bg-card shadow-sm p-4 transition-colors active:bg-muted/50 ${dimClass}`}
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
                      aria-label={clientDirectorySelectRowAria(formatClientDisplayName(client.name))}
                      className="h-4 w-4 shrink-0 cursor-pointer rounded border-border text-primary focus:ring-ring"
                    />
                    <p className="truncate text-sm font-semibold text-foreground">
                      {formatClientDisplayName(client.name)}
                      {isPaused && <span className="ml-2 text-xs font-bold text-muted-foreground">Paused</span>}
                      {isArchived && <span className="ml-2 text-xs font-bold text-muted-foreground">Archived</span>}
                      {client.clientStatus === 'deleted' && <span className="ml-2 text-xs font-bold text-destructive">Deleted</span>}
                    </p>
                  </div>
                  <div className="shrink-0" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <ClientActionsDropdown
                      clientName={client.name}
                      latestAssessmentId={client.assessments[0]?.id}
                      clientStatus={client.clientStatus}
                      onViewHistory={onViewHistory}
                      onStartAssessment={onStartAssessment}
                      onPauseToggle={() => setPauseTarget({ name: client.name, isPaused: client.clientStatus === 'paused' })}
                      onRestore={handleRestore}
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
                  <AxisScorePill score={client.latestScore} />
                  <ClientStatusPill status={attentionMap?.get(client.name)} />
                  <TrendIndicator trend={client.scoreChange} />
                  {client.remoteIntakeAwaitingStudio && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-score-amber-muted/60 px-2 py-0.5 text-[10px] font-bold text-score-amber-fg">
                      <span className="h-1.5 w-1.5 rounded-full bg-score-amber shrink-0" />
                      Awaiting studio
                    </span>
                  )}
                  {showCoachColumn && client.coachUid && coachMap?.get(client.coachUid) && (
                    <span className="max-w-[80px] truncate text-xs font-medium text-muted-foreground">
                      {coachMap.get(client.coachUid)}
                    </span>
                  )}
                  {goalLabel && (
                    <span className="text-xs font-medium text-foreground/70">
                      {goalLabel}
                    </span>
                  )}
                  <span className="ml-auto shrink-0 text-xs font-medium text-muted-foreground">
                    {formattedDates.get(client.id) ?? 'Not assessed'}
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
            className="rounded-lg border-border px-8 text-xs font-semibold text-muted-foreground transition-all hover:border-foreground hover:text-foreground"
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

      {pauseTarget && (
        <PauseClientDialog
          open={Boolean(pauseTarget)}
          onOpenChange={(open) => { if (!open) setPauseTarget(null); }}
          clientName={pauseTarget.name}
          isPaused={pauseTarget.isPaused}
          onPause={handlePauseConfirm}
          onUnpause={handleUnpauseConfirm}
        />
      )}
    </section>
  );
};
