import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Scale, Camera, Activity, Dumbbell, Heart,
  FileEdit, Map, UserCog, ChevronRight, CheckCircle,
} from 'lucide-react';
import { SCORE_COLORS } from '@/lib/scoring/scoreColor';
import type { CoachTask, TaskUrgency } from '@/lib/tasks/generateTasks';

const TASK_ICONS: Record<string, React.ElementType> = {
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

const URGENCY_META: Record<TaskUrgency, { label: string; color: string }> = {
  overdue: { label: 'Overdue', color: 'text-score-red-fg' },
  this_week: { label: 'This Week', color: 'text-score-amber-fg' },
  soon: { label: 'Coming Up', color: 'text-blue-500' },
  later: { label: 'Later', color: 'text-slate-400' },
};

interface TaskListViewProps {
  tasks: CoachTask[];
  search?: string;
}

export const TaskListView: React.FC<TaskListViewProps> = ({ tasks, search = '' }) => {
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    if (!search.trim()) return tasks;
    const t = search.toLowerCase();
    return tasks.filter((x) => x.clientName.toLowerCase().includes(t) || x.title.toLowerCase().includes(t));
  }, [tasks, search]);

  const grouped = useMemo(() => {
    const g: Record<TaskUrgency, CoachTask[]> = { overdue: [], this_week: [], soon: [], later: [] };
    for (const t of filtered) g[t.urgency].push(t);
    return (Object.entries(g) as [TaskUrgency, CoachTask[]][]).filter(([, v]) => v.length > 0);
  }, [filtered]);

  if (tasks.length === 0) return (
    <div className="py-12 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-score-green-light flex items-center justify-center">
        <CheckCircle className={`w-8 h-8 ${SCORE_COLORS.green.icon}`} />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">All Caught Up</h3>
      <p className="text-sm text-slate-500 max-w-sm mx-auto">No pending tasks. Complete an assessment to start tracking.</p>
    </div>
  );

  if (filtered.length === 0 && search.trim()) return (
    <div className="py-12 text-center text-sm text-slate-400 font-medium">No tasks match that search.</div>
  );

  const overdue = filtered.filter((t) => t.urgency === 'overdue').length;
  const thisWeek = filtered.filter((t) => t.urgency === 'this_week').length;

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500 flex items-center gap-2 flex-wrap">
        {overdue > 0 && <span className="text-score-red-fg font-semibold">{overdue} overdue</span>}
        {overdue > 0 && thisWeek > 0 && <span className="text-slate-300">·</span>}
        {thisWeek > 0 && <span className="text-score-amber-fg font-semibold">{thisWeek} due this week</span>}
        {(overdue > 0 || thisWeek > 0) && <span className="text-slate-300">·</span>}
        <span className="text-slate-400">{filtered.length} total</span>
      </p>

      {grouped.map(([urgency, items]) => (
        <TaskGroup key={urgency} urgency={urgency} items={items} navigate={navigate} />
      ))}
    </div>
  );
};

function TaskGroup({
  urgency,
  items,
  navigate,
}: {
  urgency: TaskUrgency;
  items: CoachTask[];
  navigate: ReturnType<typeof useNavigate>;
}) {
  const meta = URGENCY_META[urgency];
  const [expanded, setExpanded] = useState(urgency !== 'later');

  return (
    <div>
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 mb-2 w-full text-left">
        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">{meta.label}</span>
        <span className="text-[10px] font-bold text-slate-300">({items.length})</span>
        <ChevronRight className={`w-3 h-3 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>
      {expanded && (
        <div className="space-y-0.5">
          {items.map((task) => (
            <TaskRow key={task.id} task={task} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, navigate }: { task: CoachTask; navigate: ReturnType<typeof useNavigate> }) {
  const Icon = (task.pillar ? TASK_ICONS[task.pillar] : TASK_ICONS[task.type]) ?? Activity;
  const urgencyColor = URGENCY_META[task.urgency].color;

  return (
    <div className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-slate-50 transition-colors group">
      <Icon className="h-4 w-4 text-slate-400 shrink-0" />
      <button
        onClick={() => navigate(`/client/${encodeURIComponent(task.clientName)}`)}
        className="text-sm font-semibold text-slate-900 truncate hover:underline text-left min-w-0 flex-shrink"
      >
        {task.clientName}
      </button>
      <span className="text-xs text-slate-400 hidden sm:inline truncate">{task.title}</span>
      {task.dueDate && (
        <span className={`text-xs font-semibold ml-auto shrink-0 ${urgencyColor}`}>
          {formatDueLabel(task.dueDate)}
        </span>
      )}
      <Button
        size="sm"
        onClick={() => navigate(task.actionRoute)}
        className="h-8 px-3 text-xs bg-slate-900 text-white hover:bg-slate-800 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {task.actionLabel}
      </Button>
    </div>
  );
}

function formatDueLabel(date: Date): string {
  const diff = date.getTime() - Date.now();
  const days = Math.round(diff / (24 * 60 * 60 * 1000));
  if (days < -1) return `${Math.abs(days)}d overdue`;
  if (days === -1) return 'Yesterday';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days <= 7) return `In ${days}d`;
  return `In ${Math.round(days / 7)}w`;
}
