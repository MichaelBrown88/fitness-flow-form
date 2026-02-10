/**
 * Schedule View — Dynamic Task List
 *
 * Shows ALL clients sorted by assessment urgency.
 * Traffic-light system tied purely to schedule:
 *   Red    = Overdue (past due date)
 *   Amber  = Coming Up (within 7 days)
 *   Green  = On Track (no action needed)
 *
 * When a coach changes a due date via a pillar pill the entire
 * card, section grouping, and sort order update optimistically.
 */

import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  FileText, Activity, Dumbbell, Camera, Scale, Heart, ClipboardList,
  ChevronRight, ChevronDown, CheckCircle, Clock, AlertCircle, Loader2, Check,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/utils/logger';
import { ScheduleInsights } from './ScheduleInsights';
import { UI_SCHEDULE } from '@/constants/ui';
import { SCORE_COLORS, STATUS_GRADE } from '@/lib/scoring/scoreColor';
import type {
  UseReassessmentQueueResult,
  ReassessmentItem,
  ReassessmentType,
  ScheduleStatus,
  PillarSchedule,
} from '@/hooks/useReassessmentQueue';
import { pillarLabel } from '@/hooks/useReassessmentQueue';
import type { PartialAssessmentCategory } from '@/types/client';

// ── Constants ────────────────────────────────────────────────────────

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DUE_SOON_WINDOW = 7;
const ACTIONABLE = ['inbody', 'posture', 'fitness', 'strength', 'lifestyle'];
const STATUS_ORDER: Record<ScheduleStatus, number> = {
  'overdue': 0, 'due-soon': 1, 'up-to-date': 2,
};

// ── Traffic-light styles (derived from SCORE_COLORS) ─────────────────

const STATUS_STYLES: Record<ScheduleStatus, {
  card: string; badge: string; badgeLabel: string; icon: React.ReactNode;
}> = {
  'overdue': {
    card: 'bg-white border-slate-200 hover:border-slate-300',
    badge: `bg-white border border-slate-200 ${SCORE_COLORS.red.text}`,
    badgeLabel: UI_SCHEDULE.OVERDUE,
    icon: <AlertCircle className={`w-3.5 h-3.5 ${SCORE_COLORS.red.icon}`} />,
  },
  'due-soon': {
    card: 'bg-white border-slate-200 hover:border-slate-300',
    badge: `bg-white border border-slate-200 ${SCORE_COLORS.amber.text}`,
    badgeLabel: UI_SCHEDULE.COMING_UP,
    icon: <Clock className={`w-3.5 h-3.5 ${SCORE_COLORS.amber.icon}`} />,
  },
  'up-to-date': {
    card: 'bg-white border-slate-200 hover:border-slate-300',
    badge: `bg-white border border-slate-200 ${SCORE_COLORS.green.text}`,
    badgeLabel: UI_SCHEDULE.ON_TRACK,
    icon: <CheckCircle className={`w-3.5 h-3.5 ${SCORE_COLORS.green.icon}`} />,
  },
};

const PILLAR_STATUS_STYLES: Record<ScheduleStatus, string> = {
  'overdue': 'bg-white border border-slate-200 hover:border-slate-300 text-score-red-fg',
  'due-soon': 'bg-white border border-slate-200 hover:border-slate-300 text-score-amber-fg',
  'up-to-date': 'bg-white border border-slate-200 hover:border-slate-300 text-score-green-fg',
};

// ── Pillar icon helper ───────────────────────────────────────────────

const getTypeIcon = (type: ReassessmentType) => {
  switch (type) {
    case 'inbody': return <Scale className="w-3 h-3" />;
    case 'posture': return <Camera className="w-3 h-3" />;
    case 'fitness': return <Activity className="w-3 h-3" />;
    case 'strength': return <Dumbbell className="w-3 h-3" />;
    case 'lifestyle': return <Heart className="w-3 h-3" />;
    case 'full': return <FileText className="w-3 h-3" />;
    default: return <FileText className="w-3 h-3" />;
  }
};

// ── Date helper ──────────────────────────────────────────────────────

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Optimistic recompute helpers ─────────────────────────────────────

function recomputePillarSchedule(ps: PillarSchedule, newDueDate: Date): PillarSchedule {
  const daysFromDue = Math.floor((Date.now() - newDueDate.getTime()) / MS_PER_DAY);
  let status: ScheduleStatus;
  if (daysFromDue > 0) status = 'overdue';
  else if (Math.abs(daysFromDue) <= DUE_SOON_WINDOW) status = 'due-soon';
  else status = 'up-to-date';
  return { ...ps, dueDate: newDueDate, daysFromDue, status };
}

function recomputeClientStatus(
  schedules: PillarSchedule[],
  daysSinceAssessment: number,
): { status: ScheduleStatus; statusReason: string; mostUrgentPillar: ReassessmentType | null } {
  if (daysSinceAssessment >= 999) {
    return { status: 'overdue', statusReason: 'No assessment on record', mostUrgentPillar: 'full' };
  }
  let worstPillar: PillarSchedule | null = null;
  for (const s of schedules) {
    if (!ACTIONABLE.includes(s.pillar)) continue;
    if (!worstPillar || s.daysFromDue > worstPillar.daysFromDue) worstPillar = s;
  }
  const fullSchedule = schedules.find(s => s.pillar === 'full');
  if (fullSchedule && fullSchedule.status === 'overdue') {
    return {
      status: 'overdue',
      statusReason: `Full assessment overdue by ${fullSchedule.daysFromDue} days`,
      mostUrgentPillar: worstPillar && worstPillar.daysFromDue > 0 ? worstPillar.pillar : 'full',
    };
  }
  if (worstPillar && worstPillar.status === 'overdue') {
    return {
      status: 'overdue',
      statusReason: `${pillarLabel(worstPillar.pillar)} overdue by ${worstPillar.daysFromDue} days`,
      mostUrgentPillar: worstPillar.pillar,
    };
  }
  if (worstPillar && worstPillar.status === 'due-soon') {
    const daysLeft = Math.abs(worstPillar.daysFromDue);
    return {
      status: 'due-soon',
      statusReason: `${pillarLabel(worstPillar.pillar)} in ${daysLeft} days`,
      mostUrgentPillar: worstPillar.pillar,
    };
  }
  return { status: 'up-to-date', statusReason: 'All assessments on schedule', mostUrgentPillar: null };
}

// ── Main Component ───────────────────────────────────────────────────

interface PriorityViewProps {
  reassessmentQueue: UseReassessmentQueueResult;
  onNewAssessmentForClient: (clientName: string, category?: string) => void;
  onScheduleChanged?: () => void;
  search?: string;
  /** Show coach name on each task card (for non-coaching admins) */
  showCoachName?: boolean;
  /** Map of coachUid -> display name */
  coachMap?: Map<string, string>;
}

export const PriorityView: React.FC<PriorityViewProps> = ({
  reassessmentQueue,
  onNewAssessmentForClient,
  onScheduleChanged,
  search = '',
  showCoachName = false,
  coachMap,
}) => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const organizationId = profile?.organizationId || '';
  const { queue: hookQueue, summary: hookSummary } = reassessmentQueue;

  const [dateOverrides, setDateOverrides] = useState<Record<string, Date>>({});

  const { queue, summary } = useMemo(() => {
    const hasOverrides = Object.keys(dateOverrides).length > 0;
    if (!hasOverrides) return { queue: hookQueue, summary: hookSummary };

    const updatedQueue = hookQueue.map(item => {
      let changed = false;
      const updatedSchedules = item.pillarSchedules.map(ps => {
        const newDate = dateOverrides[`${item.clientName}::${ps.pillar}`];
        if (newDate) { changed = true; return recomputePillarSchedule(ps, newDate); }
        return ps;
      });
      if (!changed) return item;
      const derived = recomputeClientStatus(updatedSchedules, item.daysSinceAssessment);
      return { ...item, pillarSchedules: updatedSchedules, ...derived };
    }).sort((a, b) => {
      const diff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      return diff !== 0 ? diff : b.daysSinceAssessment - a.daysSinceAssessment;
    });

    return {
      queue: updatedQueue,
      summary: {
        totalClients: updatedQueue.length,
        overdue: updatedQueue.filter(q => q.status === 'overdue').length,
        dueSoon: updatedQueue.filter(q => q.status === 'due-soon').length,
        upToDate: updatedQueue.filter(q => q.status === 'up-to-date').length,
      },
    };
  }, [hookQueue, hookSummary, dateOverrides]);

  const filteredQueue = useMemo(() => {
    if (!search.trim()) return queue;
    const term = search.toLowerCase();
    return queue.filter(q => q.clientName.toLowerCase().includes(term));
  }, [queue, search]);

  const sections = useMemo(() => ({
    overdue: filteredQueue.filter(q => q.status === 'overdue'),
    dueSoon: filteredQueue.filter(q => q.status === 'due-soon'),
    upToDate: filteredQueue.filter(q => q.status === 'up-to-date'),
  }), [filteredQueue]);

  const handleDueDateSave = useCallback(async (
    clientName: string, pillar: PartialAssessmentCategory, newDate: Date,
  ) => {
    if (!organizationId) return;
    const key = `${clientName}::${pillar}`;
    setDateOverrides(prev => ({ ...prev, [key]: newDate }));
    try {
      const { setDueDateOverride } = await import('@/services/clientProfiles');
      await setDueDateOverride(clientName, organizationId, pillar, newDate);
      logger.info('[ScheduleView] Due date override saved', { clientName, pillar, date: newDate.toISOString() });
      onScheduleChanged?.();
    } catch (err) {
      setDateOverrides(prev => { const next = { ...prev }; delete next[key]; return next; });
      logger.warn('[ScheduleView] Failed to save due date:', err);
      throw err;
    }
  }, [organizationId, onScheduleChanged]);

  if (queue.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-score-green-light flex items-center justify-center">
          <CheckCircle className={`w-8 h-8 ${SCORE_COLORS.green.icon}`} />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Clients Yet</h3>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          Complete your first assessment to start tracking schedules.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ScheduleInsights queue={queue} summary={summary} />

      {sections.overdue.length > 0 && (
        <TaskSection status="overdue" label={UI_SCHEDULE.OVERDUE} count={sections.overdue.length}
          items={sections.overdue} onAssess={onNewAssessmentForClient}
          organizationId={organizationId} onDueDateSave={handleDueDateSave} navigate={navigate}
          showCoachName={showCoachName} coachMap={coachMap}
        />
      )}
      {sections.dueSoon.length > 0 && (
        <TaskSection status="due-soon" label={UI_SCHEDULE.COMING_UP} count={sections.dueSoon.length}
          items={sections.dueSoon} onAssess={onNewAssessmentForClient}
          organizationId={organizationId} onDueDateSave={handleDueDateSave} navigate={navigate}
          showCoachName={showCoachName} coachMap={coachMap}
        />
      )}
      {sections.upToDate.length > 0 && (
        <TaskSection status="up-to-date" label={UI_SCHEDULE.ON_TRACK} count={sections.upToDate.length}
          items={sections.upToDate} onAssess={onNewAssessmentForClient}
          organizationId={organizationId} onDueDateSave={handleDueDateSave} navigate={navigate}
          showCoachName={showCoachName} coachMap={coachMap}
          collapsed
        />
      )}
    </div>
  );
};

// ── Section Component ────────────────────────────────────────────────

interface TaskSectionProps {
  status: ScheduleStatus; label: string; count: number;
  items: ReassessmentItem[];
  onAssess: (clientName: string, category?: string) => void;
  organizationId: string;
  onDueDateSave: (clientName: string, pillar: PartialAssessmentCategory, newDate: Date) => Promise<void>;
  navigate: ReturnType<typeof useNavigate>;
  collapsed?: boolean;
  showCoachName?: boolean;
  coachMap?: Map<string, string>;
}

const TaskSection: React.FC<TaskSectionProps> = ({
  status, label, count, items, onAssess, organizationId, onDueDateSave, navigate, collapsed = false,
  showCoachName = false, coachMap,
}) => {
  const style = STATUS_STYLES[status];
  const [isExpanded, setIsExpanded] = React.useState(!collapsed);

  return (
    <div className="space-y-2">
      <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-2 w-full text-left">
        {style.icon}
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">{label} ({count})</h3>
        <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
      </button>
      {isExpanded && (
        <div className="space-y-2">
          {items.map((item) => (
            <TaskCard key={item.id} item={item} onAssess={onAssess}
              organizationId={organizationId} onDueDateSave={onDueDateSave} navigate={navigate}
              showCoachName={showCoachName} coachMap={coachMap}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Task Card Component ──────────────────────────────────────────────

interface TaskCardProps {
  item: ReassessmentItem;
  onAssess: (clientName: string, category?: string) => void;
  organizationId: string;
  onDueDateSave: (clientName: string, pillar: PartialAssessmentCategory, newDate: Date) => Promise<void>;
  navigate: ReturnType<typeof useNavigate>;
  showCoachName?: boolean;
  coachMap?: Map<string, string>;
}

const TaskCard: React.FC<TaskCardProps> = ({ item, onAssess, organizationId, onDueDateSave, navigate, showCoachName, coachMap }) => {
  const style = STATUS_STYLES[item.status];
  const actionablePillars = item.pillarSchedules
    .filter(s => s.pillar !== 'full')
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  return (
    <div className={`rounded-xl border transition-colors p-4 ${style.card}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <button
              onClick={() => navigate(`/client/${encodeURIComponent(item.clientName)}`)}
              className="font-semibold text-sm text-slate-900 truncate hover:underline text-left"
            >
              {item.clientName}
            </button>
            {showCoachName && item.coachUid && coachMap?.get(item.coachUid) && (
              <span className="text-[10px] font-medium text-slate-400 truncate">
                {coachMap.get(item.coachUid)}
              </span>
            )}
            <Badge variant="outline" className={`text-[10px] ${style.badge}`}>{style.badgeLabel}</Badge>
          </div>
          <p className="text-xs text-slate-500 mb-3">{item.statusReason}</p>

          {/* Pillar pills — horizontally scrollable with fade */}
          <div className="relative">
            <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide"
              style={{ maskImage: 'linear-gradient(to right, black 90%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, black 90%, transparent 100%)' }}
            >
              {actionablePillars.map((ps) => (
                <PillarPill key={ps.pillar} schedule={ps} clientName={item.clientName}
                  organizationId={organizationId} onDueDateSave={onDueDateSave}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="text-right">
            <p className={`font-bold text-sm ${SCORE_COLORS[STATUS_GRADE[item.status]].text}`}>
              {item.daysSinceAssessment >= 999 ? 'Never' : `${item.daysSinceAssessment}d`}
            </p>
            <p className="text-[10px] text-slate-400">since last</p>
          </div>
          <ReassessDropdown item={item} onAssess={onAssess} />
        </div>
      </div>
    </div>
  );
};

// ── Reassess Dropdown ────────────────────────────────────────────────
// Shows the most urgent pillar as the primary label, then lists all
// pillar options sorted by urgency so the coach can choose freely.

const PILLAR_ICON: Record<string, React.ReactNode> = {
  inbody: <Scale className="h-3.5 w-3.5" />,
  posture: <Camera className="h-3.5 w-3.5" />,
  fitness: <Activity className="h-3.5 w-3.5" />,
  strength: <Dumbbell className="h-3.5 w-3.5" />,
  lifestyle: <Heart className="h-3.5 w-3.5" />,
  full: <ClipboardList className="h-3.5 w-3.5" />,
};

interface ReassessDropdownProps {
  item: ReassessmentItem;
  onAssess: (clientName: string, category?: string) => void;
}

const ReassessDropdown: React.FC<ReassessDropdownProps> = ({ item, onAssess }) => {
  // Build ordered list: overdue pillars first, then due-soon, then on-track
  const sortedPillars = item.pillarSchedules
    .filter(ps => ps.pillar !== 'full')
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  // Primary action = most urgent pillar (or full assessment if none)
  const primary = item.mostUrgentPillar && item.mostUrgentPillar !== 'full'
    ? item.mostUrgentPillar
    : null;

  const primaryLabel = primary
    ? `Assess ${pillarLabel(primary)}`
    : UI_SCHEDULE.FULL_ASSESSMENT;

  const isOverdue = item.status === 'overdue';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant={isOverdue ? 'default' : 'outline'}
          className={`text-xs h-7 gap-1 ${isOverdue ? 'bg-score-red hover:bg-score-red-fg' : ''}`}
        >
          {primaryLabel}
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-xl border-slate-200 p-1">
        {/* Primary action repeated at top for clarity */}
        <DropdownMenuItem
          onClick={() => onAssess(item.clientName, primary || undefined)}
          className="rounded-lg text-xs font-bold px-2 py-2.5 cursor-pointer focus:bg-slate-50 gap-2"
        >
          {PILLAR_ICON[primary || 'full']}
          <span>{primaryLabel}</span>
          {primary && (
            <span className={`ml-auto text-[10px] font-bold ${SCORE_COLORS[STATUS_GRADE[
              sortedPillars.find(ps => ps.pillar === primary)?.status || 'up-to-date'
            ]].text}`}>
              {sortedPillars.find(ps => ps.pillar === primary)?.status === 'overdue'
                ? `${sortedPillars.find(ps => ps.pillar === primary)?.daysFromDue}d overdue`
                : sortedPillars.find(ps => ps.pillar === primary)?.status === 'due-soon'
                ? `in ${Math.abs(sortedPillars.find(ps => ps.pillar === primary)?.daysFromDue || 0)}d`
                : 'on track'}
            </span>
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-slate-100" />

        {/* All other pillars, sorted by urgency */}
        {sortedPillars
          .filter(ps => ps.pillar !== primary)
          .map(ps => {
            const statusLabel = ps.status === 'overdue'
              ? `${ps.daysFromDue}d overdue`
              : ps.status === 'due-soon'
              ? `in ${Math.abs(ps.daysFromDue)}d`
              : 'on track';

            return (
              <DropdownMenuItem
                key={ps.pillar}
                onClick={() => onAssess(item.clientName, ps.pillar)}
                className="rounded-lg text-xs font-medium px-2 py-2 cursor-pointer focus:bg-slate-50 text-slate-600 gap-2"
              >
                {PILLAR_ICON[ps.pillar] || <FileText className="h-3.5 w-3.5" />}
                <span>{pillarLabel(ps.pillar)}</span>
                <span className={`ml-auto text-[10px] font-bold ${SCORE_COLORS[STATUS_GRADE[ps.status]].text}`}>
                  {statusLabel}
                </span>
              </DropdownMenuItem>
            );
          })}

        {/* Full assessment option — only when primary is a specific pillar */}
        {primary && (
          <>
            <DropdownMenuSeparator className="bg-slate-100" />
            <DropdownMenuItem
              onClick={() => onAssess(item.clientName)}
              className="rounded-lg text-xs font-medium px-2 py-2 cursor-pointer focus:bg-slate-50 text-slate-600 gap-2"
            >
              <ClipboardList className="h-3.5 w-3.5 text-slate-400" />
              Full Assessment
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// ── Pillar Pill Component (with integrated date picker) ──────────────

interface PillarPillProps {
  schedule: PillarSchedule;
  clientName: string;
  organizationId: string;
  onDueDateSave: (clientName: string, pillar: PartialAssessmentCategory, newDate: Date) => Promise<void>;
}

const PillarPill: React.FC<PillarPillProps> = ({ schedule, clientName, organizationId, onDueDateSave }) => {
  const { pillar, dueDate, status, daysFromDue } = schedule;
  const pillStyle = PILLAR_STATUS_STYLES[status];

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [localDate, setLocalDate] = useState<Date>(dueDate);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync from prop when upstream data changes
  useEffect(() => {
    setLocalDate(dueDate);
  }, [dueDate.getTime()]);

  // Click-outside handler
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open]);

  // Reset when parent data changes (card may move sections)
  useEffect(() => {
    setOpen(false);
  }, [clientName, pillar]);

  const handleSelect = useCallback(async (date: Date | undefined) => {
    setOpen(false);
    if (!date || !organizationId) return;
    setLocalDate(date);
    setSaving(true);
    setSaved(false);
    try {
      await onDueDateSave(clientName, pillar as PartialAssessmentCategory, date);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      logger.warn('[PillarPill] Failed to save due date:', err);
      setLocalDate(dueDate);
    } finally {
      setSaving(false);
    }
  }, [clientName, organizationId, pillar, onDueDateSave, dueDate]);

  let dateLabel: string;
  if (status === 'overdue') dateLabel = `${daysFromDue}d overdue`;
  else if (status === 'due-soon') {
    const daysLeft = Math.abs(daysFromDue);
    dateLabel = daysLeft === 0 ? 'today' : `in ${daysLeft}d`;
  } else {
    dateLabel = localDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  return (
    <div ref={wrapperRef} className="relative shrink-0">
      <button
        onClick={() => organizationId && setOpen(prev => !prev)}
        disabled={saving}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-full cursor-pointer transition-colors ${pillStyle}`}
        title={`${pillarLabel(pillar)} — ${dateLabel}. Click to reschedule.`}
      >
        {saving ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : saved ? (
          <Check className="w-3 h-3" />
        ) : (
          getTypeIcon(pillar as ReassessmentType)
        )}
        <span>{pillarLabel(pillar)}</span>
        <span className={`${status === 'overdue' ? 'font-bold' : 'opacity-70'}`}>{dateLabel}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 rounded-md border border-slate-200 bg-white shadow-lg">
          <Calendar
            mode="single"
            selected={localDate}
            onSelect={handleSelect}
            disabled={{ before: startOfToday() }}
          />
        </div>
      )}
    </div>
  );
};
