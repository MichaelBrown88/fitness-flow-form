import { useState, useEffect, useMemo, lazy, Suspense, type ReactNode } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';
import { PostureComparisonCard } from '@/components/client/PostureComparisonCard';
import type { ClientDetailOutletContext } from './ClientDetailLayout';
import { UI_CLIENT_DETAIL } from '@/constants/ui';
import { computeScores } from '@/lib/scoring';
import { generateCoachPlan, generateBodyCompInterpretation, type CoachPlan } from '@/lib/recommendations';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring/types';

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
    <div className="border-b border-border/50 pb-6 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 py-2 mb-4 hover:opacity-70 transition-opacity"
      >
        <h3 className="text-sm font-semibold text-foreground-secondary flex items-center gap-2 min-w-0 truncate">
          <span className="shrink-0 opacity-50">{icon}</span>
          <span className="truncate">{title}</span>
        </h3>
        <div className="flex items-center gap-2 shrink-0">
          {badge}
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
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
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Generating summary…
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

const TRACKED_PILLARS: { id: 'bodycomp' | 'posture' | 'fitness' | 'strength' | 'lifestyle'; label: string }[] = [
  { id: 'bodycomp', label: 'Body Comp' },
  { id: 'posture', label: 'Posture' },
  { id: 'fitness', label: 'Fitness' },
  { id: 'strength', label: 'Strength' },
  { id: 'lifestyle', label: 'Lifestyle' },
];

export default function ClientOverview() {
  const ctx = useOutletContext<ClientDetailOutletContext>();
  const {
    currentAssessment,
    categoryBreakdown,
    categoryChanges,
    stats,
    handleNewAssessment,
    snapshots,
    profile,
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

  return (
    <div className="space-y-8">
      {baselineStatus && !baselineStatus.isComplete && (
        <div className="rounded-xl border border-score-amber bg-score-amber-muted/40 px-4 py-3">
          <p className="text-sm font-semibold text-foreground mb-2">Baseline incomplete</p>
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
          <div className="rounded-2xl bg-card shadow-sm p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-2">Total</div>
            <div className="text-2xl font-bold text-foreground">{stats.totalAssessments}</div>
          </div>
          <div className="rounded-2xl bg-card shadow-sm p-4">
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
          <div className="rounded-2xl bg-card shadow-sm p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-2">Average</div>
            <div className="text-2xl font-bold text-foreground">{stats.averageScore}</div>
          </div>
          <div className="rounded-2xl bg-card shadow-sm p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-2">Change</div>
            <div className={`text-2xl font-bold ${stats.scoreChange > 0 ? 'text-score-green-fg' : stats.scoreChange < 0 ? 'text-score-red-fg' : 'text-foreground'}`}>
              {stats.scoreChange > 0 ? '+' : ''}{stats.scoreChange}
            </div>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Pillar Scores" icon={<Activity className="h-5 w-5 text-primary" />}>
        {!currentAssessment ? (
          <div className="py-12 text-center bg-card rounded-2xl shadow-sm">
            <p className="text-sm text-muted-foreground mb-6">No assessment data found for this client.</p>
            <Button onClick={() => handleNewAssessment()} className="bg-primary text-primary-foreground h-12 px-8">
              <UserPlus className="h-4 w-4 mr-2" />
              Start First Assessment
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { id: 'lifestyle', label: 'Lifestyle Factors', bg: 'bg-primary', icon: Activity },
              { id: 'bodyComp', label: 'Body Composition', bg: 'bg-primary', icon: Scan },
              { id: 'movementQuality', label: 'Movement Quality', bg: 'bg-primary', icon: UserCheck },
              { id: 'strength', label: 'Functional Strength', bg: 'bg-primary', icon: Dumbbell },
              { id: 'cardio', label: 'Metabolic Fitness', bg: 'bg-primary', icon: Heart },
            ].map((cat) => (
              <div key={cat.id} className="text-center p-4 sm:p-5 rounded-2xl bg-card shadow-sm transition-all hover:shadow-md">
                <div className="flex justify-center mb-3">
                  <cat.icon className="h-6 w-6 text-primary opacity-80" />
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-2">{cat.label}</div>
                <div className="text-3xl font-bold text-foreground mb-1">{categoryBreakdown[cat.id] || 0}</div>
                {categoryChanges[cat.id] !== undefined && categoryChanges[cat.id] !== 0 && (
                  <div className={`text-[10px] font-bold ${categoryChanges[cat.id]! > 0 ? 'text-score-green-fg' : 'text-score-red-fg'}`}>
                    {categoryChanges[cat.id]! > 0 ? '+' : ''}{categoryChanges[cat.id]}
                  </div>
                )}
                <div className="h-2 w-full bg-border/60 rounded-full overflow-hidden mt-2">
                  <div className={`h-full ${cat.bg}`} style={{ width: `${categoryBreakdown[cat.id] || 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

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

      <CollapsibleSection
        title="Posture Comparison"
        icon={<UserCheck className="h-5 w-5 text-primary" />}
        defaultOpen={false}
      >
        <PostureComparisonCard snapshots={snapshots ?? []} />
      </CollapsibleSection>

      {currentAssessment && scores && (
        <CollapsibleSection
          title="Coach Summary"
          icon={<ClipboardList className="h-5 w-5 text-primary" />}
          defaultOpen={false}
        >
          <CoachSummaryContent formData={currentAssessment.formData} scores={scores} />
        </CollapsibleSection>
      )}
    </div>
  );
}
