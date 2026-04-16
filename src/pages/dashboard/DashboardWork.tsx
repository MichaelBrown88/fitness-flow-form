import { useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { CalendarView } from '@/components/dashboard/sub-components/CalendarView';
import { WorkClientList } from '@/components/dashboard/sub-components/WorkClientList';
import { Button } from '@/components/ui/button';
import { Link2, Users, ClipboardCheck, AlertTriangle, CheckCircle2, ArrowRight, Sparkles, TrendingDown, Share2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { staffPreferredFirstName } from '@/lib/utils/staffDisplayName';
import { formatClientDisplayName } from '@/lib/utils/clientDisplayName';
import type { DashboardOutletContext } from './DashboardLayout';

function greetingHour(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardWork() {
  const ctx = useOutletContext<DashboardOutletContext>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const coachFirst = user ? staffPreferredFirstName(profile, user) : 'Coach';

  // Clients who completed remote intake and are ready for in-studio assessment
  const remoteReadyClients = useMemo(() => {
    return (ctx.clientGroups ?? []).filter(c => c.remoteIntakeAwaitingStudio);
  }, [ctx.clientGroups]);

  // Clients whose score dropped significantly (coaching opportunities)
  const scoreAlerts = useMemo(() => {
    return (ctx.clientGroups ?? [])
      .filter(c => (c.scoreChange ?? 0) < -5 && c.latestScore > 0)
      .sort((a, b) => (a.scoreChange ?? 0) - (b.scoreChange ?? 0))
      .slice(0, 5);
  }, [ctx.clientGroups]);

  // Clients with assessments but no shared report (pending deliverables)
  const unsharableClients = useMemo(() => {
    return (ctx.clientGroups ?? [])
      .filter(c => c.assessments.length > 0 && !c.shareToken)
      .slice(0, 5);
  }, [ctx.clientGroups]);

  const { overdueCount, dueSoonCount, attentionCount } = useMemo(() => {
    if (!ctx.reassessmentQueue) return { overdueCount: 0, dueSoonCount: 0, attentionCount: 0 };
    const queue = ctx.reassessmentQueue.queue;
    const overdue = queue.filter(item => item.status === 'overdue').length;
    const dueSoon = queue.filter(item => item.status === 'due-soon').length;
    return { overdueCount: overdue, dueSoonCount: dueSoon, attentionCount: overdue + dueSoon };
  }, [ctx.reassessmentQueue]);

  if (!ctx.reassessmentQueue) return null;

  const totalClients = ctx.analytics?.totalClients ?? 0;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-3 sm:px-5 py-6 sm:py-10">
      {/* Greeting + roster pulse */}
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {greetingHour()}, {coachFirst}.
        </h1>
        {totalClients > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {totalClients} client{totalClients !== 1 ? 's' : ''}
            </span>
            {overdueCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-score-red-fg font-medium">
                <AlertTriangle className="h-3.5 w-3.5" />
                {overdueCount} overdue
              </span>
            )}
            {dueSoonCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-score-amber-fg font-medium">
                <ClipboardCheck className="h-3.5 w-3.5" />
                {dueSoonCount} due soon
              </span>
            )}
            {attentionCount === 0 && totalClients > 0 && (
              <span className="inline-flex items-center gap-1.5 text-score-green-fg font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                All on track
              </span>
            )}
          </div>
        )}
      </div>

      {/* Remote intake ready — highest-priority, lowest-friction assessments */}
      {remoteReadyClients.length > 0 && (
        <section>
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground-secondary">
              Ready for Studio
            </h2>
            <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground tabular-nums">
              {remoteReadyClients.length}
            </span>
          </div>
          <div className="overflow-hidden rounded-2xl bg-card shadow-sm border-l-4 border-l-primary">
            <ul className="divide-y divide-border/40 px-3">
              {remoteReadyClients.map(client => (
                <li key={client.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {formatClientDisplayName(client.name)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Remote intake complete — answers will be pre-loaded
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0 gap-1.5 text-xs font-semibold"
                    onClick={() => ctx.handleNewAssessmentForClient(client.name, 'full')}
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                    Continue in studio
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Needs Attention queue */}
      <section>
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground-secondary">
            Needs Attention
          </h2>
          {attentionCount > 0 && (
            <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-score-red px-1 text-[10px] font-bold text-white tabular-nums">
              {attentionCount}
            </span>
          )}
        </div>
        <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
          <WorkClientList
            queue={ctx.reassessmentQueue.queue}
            search={ctx.search}
            onStartAssessment={ctx.handleNewAssessmentForClient}
          />
        </div>
      </section>

      {/* Score alerts — clients whose scores dropped (coaching opportunities) */}
      {scoreAlerts.length > 0 && (
        <section>
          <div className="mb-2 flex items-center gap-2">
            <TrendingDown className="h-3.5 w-3.5 text-score-red-fg" />
            <h2 className="text-sm font-semibold text-foreground-secondary">
              Score Drops
            </h2>
          </div>
          <div className="overflow-hidden rounded-2xl bg-card shadow-sm border-l-4 border-l-score-red">
            <ul className="divide-y divide-border/40 px-3">
              {scoreAlerts.map(client => (
                <li key={client.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {formatClientDisplayName(client.name)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Score dropped from {(client.latestScore - (client.scoreChange ?? 0))} to {client.latestScore}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-score-red-fg tabular-nums shrink-0">
                    {client.scoreChange}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Pending deliverables — reports not yet shared with clients */}
      {unsharableClients.length > 0 && (
        <section>
          <div className="mb-2 flex items-center gap-2">
            <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground-secondary">
              Unshared Reports
            </h2>
            <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-muted px-1 text-[10px] font-bold text-muted-foreground tabular-nums">
              {unsharableClients.length}
            </span>
          </div>
          <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
            <ul className="divide-y divide-border/40 px-3">
              {unsharableClients.map(client => (
                <li key={client.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {formatClientDisplayName(client.name)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {client.assessments.length} assessment{client.assessments.length !== 1 ? 's' : ''} — report not shared
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/client/${encodeURIComponent(client.name)}/report?share=1`)}
                    className="shrink-0 gap-1.5 text-xs font-semibold"
                  >
                    <Share2 className="h-3 w-3" />
                    Share
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Calendar */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground-secondary">
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
        <div className="overflow-hidden rounded-2xl bg-card shadow-sm p-5 border border-dashed border-border/50">
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
