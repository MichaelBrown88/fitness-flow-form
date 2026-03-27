/**
 * Schedule Agenda — Time-Horizon Task List
 *
 * Flat, action-oriented agenda replacing the old status-grouped PriorityView.
 * Groups items by time horizon (Overdue → This Week → Next Week → 2-3 Weeks → 4+ Weeks).
 * Each row = one client + one pillar with "Push 1 wk" and "Start" actions.
 */

import React, { useMemo, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Scale, Camera, Activity, Dumbbell, Heart,
  ChevronRight, CheckCircle, Loader2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/utils/logger';
import { SCORE_COLORS } from '@/lib/scoring/scoreColor';
import {
  deriveAgenda,
  pillarLabel,
  type UseReassessmentQueueResult,
  type AgendaGroup,
  type AgendaItem,
  type ReassessmentType,
} from '@/hooks/useReassessmentQueue';
import type { PartialAssessmentCategory } from '@/types/client';
import { formatClientDisplayName } from '@/lib/utils/clientDisplayName';

// ── Pillar icon helper ───────────────────────────────────────────────

const PILLAR_ICONS: Record<string, React.ElementType> = {
  bodycomp: Scale,
  posture: Camera,
  fitness: Activity,
  strength: Dumbbell,
  lifestyle: Heart,
};

// ── Main Component ───────────────────────────────────────────────────

interface ScheduleAgendaProps {
  reassessmentQueue: UseReassessmentQueueResult;
  onNewAssessmentForClient: (clientName: string, category?: string) => void;
  onScheduleChanged?: () => void;
  search?: string;
  showCoachName?: boolean;
  coachMap?: Map<string, string>;
}

export const PriorityView: React.FC<ScheduleAgendaProps> = ({
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
  const { queue, summary } = reassessmentQueue;

  const agenda = useMemo(() => {
    const groups = deriveAgenda(queue);
    if (!search.trim()) return groups;
    const term = search.toLowerCase();
    return groups
      .map(g => ({ ...g, items: g.items.filter(i => i.clientName.toLowerCase().includes(term)) }))
      .filter(g => g.items.length > 0);
  }, [queue, search]);

  const [pushingKey, setPushingKey] = useState<string | null>(null);

  const handlePushOneWeek = useCallback(async (item: AgendaItem) => {
    if (!organizationId) return;
    setPushingKey(item.id);
    try {
      const { setDueDateOverride } = await import('@/services/clientProfiles');
      const newDue = new Date(Math.max(item.dueDate.getTime(), Date.now()) + 7 * 24 * 60 * 60 * 1000);
      await setDueDateOverride(item.clientName, organizationId, item.pillar as PartialAssessmentCategory, newDue);
      logger.info('[Agenda] Pushed 1 week', { client: item.clientName, pillar: item.pillar });
      onScheduleChanged?.();
    } catch (err) {
      logger.warn('[Agenda] Failed to push 1 week:', err);
    } finally {
      setPushingKey(null);
    }
  }, [organizationId, onScheduleChanged]);

  if (queue.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-score-green-light flex items-center justify-center">
          <CheckCircle className={`w-8 h-8 ${SCORE_COLORS.green.icon}`} />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-foreground">No Clients Yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Complete your first assessment to start tracking schedules.
        </p>
      </div>
    );
  }

  const totalFlat = agenda.reduce((acc, g) => acc + g.items.length, 0);
  if (totalFlat === 0 && search.trim()) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground font-medium">
        No schedule items match that name.
      </div>
    );
  }

  const overdueCount = summary.overdue;
  const dueThisWeek = agenda.find(g => g.horizon === 'this-week')?.items.length ?? 0;
  const onTrack = summary.upToDate;

  return (
    <div className="space-y-6">
      {/* Inline summary */}
      <p className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
        {overdueCount > 0 && (
          <span className="text-score-red-fg font-semibold">{overdueCount} overdue</span>
        )}
        {overdueCount > 0 && dueThisWeek > 0 && <span className="text-muted-foreground/60">·</span>}
        {dueThisWeek > 0 && (
          <span className="text-score-amber-fg font-semibold">{dueThisWeek} due this week</span>
        )}
        {(overdueCount > 0 || dueThisWeek > 0) && onTrack > 0 && <span className="text-muted-foreground/60">·</span>}
        {onTrack > 0 && (
          <span className="text-score-green-fg font-semibold">{onTrack} on track</span>
        )}
      </p>

      {/* Agenda groups */}
      {agenda.map((group) => (
        <AgendaSection
          key={group.horizon}
          group={group}
          onStart={onNewAssessmentForClient}
          onPush={handlePushOneWeek}
          pushingKey={pushingKey}
          navigate={navigate}
          showCoachName={showCoachName}
          coachMap={coachMap}
          defaultCollapsed={group.horizon === '4-plus-weeks'}
        />
      ))}
    </div>
  );
};

// ── Section ──────────────────────────────────────────────────────────

interface AgendaSectionProps {
  group: AgendaGroup;
  onStart: (clientName: string, category?: string) => void;
  onPush: (item: AgendaItem) => void;
  pushingKey: string | null;
  navigate: ReturnType<typeof useNavigate>;
  showCoachName?: boolean;
  coachMap?: Map<string, string>;
  defaultCollapsed?: boolean;
}

const AgendaSection: React.FC<AgendaSectionProps> = ({
  group, onStart, onPush, pushingKey, navigate, showCoachName, coachMap, defaultCollapsed = false,
}) => {
  const [expanded, setExpanded] = useState(!defaultCollapsed);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 mb-2 w-full text-left"
      >
        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
          {group.label}
        </span>
        <span className="text-[10px] font-bold text-muted-foreground/60">({group.items.length})</span>
        <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>
      {expanded && (
        <div className="space-y-0.5">
          {group.items.map((item) => (
            <AgendaRow
              key={item.id}
              item={item}
              onStart={onStart}
              onPush={onPush}
              isPushing={pushingKey === item.id}
              navigate={navigate}
              showCoachName={showCoachName}
              coachMap={coachMap}
              showStartButton={group.horizon === 'overdue' || group.horizon === 'this-week'}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Row ──────────────────────────────────────────────────────────────

interface AgendaRowProps {
  item: AgendaItem;
  onStart: (clientName: string, category?: string) => void;
  onPush: (item: AgendaItem) => void;
  isPushing: boolean;
  navigate: ReturnType<typeof useNavigate>;
  showCoachName?: boolean;
  coachMap?: Map<string, string>;
  showStartButton: boolean;
}

const AgendaRow: React.FC<AgendaRowProps> = ({
  item, onStart, onPush, isPushing, navigate, showCoachName, coachMap, showStartButton,
}) => {
  const Icon = PILLAR_ICONS[item.pillar] || Activity;
  const dueColor = item.horizon === 'overdue'
    ? 'text-score-red-fg'
    : item.horizon === 'this-week'
    ? 'text-score-amber-fg'
    : 'text-muted-foreground';

  return (
    <div className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-muted transition-colors group">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <button
        onClick={() => navigate(`/client/${encodeURIComponent(item.clientName)}`)}
        className="min-w-0 flex-shrink truncate text-left text-sm font-semibold text-foreground hover:underline"
      >
        {formatClientDisplayName(item.clientName)}
      </button>
      {showCoachName && item.coachUid && coachMap?.get(item.coachUid) && (
        <span className="text-xs text-muted-foreground truncate hidden sm:inline">
          {coachMap.get(item.coachUid)}
        </span>
      )}
      <span className="text-xs text-muted-foreground hidden sm:inline">
        {pillarLabel(item.pillar)}
      </span>
      <span className={`text-xs font-semibold ml-auto shrink-0 ${dueColor}`}>
        {item.dueLabel}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPush(item)}
        disabled={isPushing}
        className="h-8 px-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
      >
        {isPushing ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Push 1 wk'}
      </Button>
      {showStartButton && (
        <Button
          size="sm"
          onClick={() => onStart(item.clientName, item.pillar === 'full' ? undefined : item.pillar)}
          className="h-8 px-3 text-xs bg-foreground text-white hover:bg-foreground/90 shrink-0"
        >
          Start
        </Button>
      )}
    </div>
  );
};
