import { useEffect } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { TaskListView } from '@/components/dashboard/sub-components/TaskListView';
import { CalendarView } from '@/components/dashboard/sub-components/CalendarView';
import type { DashboardOutletContext } from './DashboardLayout';
import { DASHBOARD_WORK_VIEW_QUERY } from '@/constants/routes';
import { UI_TABS } from '@/constants/ui';

export default function DashboardWork() {
  const ctx = useOutletContext<DashboardOutletContext>();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!ctx.reassessmentQueue) return;
    const view = searchParams.get(DASHBOARD_WORK_VIEW_QUERY);
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (view !== 'calendar' && hash !== '#work-calendar') return;
    requestAnimationFrame(() => {
      document.getElementById('work-calendar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [searchParams, ctx.reassessmentQueue]);

  if (!ctx.reassessmentQueue) return null;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3 overflow-hidden lg:gap-4">
      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-1 gap-3 overflow-hidden lg:grid-cols-2 lg:gap-4">
        <section
          id="work-tasks"
          aria-labelledby="work-tasks-heading"
          className="flex max-h-[min(50vh,24rem)] min-h-0 min-w-0 flex-col lg:max-h-full"
        >
          <h2
            id="work-tasks-heading"
            className="mb-2 shrink-0 text-xs font-semibold tracking-tight text-foreground"
          >
            {UI_TABS.SCHEDULE}
          </h2>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/70 bg-muted/10 dark:bg-muted/5">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-3">
              <TaskListView tasks={ctx.tasks} search={ctx.search} density="compact" />
            </div>
          </div>
        </section>

        <section
          id="work-calendar"
          aria-labelledby="work-calendar-heading"
          className="flex max-h-[min(50vh,24rem)] min-h-0 min-w-0 flex-col lg:max-h-full"
        >
          <h2
            id="work-calendar-heading"
            className="mb-2 shrink-0 text-xs font-semibold tracking-tight text-foreground"
          >
            {UI_TABS.CALENDAR}
          </h2>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/70 bg-muted/10 dark:bg-muted/5">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-3">
              <CalendarView
                reassessmentQueue={ctx.reassessmentQueue}
                onNewAssessmentForClient={ctx.handleNewAssessmentForClient}
                organizationId={ctx.profile?.organizationId}
                onScheduleChanged={ctx.refreshSchedules}
                density="compact"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
