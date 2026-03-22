import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { SCORE_COLORS } from '@/lib/scoring/scoreColor';
import type { CoachTask, TaskUrgency } from '@/lib/tasks/generateTasks';
import { DASHBOARD_TASKS } from '@/constants/dashboardTasksCopy';
import {
  buildFocusStripEntries,
  buildSummaryParts,
  groupTasksByUrgency,
  splitCadenceAndFollowups,
} from './taskListModel';
import { CadenceUrgencyBlock, FollowupUrgencyBlock } from './taskListViewBlocks';
import { TaskListFocusStrip } from './taskListFocusStrip';

interface TaskListViewProps {
  tasks: CoachTask[];
  search?: string;
}

export const TaskListView: React.FC<TaskListViewProps> = ({ tasks, search = '' }) => {
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    if (!search.trim()) return tasks;
    const t = search.toLowerCase();
    return tasks.filter(
      (x) => x.clientName.toLowerCase().includes(t) || x.title.toLowerCase().includes(t),
    );
  }, [tasks, search]);

  const { cadence: cadenceFiltered, followups: followupsFiltered } = useMemo(
    () => splitCadenceAndFollowups(filtered),
    [filtered],
  );

  const cadenceByUrgency = useMemo(() => groupTasksByUrgency(cadenceFiltered), [cadenceFiltered]);
  const followupsByUrgency = useMemo(() => groupTasksByUrgency(followupsFiltered), [followupsFiltered]);

  const focusEntries = useMemo(() => buildFocusStripEntries(cadenceFiltered), [cadenceFiltered]);
  const summary = useMemo(() => buildSummaryParts(filtered), [filtered]);

  const defaultUrgencyOpen: Record<TaskUrgency, boolean> = {
    overdue: true,
    this_week: true,
    soon: true,
    later: false,
  };
  const [expandedCadenceUrgency, setExpandedCadenceUrgency] =
    useState<Record<TaskUrgency, boolean>>(defaultUrgencyOpen);
  const [expandedFollowupUrgency, setExpandedFollowupUrgency] =
    useState<Record<TaskUrgency, boolean>>(defaultUrgencyOpen);

  const [expandedClients, setExpandedClients] = useState<Set<string>>(() => new Set());

  const toggleClient = useCallback((key: string) => {
    setExpandedClients((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  if (tasks.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-score-green-light flex items-center justify-center">
          <CheckCircle className={`w-8 h-8 ${SCORE_COLORS.green.icon}`} />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {DASHBOARD_TASKS.EMPTY_NO_TASKS_TITLE}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          {DASHBOARD_TASKS.EMPTY_NO_TASKS_BODY}
        </p>
      </div>
    );
  }

  if (filtered.length === 0 && search.trim()) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground font-medium">
        {DASHBOARD_TASKS.SEARCH_NO_MATCH}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">{DASHBOARD_TASKS.EXPLAINER}</p>

      <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {summary.segments.join(DASHBOARD_TASKS.SUMMARY_SEPARATOR)}
      </p>

      <TaskListFocusStrip entries={focusEntries} navigate={navigate} />

      {cadenceByUrgency.length > 0 && (
        <section aria-labelledby="tasks-cadence-heading" className="space-y-4">
          <h2
            id="tasks-cadence-heading"
            className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground"
          >
            {DASHBOARD_TASKS.SECTION_CADENCE}
          </h2>
          {cadenceByUrgency.map(([urgency, items]) => (
            <CadenceUrgencyBlock
              key={urgency}
              urgency={urgency}
              items={items}
              expanded={expandedCadenceUrgency[urgency] ?? true}
              onToggleExpanded={() =>
                setExpandedCadenceUrgency((p) => ({ ...p, [urgency]: !p[urgency] }))
              }
              expandedClients={expandedClients}
              onToggleClient={toggleClient}
              navigate={navigate}
            />
          ))}
        </section>
      )}

      {followupsByUrgency.length > 0 && (
        <section aria-labelledby="tasks-followups-heading" className="space-y-4">
          <h2
            id="tasks-followups-heading"
            className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground"
          >
            {DASHBOARD_TASKS.SECTION_FOLLOWUPS}
          </h2>
          {followupsByUrgency.map(([urgency, items]) => (
            <FollowupUrgencyBlock
              key={urgency}
              urgency={urgency}
              items={items}
              expanded={expandedFollowupUrgency[urgency] ?? urgency !== 'later'}
              onToggleExpanded={() =>
                setExpandedFollowupUrgency((p) => ({ ...p, [urgency]: !p[urgency] }))
              }
              navigate={navigate}
            />
          ))}
        </section>
      )}
    </div>
  );
};
