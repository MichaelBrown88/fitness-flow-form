import { useState, useEffect, useMemo, useCallback, lazy, Suspense, type ReactNode } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PILLAR_DISPLAY } from '@/constants/pillars';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Dumbbell,
  Heart,
  Scan,
  UserCheck,
  Target as TargetIcon,
  UserPlus,
  ChevronDown,
  ClipboardList,
  Loader2,
  ArrowRight,
  Share2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { PostureComparisonCard } from '@/components/client/PostureComparisonCard';
import type { ClientDetailOutletContext } from './ClientDetailLayout';
import { UI_CLIENT_DETAIL } from '@/constants/ui';
import { computeScores } from '@/lib/scoring';
import { generateCoachPlan, generateBodyCompInterpretation, type CoachPlan } from '@/lib/recommendations';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring/types';
import type { Trackable } from '@/lib/roadmap/types';

const CoachReport = lazy(() => import('@/components/reports/CoachReport'));

function CollapsibleSection({
  title,
  icon,
  badge,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/20 pb-5 pt-1 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 py-2 mb-4 hover:opacity-70 transition-opacity"
      >
        <h3 className="text-sm font-semibold text-foreground-secondary flex items-center gap-2 min-w-0 truncate">
          <span className="shrink-0 opacity-70">{icon}</span>
          <span className="truncate">{title}</span>
        </h3>
        <div className="flex items-center gap-2 shrink-0">
          {badge}
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

/**
 * Mounts only when the "Coach Summary" section is expanded.
 * Computes the plan once on mount and renders CoachReport.
 */
function CoachSummaryContent({ formData, scores }: { formData: FormData; scores: ScoreSummary }) {
  const [plan, setPlan] = useState<CoachPlan | null>(null);
  const bodyComp = useMemo(() => generateBodyCompInterpretation(formData, scores), [formData, scores]);

  useEffect(() => {
    let cancelled = false;
    setPlan(null);
    void generateCoachPlan(formData, scores).then((next) => {
      if (!cancelled) setPlan(next);
    });
    return () => {
      cancelled = true;
    };
  }, [formData, scores]);

  if (!plan) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <p className="text-xs text-muted-foreground text-center">Generating coach summary...</p>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    }>
      <CoachReport plan={plan} scores={scores} bodyComp={bodyComp ?? undefined} formData={formData} />
    </Suspense>
  );
}

const PILLAR_DEFS = [
  { id: 'lifestyle', label: 'Lifestyle Factors', icon: Activity },
  { id: 'bodyComp', label: 'Body Composition', icon: Scan },
  { id: 'movementQuality', label: 'Movement Quality', icon: UserCheck },
  { id: 'strength', label: 'Functional Strength', icon: Dumbbell },
  { id: 'cardio', label: 'Metabolic Fitness', icon: Heart },
] as const;

function PillarScoreGrid({
  categoryBreakdown,
  categoryChanges,
  scores,
}: {
  categoryBreakdown: Record<string, number>;
  categoryChanges: Record<string, number | undefined>;
  scores: ScoreSummary | null;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
      {PILLAR_DEFS.map((cat) => {
        const isExpanded = expandedId === cat.id;
        const scoreCategory = scores?.categories.find(c => c.id === cat.id);
        const change = categoryChanges[cat.id];
        const score = categoryBreakdown[cat.id] || 0;

        return (
          <div key={cat.id} className="col-span-1">
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : cat.id)}
              className={`w-full text-center p-5 sm:p-6 rounded-2xl bg-card shadow-sm transition-all hover:shadow-md cursor-pointer ${isExpanded ? 'ring-2 ring-primary/30' : ''}`}
            >
              <div className="flex justify-center mb-3">
                <cat.icon className="h-6 w-6 text-primary opacity-80" />
              </div>
              <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-2">{cat.label}</div>
              <div className="text-3xl font-bold text-foreground mb-1">{score}</div>
              {change !== undefined && change !== 0 && (
                <div className={`text-[10px] font-bold ${change > 0 ? 'text-score-green-fg' : 'text-score-red-fg'}`}>
                  {change > 0 ? '+' : ''}{change}
                </div>
              )}
              <div className="h-2 w-full bg-border/60 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-primary" style={{ width: `${score}%` }} />
              </div>
            </button>

            {isExpanded && scoreCategory && (
              <div className="mt-2 rounded-xl bg-muted/50 border border-border/50 px-4 py-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Top contributing factors (lowest-scoring details = areas dragging the score down) */}
                {scoreCategory.details.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Contributing Factors</p>
                    {scoreCategory.details
                      .slice()
                      .sort((a, b) => a.score - b.score)
                      .slice(0, 3)
                      .map(d => (
                        <div key={d.id} className="flex items-center justify-between gap-2 py-1">
                          <span className="flex items-center gap-1.5 text-xs text-foreground truncate">
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${d.score >= 70 ? 'bg-score-green' : d.score >= 40 ? 'bg-score-amber' : 'bg-score-red'}`} />
                            {d.label}
                          </span>
                          <span className={`text-xs font-bold tabular-nums ${d.score >= 70 ? 'text-score-green-fg' : d.score >= 40 ? 'text-score-amber-fg' : 'text-score-red-fg'}`}>
                            {d.score}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
                {/* Weaknesses */}
                {scoreCategory.weaknesses.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Areas for Improvement</p>
                    {scoreCategory.weaknesses.slice(0, 2).map((w, i) => (
                      <p key={i} className="text-xs text-foreground-secondary leading-snug">• {w}</p>
                    ))}
                  </div>
                )}
                {/* Strengths */}
                {scoreCategory.strengths.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Strengths</p>
                    {scoreCategory.strengths.slice(0, 2).map((s, i) => (
                      <p key={i} className="text-xs text-score-green-fg leading-snug">• {s}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const TRACKED_PILLARS: { id: 'bodycomp' | 'posture' | 'fitness' | 'strength' | 'lifestyle'; label: string }[] = [
  { id: 'bodycomp', label: 'Body Comp' },
  { id: 'posture', label: 'Posture' },
  { id: 'fitness', label: 'Fitness' },
  { id: 'strength', label: 'Strength' },
  { id: 'lifestyle', label: 'Lifestyle' },
];

export default function ClientOverview() {
  const ctx = useOutletContext<ClientDetailOutletContext>();
  const navigate = useNavigate();
  const {
    clientName,
    currentAssessment,
    categoryBreakdown,
    categoryChanges,
    stats,
    handleNewAssessment,
    snapshots,
    profile,
    roadmapItems,
    roadmapStatus,
  } = ctx;

  // Baseline completeness: which pillars have never been assessed?
  const baselineStatus = useMemo(() => {
    if (!profile) return null;
    const activePillars = profile.activePillars ?? ['bodycomp', 'strength', 'fitness', 'lifestyle'];
    const pillarDateMap: Record<string, boolean> = {
      bodycomp: !!(profile.lastBodyCompDate ?? profile.lastInBodyDate),
      posture: !!profile.lastPostureDate,
      fitness: !!profile.lastFitnessDate,
      strength: !!profile.lastStrengthDate,
      lifestyle: !!profile.lastLifestyleDate,
    };
    const missing = TRACKED_PILLARS
      .filter(p => activePillars.includes(p.id) && !pillarDateMap[p.id])
      .map(p => p);
    return { isComplete: missing.length === 0, missing };
  }, [profile]);

  const scores = useMemo(
    () => currentAssessment ? computeScores(currentAssessment.formData) : null,
    [currentAssessment],
  );

  // Extract ARC trackables for inline milestone display
  const arcTrackables = useMemo(() => {
    if (!roadmapItems || roadmapItems.length === 0) return [];
    const all: (Trackable & { itemTitle: string })[] = [];
    for (const item of roadmapItems) {
      if (item.trackables) {
        for (const t of item.trackables) {
          all.push({ ...t, itemTitle: item.title });
        }
      }
    }
    return all;
  }, [roadmapItems]);

  return (
    <div className="space-y-6">
      {baselineStatus && !baselineStatus.isComplete && (
        <div className="rounded-xl border-2 border-score-amber bg-score-amber-muted/40 px-4 py-3">
          <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-score-amber-fg shrink-0" />
            Baseline incomplete
          </p>
          <div className="flex flex-wrap gap-2">
            {baselineStatus.missing.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => void handleNewAssessment(p.id)}
                className="text-xs font-bold text-score-amber-fg border border-score-amber rounded-lg px-3 py-1.5 hover:bg-score-amber-muted transition-colors"
              >
                Start {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <CollapsibleSection
        title={UI_CLIENT_DETAIL.OVERVIEW_SECTION_TITLE}
        icon={<TrendingUp className="h-5 w-5 text-primary" />}
      >
        <div className="grid gap-2 sm:gap-3 grid-cols-2 md:grid-cols-4">
          <div className="rounded-2xl bg-card shadow-sm p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-2">Total</div>
            <div className="text-2xl font-bold text-foreground">{stats.totalAssessments}</div>
          </div>
          <div className="rounded-2xl bg-card shadow-sm p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-2">Latest</div>
            <div className="flex items-end justify-between">
              <div className="text-2xl font-bold text-foreground">{stats.latestScore}</div>
              {stats.trend !== 'neutral' && (
                <div className={`flex items-center mb-0.5 ${stats.trend === 'up' ? 'text-score-green' : 'text-score-red'}`}>
                  {stats.trend === 'up' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </div>
              )}
            </div>
          </div>
          <div className="rounded-2xl bg-card shadow-sm p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-2">Average</div>
            <div className="text-2xl font-bold text-foreground">{stats.averageScore}</div>
          </div>
          <div className="rounded-2xl bg-card shadow-sm p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-2">Change</div>
            <div className={`text-2xl font-bold ${stats.scoreChange > 0 ? 'text-score-green-fg' : stats.scoreChange < 0 ? 'text-score-red-fg' : 'text-foreground'}`}>
              {stats.scoreChange > 0 ? '+' : ''}{stats.scoreChange}
            </div>
          </div>
        </div>
        {currentAssessment && (
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-semibold"
              onClick={() => navigate(`/client/${encodeURIComponent(clientName)}/report?share=1`)}
            >
              <Share2 className="h-3.5 w-3.5" />
              Share Report
            </Button>
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Pillar Scores" icon={<Activity className="h-5 w-5 text-primary" />}>
        {!currentAssessment ? (
          <div className="py-12 text-center bg-card rounded-2xl shadow-sm px-6">
            {profile?.remoteIntakeAwaitingStudio ? (
              <>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-950/40 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-400 mb-4">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                  Remote intake complete
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">Ready for studio</p>
                <p className="text-sm text-muted-foreground mb-6">
                  This client has submitted their intake form. Click below to start the physical assessment — their answers will be pre-loaded.
                </p>
                <Button onClick={() => handleNewAssessment()} className="bg-primary text-primary-foreground h-12 px-8">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Continue in studio
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-6">No assessment data found for this client.</p>
                <Button onClick={() => handleNewAssessment()} className="bg-primary text-primary-foreground h-12 px-8">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Start First Assessment
                </Button>
              </>
            )}
          </div>
        ) : (
          <PillarScoreGrid
            categoryBreakdown={categoryBreakdown}
            categoryChanges={categoryChanges}
            scores={scores}
          />
        )}
      </CollapsibleSection>

      {arcTrackables.length > 0 && (
        <CollapsibleSection
          title="ARC™ Milestones"
          icon={<TargetIcon className="h-5 w-5 text-primary" />}
          badge={
            <span className="text-[10px] font-bold text-muted-foreground">
              {arcTrackables.filter(t => t.current >= t.target).length}/{arcTrackables.length} reached
            </span>
          }
        >
          <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2">
            {arcTrackables.slice(0, 8).map((t) => {
              const range = Math.abs(t.target - t.baseline);
              const progress = range > 0
                ? Math.min(100, Math.max(0, Math.round(((Math.abs(t.current - t.baseline)) / range) * 100)))
                : t.current >= t.target ? 100 : 0;
              const isAchieved = t.target > t.baseline
                ? t.current >= t.target
                : t.current <= t.target;
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-3 rounded-xl bg-card shadow-sm px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-foreground truncate">{t.label}</span>
                      <span className="text-[11px] font-bold text-muted-foreground whitespace-nowrap tabular-nums">
                        {t.current}{t.unit ? ` ${t.unit}` : ''} → {t.target}{t.unit ? ` ${t.unit}` : ''}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-border/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isAchieved ? 'bg-score-green' : 'bg-primary'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  {isAchieved && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-score-green shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
          {arcTrackables.length > 8 && (
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              +{arcTrackables.length - 8} more milestones in ARC™ tab
            </p>
          )}
        </CollapsibleSection>
      )}

      <CollapsibleSection title="Quick Assessments" icon={<TargetIcon className="h-5 w-5 text-primary" />}>
        <div className="grid gap-2 sm:gap-3 grid-cols-3 sm:grid-cols-5">
          {[
            { id: 'lifestyle', label: PILLAR_DISPLAY.lifestyle.short, icon: Activity },
            { id: 'bodycomp', label: PILLAR_DISPLAY.bodyComp.short, icon: Scan },
            { id: 'posture', label: PILLAR_DISPLAY.movementQuality.short, icon: UserCheck },
            { id: 'strength', label: PILLAR_DISPLAY.strength.short, icon: Dumbbell },
            { id: 'fitness', label: PILLAR_DISPLAY.cardio.short, icon: Heart },
          ].map((action) => (
            <Button
              key={action.id}
              variant="outline"
              onClick={() => handleNewAssessment(action.id as 'lifestyle' | 'bodycomp' | 'posture' | 'strength' | 'fitness')}
              className="flex flex-col items-center gap-2 h-auto py-3 sm:py-4 rounded-xl border-border hover:border-primary/20 hover:bg-muted"
            >
              <action.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <span className="text-[10px] font-bold text-foreground-secondary uppercase tracking-[0.15em]">{action.label}</span>
            </Button>
          ))}
        </div>
      </CollapsibleSection>

      {currentAssessment && scores && (
        <CollapsibleSection
          title="Coach Summary"
          icon={<ClipboardList className="h-5 w-5 text-primary" />}
          defaultOpen
        >
          <CoachSummaryContent formData={currentAssessment.formData} scores={scores} />
        </CollapsibleSection>
      )}

      <CollapsibleSection
        title="Posture Comparison"
        icon={<UserCheck className="h-5 w-5 text-primary" />}
        defaultOpen={(snapshots ?? []).length >= 2}
      >
        <PostureComparisonCard snapshots={snapshots ?? []} />
      </CollapsibleSection>
    </div>
  );
}
