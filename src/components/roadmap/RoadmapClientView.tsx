import { useMemo } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  Dumbbell,
  Heart,
  Scale,
  Sun,
  Target,
  Zap,
} from 'lucide-react';
import type {
  RoadmapCategory,
  RoadmapItem,
  RoadmapItemStatus,
  RoadmapPhase,
  Trackable,
} from '@/lib/roadmap/types';
import { PHASE_NARRATIVES, URGENCY_CLIENT_LABELS } from '@/lib/roadmap/types';
import { buildJourneySummaryContent } from '@/lib/roadmap/journeySummary';
import { groupPhaseItemsByPillar, CATEGORY_ORDER } from '@/lib/roadmap/sortPhaseItems';
import { getPillarLabel } from '@/constants/pillars';
import {
  PillarScoreBadge,
} from '@/components/reports/PillarScoreBadge';
import type { PillarKey } from '@/lib/reports/radarData';
import { TrackableBar } from './TrackableBar';
import { cn } from '@/lib/utils';

const PHASES: RoadmapPhase[] = ['foundation', 'development', 'performance'];

const CATEGORY_TO_PILLAR: Record<RoadmapCategory, PillarKey | null> = {
  bodyComp: 'bodyComp',
  movementQuality: 'movementQuality',
  strength: 'strength',
  cardio: 'cardio',
  lifestyle: 'lifestyle',
  general: null,
};

const CATEGORY_ICON: Record<RoadmapCategory, typeof Scale> = {
  bodyComp: Scale,
  strength: Dumbbell,
  cardio: Heart,
  movementQuality: Zap,
  lifestyle: Sun,
  general: Target,
};

interface RoadmapClientViewProps {
  clientName: string;
  summary?: string;
  items: RoadmapItem[];
  organizationName?: string;
  activePhase?: RoadmapPhase;
  clientGoals?: string[];
  mode?: 'client' | 'coach';
  showEditButton?: boolean;
  /** When true, parent owns max-width / horizontal padding. */
  embedded?: boolean;
}

export default function RoadmapClientView({
  clientName,
  summary,
  items,
  organizationName,
  activePhase = 'foundation',
  clientGoals,
  mode = 'client',
  embedded = false,
}: RoadmapClientViewProps) {
  const total = items.length;
  const achieved = items.filter((i) => i.status === 'achieved').length;
  const inProgress = items.filter((i) => i.status === 'in_progress').length;
  const pct = total === 0 ? 0 : Math.round((achieved / total) * 100);
  const firstName = clientName.split(' ')[0] || clientName;

  const grouped = useMemo(() => {
    const map = new Map<RoadmapPhase, RoadmapItem[]>();
    for (const phase of PHASES) map.set(phase, []);
    for (const item of items) map.get(item.phase)?.push(item);
    return map;
  }, [items]);

  const populatedPhases = PHASES.filter((p) => (grouped.get(p)?.length ?? 0) > 0);

  const journeyContent = useMemo(
    () =>
      buildJourneySummaryContent({
        clientName,
        clientGoals: clientGoals ?? [],
        itemCount: total,
        phaseCount: populatedPhases.length,
        mode,
      }),
    [clientName, clientGoals, total, populatedPhases.length, mode],
  );

  const rootClass = embedded ? 'space-y-5 py-2' : 'max-w-2xl mx-auto px-4 py-6 space-y-5';
  const summaryTrimmed = summary?.trim();

  return (
    <div className={rootClass}>
      <HeroCard
        firstName={firstName}
        organizationName={organizationName}
        clientGoals={clientGoals ?? []}
        total={total}
        achieved={achieved}
        inProgress={inProgress}
        pct={pct}
        activePhase={activePhase}
      />

      {summaryTrimmed ? <CoachSummaryCard summary={summaryTrimmed} /> : null}

      <JourneyIntroCard
        intro={journeyContent.intro}
        sessionExpectation={journeyContent.sessionExpectation}
        phaseBlurbs={journeyContent.phaseBlurbs}
        allMetricsActive={journeyContent.allMetricsActive}
      />

      <PhaseProgressStrip
        items={items}
        activePhase={activePhase}
        grouped={grouped}
      />

      <PhaseSections populatedPhases={populatedPhases} grouped={grouped} activePhase={activePhase} />

      <Footer />
    </div>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────

interface HeroCardProps {
  firstName: string;
  organizationName?: string;
  clientGoals: string[];
  total: number;
  achieved: number;
  inProgress: number;
  pct: number;
  activePhase: RoadmapPhase;
}

function HeroCard({
  firstName,
  organizationName,
  clientGoals,
  total,
  achieved,
  inProgress,
  pct,
  activePhase,
}: HeroCardProps) {
  return (
    <section className="rounded-[28px] border border-border bg-card p-6 shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_14px_rgba(15,15,15,0.04)] sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-3">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <AxisDiamondMark />
            Your ARC™
          </p>
          <h1 className="text-3xl font-bold tracking-[-0.020em] text-foreground sm:text-4xl">
            Hi {firstName}, here's your plan
          </h1>
          {organizationName ? (
            <p className="text-[12px] text-foreground-secondary">
              Prepared by {organizationName}
            </p>
          ) : null}

          {clientGoals.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-bold uppercase tracking-[0.10em] text-muted-foreground">
                Your goals
              </span>
              {clientGoals.map((g) => (
                <span
                  key={g}
                  className="inline-flex items-center rounded-full border border-border bg-card-elevated px-2.5 py-0.5 text-[12px] font-semibold text-foreground"
                >
                  {prettifyGoal(g)}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col items-start gap-3 lg:items-end">
          <ArcPhasePill phase={activePhase} />

          <div className="flex items-baseline gap-1 lg:text-right">
            <span className="text-5xl font-bold leading-none tracking-[-0.025em] tabular-nums text-foreground">
              {pct}
              <span className="text-xl font-semibold text-muted-foreground">%</span>
            </span>
          </div>
          <p className="text-[12px] text-muted-foreground lg:text-right">
            {total === 0
              ? 'No milestones yet'
              : `${achieved} of ${total} milestone${total === 1 ? '' : 's'} achieved${
                  inProgress > 0 ? ` · ${inProgress} in progress` : ''
                }`}
          </p>
        </div>
      </div>
    </section>
  );
}

function ArcPhasePill({ phase }: { phase: RoadmapPhase }) {
  const { title } = PHASE_NARRATIVES[phase];
  const cls =
    phase === 'foundation'
      ? 'bg-score-green-light text-score-green-fg'
      : phase === 'development'
        ? 'bg-score-amber-light text-score-amber-fg'
        : 'bg-score-red-light text-score-red-fg';
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold', cls)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      You're here: {title}
    </span>
  );
}

// ─── Coach summary card ──────────────────────────────────────────────

function CoachSummaryCard({ summary }: { summary: string }) {
  return (
    <section className="rounded-[24px] border border-border bg-gradient-to-b from-card-elevated to-muted/30 p-6 shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_14px_rgba(15,15,15,0.04)]">
      <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        <AxisDiamondMark />
        From your coach
      </p>
      <p className="max-w-[72ch] text-[14px] font-medium leading-[1.6] tracking-[-0.005em] text-foreground-secondary">
        {summary}
      </p>
    </section>
  );
}

// ─── Journey intro ───────────────────────────────────────────────────

function JourneyIntroCard({
  intro,
  sessionExpectation,
  phaseBlurbs,
  allMetricsActive,
}: {
  intro: string;
  sessionExpectation?: string;
  phaseBlurbs: { phase: RoadmapPhase; title: string; blurb: string }[];
  allMetricsActive: string;
}) {
  return (
    <section className="rounded-[24px] border border-border bg-card p-6 shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_14px_rgba(15,15,15,0.04)]">
      <p className="text-sm leading-relaxed text-foreground">{intro}</p>
      {sessionExpectation ? (
        <p className="mt-2 text-xs text-foreground-secondary">{sessionExpectation}</p>
      ) : null}
      <div className="mt-4 space-y-2 border-t border-border pt-4">
        {phaseBlurbs.map(({ phase, title, blurb }) => (
          <div key={phase} className="text-xs leading-relaxed">
            <span className="font-semibold text-foreground">{title}:</span>{' '}
            <span className="text-foreground-secondary">{blurb}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 border-t border-border pt-3 text-[11px] text-foreground-secondary">
        {allMetricsActive}
      </p>
    </section>
  );
}

// ─── Phase progress strip ────────────────────────────────────────────

function PhaseProgressStrip({
  items,
  activePhase,
  grouped,
}: {
  items: RoadmapItem[];
  activePhase: RoadmapPhase;
  grouped: Map<RoadmapPhase, RoadmapItem[]>;
}) {
  if (items.length === 0) return null;
  return (
    <section className="rounded-[24px] border border-border bg-card p-6 shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_14px_rgba(15,15,15,0.04)]">
      <p className="mb-4 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        <Target className="h-3.5 w-3.5" />
        Phase progress
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        {PHASES.map((phase, i) => {
          const phaseItems = grouped.get(phase) ?? [];
          const total = phaseItems.length;
          const achieved = phaseItems.filter((it) => it.status === 'achieved').length;
          const pct = total === 0 ? 0 : Math.round((achieved / total) * 100);
          const isActive = phase === activePhase;
          const isComplete = total > 0 && achieved === total;

          return (
            <div
              key={phase}
              className={cn(
                'rounded-2xl border bg-card-elevated p-4 transition',
                isActive ? 'border-foreground/15 shadow-[0_2px_8px_rgba(15,15,15,0.05)]' : 'border-border',
              )}
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Phase {i + 1}
                </p>
                {isActive ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] font-bold text-foreground">
                    you're here
                  </span>
                ) : isComplete ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-score-green-fg" />
                ) : null}
              </div>
              <p className="mt-1 text-[15px] font-bold text-foreground">{PHASE_NARRATIVES[phase].title}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {total === 0 ? 'No milestones' : `${achieved}/${total} achieved · ${pct}%`}
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-[width] duration-700',
                    isComplete ? 'bg-score-green' : isActive ? 'bg-foreground' : 'bg-muted-foreground/40',
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Phase sections ──────────────────────────────────────────────────

function PhaseSections({
  populatedPhases,
  grouped,
  activePhase,
}: {
  populatedPhases: RoadmapPhase[];
  grouped: Map<RoadmapPhase, RoadmapItem[]>;
  activePhase: RoadmapPhase;
}) {
  if (populatedPhases.length === 0) {
    return (
      <section className="rounded-[24px] border border-dashed border-border bg-card p-8 text-center">
        <p className="text-sm font-semibold text-foreground">Your milestones will appear here.</p>
        <p className="mt-1 text-xs text-foreground-secondary">
          Your coach is putting together your plan.
        </p>
      </section>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      {populatedPhases.map((phase, idx) => (
        <PhaseSection
          key={phase}
          phase={phase}
          phaseIndex={idx}
          items={grouped.get(phase) ?? []}
          isActive={phase === activePhase}
        />
      ))}
    </div>
  );
}

function PhaseSection({
  phase,
  phaseIndex,
  items,
  isActive,
}: {
  phase: RoadmapPhase;
  phaseIndex: number;
  items: RoadmapItem[];
  isActive: boolean;
}) {
  const meta = PHASE_NARRATIVES[phase];
  const byPillar = useMemo(() => groupPhaseItemsByPillar(items), [items]);
  const orderedCategories = useMemo(
    () =>
      (Object.entries(CATEGORY_ORDER) as [RoadmapCategory, number][])
        .sort(([, a], [, b]) => a - b)
        .map(([cat]) => cat),
    [],
  );

  return (
    <section
      className={cn(
        'rounded-[24px] border bg-card p-6 shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_14px_rgba(15,15,15,0.04)] sm:p-7',
        isActive ? 'border-foreground/15' : 'border-border',
      )}
    >
      <header className="mb-5 flex items-baseline justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Phase {phaseIndex + 1}
          </p>
          <h2 className="mt-0.5 text-xl font-bold tracking-[-0.014em] text-foreground sm:text-2xl">
            {meta.title}
          </h2>
          <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-foreground-secondary">
            {meta.subtitle}
          </p>
        </div>
        {isActive ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-foreground/5 px-2.5 py-0.5 text-[11px] font-bold text-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
            you're here
          </span>
        ) : null}
      </header>

      <div className="flex flex-col gap-5">
        {orderedCategories.map((category) => {
          const pillarItems = byPillar.get(category);
          if (!pillarItems || pillarItems.length === 0) return null;
          return <PillarGroup key={category} category={category} items={pillarItems} />;
        })}
      </div>
    </section>
  );
}

function PillarGroup({ category, items }: { category: RoadmapCategory; items: RoadmapItem[] }) {
  const pillarKey = CATEGORY_TO_PILLAR[category];
  const Icon = CATEGORY_ICON[category];
  const label = getPillarLabel(category, 'short');

  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2">
        {pillarKey ? (
          <PillarScoreBadge pillar={pillarKey} score={100} size={28} />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-card-elevated">
            <Icon className="h-3.5 w-3.5 text-foreground-secondary" />
          </span>
        )}
        <span className="text-[11px] font-bold uppercase tracking-[0.10em] text-muted-foreground">
          {label}
        </span>
        <span className="text-[11px] text-muted-foreground/70">
          {items.length} milestone{items.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        {items.map((item) => (
          <MilestoneCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

// ─── Milestone card ──────────────────────────────────────────────────

const STATUS_META: Record<
  RoadmapItemStatus,
  { icon: typeof Circle; tone: 'green' | 'amber' | 'muted' | 'foreground'; label: string }
> = {
  not_started: { icon: Circle, tone: 'muted', label: 'Not started' },
  in_progress: { icon: Clock, tone: 'amber', label: 'In progress' },
  achieved: { icon: CheckCircle2, tone: 'green', label: 'Achieved' },
  adjusted: { icon: ArrowRight, tone: 'foreground', label: 'Adjusted' },
};

const STATUS_TONE_CHIP: Record<'green' | 'amber' | 'muted' | 'foreground', string> = {
  green: 'bg-score-green-light text-score-green-fg',
  amber: 'bg-score-amber-light text-score-amber-fg',
  muted: 'bg-muted text-muted-foreground',
  foreground: 'bg-foreground/5 text-foreground',
};

const STATUS_TONE_ICON: Record<'green' | 'amber' | 'muted' | 'foreground', string> = {
  green: 'text-score-green',
  amber: 'text-score-amber',
  muted: 'text-muted-foreground',
  foreground: 'text-foreground',
};

function MilestoneCard({ item }: { item: RoadmapItem }) {
  const meta = STATUS_META[item.status];
  const Icon = meta.icon;
  const isAchieved = item.status === 'achieved';
  const trackable: Trackable | undefined = item.trackables?.[0];

  return (
    <article
      className={cn(
        'rounded-2xl border bg-card-elevated p-4',
        isAchieved && 'border-score-green-light bg-score-green-light/30',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-card',
            isAchieved ? 'border-score-green' : 'border-border',
          )}
        >
          <Icon className={cn('h-3.5 w-3.5', STATUS_TONE_ICON[meta.tone])} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p
              className={cn(
                'text-sm font-bold tracking-[-0.005em]',
                isAchieved ? 'text-score-green-bold' : 'text-foreground',
              )}
            >
              {item.title}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {item.urgency ? (
                <span className="inline-flex items-center rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-foreground-secondary">
                  {URGENCY_CLIENT_LABELS[item.urgency]}
                </span>
              ) : null}
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em]',
                  STATUS_TONE_CHIP[meta.tone],
                )}
              >
                {meta.label}
              </span>
            </div>
          </div>
          {item.description ? (
            <p className="mt-1 max-w-[68ch] text-[13px] leading-relaxed text-foreground-secondary">
              {item.description}
            </p>
          ) : null}
          {trackable ? (
            <div className="mt-3 max-w-[420px]">
              <TrackableBar trackable={trackable} compact />
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="space-y-1 pt-2 text-center">
      <p className="text-[10px] text-foreground-secondary">
        Your ARC™ was created by your coach and is updated as you progress.
      </p>
      <p className="text-[10px] text-foreground-secondary">
        Speak to your coach if you have any questions about your plan.
      </p>
    </footer>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function prettifyGoal(g: string): string {
  return g
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function AxisDiamondMark({ size = 11 }: { size?: number }) {
  const c = size / 2;
  const inner = size * 0.32;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <path
        d={`M ${c} 0 L ${size} ${c} L ${c} ${size} L 0 ${c} Z`}
        className="fill-foreground"
        opacity={0.92}
      />
      <path
        d={`M ${c} ${c - inner} L ${c + inner} ${c} L ${c} ${c + inner} L ${c - inner} ${c} Z`}
        className="fill-background"
        opacity={0.22}
      />
    </svg>
  );
}
