/**
 * Client Console — Overview tab.
 *
 * The coach's command centre for a single client. Hero / Journey /
 * Attention / Pillar snapshots / Quick actions / Activity timeline.
 *
 * Journey is the headline data viz: STARTING POINT → CURRENT → GOAL,
 * each rendered with a compact pillar radar snapshot. The trend chart underneath
 * shows the longitudinal AXIS score over all assessments.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  Eye,
  Heart,
  Plus,
  Scale,
  Sun,
  Trophy,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UI_CLIENT_DETAIL } from '@/constants/ui';
import { computeScores, type ScoreSummary, type ScoreCategory } from '@/lib/scoring';
import { determineArchetype } from '@/lib/clientArchetypes';
import { MiniPillarRadar } from '@/components/reports/MiniPillarRadar';
import { PillarScoreBadge } from '@/components/reports/PillarScoreBadge';
import type { PillarKey } from '@/lib/reports/radarData';
import type { Timestamp } from 'firebase/firestore';
import type { FormData } from '@/contexts/FormContext';
import { useAuth } from '@/hooks/useAuth';
import { getCoachNotes } from '@/services/coachNotes';
import type { CoachNotesDoc } from '@/lib/coachNotes/types';
import type { ClientDetailOutletContext } from './ClientDetailLayout';
import { ClientOverviewEmpty, type ClientOverviewEmptyVariant } from './ClientOverviewEmpty';
import {
  hasAssessmentSnapshotHistory,
  pillarDisplayScore,
  shouldShowClientArchetype,
  shouldShowCoachAxisDashboard,
} from '@/lib/client/clientAxisOverview';
import { cn } from '@/lib/utils';

function buildClientPath(name: string, sub?: string): string {
  const base = `/dashboard/clients/${encodeURIComponent(name)}`;
  return sub ? `${base}/${sub}` : base;
}

// ─── Pillar canonical order (matches the radar chart) ────────────────

const PILLAR_ORDER: { id: PillarKey; label: string; short: string; icon: typeof Scale }[] = [
  { id: 'bodyComp',        label: 'Body Composition',     short: 'Body',      icon: Scale },
  { id: 'strength',        label: 'Functional Strength',  short: 'Strength',  icon: Dumbbell },
  { id: 'cardio',          label: 'Metabolic Fitness',    short: 'Cardio',    icon: Heart },
  { id: 'movementQuality', label: 'Movement Quality',     short: 'Movement',  icon: Zap },
  { id: 'lifestyle',       label: 'Lifestyle Factors',    short: 'Lifestyle', icon: Sun },
];

// Pillars whose baseline-completeness lives on the profile (matches the
// existing TRACKED_PILLARS shape so the "Start X" buttons keep working).
const BASELINE_PILLARS: { id: 'bodycomp' | 'posture' | 'fitness' | 'strength' | 'lifestyle'; label: string }[] = [
  { id: 'bodycomp',  label: 'Body Comp' },
  { id: 'posture',   label: 'Posture' },
  { id: 'fitness',   label: 'Fitness' },
  { id: 'strength',  label: 'Strength' },
  { id: 'lifestyle', label: 'Lifestyle' },
];

// ─── Helpers ─────────────────────────────────────────────────────────

function scoresToRadarArray(scores: ScoreSummary | null | undefined): number[] {
  if (!scores) return [0, 0, 0, 0, 0];
  return PILLAR_ORDER.map(({ id }) => scores.categories?.find((c) => c.id === id)?.score ?? 0);
}

function timestampToDate(ts: Timestamp | null | undefined): Date | null {
  if (!ts) return null;
  // Firestore Timestamp has toDate(); fall back to constructor for plain objects.
  try {
    return ts.toDate();
  } catch {
    return null;
  }
}

function fmtShort(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysAgo(d: Date | null): number | null {
  if (!d) return null;
  const ms = Date.now() - d.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

function relativeWhen(d: Date | null): string {
  const days = daysAgo(d);
  if (days == null) return '—';
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
}

function tone(score: number): 'green' | 'amber' | 'red' | 'muted' {
  if (score >= 75) return 'green';
  if (score >= 50) return 'amber';
  if (score > 0) return 'red';
  return 'muted';
}

const TONE_TEXT: Record<'green' | 'amber' | 'red' | 'muted', string> = {
  green: 'text-score-green',
  amber: 'text-score-amber',
  red: 'text-score-red',
  muted: 'text-foreground',
};

// ─── Page component ──────────────────────────────────────────────────

export default function ClientOverview() {
  const ctx = useOutletContext<ClientDetailOutletContext>();
  const navigate = useNavigate();
  const { effectiveOrgId } = useAuth();
  const [coachNotes, setCoachNotes] = useState<CoachNotesDoc | null>(null);
  const {
    clientName,
    displayClientName,
    currentAssessment,
    categoryBreakdown,
    categoryChanges,
    stats,
    handleNewAssessment,
    snapshots,
    profile,
  } = ctx;

  // ─── Compute derived state ───────────────────────────────────────

  const scores = useMemo(
    () => (currentAssessment ? computeScores(currentAssessment.formData) : null),
    [currentAssessment],
  );

  const showCoachAxis = useMemo(
    () =>
      shouldShowCoachAxisDashboard({
        snapshots: snapshots ?? [],
        remoteIntakePending: profile?.remoteIntakePending,
        remoteIntakeAwaitingStudio: profile?.remoteIntakeAwaitingStudio,
      }),
    [snapshots, profile?.remoteIntakePending, profile?.remoteIntakeAwaitingStudio],
  );

  const archetype = useMemo(() => {
    if (!showCoachAxis || !scores || !shouldShowClientArchetype(scores)) return null;
    return determineArchetype(scores, currentAssessment?.formData);
  }, [showCoachAxis, scores, currentAssessment?.formData]);

  const overviewEmptyVariant = useMemo((): ClientOverviewEmptyVariant | null => {
    if (showCoachAxis) return null;
    if (profile?.remoteIntakePending) return 'intake-pending';
    if (
      profile?.remoteIntakeAwaitingStudio ||
      (!hasAssessmentSnapshotHistory(snapshots ?? []) &&
        profile?.formData &&
        Object.keys(profile.formData).length > 0)
    ) {
      return 'intake-ready';
    }
    return 'not-started';
  }, [
    showCoachAxis,
    profile?.remoteIntakePending,
    profile?.remoteIntakeAwaitingStudio,
    profile?.formData,
    snapshots,
  ]);

  // Snapshots sorted oldest → newest for the trend / journey logic.
  const sortedSnapshots = useMemo(() => {
    return [...(snapshots ?? [])].sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis());
  }, [snapshots]);

  const startingSnapshot = sortedSnapshots[0] ?? null;
  const startingScores = useMemo(() => {
    if (!startingSnapshot) return null;
    if (startingSnapshot.scoresSummary) {
      // Convert scoresSummary into canonical five-pillar radar order.
      return PILLAR_ORDER.map((p) => {
        const cat = startingSnapshot.scoresSummary?.categories.find((c) => c.id === p.id);
        return cat?.score ?? 0;
      });
    }
    try {
      const computed = computeScores(startingSnapshot.formData);
      return scoresToRadarArray(computed);
    } catch {
      return null;
    }
  }, [startingSnapshot]);
  const startingOverall = startingSnapshot?.overallScore ?? 0;

  const currentRadar = useMemo(() => scoresToRadarArray(scores), [scores]);
  const currentOverall = stats?.latestScore ?? scores?.overall ?? 0;

  // Stated goals from the latest assessment — the Goal card shows what the
  // client said they want.
  const statedGoals = useMemo<string[]>(() => {
    const goals = currentAssessment?.formData?.clientGoals;
    return Array.isArray(goals) ? goals : [];
  }, [currentAssessment]);

  // Goal card state: 'stated' = qualitative goals from the assessment;
  // 'none' = no goals set yet.
  const goalScores = useMemo<{
    scores: number[];
    overall: number;
    source: 'stated' | 'none';
    statedGoals: string[];
  }>(() => {
    if (statedGoals.length > 0) {
      return { scores: [], overall: 0, source: 'stated', statedGoals };
    }
    return { scores: [], overall: 0, source: 'none', statedGoals: [] };
  }, [statedGoals]);

  // Last assessment date (any assessment).
  const lastAssessmentDate = useMemo(() => {
    const latest = sortedSnapshots[sortedSnapshots.length - 1];
    return timestampToDate(latest?.timestamp ?? null);
  }, [sortedSnapshots]);

  // ─── Coach notes (coach-only diagnostic + prescription) ─────────
  useEffect(() => {
    if (!effectiveOrgId || !clientName) return;
    let cancelled = false;
    getCoachNotes(effectiveOrgId, clientName).then((doc) => {
      if (!cancelled) setCoachNotes(doc);
    });
    return () => {
      cancelled = true;
    };
  }, [effectiveOrgId, clientName]);

  const coachNotesStats = useMemo(() => {
    if (!coachNotes) return null;
    let active = 0;
    let monitoring = 0;
    let resolved = 0;
    const recentlyResolved: string[] = [];
    for (const pillar of Object.values(coachNotes.pillars)) {
      for (const f of pillar?.findings ?? []) {
        if (f.status === 'active') active++;
        else if (f.status === 'monitoring') monitoring++;
        else if (f.status === 'resolved') {
          resolved++;
          if (f.resolvedAt) recentlyResolved.push(f.finding);
        }
      }
    }
    return { active, monitoring, resolved, recentlyResolved: recentlyResolved.slice(0, 3) };
  }, [coachNotes]);

  // ─── Baseline incompleteness — surfaces in Attention card ────────
  // Derives from snapshots (the actual record of completed assessments)
  // rather than profile.lastXDate fields. Profile dates can drift out of
  // sync for legacy data — snapshots are the source of truth.
  const assessedFromSnapshots = useMemo(() => {
    const set = new Set<'bodycomp' | 'posture' | 'fitness' | 'strength' | 'lifestyle'>();
    for (const snap of snapshots ?? []) {
      const t = String(snap.type ?? '');
      if (t === 'full-assessment' || t === 'full') {
        set.add('bodycomp');
        set.add('posture');
        set.add('fitness');
        set.add('strength');
        set.add('lifestyle');
        continue;
      }
      const m = t.match(/^(?:pillar|partial)-(bodycomp|posture|fitness|strength|lifestyle)$/);
      if (m) set.add(m[1] as 'bodycomp' | 'posture' | 'fitness' | 'strength' | 'lifestyle');
      const pillar = (snap as { pillar?: string }).pillar;
      if (
        pillar === 'bodycomp' ||
        pillar === 'posture' ||
        pillar === 'fitness' ||
        pillar === 'strength' ||
        pillar === 'lifestyle'
      ) {
        set.add(pillar);
      }
    }
    return set;
  }, [snapshots]);

  const baselineMissing = useMemo(() => {
    const activePillars = profile?.activePillars ?? ['bodycomp', 'strength', 'fitness', 'lifestyle'];
    return BASELINE_PILLARS.filter(
      (p) => activePillars.includes(p.id) && !assessedFromSnapshots.has(p.id),
    );
  }, [profile, assessedFromSnapshots]);

  // ─── Render ──────────────────────────────────────────────────────

  if (overviewEmptyVariant) {
    return (
      <ClientOverviewEmpty
        name={displayClientName || clientName}
        variant={overviewEmptyVariant}
        onPrimaryAction={
          overviewEmptyVariant === 'intake-pending'
            ? undefined
            : () => void handleNewAssessment()
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <HeroStrip
        name={displayClientName || clientName}
        vitals={buildVitals(currentAssessment?.formData)}
        archetype={archetype?.name}
        currentOverall={currentOverall}
        scoreChange={stats?.scoreChange ?? 0}
        radarScores={currentRadar}
        lastAssessedAt={lastAssessmentDate}
        showAxisScores={showCoachAxis}
      />

      <JourneySection
        startingScores={startingScores}
        startingOverall={startingOverall}
        startingDate={timestampToDate(startingSnapshot?.timestamp ?? null)}
        currentScores={currentRadar}
        currentOverall={currentOverall}
        currentDate={lastAssessmentDate}
        goal={goalScores}
        trendPoints={sortedSnapshots.map((s) => ({
          at: timestampToDate(s.timestamp) ?? new Date(),
          score: s.overallScore,
        }))}
      />

      <AttentionCard
        missingPillars={baselineMissing}
        onStartAssessment={() => void handleNewAssessment()}
      />

      <CoachNotesCard
        stats={coachNotesStats}
        loaded={coachNotes != null}
        onView={() => navigate(`/dashboard/clients/${encodeURIComponent(clientName)}/timeline#notes`)}
      />

      <PillarSnapshots
        scores={scores}
        breakdown={categoryBreakdown}
        changes={categoryChanges}
        onPillar={() => navigate(`/dashboard/clients/${encodeURIComponent(clientName)}/report`)}
      />

      <QuickActionsBar
        onNewAssessment={() => void handleNewAssessment()}
        onHistory={() => navigate(`/dashboard/clients/${encodeURIComponent(clientName)}/timeline`)}
      />

      <ActivityTimeline snapshots={sortedSnapshots.slice(-6).reverse()} />
    </div>
  );
}

// ─── Hero strip ──────────────────────────────────────────────────────

interface HeroStripProps {
  name: string;
  vitals: { label: string; value: string }[];
  archetype: string | null | undefined;
  currentOverall: number;
  scoreChange: number;
  radarScores: number[];
  lastAssessedAt: Date | null;
  showAxisScores: boolean;
}

function HeroStrip({
  name,
  vitals,
  archetype,
  currentOverall,
  scoreChange,
  radarScores,
  lastAssessedAt,
  showAxisScores,
}: HeroStripProps) {
  const t = tone(currentOverall);

  return (
    <section className="rounded-[28px] border border-border bg-card p-7 shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_14px_rgba(15,15,15,0.04)] sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: identity */}
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold tracking-[-0.020em] text-foreground sm:text-4xl">
            {name}
          </h1>

          {vitals.length > 0 ? (
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {vitals.map((v) => (
                <span key={v.label} className="inline-flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.10em] text-muted-foreground">
                    {v.label}
                  </span>
                  <span className="text-[13px] font-semibold tabular-nums text-foreground-secondary">
                    {v.value}
                  </span>
                </span>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-[12px] text-muted-foreground">
            {archetype ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                <Trophy className="h-3.5 w-3.5" />
                {archetype}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-score-green" />
              {lastAssessedAt ? `Last assessed ${relativeWhen(lastAssessedAt)}` : 'Not yet assessed'}
            </span>
          </div>
        </div>

        {showAxisScores ? (
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="inline-flex items-center justify-end gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <AxisDiamondMark />
                Current AXIS™
              </p>
              <div className="mt-1 flex items-baseline justify-end gap-1">
                <span className={cn('text-6xl font-bold leading-none tracking-[-0.025em] tabular-nums', TONE_TEXT[t])}>
                  {currentOverall || '—'}
                </span>
                {currentOverall ? (
                  <span className="text-xl font-semibold text-muted-foreground">/ 100</span>
                ) : null}
              </div>
              {scoreChange !== 0 ? (
                <p
                  className={cn(
                    'mt-1 text-[12px] font-semibold tabular-nums',
                    scoreChange > 0 ? 'text-score-green-fg' : 'text-score-red-fg',
                  )}
                >
                  {scoreChange > 0 ? '▲ +' : '▼ '}
                  {scoreChange} since baseline
                </p>
              ) : null}
            </div>
            <MiniPillarRadar scores={radarScores} size={120} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

// ─── Journey section ─────────────────────────────────────────────────

interface JourneySectionProps {
  startingScores: number[] | null;
  startingOverall: number;
  startingDate: Date | null;
  currentScores: number[];
  currentOverall: number;
  currentDate: Date | null;
  goal: {
    scores: number[];
    overall: number;
    source: 'stated' | 'none';
    statedGoals: string[];
  };
  trendPoints: { at: Date; score: number }[];
}

function JourneySection({
  startingScores,
  startingOverall,
  startingDate,
  currentScores,
  currentOverall,
  currentDate,
  goal,
  trendPoints,
}: JourneySectionProps) {
  return (
    <section className="rounded-[28px] border border-border bg-card p-7 shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_14px_rgba(15,15,15,0.04)] sm:p-8">
      <p className="mb-4 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        <AxisDiamondMark />
        Journey
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <JourneyCard
          eyebrow="Starting Point"
          score={startingOverall}
          when={fmtShort(startingDate)}
          scores={startingScores ?? [0, 0, 0, 0, 0]}
          variant="filled"
          available={Boolean(startingScores)}
          fallback="Baseline pending"
        />
        <JourneyCard
          eyebrow="Current"
          score={currentOverall}
          when={fmtShort(currentDate)}
          scores={currentScores}
          variant="filled"
          available={currentOverall > 0}
          fallback="No assessment yet"
          highlight
        />
        <GoalCard goal={goal} />

      </div>

      <div className="mt-6 border-t border-border pt-5">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          AXIS over time
        </p>
        <TrendChart points={trendPoints} goal={null} />
      </div>
    </section>
  );
}

interface JourneyCardProps {
  eyebrow: string;
  score: number;
  when: string;
  scores: number[];
  variant: 'filled' | 'outline';
  available: boolean;
  fallback: string;
  highlight?: boolean;
}

function JourneyCard({ eyebrow, score, when, scores, variant, available, fallback, highlight }: JourneyCardProps) {
  const t = tone(score);
  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-2xl border bg-card-elevated p-5',
        highlight ? 'border-foreground/10 shadow-[0_1px_3px_rgba(15,15,15,0.05)]' : 'border-border',
      )}
    >
      <div className="flex flex-col gap-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {eyebrow}
        </p>
        {available ? (
          <>
            <p className="flex items-baseline gap-1">
              <span className={cn('text-4xl font-bold leading-none tracking-[-0.025em] tabular-nums', TONE_TEXT[t])}>
                {score || '—'}
              </span>
              {score ? <span className="text-sm font-semibold text-muted-foreground">/ 100</span> : null}
            </p>
            <p className="text-[12px] text-muted-foreground">{when}</p>
          </>
        ) : (
          <p className="max-w-[24ch] text-[13px] font-medium leading-relaxed text-foreground-secondary">
            {fallback}
          </p>
        )}
      </div>
      <div className="ml-auto">
        <MiniPillarRadar scores={scores} size={92} variant={variant} />
      </div>
    </div>
  );
}

// ─── Goal card ───────────────────────────────────────────────────────
//
// Two states:
//  - 'stated' → client has stated qualitative goals (chips)
//  - 'none'   → no goals set yet (placeholder + "Set goal →")

function GoalCard({
  goal,
}: {
  goal: { scores: number[]; overall: number; source: 'stated' | 'none'; statedGoals: string[] };
}) {
  if (goal.source === 'stated') {
    return (
      <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card-elevated p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Goal
        </p>
        <div className="flex flex-wrap gap-1.5">
          {goal.statedGoals.map((g) => (
            <span
              key={g}
              className="inline-flex items-center rounded-full border border-border bg-card px-2.5 py-0.5 text-[12px] font-semibold text-foreground"
            >
              {prettifyGoal(g)}
            </span>
          ))}
        </div>
        <p className="text-[12px] text-muted-foreground">
          Goals from the client's assessment shape their report and plan.
        </p>
      </div>
    );
  }

  return (
    <JourneyCard
      eyebrow="Goal"
      score={0}
      when="set goal →"
      scores={[0, 0, 0, 0, 0]}
      variant="outline"
      available={false}
      fallback="No goals set yet"
    />
  );
}

function prettifyGoal(g: string): string {
  const labels: Record<string, string> = {
    'weight-loss': 'Weight loss',
    'build-muscle': 'Build muscle',
    'build-strength': 'Build strength',
    'body-recomposition': 'Body recomposition',
    'improve-fitness': 'Improve fitness',
    'improve-mobility': 'Improve mobility',
    'improve-posture': 'Improve posture',
    'reduce-stress': 'Reduce stress',
    'general-health': 'General health',
    'sport-performance': 'Sport performance',
    rehabilitation: 'Rehabilitation',
  };
  if (labels[g]) return labels[g];
  return g
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map((w) => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

// ─── Trend chart (simple inline line) ────────────────────────────────

function TrendChart({ points, goal }: { points: { at: Date; score: number }[]; goal: number | null }) {
  if (points.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card-elevated px-4 py-6 text-center text-sm text-muted-foreground">
        No assessments captured yet — trend will appear here after the first assessment.
      </div>
    );
  }

  const w = 800;
  const h = 140;
  const pad = { l: 32, r: 16, t: 12, b: 22 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const minMs = points[0].at.getTime();
  const maxMs = points[points.length - 1].at.getTime();
  const span = Math.max(1, maxMs - minMs);
  const xFor = (d: Date) => pad.l + ((d.getTime() - minMs) / span) * innerW;
  const yFor = (s: number) => pad.t + (1 - Math.max(0, Math.min(100, s)) / 100) * innerH;

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(p.at).toFixed(1)} ${yFor(p.score).toFixed(1)}`)
    .join(' ');

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="block w-full" role="img" aria-label="AXIS score over time">
        {/* Grid lines */}
        {[25, 50, 75, 100].map((stop) => (
          <g key={stop}>
            <line
              x1={pad.l}
              x2={w - pad.r}
              y1={yFor(stop)}
              y2={yFor(stop)}
              stroke="hsl(var(--border))"
              strokeDasharray="3 5"
              strokeWidth={0.7}
              opacity={0.6}
            />
            <text
              x={pad.l - 6}
              y={yFor(stop) + 3}
              textAnchor="end"
              fontSize={9}
              fontWeight={600}
              className="fill-muted-foreground tabular-nums"
            >
              {stop}
            </text>
          </g>
        ))}

        {/* Goal line */}
        {goal != null ? (
          <g>
            <line
              x1={pad.l}
              x2={w - pad.r}
              y1={yFor(goal)}
              y2={yFor(goal)}
              stroke="hsl(var(--score-green))"
              strokeDasharray="4 4"
              strokeWidth={1.4}
              opacity={0.6}
            />
            <text
              x={w - pad.r - 4}
              y={yFor(goal) - 4}
              textAnchor="end"
              fontSize={10}
              fontWeight={700}
              className="fill-score-green tabular-nums"
            >
              goal {goal}
            </text>
          </g>
        ) : null}

        {/* Trend line */}
        <path d={path} fill="none" stroke="hsl(var(--foreground))" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* Points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={xFor(p.at)} cy={yFor(p.score)} r={4} fill="hsl(var(--card))" stroke="hsl(var(--foreground))" strokeWidth={2} />
          </g>
        ))}

        {/* X-axis end labels */}
        <text x={pad.l} y={h - 6} fontSize={10} className="fill-muted-foreground">
          {fmtShort(points[0].at)}
        </text>
        <text x={w - pad.r} y={h - 6} fontSize={10} textAnchor="end" className="fill-muted-foreground">
          {fmtShort(points[points.length - 1].at)}
        </text>
      </svg>
    </div>
  );
}

// ─── Attention card ──────────────────────────────────────────────────

interface AttentionCardProps {
  missingPillars: typeof BASELINE_PILLARS;
  onStartAssessment: () => void;
}

function AttentionCard({ missingPillars, onStartAssessment }: AttentionCardProps) {
  const items: { tone: 'red' | 'amber' | 'green'; node: ReactNode }[] = [];

  if (missingPillars.length > 0) {
    items.push({
      tone: 'amber',
      node: (
        <div>
          <p className="mb-2 text-sm font-semibold text-foreground">
            {missingPillars.length} pillar{missingPillars.length === 1 ? '' : 's'} not yet assessed
            {' '}({missingPillars.map((p) => p.label).join(', ')})
          </p>
          <button
            type="button"
            onClick={onStartAssessment}
            className="inline-flex items-center gap-1 rounded-full border border-score-amber bg-score-amber-light/60 px-3 py-1 text-[12px] font-semibold text-score-amber-fg transition hover:bg-score-amber-light"
          >
            Start assessment
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      ),
    });
  }

  const allClear = items.length === 0;

  return (
    <section className="rounded-[24px] border border-border bg-card p-6 shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_14px_rgba(15,15,15,0.04)]">
      <header className="mb-4 flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5" />
          Attention
        </p>
        {allClear ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-score-green-light px-2.5 py-0.5 text-[11px] font-bold text-score-green-fg">
            <CheckCircle2 className="h-3 w-3" /> all clear
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-score-amber-light px-2.5 py-0.5 text-[11px] font-bold text-score-amber-fg">
            {items.length}
          </span>
        )}
      </header>
      {allClear ? (
        <p className="text-sm text-foreground-secondary">
          Nothing needs you right now — baseline pillars are covered.
        </p>
      ) : (
        <ul className="flex flex-col gap-3.5">
          {items.map((item, i) => (
            <li
              key={i}
              className={cn(
                'rounded-2xl border p-3.5',
                item.tone === 'amber' && 'border-score-amber-light bg-score-amber-light/40',
                item.tone === 'red' && 'border-score-red-light bg-score-red-light/40',
                item.tone === 'green' && 'border-score-green-light bg-score-green-light/40',
              )}
            >
              {item.node}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ─── Coach notes card (compact summary) ─────────────────────────────

interface CoachNotesCardProps {
  stats: { active: number; monitoring: number; resolved: number; recentlyResolved: string[] } | null;
  loaded: boolean;
  onView: () => void;
}

function CoachNotesCard({ stats, loaded, onView }: CoachNotesCardProps) {
  return (
    <section className="rounded-[24px] border border-border bg-card p-6 shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_14px_rgba(15,15,15,0.04)]">
      <header className="mb-4 flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <Eye className="h-3.5 w-3.5" />
          Coach Notes
          <span className="ml-1 inline-flex items-center rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-foreground-secondary">
            coach only
          </span>
        </p>
        <button
          type="button"
          onClick={onView}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-foreground hover:underline"
        >
          Open notes
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </header>

      {!loaded ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !stats || stats.active + stats.monitoring + stats.resolved === 0 ? (
        <div>
          <p className="text-sm text-foreground-secondary">
            No coach notes generated yet — the next assessment will populate them automatically, or
            you can generate now from the Coach Notes tab.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-score-amber-light px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-score-amber-fg">
              {stats.active}
              <span className="font-medium opacity-80">active</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-muted-foreground">
              {stats.monitoring}
              <span className="font-medium opacity-80">monitoring</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-score-green-light px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-score-green-fg">
              {stats.resolved}
              <span className="font-medium opacity-80">resolved</span>
            </span>
          </div>
          {stats.recentlyResolved.length > 0 ? (
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.10em] text-muted-foreground">
                Recently resolved
              </p>
              <ul className="flex flex-col gap-1 text-[13px] text-foreground-secondary">
                {stats.recentlyResolved.map((label) => (
                  <li key={label} className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-score-green-fg" />
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

// ─── Pillar snapshots ────────────────────────────────────────────────

function PillarSnapshots({
  scores,
  breakdown,
  changes,
  onPillar,
}: {
  scores: ScoreSummary | null;
  breakdown: Record<string, number>;
  changes: Record<string, number | undefined>;
  onPillar: () => void;
}) {
  return (
    <section className="rounded-[24px] border border-border bg-card p-6 shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_14px_rgba(15,15,15,0.04)]">
      <header className="mb-4 flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <ClipboardList className="h-3.5 w-3.5" />
          Pillar snapshots
        </p>
        <button
          type="button"
          onClick={onPillar}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-foreground hover:underline"
        >
          Open report <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {PILLAR_ORDER.map((p) => {
          const cat: ScoreCategory | undefined = scores?.categories.find((c) => c.id === p.id);
          const displayScore = pillarDisplayScore(cat?.score ?? breakdown[p.id], cat?.assessed);
          const change = cat?.assessed ? changes[p.id] : undefined;
          const Icon = p.icon;
          const badgeScore = displayScore ?? 0;
          return (
            <button
              key={p.id}
              type="button"
              onClick={onPillar}
              className="group flex flex-col gap-3 rounded-2xl border border-border bg-card-elevated p-4 text-left transition hover:border-foreground/15 hover:shadow-[0_2px_8px_rgba(15,15,15,0.05)]"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.10em] text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" />
                  {p.short}
                </span>
                <DeltaPill diff={change} />
              </div>
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'text-3xl font-bold leading-none tracking-[-0.025em] tabular-nums',
                    displayScore != null ? TONE_TEXT[tone(displayScore)] : 'text-muted-foreground',
                  )}
                >
                  {displayScore ?? '—'}
                </span>
                {displayScore != null ? (
                  <PillarScoreBadge pillar={p.id} score={badgeScore} size={56} />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground">
                    —
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function DeltaPill({ diff }: { diff: number | undefined }) {
  if (diff == null || diff === 0) {
    return <span className="text-[11px] text-muted-foreground">—</span>;
  }
  if (diff > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-score-green-light px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-score-green-fg">
        ▲ +{diff}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-score-red-light px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-score-red-fg">
      ▼ {diff}
    </span>
  );
}

// ─── Quick actions bar ───────────────────────────────────────────────

function QuickActionsBar({
  onNewAssessment,
  onHistory,
}: {
  onNewAssessment: () => void;
  onHistory: () => void;
}) {
  return (
    <section className="rounded-[20px] border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_14px_rgba(15,15,15,0.04)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Quick actions
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onNewAssessment} size="sm" className="h-9 gap-1.5 rounded-full">
            <Plus className="h-3.5 w-3.5" /> New assessment
          </Button>
          <Button onClick={onHistory} variant="outline" size="sm" className="h-9 gap-1.5 rounded-full">
            <Activity className="h-3.5 w-3.5" /> History
          </Button>
        </div>
      </div>
    </section>
  );
}

// ─── Activity timeline ───────────────────────────────────────────────

function ActivityTimeline({ snapshots }: { snapshots: NonNullable<ClientDetailOutletContext['snapshots']> }) {
  if (snapshots.length === 0) return null;
  return (
    <section className="rounded-[24px] border border-border bg-card p-6 shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_14px_rgba(15,15,15,0.04)]">
      <p className="mb-4 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        <Activity className="h-3.5 w-3.5" />
        Recent activity
      </p>
      <ul className="flex flex-col gap-3">
        {snapshots.map((s, i) => {
          const date = timestampToDate(s.timestamp);
          const isPillar = (s.type ?? '').toString().startsWith('pillar') || (s.type ?? '').toString().startsWith('partial');
          return (
            <li key={s.id ?? `${i}`} className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-card-elevated text-foreground-secondary">
                <ClipboardList className="h-3.5 w-3.5" />
              </span>
              <div className="flex flex-1 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-sm font-semibold text-foreground">
                  {isPillar ? `${(s.pillar ?? 'Pillar').toString()} assessment` : 'Full assessment'}
                  <span className="ml-2 text-[12px] font-semibold tabular-nums text-foreground-secondary">
                    AXIS {Math.round(s.overallScore ?? 0)}
                  </span>
                </span>
                <span className="text-[12px] text-muted-foreground">
                  {fmtShort(date)} · {relativeWhen(date)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ─── Vitals helper ───────────────────────────────────────────────────

function buildVitals(formData: FormData | undefined): { label: string; value: string }[] {
  if (!formData) return [];
  const out: { label: string; value: string }[] = [];
  if (formData.gender) out.push({ label: 'Gender', value: capitalise(formData.gender) });
  if (formData.dateOfBirth) {
    try {
      const dob = new Date(formData.dateOfBirth);
      const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age > 0 && age < 130) out.push({ label: 'Age', value: String(age) });
    } catch { /* skip invalid date */ }
  }
  const heightCm = parseFloat(formData.heightCm ?? '');
  if (heightCm > 0) {
    out.push({
      label: 'Height',
      value: heightCm >= 100 ? `${(heightCm / 100).toFixed(2)} m` : `${formData.heightCm} cm`,
    });
  }
  const weightKg = parseFloat(formData.inbodyWeightKg ?? '');
  if (weightKg > 0) out.push({ label: 'Weight', value: `${weightKg.toFixed(1)} kg` });
  const bmi = parseFloat(formData.inbodyBmi ?? '');
  if (bmi > 0) out.push({ label: 'BMI', value: bmi.toFixed(1) });
  return out;
}

function capitalise(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// ─── AXIS diamond brand mark ─────────────────────────────────────────

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
