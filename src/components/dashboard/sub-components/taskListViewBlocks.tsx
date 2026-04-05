import React, { useMemo } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Scale,
  Camera,
  Activity,
  Dumbbell,
  Heart,
  FileEdit,
  Map,
  UserCog,
  ChevronRight,
} from 'lucide-react';
import type { CoachTask, TaskUrgency } from '@/lib/tasks/generateTasks';
import { getPillarLabel } from '@/constants/pillars';
import {
  dueLabelClass,
  dueLabelForTask,
  groupCadenceTasksByClient,
  urgencyHeading,
  type ClientCadenceGroup as ClientCadenceGroupModel,
} from './taskListModel';
import { formatClientDisplayName } from '@/lib/utils/clientDisplayName';

export const TASK_ICONS: Record<string, React.ElementType> = {
  overdue_reassessment: Activity,
  upcoming_reassessment: Activity,
  draft_assessment: FileEdit,
  roadmap_review: Map,
  roadmap_needed: Map,
  profile_incomplete: UserCog,
  bodycomp: Scale,
  posture: Camera,
  fitness: Activity,
  strength: Dumbbell,
  lifestyle: Heart,
};

export function clientGroupKey(urgency: TaskUrgency, clientName: string): string {
  return `${urgency}::${clientName}`;
}

interface CadenceUrgencyBlockProps {
  urgency: TaskUrgency;
  items: CoachTask[];
  expanded: boolean;
  onToggleExpanded: () => void;
  expandedClients: Set<string>;
  onToggleClient: (key: string) => void;
  navigate: NavigateFunction;
}

export function CadenceUrgencyBlock({
  urgency,
  items,
  expanded,
  onToggleExpanded,
  expandedClients,
  onToggleClient,
  navigate,
}: CadenceUrgencyBlockProps) {
  const groups = useMemo(() => groupCadenceTasksByClient(items), [items]);
  const heading = urgencyHeading(urgency);
  const panelId = `cadence-urgency-${urgency}`;

  return (
    <div>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggleExpanded}
        className="flex min-h-[44px] items-center gap-2 mb-2 w-full text-left rounded-lg px-1 -mx-1 hover:bg-muted/50"
      >
        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
          {heading}
        </span>
        <span className="text-[10px] font-bold text-muted-foreground/80">({groups.length})</span>
        <ChevronRight
          className={`w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0 ${expanded ? 'rotate-90' : ''}`}
          aria-hidden
        />
      </button>
      {expanded && (
        <div id={panelId} className="space-y-1">
          {groups.map((g) => (
            <ClientCadenceGroupCard
              key={g.clientName}
              urgency={urgency}
              group={g}
              expanded={expandedClients.has(clientGroupKey(urgency, g.clientName))}
              onToggle={() => onToggleClient(clientGroupKey(urgency, g.clientName))}
              navigate={navigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ClientCadenceGroupCardProps {
  urgency: TaskUrgency;
  group: ClientCadenceGroupModel;
  expanded: boolean;
  onToggle: () => void;
  navigate: NavigateFunction;
}

function ClientCadenceGroupCard({
  urgency,
  group,
  expanded,
  onToggle,
  navigate,
}: ClientCadenceGroupCardProps) {
  const sortedTasks = useMemo(
    () =>
      [...group.tasks].sort((a, b) => {
        const da = a.dueDate?.getTime() ?? 0;
        const db = b.dueDate?.getTime() ?? 0;
        return da - db;
      }),
    [group.tasks],
  );

  const pillarLine = sortedTasks
    .map((t) => (t.pillar ? getPillarLabel(t.pillar) : 'Assessment'))
    .join(', ');
  const truncated =
    pillarLine.length > 52 ? `${pillarLine.slice(0, 51)}…` : pillarLine;

  const worst = sortedTasks[0];
  const worstLabel = worst?.dueDate ? dueLabelForTask(worst) : { text: '', style: 'muted' as const };
  const panelId = `client-cadence-${urgency}-${encodeURIComponent(group.clientName)}`;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex min-h-[44px] w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
      >
        <ChevronRight
          className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">
            {formatClientDisplayName(group.clientName)}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {sortedTasks.length === 1
              ? `1 check-in · ${truncated}`
              : `${sortedTasks.length} check-ins · ${truncated}`}
          </p>
        </div>
        {worstLabel.text ? (
          <span className={`text-xs font-semibold shrink-0 ${dueLabelClass(worstLabel.style)}`}>
            {worstLabel.text}
          </span>
        ) : null}
      </button>
      {expanded && (
        <div id={panelId} className="border-t border-border divide-y divide-border/80">
          {sortedTasks.map((task) => (
            <TaskRow key={task.id} task={task} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  );
}

interface FollowupUrgencyBlockProps {
  urgency: TaskUrgency;
  items: CoachTask[];
  expanded: boolean;
  onToggleExpanded: () => void;
  navigate: NavigateFunction;
}

export function FollowupUrgencyBlock({
  urgency,
  items,
  expanded,
  onToggleExpanded,
  navigate,
}: FollowupUrgencyBlockProps) {
  const heading = urgencyHeading(urgency);
  const panelId = `followup-urgency-${urgency}`;

  return (
    <div>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggleExpanded}
        className="flex min-h-[44px] items-center gap-2 mb-2 w-full text-left rounded-lg px-1 -mx-1 hover:bg-muted/50"
      >
        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
          {heading}
        </span>
        <span className="text-[10px] font-bold text-muted-foreground/80">({items.length})</span>
        <ChevronRight
          className={`w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0 ${expanded ? 'rotate-90' : ''}`}
          aria-hidden
        />
      </button>
      {expanded && (
        <div id={panelId} className="space-y-0.5">
          {items.map((task) => (
            <TaskRow key={task.id} task={task} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  );
}

interface TaskRowProps {
  task: CoachTask;
  navigate: NavigateFunction;
}

export function TaskRow({ task, navigate }: TaskRowProps) {
  const Icon = (task.pillar ? TASK_ICONS[task.pillar] : TASK_ICONS[task.type]) ?? Activity;
  const due = task.dueDate ? dueLabelForTask(task) : null;

  return (
    <div className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-muted/40 transition-colors group">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
      <button
        type="button"
        onClick={() => navigate(`/client/${encodeURIComponent(task.clientName)}`)}
        className="text-sm font-semibold text-foreground truncate hover:underline text-left min-w-0 shrink"
      >
        {formatClientDisplayName(task.clientName)}
      </button>
      <span className="text-xs text-muted-foreground hidden sm:inline truncate">{task.title}</span>
      {due?.text ? (
        <span className={`text-xs font-semibold ml-auto shrink-0 ${dueLabelClass(due.style)}`}>
          {due.text}
        </span>
      ) : (
        <span className="ml-auto shrink-0 w-0 sm:w-auto" />
      )}
      <Button
        type="button"
        size="sm"
        onClick={() => navigate(task.actionRoute)}
        className="h-9 min-h-[44px] sm:min-h-0 sm:h-8 px-3 text-xs shrink-0 sm:opacity-0 sm:group-hover:opacity-100 sm:transition-opacity"
      >
        {task.actionLabel}
      </Button>
    </div>
  );
}
