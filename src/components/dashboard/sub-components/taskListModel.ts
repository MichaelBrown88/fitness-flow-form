/**
 * Pure helpers for dashboard TaskListView: cadence vs follow-ups, client grouping, focus strip.
 */

import { DASHBOARD_TASKS } from '@/constants/dashboardTasksCopy';
import type { CoachTask, TaskType, TaskUrgency } from '@/lib/tasks/generateTasks';
import { getPillarLabel } from '@/constants/pillars';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const CADENCE_TYPES: TaskType[] = ['overdue_reassessment', 'upcoming_reassessment'];

export function isCadenceTaskType(type: TaskType): boolean {
  return CADENCE_TYPES.includes(type);
}

export function splitCadenceAndFollowups(tasks: CoachTask[]): {
  cadence: CoachTask[];
  followups: CoachTask[];
} {
  const cadence: CoachTask[] = [];
  const followups: CoachTask[] = [];
  for (const t of tasks) {
    if (isCadenceTaskType(t.type)) cadence.push(t);
    else followups.push(t);
  }
  return { cadence, followups };
}

export type ClientCadenceGroup = {
  clientName: string;
  tasks: CoachTask[];
  /** Most days past cadence (positive) among tasks with dueDate; higher = worse */
  worstDaysPast: number;
  /** For upcoming-only groups: soonest due date ms */
  soonestDueMs: number;
};

function daysPastDue(d: Date): number {
  return Math.floor((Date.now() - d.getTime()) / MS_PER_DAY);
}

/** Group cadence tasks by client within one urgency bucket */
export function groupCadenceTasksByClient(tasks: CoachTask[]): ClientCadenceGroup[] {
  const byClient = new Map<string, CoachTask[]>();
  for (const t of tasks) {
    const list = byClient.get(t.clientName) ?? [];
    list.push(t);
    byClient.set(t.clientName, list);
  }

  const groups: ClientCadenceGroup[] = [];
  for (const [clientName, clientTasks] of byClient) {
    let worstDaysPast = 0;
    let soonestDueMs = Infinity;
    for (const t of clientTasks) {
      if (!t.dueDate) continue;
      if (t.urgency === 'overdue') {
        worstDaysPast = Math.max(worstDaysPast, daysPastDue(t.dueDate));
      } else {
        soonestDueMs = Math.min(soonestDueMs, t.dueDate.getTime());
      }
    }
    if (soonestDueMs === Infinity) soonestDueMs = Date.now();
    groups.push({ clientName, tasks: clientTasks, worstDaysPast, soonestDueMs });
  }

  groups.sort((a, b) => {
    if (a.worstDaysPast !== b.worstDaysPast) return b.worstDaysPast - a.worstDaysPast;
    return a.soonestDueMs - b.soonestDueMs;
  });
  return groups;
}

export type FocusStripEntry = {
  clientName: string;
  clientPath: string;
  firstActionRoute: string;
  firstActionLabel: string;
  /** Sort key: higher = more urgent for overdue */
  priority: number;
  subtitle: string;
};

function pillarLabelsLine(tasks: CoachTask[], maxLen = 48): string {
  const labels = tasks.map((t) => (t.pillar ? getPillarLabel(t.pillar) : 'Assessment'));
  const joined = labels.join(', ');
  if (joined.length <= maxLen) return joined;
  return `${joined.slice(0, maxLen - 1)}…`;
}

export function buildFocusStripEntries(cadenceTasks: CoachTask[]): FocusStripEntry[] {
  const overdue = cadenceTasks.filter((t) => t.urgency === 'overdue');
  const thisWeek = cadenceTasks.filter((t) => t.urgency === 'this_week');

  const byClientOverdue = groupCadenceTasksByClient(overdue);
  const entries: FocusStripEntry[] = [];

  for (const g of byClientOverdue) {
    const sorted = [...g.tasks].sort((a, b) => {
      const da = a.dueDate?.getTime() ?? 0;
      const db = b.dueDate?.getTime() ?? 0;
      return da - db;
    });
    const first = sorted[0];
    if (!first) continue;
    entries.push({
      clientName: g.clientName,
      clientPath: `/client/${encodeURIComponent(g.clientName)}`,
      firstActionRoute: first.actionRoute,
      firstActionLabel: first.actionLabel,
      priority: g.worstDaysPast,
      subtitle: pillarLabelsLine(g.tasks, 56),
    });
  }

  entries.sort((a, b) => b.priority - a.priority);

  const max = DASHBOARD_TASKS.FOCUS_STRIP_MAX;
  const picked = entries.slice(0, max);
  if (picked.length >= max) return picked;

  const byClientWeek = groupCadenceTasksByClient(thisWeek);
  const seen = new Set(picked.map((e) => e.clientName));
  for (const g of byClientWeek) {
    if (picked.length >= max) break;
    if (seen.has(g.clientName)) continue;
    seen.add(g.clientName);
    const sorted = [...g.tasks].sort((a, b) => {
      const da = a.dueDate?.getTime() ?? Infinity;
      const db = b.dueDate?.getTime() ?? Infinity;
      return da - db;
    });
    const first = sorted[0];
    if (!first) continue;
    picked.push({
      clientName: g.clientName,
      clientPath: `/client/${encodeURIComponent(g.clientName)}`,
      firstActionRoute: first.actionRoute,
      firstActionLabel: first.actionLabel,
      priority: 0,
      subtitle: pillarLabelsLine(g.tasks, 56),
    });
  }
  return picked;
}

export type DueLabelStyle = 'severe' | 'moderate' | 'soon' | 'muted';

export function dueLabelForTask(task: CoachTask): { text: string; style: DueLabelStyle } {
  if (!task.dueDate) {
    return { text: '', style: 'muted' };
  }
  const d = task.dueDate;
  const diff = d.getTime() - Date.now();
  const days = Math.round(diff / MS_PER_DAY);

  if (task.urgency === 'overdue' || diff < 0) {
    const past = Math.abs(Math.floor(diff / MS_PER_DAY));
    const severe = past >= DASHBOARD_TASKS.PAST_CADENCE_SEVERE_DAYS;
    return {
      text: past === 0 ? 'Today' : past === 1 ? '1d past cadence' : `${past}d past cadence`,
      style: severe ? 'severe' : 'moderate',
    };
  }
  if (days === 0) return { text: 'Today', style: 'soon' };
  if (days === 1) return { text: 'Tomorrow', style: 'soon' };
  if (days <= 7) return { text: `In ${days}d`, style: 'soon' };
  return { text: `In ${Math.round(days / 7)}w`, style: 'muted' };
}

const STYLE_CLASS: Record<DueLabelStyle, string> = {
  severe: 'text-score-red-fg',
  moderate: 'text-score-amber-fg',
  soon: 'text-primary',
  muted: 'text-muted-foreground',
};

export function dueLabelClass(style: DueLabelStyle): string {
  return STYLE_CLASS[style];
}

export function uniqueClientCountForUrgency(tasks: CoachTask[], urgency: TaskUrgency): number {
  const names = new Set<string>();
  for (const t of tasks) {
    if (t.urgency === urgency) names.add(t.clientName);
  }
  return names.size;
}

export function buildSummaryParts(filtered: CoachTask[]): {
  segments: string[];
} {
  const { cadence, followups } = splitCadenceAndFollowups(filtered);
  const past = uniqueClientCountForUrgency(cadence, 'overdue');
  const week = uniqueClientCountForUrgency(cadence, 'this_week');
  const fu = followups.length;
  const sep = DASHBOARD_TASKS.SUMMARY_SEPARATOR;
  const segments: string[] = [];
  if (past > 0) {
    segments.push(`${past} ${past === 1 ? 'client' : 'clients'} past cadence`);
  }
  if (week > 0) {
    segments.push(`${week} due this week`);
  }
  if (fu > 0) {
    segments.push(`${fu} follow-up${fu === 1 ? '' : 's'}`);
  }
  if (segments.length === 0) {
    segments.push(`${filtered.length} open item${filtered.length === 1 ? '' : 's'}`);
  }
  return { segments: segments.filter(Boolean) };
}

const URGENCY_HEADINGS: Record<TaskUrgency, string> = {
  overdue: DASHBOARD_TASKS.URGENCY_PAST_CADENCE,
  this_week: DASHBOARD_TASKS.URGENCY_THIS_WEEK,
  soon: DASHBOARD_TASKS.URGENCY_COMING_UP,
  later: DASHBOARD_TASKS.URGENCY_LATER,
};

export function urgencyHeading(urgency: TaskUrgency): string {
  return URGENCY_HEADINGS[urgency];
}

export function groupTasksByUrgency(tasks: CoachTask[]): [TaskUrgency, CoachTask[]][] {
  const g: Record<TaskUrgency, CoachTask[]> = { overdue: [], this_week: [], soon: [], later: [] };
  for (const t of tasks) g[t.urgency].push(t);
  return (Object.entries(g) as [TaskUrgency, CoachTask[]][]).filter(([, v]) => v.length > 0);
}
