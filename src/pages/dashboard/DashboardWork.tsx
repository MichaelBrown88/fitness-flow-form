import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { CalendarView } from '@/components/dashboard/sub-components/CalendarView';
import { WorkClientList } from '@/components/dashboard/sub-components/WorkClientList';
import { Button } from '@/components/ui/button';
import { Link2 } from 'lucide-react';
import type { DashboardOutletContext } from './DashboardLayout';

export default function DashboardWork() {
  const ctx = useOutletContext<DashboardOutletContext>();

  const attentionCount = useMemo(() => {
    if (!ctx.reassessmentQueue) return 0;
    return ctx.reassessmentQueue.queue.filter(
      item => item.status === 'overdue' || item.status === 'due-soon',
    ).length;
  }, [ctx.reassessmentQueue]);

  if (!ctx.reassessmentQueue) return null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 px-3 sm:px-4 pt-6 pb-8">
      <section>
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-[11px] font-black uppercase tracking-[0.12em] text-muted-foreground">
            Needs Attention
          </h2>
          {attentionCount > 0 && (
            <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-score-red px-1 text-[9px] font-bold text-white tabular-nums">
              {attentionCount}
            </span>
          )}
        </div>
        <div className="overflow-hidden rounded-lg border border-border/70 bg-background">
          <WorkClientList
            queue={ctx.reassessmentQueue.queue}
            search={ctx.search}
            onStartAssessment={ctx.handleNewAssessmentForClient}
          />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-black uppercase tracking-[0.12em] text-muted-foreground">
            Calendar
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-muted-foreground"
            disabled
            title="Connect a third-party calendar — coming soon"
          >
            <Link2 className="h-3.5 w-3.5" />
            Connect calendar
          </Button>
        </div>
        <div className="overflow-hidden rounded-lg border border-border/70 bg-background p-3">
          <CalendarView
            reassessmentQueue={ctx.reassessmentQueue}
            onNewAssessmentForClient={ctx.handleNewAssessmentForClient}
            organizationId={ctx.profile?.organizationId}
            onScheduleChanged={ctx.refreshSchedules}
            density="compact"
          />
        </div>
      </section>
    </div>
  );
}
