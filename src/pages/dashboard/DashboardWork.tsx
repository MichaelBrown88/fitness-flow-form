import { useMemo, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { CalendarView } from '@/components/dashboard/sub-components/CalendarView';
import { WorkClientList } from '@/components/dashboard/sub-components/WorkClientList';
import { ScheduleDialog } from '@/components/dashboard/sub-components/ScheduleDialog';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Calendar as CalendarIcon,
  ChevronRight,
  CircleCheck,
  Plus,
  Share2,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { staffPreferredFirstName } from '@/lib/utils/staffDisplayName';
import { formatClientDisplayName } from '@/lib/utils/clientDisplayName';
import { cn } from '@/lib/utils';
import type { ReassessmentItem } from '@/hooks/useReassessmentQueue';
import type { DashboardOutletContext } from './DashboardLayout';

function greetingHour(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatToday(): string {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

const isInactive = (c: { clientStatus?: string }) =>
  c.clientStatus === 'deleted' || c.clientStatus === 'archived' || c.clientStatus === 'paused';

export default function DashboardWork() {
  const ctx = useOutletContext<DashboardOutletContext>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const coachFirst = user ? staffPreferredFirstName(profile, user) : 'Coach';

  // ─── Lists driving the page ──────────────────────────────────────────
  const remoteReadyClients = useMemo(
    () => (ctx.clientGroups ?? []).filter((c) => c.remoteIntakeAwaitingStudio && !isInactive(c)),
    [ctx.clientGroups],
  );

  const scoreAlerts = useMemo(
    () =>
      (ctx.clientGroups ?? [])
        .filter((c) => (c.scoreChange ?? 0) < -5 && c.latestScore > 0 && !isInactive(c))
        .sort((a, b) => (a.scoreChange ?? 0) - (b.scoreChange ?? 0))
        .slice(0, 5),
    [ctx.clientGroups],
  );

  const unsharableClients = useMemo(
    () =>
      (ctx.clientGroups ?? [])
        .filter((c) => c.assessments.length > 0 && !c.shareToken && !isInactive(c))
        .slice(0, 5),
    [ctx.clientGroups],
  );

  // ─── KPIs ────────────────────────────────────────────────────────────
  const totalClients = ctx.analytics?.totalClients ?? 0;

  const { overdueCount, dueSoonCount, attentionCount } = useMemo(() => {
    if (!ctx.reassessmentQueue) return { overdueCount: 0, dueSoonCount: 0, attentionCount: 0 };
    const queue = ctx.reassessmentQueue.queue;
    const overdue = queue.filter((item) => item.status === 'overdue').length;
    const dueSoon = queue.filter((item) => item.status === 'due-soon').length;
    return { overdueCount: overdue, dueSoonCount: dueSoon, attentionCount: overdue + dueSoon };
  }, [ctx.reassessmentQueue]);

  const assessments30d = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    let n = 0;
    for (const c of ctx.clientGroups ?? []) {
      if (isInactive(c)) continue;
      for (const a of c.assessments ?? []) {
        const ts =
          (a as { createdAtMs?: number; completedAtMs?: number; assessmentDateMs?: number })
            .createdAtMs ??
          (a as { completedAtMs?: number }).completedAtMs ??
          (a as { assessmentDateMs?: number }).assessmentDateMs;
        if (typeof ts === 'number' && ts >= cutoff) n += 1;
      }
    }
    return n;
  }, [ctx.clientGroups]);

  const reportsSharedPct = useMemo(() => {
    const eligible = (ctx.clientGroups ?? []).filter((c) => c.assessments.length > 0 && !isInactive(c));
    if (eligible.length === 0) return null;
    const shared = eligible.filter((c) => c.shareToken).length;
    return Math.round((shared / eligible.length) * 100);
  }, [ctx.clientGroups]);

  // ─── SIGNAL feed (unified priority items) ────────────────────────────
  type SignalItem = {
    id: string;
    icon: typeof Sparkles;
    tone: 'green' | 'amber' | 'red';
    title: string;
    meta: string;
    action?: { label: string; onClick: () => void };
  };

  const signalItems = useMemo<SignalItem[]>(() => {
    const items: SignalItem[] = [];
    for (const c of remoteReadyClients.slice(0, 3)) {
      items.push({
        id: `ready-${c.id}`,
        icon: Sparkles,
        tone: 'green',
        title: `${formatClientDisplayName(c.name)} ready for studio`,
        meta: 'Remote intake complete · answers will pre-fill',
        action: { label: 'Continue', onClick: () => ctx.handleNewAssessmentForClient(c.name) },
      });
    }
    for (const c of scoreAlerts.slice(0, 3)) {
      items.push({
        id: `drop-${c.id}`,
        icon: TrendingDown,
        tone: 'red',
        title: `${formatClientDisplayName(c.name)} · score dropped`,
        meta: `From ${c.latestScore - (c.scoreChange ?? 0)} to ${c.latestScore} · review and reach out`,
        action: { label: 'Open', onClick: () => navigate(`/client/${encodeURIComponent(c.name)}`) },
      });
    }
    for (const c of unsharableClients.slice(0, 3)) {
      items.push({
        id: `unshared-${c.id}`,
        icon: Share2,
        tone: 'amber',
        title: `${formatClientDisplayName(c.name)} · report unshared`,
        meta: `${c.assessments.length} assessment${c.assessments.length !== 1 ? 's' : ''} pending delivery`,
        action: {
          label: 'Share',
          onClick: () => navigate(`/client/${encodeURIComponent(c.name)}/report?share=1`),
        },
      });
    }
    return items;
  }, [remoteReadyClients, scoreAlerts, unsharableClients, ctx, navigate]);

  // ─── Schedule dialog state (existing flow preserved) ─────────────────
  const [scheduleTarget, setScheduleTarget] = useState<ReassessmentItem | null>(null);

  if (!ctx.reassessmentQueue) return null;

  return (
    <div className="mx-auto flex w-full min-h-0 flex-1 flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      {/* ─── Breadcrumb ───────────────────────────────────────── */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>Workspace</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-semibold text-foreground">Today</span>
      </nav>

      {/* ─── Page head (greeting + actions) ───────────────────── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {greetingHour()}, {coachFirst}.
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatToday()}
            {totalClients > 0 && <> · {totalClients} client{totalClients !== 1 ? 's' : ''}</>}
            {attentionCount > 0 && <> · <span className="font-medium text-score-amber-fg">{attentionCount} need{attentionCount === 1 ? 's' : ''} attention</span></>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="h-10 gap-2 rounded-full"
            onClick={() => {
              const el = document.getElementById('today-calendar');
              el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            <CalendarIcon className="h-4 w-4" />
            Schedule
          </Button>
          <Button onClick={ctx.onNewClient} className="h-10 gap-2 rounded-full">
            <Plus className="h-4 w-4" />
            New assessment
          </Button>
        </div>
      </header>

      {/* ─── KPI row ──────────────────────────────────────────── */}
      {/* Kit stat-row: 4 cols, 12px gap */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Active clients" value={totalClients > 0 ? String(totalClients) : '—'} />
        <KpiCard
          label="Assessments · 30d"
          value={assessments30d > 0 ? String(assessments30d) : '—'}
        />
        <KpiCard
          label="Needs attention"
          value={attentionCount === 0 && totalClients === 0 ? '—' : String(attentionCount)}
          trend={
            attentionCount === 0 && totalClients > 0
              ? { dir: 'up', label: 'all on track' }
              : overdueCount > 0
              ? { dir: 'down', label: `${overdueCount} overdue` }
              : undefined
          }
        />
        <KpiCard
          label="Reports shared"
          value={reportsSharedPct === null ? '—' : `${reportsSharedPct}%`}
        />
      </div>

      {/* ─── Two-column body ──────────────────────────────────── */}
      {/* Kit content-grid: 1.5fr / 1fr, gap 16px, items start */}
      <div className="grid min-h-0 flex-1 items-start gap-4 lg:grid-cols-[1.5fr_1fr]">
        {/* LEFT: Clients needing attention */}
        <section className="min-w-0 space-y-6">
          <Panel
            title="Clients needing attention"
            link={
              attentionCount > 0 ? { label: 'See all clients', onClick: () => navigate('/dashboard/clients') } : undefined
            }
          >
            <WorkClientList
              queue={ctx.reassessmentQueue.queue}
              search={ctx.search}
              onScheduleClient={setScheduleTarget}
            />
          </Panel>
        </section>

        {/* RIGHT: SIGNAL feed */}
        <aside className="min-w-0">
          <Panel
            title={
              <span>
                <span className="font-semibold">SIGNAL</span>
                <span className="text-xs text-muted-foreground">™ · Coach priorities</span>
              </span>
            }
            label="Today"
          >
            {signalItems.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <CircleCheck className="h-6 w-6 text-score-green" />
                <p className="text-sm font-semibold text-foreground">All clear</p>
                <p className="max-w-[260px] text-xs text-muted-foreground">
                  No drops, unshared reports, or studio-ready clients right now. Nicely done.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {signalItems.map((item) => (
                  <SignalRow key={item.id} item={item} />
                ))}
              </ul>
            )}
          </Panel>
        </aside>
      </div>

      {/* ─── Calendar (full-width below grid) ─────────────────── */}
      <section id="today-calendar" className="space-y-3 scroll-mt-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Calendar</h2>
        <div className="overflow-hidden rounded-[28px] border border-border bg-card p-3 shadow-sm">
          <CalendarView
            reassessmentQueue={ctx.reassessmentQueue}
            onNewAssessmentForClient={ctx.handleNewAssessmentForClient}
            organizationId={ctx.profile?.organizationId}
            onScheduleChanged={ctx.refreshSchedules}
            density="compact"
          />
        </div>
      </section>

      {/* ─── Schedule dialog (existing flow) ──────────────────── */}
      {scheduleTarget && ctx.profile?.organizationId && (
        <ScheduleDialog
          client={scheduleTarget}
          organizationId={ctx.profile.organizationId}
          onScheduled={() => {
            setScheduleTarget(null);
            ctx.refreshSchedules?.();
          }}
          onClose={() => setScheduleTarget(null)}
        />
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  trend?: { dir: 'up' | 'down'; label: string };
}

function KpiCard({ label, value, trend }: KpiCardProps) {
  // Kit spec: rounded-[20px], padding 16px 18px, gap 6px,
  // value 28px / 700 / line 1.1 / -0.015em, label 11px uppercase,
  // trend 12px semibold inline-flex.
  return (
    <div className="flex flex-col gap-1.5 rounded-[20px] border border-border bg-card px-[18px] py-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div className="text-[28px] font-bold leading-[1.1] tracking-[-0.015em] text-foreground tabular-nums">
        {value}
      </div>
      {trend ? (
        <div
          className={cn(
            'flex items-center gap-1 text-xs font-semibold',
            trend.dir === 'up' ? 'text-score-green-fg' : 'text-score-amber-fg',
          )}
        >
          {trend.dir === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {trend.label}
        </div>
      ) : (
        <div className="h-[18px]" />
      )}
    </div>
  );
}

interface PanelProps {
  title: React.ReactNode;
  label?: string;
  link?: { label: string; onClick: () => void };
  children: React.ReactNode;
}

function Panel({ title, label, link, children }: PanelProps) {
  // Kit spec: rounded-[20px], padding 18px 20px, gap 14px in column.
  return (
    <div className="rounded-[20px] border border-border bg-card">
      <header className="flex items-center justify-between gap-3 px-5 pt-[18px]">
        <h3 className="text-sm font-semibold tracking-[-0.005em] text-foreground">{title}</h3>
        {label ? (
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {label}
          </span>
        ) : null}
        {link ? (
          <button
            type="button"
            onClick={link.onClick}
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-foreground transition-colors hover:text-muted-foreground"
          >
            {link.label}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </header>
      <div className="px-2 pb-2 pt-2">{children}</div>
    </div>
  );
}

const SIGNAL_TONE_TILE: Record<'green' | 'amber' | 'red', { tile: string; icon: string }> = {
  green: { tile: 'bg-[hsl(var(--score-green)/0.18)]', icon: 'text-[hsl(var(--score-green))]' },
  amber: { tile: 'bg-[hsl(var(--score-amber)/0.18)]', icon: 'text-[hsl(var(--score-amber))]' },
  red: { tile: 'bg-[hsl(var(--score-red)/0.18)]', icon: 'text-[hsl(var(--score-red))]' },
};

interface SignalRowProps {
  item: {
    icon: typeof Sparkles;
    tone: 'green' | 'amber' | 'red';
    title: string;
    meta: string;
    action?: { label: string; onClick: () => void };
  };
}

function SignalRow({ item }: SignalRowProps) {
  const Icon = item.icon;
  const tone = SIGNAL_TONE_TILE[item.tone];
  return (
    <li className="flex items-start gap-3 px-3 py-3">
      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tone.tile)} aria-hidden>
        <Icon className={cn('h-4 w-4', tone.icon)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold leading-snug text-foreground">{item.title}</div>
        <div className="text-[12px] leading-relaxed text-muted-foreground">{item.meta}</div>
      </div>
      {item.action ? (
        <button
          type="button"
          onClick={item.action.onClick}
          className="shrink-0 rounded-full border border-border px-3 py-1 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted"
        >
          {item.action.label}
        </button>
      ) : null}
    </li>
  );
}
