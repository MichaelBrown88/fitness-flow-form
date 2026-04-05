/**
 * Team View — Admin Team Dashboard
 *
 * Org-wide KPI summary cards + sortable coach performance table.
 * Clicking a coach row navigates to their client detail page.
 */

import React, { useState, useMemo } from 'react';
import {
  Users, ClipboardList, TrendingUp, TrendingDown, Minus,
  AlertCircle, ChevronUp, ChevronDown, Loader2, Crown,
} from 'lucide-react';
import { useTeamDashboard } from '@/hooks/dashboard/useTeamDashboard';
import type { CoachMetrics } from '@/services/teamMetrics';
import { SCORE_COLORS } from '@/lib/scoring/scoreColor';
import { Button } from '@/components/ui/button';

/** Cloud Function returns ISO strings; normalize for sorting and display. */
function parseCoachLastActive(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ── Types ────────────────────────────────────────────────────────────

type SortKey = 'displayName' | 'clientCount' | 'assessments30d' | 'overdueCount' | 'avgScore' | 'avgTrend' | 'lastActive';
type SortDir = 'asc' | 'desc';

interface TeamViewProps {
  search: string;
}

// ── Summary Card ─────────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
  detail?: string;
}> = ({ label, value, icon, detail }) => (
  <div className="space-y-1 rounded-lg border border-border/60 bg-muted/40 p-4 dark:bg-muted/20">
    <div className="flex items-center gap-2 text-muted-foreground">
      {icon}
      <span className="text-[10px] font-black uppercase tracking-[0.15em]">{label}</span>
    </div>
    <p className="text-2xl font-bold text-foreground">{value}</p>
    {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
  </div>
);

// ── Trend Badge ──────────────────────────────────────────────────────

const TrendBadge: React.FC<{ value: number }> = ({ value }) => {
  if (value > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-score-green-fg bg-score-green-light px-1.5 py-0.5 rounded-full">
        <TrendingUp className="h-3 w-3" />+{value}
      </span>
    );
  }
  if (value < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-score-red-fg bg-score-red-light px-1.5 py-0.5 rounded-full">
        <TrendingDown className="h-3 w-3" />{value}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      <Minus className="h-3 w-3" />0
    </span>
  );
};

// ── Sort Header ──────────────────────────────────────────────────────

const SortHeader: React.FC<{
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}> = ({ label, sortKey, currentKey, currentDir, onSort, className }) => (
  <th
    className={`cursor-pointer px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-foreground ${className || ''}`}
    onClick={() => onSort(sortKey)}
  >
    <span className="inline-flex items-center gap-1">
      {label}
      {currentKey === sortKey && (
        currentDir === 'asc'
          ? <ChevronUp className="w-3 h-3" />
          : <ChevronDown className="w-3 h-3" />
      )}
    </span>
  </th>
);

// ── Main Component ───────────────────────────────────────────────────

export const TeamView: React.FC<TeamViewProps> = ({ search }) => {
  const { loading, error, missingOrganization, summary, coaches, refresh } = useTeamDashboard();
  const [sortKey, setSortKey] = useState<SortKey>('assessments30d');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const filteredCoaches = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = coaches;
    if (term) {
      list = list.filter(c =>
        c.displayName.toLowerCase().includes(term) ||
        (c.email && c.email.toLowerCase().includes(term))
      );
    }
    return [...list].sort((a, b) => {
      let aVal: string | number | null;
      let bVal: string | number | null;
      switch (sortKey) {
        case 'displayName': aVal = a.displayName.toLowerCase(); bVal = b.displayName.toLowerCase(); break;
        case 'clientCount': aVal = a.clientCount; bVal = b.clientCount; break;
        case 'assessments30d': aVal = a.assessments30d; bVal = b.assessments30d; break;
        case 'overdueCount': aVal = a.overdueCount; bVal = b.overdueCount; break;
        case 'avgScore': aVal = a.avgScore; bVal = b.avgScore; break;
        case 'avgTrend': aVal = a.avgTrend; bVal = b.avgTrend; break;
        case 'lastActive': {
          const ad = parseCoachLastActive(a.lastActive);
          const bd = parseCoachLastActive(b.lastActive);
          aVal = ad?.getTime() ?? 0;
          bVal = bd?.getTime() ?? 0;
          break;
        }
        default: aVal = 0; bVal = 0;
      }
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [coaches, search, sortKey, sortDir]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm font-medium text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading team data…
      </div>
    );
  }

  if (missingOrganization) {
    return (
      <div className="text-center py-20 space-y-3 max-w-md mx-auto">
        <AlertCircle className="w-10 h-10 text-score-amber mx-auto" />
        <p className="text-sm font-semibold text-foreground">Organization not available</p>
        <p className="text-xs text-muted-foreground">
          Team metrics need an organization context. Try signing out and back in, or contact support if this persists.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 space-y-4 max-w-md mx-auto">
        <AlertCircle className="w-10 h-10 text-score-red mx-auto" />
        <p className="text-sm font-semibold text-foreground">{error}</p>
        <Button type="button" variant="outline" className="rounded-lg" onClick={() => void refresh()}>
          Try again
        </Button>
      </div>
    );
  }

  if (coaches.length === 0) {
    return (
      <div className="text-center py-20 space-y-3">
        <Users className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">No coaches in your organization yet</p>
        <p className="text-xs text-muted-foreground">Invite coaches from the Settings page to see team performance here.</p>
      </div>
    );
  }

  const daysSince = (date: Date | null) => {
    if (!date) return 'Never';
    const days = Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
    if (days === 0) return 'Today';
    if (days === 1) return '1d ago';
    return `${days}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Clients"
          value={summary.totalClients}
          icon={<Users className="w-4 h-4" />}
          detail={`across ${summary.totalCoaches} coach${summary.totalCoaches !== 1 ? 'es' : ''}`}
        />
        <StatCard
          label="This Month"
          value={summary.assessmentsThisMonth}
          icon={<ClipboardList className="w-4 h-4" />}
          detail="assessments completed"
        />
        <StatCard
          label="Avg Improvement"
          value={summary.avgScoreChange > 0 ? `+${summary.avgScoreChange}` : `${summary.avgScoreChange}`}
          icon={summary.avgScoreChange >= 0
            ? <TrendingUp className={`w-4 h-4 ${SCORE_COLORS.green.icon}`} />
            : <TrendingDown className={`w-4 h-4 ${SCORE_COLORS.red.icon}`} />
          }
          detail="mean score change"
        />
        <StatCard
          label="Coaches"
          value={summary.totalCoaches}
          icon={<Crown className="w-4 h-4" />}
          detail="active in organization"
        />
      </div>

      {/* Coach Performance Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <caption className="sr-only">Coach performance — sort columns to compare clients, assessments, and activity</caption>
          <thead>
            <tr className="border-b border-border">
              <SortHeader label="Coach" sortKey="displayName" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} className="pl-4" />
              <SortHeader label="Clients" sortKey="clientCount" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
              <SortHeader label="30d Assessments" sortKey="assessments30d" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
              <SortHeader label="Avg Score" sortKey="avgScore" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
              <SortHeader label="Avg Trend" sortKey="avgTrend" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
              <SortHeader label="Last Active" sortKey="lastActive" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {filteredCoaches.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm font-medium text-muted-foreground">
                  No coaches match your search.
                </td>
              </tr>
            ) : (
              filteredCoaches.map((coach) => (
                <CoachRow key={coach.uid} coach={coach} daysSince={daysSince} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Coach Row ────────────────────────────────────────────────────────

const CoachRow: React.FC<{
  coach: CoachMetrics;
  daysSince: (d: Date | null) => string;
}> = ({ coach, daysSince }) => {
  const lastActiveDate = parseCoachLastActive(coach.lastActive);
  const lastActiveLabel = daysSince(lastActiveDate);
  const isInactive =
    !lastActiveDate || Date.now() - lastActiveDate.getTime() > 14 * 24 * 60 * 60 * 1000;

  return (
    <tr className="border-b border-border transition-colors hover:bg-muted/40">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-on-brand-tint">
            {coach.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight text-foreground">
              {coach.displayName}
              {coach.role === 'org_admin' && (
                <Crown className="-mt-0.5 ml-1.5 inline h-3 w-3 text-primary" />
              )}
            </p>
            {coach.email && (
              <p className="text-[10px] font-medium text-muted-foreground">{coach.email}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-3 py-4">
        <span className="text-sm font-semibold text-foreground">{coach.clientCount}</span>
      </td>
      <td className="px-3 py-4">
        <span className={`text-sm font-semibold ${coach.assessments30d === 0 ? 'text-muted-foreground' : 'text-foreground'}`}>
          {coach.assessments30d}
        </span>
      </td>
      <td className="px-3 py-4">
        <span className={`text-sm font-semibold ${coach.avgScore === 0 ? 'text-muted-foreground' : 'text-foreground'}`}>
          {coach.avgScore || '—'}
        </span>
      </td>
      <td className="px-3 py-4">
        <TrendBadge value={coach.avgTrend} />
      </td>
      <td className="px-3 py-4">
        <span className={`text-xs font-semibold ${isInactive ? 'text-score-amber-fg dark:text-amber-400' : 'text-muted-foreground'}`}>
          {lastActiveLabel}
          {isInactive && lastActiveLabel !== 'Never' && (
            <AlertCircle className="w-3 h-3 inline ml-1 -mt-0.5 text-score-amber" />
          )}
        </span>
      </td>
    </tr>
  );
};
