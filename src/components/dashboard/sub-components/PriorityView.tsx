/**
 * Priority View — Dynamic Task List
 *
 * Shows ALL clients sorted by assessment urgency.
 * Traffic-light system tied purely to schedule:
 *   Red    = Overdue (past due date)
 *   Amber  = Due Soon (within 7 days)
 *   Green  = Up to Date (no action needed)
 *
 * When a coach changes a due date via the inline editor the entire
 * card, section grouping, and sort order update optimistically.
 */

import React, { useMemo, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText, Activity, Dumbbell, Camera, Scale, Heart,
  ChevronRight, CheckCircle, Clock, AlertCircle, Settings2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/utils/logger';
import { InlineDueDateEditor } from './InlineDueDateEditor';
import { ScheduleInsights } from './ScheduleInsights';
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

// ── Traffic-light styles ─────────────────────────────────────────────

const STATUS_STYLES: Record<ScheduleStatus, {
  card: string; badge: string; badgeLabel: string; icon: React.ReactNode;
}> = {
  'overdue': {
    card: 'bg-red-50/50 border-red-200 hover:border-red-300',
    badge: 'bg-red-100 text-red-700 border-red-200',
    badgeLabel: 'Overdue',
    icon: <AlertCircle className="w-3.5 h-3.5 text-red-500" />,
  },
  'due-soon': {
    card: 'bg-amber-50/50 border-amber-200 hover:border-amber-300',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    badgeLabel: 'Due Soon',
    icon: <Clock className="w-3.5 h-3.5 text-amber-500" />,
  },
  'up-to-date': {
    card: 'bg-emerald-50/30 border-emerald-200 hover:border-emerald-300',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    badgeLabel: 'Up to Date',
    icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />,
  },
};

const PILLAR_STATUS_STYLES: Record<ScheduleStatus, string> = {
  'overdue': 'bg-red-100 text-red-700 border border-red-200',
  'due-soon': 'bg-amber-100 text-amber-700 border border-amber-200',
  'up-to-date': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
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
      statusReason: `Full assessment overdue by ${fullSchedule.daysFromDue}d`,
      mostUrgentPillar: worstPillar && worstPillar.daysFromDue > 0 ? worstPillar.pillar : 'full',
    };
  }
  if (worstPillar && worstPillar.status === 'overdue') {
    return {
      status: 'overdue',
      statusReason: `${pillarLabel(worstPillar.pillar)} overdue by ${worstPillar.daysFromDue}d`,
      mostUrgentPillar: worstPillar.pillar,
    };
  }
  if (worstPillar && worstPillar.status === 'due-soon') {
    const daysLeft = Math.abs(worstPillar.daysFromDue);
    return {
      status: 'due-soon',
      statusReason: `${pillarLabel(worstPillar.pillar)} due in ${daysLeft}d`,
      mostUrgentPillar: worstPillar.pillar,
    };
  }
  return { status: 'up-to-date', statusReason: 'All assessments on schedule', mostUrgentPillar: null };
}

// ── Main Component ───────────────────────────────────────────────────

interface PriorityViewProps {
  reassessmentQueue: UseReassessmentQueueResult;
  onNewAssessmentForClient: (clientName: string, category?: string) => void;
  /** Called after a schedule edit is saved to Firestore, triggering a data refetch */
  onScheduleChanged?: () => void;
  /** Optional search filter applied from the dashboard search bar */
  search?: string;
}

export const PriorityView: React.FC<PriorityViewProps> = ({
  reassessmentQueue,
  onNewAssessmentForClient,
  onScheduleChanged,
  search = '',
}) => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const organizationId = profile?.organizationId || '';
  const { queue: hookQueue, summary: hookSummary } = reassessmentQueue;

  // Optimistic date overrides: key = "clientName::pillar"
  const [dateOverrides, setDateOverrides] = useState<Record<string, Date>>({});

  // Apply overrides → recompute statuses → re-sort
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

  // Apply search filter
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
      // Save the absolute date — does NOT change the recurring cadence interval.
      // After the assessment is completed, the override is automatically ignored
      // because it falls behind the new lastAssessmentDate.
      const { setDueDateOverride } = await import('@/services/clientProfiles');
      await setDueDateOverride(clientName, organizationId, pillar, newDate);
      logger.info('[PriorityView] Due date override saved', { clientName, pillar, date: newDate.toISOString() });
      // Trigger a background refetch so the data survives a page refresh
      onScheduleChanged?.();
    } catch (err) {
      setDateOverrides(prev => { const next = { ...prev }; delete next[key]; return next; });
      logger.warn('[PriorityView] Failed to save due date:', err);
      throw err;
    }
  }, [organizationId]);

  if (queue.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
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
        <TaskSection status="overdue" label="Overdue" count={sections.overdue.length}
          items={sections.overdue} onAssess={onNewAssessmentForClient}
          organizationId={organizationId} onDueDateSave={handleDueDateSave} navigate={navigate}
        />
      )}
      {sections.dueSoon.length > 0 && (
        <TaskSection status="due-soon" label="Due Soon" count={sections.dueSoon.length}
          items={sections.dueSoon} onAssess={onNewAssessmentForClient}
          organizationId={organizationId} onDueDateSave={handleDueDateSave} navigate={navigate}
        />
      )}
      {sections.upToDate.length > 0 && (
        <TaskSection status="up-to-date" label="Up to Date" count={sections.upToDate.length}
          items={sections.upToDate} onAssess={onNewAssessmentForClient}
          organizationId={organizationId} onDueDateSave={handleDueDateSave} navigate={navigate}
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
}

const TaskSection: React.FC<TaskSectionProps> = ({
  status, label, count, items, onAssess, organizationId, onDueDateSave, navigate, collapsed = false,
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
}

const TaskCard: React.FC<TaskCardProps> = ({ item, onAssess, organizationId, onDueDateSave, navigate }) => {
  const style = STATUS_STYLES[item.status];
  const actionablePillars = item.pillarSchedules.filter(s => s.pillar !== 'full');

  return (
    <div className={`rounded-xl border transition-colors p-3 ${style.card}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <button
              onClick={() => navigate(`/client/${encodeURIComponent(item.clientName)}`)}
              className="font-semibold text-sm text-slate-900 truncate hover:underline text-left"
            >
              {item.clientName}
            </button>
            <Badge variant="outline" className={`text-[10px] ${style.badge}`}>{style.badgeLabel}</Badge>
            {item.hasCustomCadence && (
              <span className="inline-flex items-center gap-0.5 text-[9px] text-indigo-600">
                <Settings2 className="w-2.5 h-2.5" /> Custom
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mb-2">{item.statusReason}</p>
          <div className="flex flex-wrap gap-1.5">
            {actionablePillars.map((ps) => (
              <PillarPill key={ps.pillar} schedule={ps} clientName={item.clientName}
                organizationId={organizationId} onDueDateSave={onDueDateSave}
              />
            ))}
          </div>
          {item.pillarGaps.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5">
              {item.pillarGaps.map((gap) => (
                <span key={gap.pillar} className="text-[10px] text-slate-400">
                  {gap.pillar}: <span className="font-medium">{gap.score}%</span>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="text-right">
            <p className={`font-bold text-sm ${
              item.status === 'overdue' ? 'text-red-600' :
              item.status === 'due-soon' ? 'text-amber-600' : 'text-emerald-600'
            }`}>
              {item.daysSinceAssessment >= 999 ? 'Never' : `${item.daysSinceAssessment}d`}
            </p>
            <p className="text-[10px] text-slate-400">since last</p>
          </div>
          {item.status !== 'up-to-date' && item.mostUrgentPillar && (
            <Button
              size="sm" variant={item.status === 'overdue' ? 'default' : 'outline'}
              className={`text-xs h-7 ${item.status === 'overdue' ? 'bg-red-600 hover:bg-red-700' : ''}`}
              onClick={() => {
                const p = item.mostUrgentPillar;
                onAssess(item.clientName, p && p !== 'full' ? p : undefined);
              }}
            >
              {item.mostUrgentPillar !== 'full'
                ? `Start ${pillarLabel(item.mostUrgentPillar)}`
                : 'Full Assessment'}
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Pillar Pill Component ────────────────────────────────────────────

interface PillarPillProps {
  schedule: PillarSchedule;
  clientName: string;
  organizationId: string;
  onDueDateSave: (clientName: string, pillar: PartialAssessmentCategory, newDate: Date) => Promise<void>;
}

const PillarPill: React.FC<PillarPillProps> = ({ schedule, clientName, organizationId, onDueDateSave }) => {
  const { pillar, dueDate, status, daysFromDue } = schedule;
  const pillStyle = PILLAR_STATUS_STYLES[status];

  let dateLabel: string;
  if (status === 'overdue') dateLabel = `${daysFromDue}d overdue`;
  else if (status === 'due-soon') {
    const daysLeft = Math.abs(daysFromDue);
    dateLabel = daysLeft === 0 ? 'today' : `in ${daysLeft}d`;
  } else {
    dateLabel = dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  return (
    <div className="flex items-center gap-0.5">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full ${pillStyle}`}
        title={`${pillarLabel(pillar)} — ${dateLabel}`}
      >
        {getTypeIcon(pillar)}
        <span>{pillarLabel(pillar)}</span>
        <span className={`ml-0.5 ${status === 'overdue' ? 'font-bold' : 'opacity-70'}`}>{dateLabel}</span>
      </span>
      {organizationId && (
        <InlineDueDateEditor clientName={clientName} organizationId={organizationId}
          pillar={pillar as PartialAssessmentCategory} currentDate={dueDate} onSave={onDueDateSave}
        />
      )}
    </div>
  );
};
