/**
 * ARC™ tab — coach console for the client's plan.
 *
 * Hero (status + AXIS goal) → Coach Summary → Phase progress strip →
 * grouped milestone cards. Editing / sending / sharing remains on the
 * dedicated full ARC™ page; this surface is the read-and-act view that
 * matches the rest of the new client console.
 */

import { useMemo, useState } from 'react';
import { Link, useOutletContext, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  Edit3,
  Heart,
  Loader2,
  Map as MapIcon,
  Plus,
  Scale,
  Send,
  Sun,
  Target,
  X,
  Zap,
  Dumbbell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRoadmapData } from '@/hooks/useRoadmapData';
import {
  PHASE_NARRATIVES,
  URGENCY_CLIENT_LABELS,
  type RoadmapItem,
  type RoadmapItemStatus,
  type RoadmapPhase,
  type RoadmapCategory,
  type Trackable,
} from '@/lib/roadmap/types';
import { TrackableBar } from '@/components/roadmap/TrackableBar';
import { RoadmapEditor } from '@/components/roadmap/RoadmapEditor';
import { computeScores } from '@/lib/scoring';
import {
  generateRoadmapBlocks,
  getAllPossibleBlocksForClient,
} from '@/lib/roadmap/generateBlocks';
import { PillarScoreBadge } from '@/components/reports/PillarScoreBadge';
import type { PillarKey } from '@/lib/reports/radarData';
import { groupPhaseItemsByPillar, CATEGORY_ORDER } from '@/lib/roadmap/sortPhaseItems';
import { getPillarLabel } from '@/constants/pillars';
import type { ClientDetailOutletContext } from './ClientDetailLayout';
import { cn } from '@/lib/utils';

// ─── Constants ───────────────────────────────────────────────────────

const PHASES: RoadmapPhase[] = ['foundation', 'development', 'performance'];

/** Map roadmap categories to pillar badge keys. `general` uses the Target icon. */
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

// ─── Page ────────────────────────────────────────────────────────────

export default function ClientRoadmapTab() {
  const navigate = useNavigate();
  const { clientName, displayClientName, assessments, snapshots, currentAssessment, isRoadmapStale } =
    useOutletContext<ClientDetailOutletContext>();
  const effectiveName = clientName ?? '';

  const {
    items,
    loading,
    needsCreation,
    summary,
    clientGoals,
    activePhase,
    saving,
    generatedBlocks,
    allPossibleBlocks,
    handleSummaryChange,
    handleItemsChange,
    handleShare,
    shareState,
  } = useRoadmapData(effectiveName);

  // Fallback block computation — when the hook's loadLatestAssessment
  // can't find the client (different lookup path than the rest of the
  // client-detail flow), compute blocks directly from the outlet's
  // currentAssessment so coaches always have material to populate from.
  const fallbackBlocks = useMemo(() => {
    if (generatedBlocks.length > 0 || allPossibleBlocks.length > 0) {
      return { generated: generatedBlocks, all: allPossibleBlocks };
    }
    if (!currentAssessment?.formData) {
      return { generated: [], all: [] };
    }
    try {
      const scores = computeScores(currentAssessment.formData);
      return {
        generated: generateRoadmapBlocks(scores, currentAssessment.formData),
        all: getAllPossibleBlocksForClient(scores, currentAssessment.formData),
      };
    } catch {
      return { generated: [], all: [] };
    }
  }, [generatedBlocks, allPossibleBlocks, currentAssessment]);

  // Inline edit mode — keeps the user on the ClientDetailLayout chrome
  // (breadcrumb + tabs) instead of navigating off to AppShell.
  const [editing, setEditing] = useState(false);

  const editPath = `/coach/clients/${encodeURIComponent(effectiveName)}/roadmap`;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Loading ARC™…</p>
      </div>
    );
  }

  // "No assessment yet" must check every signal — the legacy `assessments`
  // collection misses clients whose data lives only as `snapshots` or
  // whose latest run is exposed via `currentAssessment`. Treat any of
  // these as "they've done an assessment".
  const hasAnyAssessment =
    assessments.length > 0 || snapshots.length > 0 || currentAssessment != null;
  if (!hasAnyAssessment) {
    return (
      <EmptyState
        title="Complete an assessment first"
        body="An ARC™ is built from the latest assessment + the client's stated goals. Run a full assessment to unlock plan generation."
        cta={null}
      />
    );
  }

  // No ARC document exists yet — drop the coach into the full builder
  // page (separate route owns initial creation flow).
  if (needsCreation && items.length === 0) {
    return (
      <EmptyState
        title="No ARC™ yet"
        body="Build the first plan from the latest assessment + the client's stated goals. The ARC™ surfaces what specifically should be tracked to take this client from where they are to where they want to be."
        cta={
          <Button size="sm" className="gap-1.5 rounded-full" onClick={() => navigate(editPath)}>
            <Plus className="h-4 w-4" />
            Build ARC™
          </Button>
        }
      />
    );
  }

  // Inline editing — keeps the coach inside the polished tab chrome.
  if (editing) {
    return (
      <div className="space-y-5">
        <ArcEditingHeader
          clientName={displayClientName || effectiveName}
          itemCount={items.length}
          saving={Boolean(saving)}
          shareState={shareState}
          onDone={() => setEditing(false)}
          onSend={handleShare}
        />
        <section className="rounded-[28px] border border-border bg-card p-6 shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_14px_rgba(15,15,15,0.04)] sm:p-7">
          <RoadmapEditor
            summary={summary}
            items={items}
            onSummaryChange={handleSummaryChange}
            onItemsChange={handleItemsChange}
            saving={saving}
            generatedBlocks={fallbackBlocks.generated}
            allPossibleBlocks={fallbackBlocks.all}
            clientGoals={clientGoals}
          />
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ArcHeroStrip
        clientName={displayClientName || effectiveName}
        items={items}
        clientGoals={clientGoals}
        activePhase={activePhase}
        isStale={isRoadmapStale}
        onEdit={() => setEditing(true)}
      />

      {summary?.trim() ? (
        <ArcSummaryCard summary={summary.trim()} />
      ) : null}

      <ArcPhaseProgressStrip items={items} activePhase={activePhase} />

      <ArcPhases items={items} activePhase={activePhase} />
    </div>
  );
}

// ─── Editing header (inline) ─────────────────────────────────────────

function ArcEditingHeader({
  clientName,
  itemCount,
  saving,
  shareState,
  onDone,
  onSend,
}: {
  clientName: string;
  itemCount: number;
  saving: boolean;
  shareState: 'idle' | 'copied';
  onDone: () => void;
  onSend: () => void;
}) {
  return (
    <section className="rounded-[24px] border border-border bg-card px-6 py-5 shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_14px_rgba(15,15,15,0.04)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <Edit3 className="h-3.5 w-3.5" />
            Editing ARC™
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-[-0.014em] text-foreground sm:text-2xl">
            {clientName.split(' ')[0]}'s plan · {itemCount} milestone{itemCount === 1 ? '' : 's'}
          </h2>
          {saving ? (
            <p className="mt-1 inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onDone} variant="outline" size="sm" className="h-9 gap-1.5 rounded-full">
            <X className="h-3.5 w-3.5" />
            Done editing
          </Button>
          <Button onClick={onSend} size="sm" className="h-9 gap-1.5 rounded-full" disabled={itemCount === 0}>
            {shareState === 'copied' ? (
              <>
                <Check className="h-3.5 w-3.5" /> Link copied
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" /> Send to client
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────

interface ArcHeroStripProps {
  clientName: string;
  items: RoadmapItem[];
  clientGoals: string[];
  activePhase: RoadmapPhase;
  isStale: boolean;
  onEdit: () => void;
}

function ArcHeroStrip({ clientName, items, clientGoals, activePhase, isStale, onEdit }: ArcHeroStripProps) {
  const total = items.length;
  const achieved = items.filter((i) => i.status === 'achieved').length;
  const inProgress = items.filter((i) => i.status === 'in_progress').length;
  const pct = total === 0 ? 0 : Math.round((achieved / total) * 100);
  const firstName = clientName.split(' ')[0];

  return (
    <section className="rounded-[28px] border border-border bg-card p-7 shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_14px_rgba(15,15,15,0.04)] sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-3">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <AxisDiamondMark />
            ARC™ — Adaptive Recovery Companion
          </p>
          <h2 className="text-3xl font-bold tracking-[-0.020em] text-foreground sm:text-4xl">
            {firstName}'s plan
          </h2>
          <p className="max-w-[60ch] text-sm leading-relaxed text-foreground-secondary">
            The metrics specifically tracked for this client based on their assessment + stated goals.
            Milestones surface "wins" along the way to the headline goal.
          </p>

          {clientGoals.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-bold uppercase tracking-[0.10em] text-muted-foreground">
                Client goals
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

        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-2">
            <ArcPhasePill phase={activePhase} />
            {isStale ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-score-amber-light px-2.5 py-0.5 text-[11px] font-bold text-score-amber-fg">
                <AlertTriangle className="h-3 w-3" /> drift
              </span>
            ) : null}
          </div>

          <div className="flex items-baseline gap-1 text-right">
            <span className="text-5xl font-bold leading-none tracking-[-0.025em] tabular-nums text-foreground">
              {pct}
              <span className="text-xl font-semibold text-muted-foreground">%</span>
            </span>
          </div>
          <p className="text-[12px] text-muted-foreground">
            {achieved} of {total} milestones achieved
            {inProgress > 0 ? ` · ${inProgress} in progress` : ''}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={onEdit} variant="outline" size="sm" className="h-9 gap-1.5 rounded-full">
              <Edit3 className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button onClick={onEdit} size="sm" className="h-9 gap-1.5 rounded-full">
              <Send className="h-3.5 w-3.5" />
              Edit or send ARC™
            </Button>
          </div>
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
      Phase: {title}
    </span>
  );
}

// ─── Summary card (coach-written narrative) ──────────────────────────

function ArcSummaryCard({ summary }: { summary: string }) {
  return (
    <section className="rounded-[24px] border border-border bg-gradient-to-b from-card-elevated to-muted/30 p-6 shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_14px_rgba(15,15,15,0.04)]">
      <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        <AxisDiamondMark />
        Coach Summary
      </p>
      <p className="max-w-[72ch] text-[14px] font-medium leading-[1.6] tracking-[-0.005em] text-foreground-secondary">
        {summary}
      </p>
    </section>
  );
}

// ─── Phase progress strip ────────────────────────────────────────────

function ArcPhaseProgressStrip({ items, activePhase }: { items: RoadmapItem[]; activePhase: RoadmapPhase }) {
  const grouped = useMemo(() => {
    const map = new Map<RoadmapPhase, RoadmapItem[]>();
    for (const phase of PHASES) map.set(phase, []);
    for (const item of items) map.get(item.phase)?.push(item);
    return map;
  }, [items]);

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
                    active
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

// ─── Phases + milestones ─────────────────────────────────────────────

function ArcPhases({ items, activePhase }: { items: RoadmapItem[]; activePhase: RoadmapPhase }) {
  const grouped = useMemo(() => {
    const map = new Map<RoadmapPhase, RoadmapItem[]>();
    for (const phase of PHASES) map.set(phase, []);
    for (const item of items) map.get(item.phase)?.push(item);
    return map;
  }, [items]);

  const populatedPhases = PHASES.filter((p) => (grouped.get(p)?.length ?? 0) > 0);

  return (
    <div className="flex flex-col gap-5">
      {populatedPhases.map((phase, idx) => (
        <ArcPhaseSection
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

function ArcPhaseSection({
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
  const orderedCategories = useMemo(() => {
    return (Object.entries(CATEGORY_ORDER) as [RoadmapCategory, number][])
      .sort(([, a], [, b]) => a - b)
      .map(([cat]) => cat);
  }, []);

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
          <h3 className="mt-0.5 text-xl font-bold tracking-[-0.014em] text-foreground sm:text-2xl">
            {meta.title}
          </h3>
          <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-foreground-secondary">
            {meta.subtitle}
          </p>
        </div>
        {isActive ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-foreground/5 px-2.5 py-0.5 text-[11px] font-bold text-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
            active
          </span>
        ) : null}
      </header>

      <div className="flex flex-col gap-5">
        {orderedCategories.map((category) => {
          const pillarItems = byPillar.get(category);
          if (!pillarItems || pillarItems.length === 0) return null;
          return (
            <ArcPillarGroup key={category} category={category} items={pillarItems} />
          );
        })}
      </div>
    </section>
  );
}

function ArcPillarGroup({ category, items }: { category: RoadmapCategory; items: RoadmapItem[] }) {
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
          <ArcMilestoneCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

// ─── Milestone card ──────────────────────────────────────────────────

const STATUS_META: Record<RoadmapItemStatus, { icon: typeof Circle; tone: 'green' | 'amber' | 'muted' | 'foreground'; label: string }> = {
  not_started: { icon: Circle,        tone: 'muted',      label: 'Not started' },
  in_progress: { icon: Clock,         tone: 'amber',      label: 'In progress' },
  achieved:    { icon: CheckCircle2,  tone: 'green',      label: 'Achieved' },
  adjusted:    { icon: ArrowRight,    tone: 'foreground', label: 'Adjusted' },
};

const STATUS_TONE_CHIP: Record<'green' | 'amber' | 'muted' | 'foreground', string> = {
  green:      'bg-score-green-light text-score-green-fg',
  amber:      'bg-score-amber-light text-score-amber-fg',
  muted:      'bg-muted text-muted-foreground',
  foreground: 'bg-foreground/5 text-foreground',
};

const STATUS_TONE_ICON: Record<'green' | 'amber' | 'muted' | 'foreground', string> = {
  green:      'text-score-green',
  amber:      'text-score-amber',
  muted:      'text-muted-foreground',
  foreground: 'text-foreground',
};

function ArcMilestoneCard({ item }: { item: RoadmapItem }) {
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
            <p className={cn('text-sm font-bold tracking-[-0.005em]', isAchieved ? 'text-score-green-bold' : 'text-foreground')}>
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

// ─── Empty / loading / error states ─────────────────────────────────

function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-dashed border-border bg-card p-10 text-center shadow-[0_1px_2px_rgba(15,15,15,0.04)]">
      <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-card-elevated">
        <MapIcon className="h-5 w-5 text-foreground-secondary" />
      </span>
      <h2 className="text-lg font-bold tracking-[-0.014em] text-foreground sm:text-xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-[44ch] text-sm leading-relaxed text-foreground-secondary">
        {body}
      </p>
      {cta ? <div className="mt-5 inline-flex">{cta}</div> : null}
      <div className="mt-3 inline-flex">
        <Link
          to="../report"
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-foreground hover:underline"
        >
          View report <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </section>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

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
