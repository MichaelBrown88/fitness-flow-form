import { useMemo, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { CalendarView } from '@/components/dashboard/sub-components/CalendarView';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  ArrowRight,
  Calendar as CalendarIcon,
  CircleCheck,
  Plus,
  Share2,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { WorkspaceBreadcrumb } from '@/components/dashboard/WorkspaceBreadcrumb';
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

  // ─── Calendar sheet (Schedule button opens slide-in) ─────────────────
  const [calendarSheetOpen, setCalendarSheetOpen] = useState(false);

  if (!ctx.reassessmentQueue) return null;

  return (
    <div className="mx-auto flex w-full min-h-0 flex-1 flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      {/* ─── Breadcrumb ───────────────────────────────────────── */}
      <WorkspaceBreadcrumb current="Today" />

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
            className="h-9 gap-2 rounded-full px-4 text-[13px] font-semibold"
            onClick={() => setCalendarSheetOpen(true)}
          >
            <CalendarIcon className="h-4 w-4" />
            Schedule
          </Button>
          <Button onClick={ctx.onNewClient} className="h-9 gap-2 rounded-full px-4 text-[13px] font-bold">
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
            <ClientAttentionList
              queue={ctx.reassessmentQueue.queue}
              search={ctx.search}
              onOpenClient={(name) => navigate(`/client/${encodeURIComponent(name)}`)}
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

      {/* ─── Calendar sheet (Schedule button opens this) ──────── */}
      <Sheet open={calendarSheetOpen} onOpenChange={setCalendarSheetOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-2xl">
          <SheetHeader className="px-6 pb-3 pt-6">
            <SheetTitle className="text-xl font-bold tracking-tight">Schedule</SheetTitle>
          </SheetHeader>
          <div className="px-3 pb-6">
            <CalendarView
              reassessmentQueue={ctx.reassessmentQueue}
              onNewAssessmentForClient={ctx.handleNewAssessmentForClient}
              organizationId={ctx.profile?.organizationId}
              onScheduleChanged={ctx.refreshSchedules}
              density="compact"
            />
          </div>
        </SheetContent>
      </Sheet>

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

// ─── Client attention list (kit row recipe) ──────────────────────────

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function axisTone(score: number): 'green' | 'amber' | 'red' {
  if (score >= 75) return 'green';
  if (score >= 50) return 'amber';
  return 'red';
}

const AXIS_PILL_TONE: Record<'green' | 'amber' | 'red', string> = {
  green: 'bg-score-green-muted text-score-green-bold',
  amber: 'bg-score-amber-muted text-score-amber-bold',
  red: 'bg-score-red-muted text-score-red-bold',
};

const STATUS_PILL: Record<
  'overdue' | 'due-soon' | 'up-to-date',
  { label: string; dot: string }
> = {
  overdue: { label: 'Overdue', dot: 'bg-score-red' },
  'due-soon': { label: 'Needs attention', dot: 'bg-score-amber' },
  'up-to-date': { label: 'On track', dot: 'bg-score-green' },
};

interface ClientAttentionListProps {
  queue: ReassessmentItem[];
  search?: string;
  onOpenClient: (name: string) => void;
}

function ClientAttentionList({ queue, search, onOpenClient }: ClientAttentionListProps) {
  const filtered = queue
    .filter((item) => item.status === 'overdue' || item.status === 'due-soon')
    .filter((item) => {
      const s = search?.trim().toLowerCase();
      return !s || item.clientName.toLowerCase().includes(s);
    })
    .slice(0, 6);

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
        <CircleCheck className="h-7 w-7 text-score-green" />
        <p className="text-sm font-semibold text-foreground">All clients are on track</p>
        <p className="text-xs text-muted-foreground">Nothing due right now.</p>
      </div>
    );
  }

  return (
    <ul className="px-4">
      {filtered.map((item, idx) => (
        <ClientAttentionRow
          key={item.id}
          item={item}
          isLast={idx === filtered.length - 1}
          onOpen={() => onOpenClient(item.clientName)}
        />
      ))}
    </ul>
  );
}

interface ClientAttentionRowProps {
  item: ReassessmentItem;
  isLast: boolean;
  onOpen: () => void;
}

function ClientAttentionRow({ item, isLast, onOpen }: ClientAttentionRowProps) {
  const tone = axisTone(item.overallScore);
  const status = STATUS_PILL[item.status as 'overdue' | 'due-soon' | 'up-to-date'] ?? STATUS_PILL['up-to-date'];
  const displayName = formatClientDisplayName(item.clientName);
  const sub = item.statusReason || `Last assessed ${item.daysSinceAssessment} day${item.daysSinceAssessment === 1 ? '' : 's'} ago`;

  return (
    <li
      className={cn(
        'grid items-center gap-3.5 py-2.5',
        'grid-cols-[36px_1fr_auto_auto_auto]',
        !isLast && 'border-b border-[hsl(var(--background))]',
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-[12px] font-semibold text-muted-foreground">
        {initials(item.clientName)}
      </div>
      <div className="min-w-0">
        <div className="truncate text-[14px] font-semibold tracking-[-0.005em] text-foreground">
          {displayName}
        </div>
        <div className="mt-0.5 truncate text-[12px] text-muted-foreground">{sub}</div>
      </div>
      {item.overallScore > 0 ? (
        <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold', AXIS_PILL_TONE[tone])}>
          AXIS {item.overallScore}
        </span>
      ) : (
        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          No data
        </span>
      )}
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-foreground-secondary">
        <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} aria-hidden />
        {status.label}
      </span>
      <Button
        variant="outline"
        onClick={onOpen}
        className="h-8 rounded-full px-3 text-[12px] font-semibold"
      >
        Open
      </Button>
    </li>
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
