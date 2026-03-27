import { useState, useEffect, useMemo, useCallback, lazy, Suspense, type ReactNode } from 'react';
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
  Zap,
  AlertCircle,
} from 'lucide-react';
import { PostureComparisonCard } from '@/components/client/PostureComparisonCard';
import { ClientCheckinStrip } from '@/components/client/ClientCheckinStrip';
import { getClientCheckinHints } from '@/lib/clientCheckinHints';
import type { ClientDetailOutletContext } from './ClientDetailLayout';
import { computeScores } from '@/lib/scoring';
import { generateCoachPlan, generateBodyCompInterpretation, type CoachPlan } from '@/lib/recommendations';
import { getLatestPreSessionCheckin, type PreSessionCheckinPayload } from '@/services/publicReports';
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
    <div className="rounded-2xl bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 p-4 sm:p-6 hover:bg-muted/50 transition-colors"
      >
        <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2 min-w-0 truncate">
          <span className="shrink-0">{icon}</span>
          <span className="truncate">{title}</span>
        </h3>
        <div className="flex items-center gap-2 shrink-0">
          {badge}
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {open && <div className="px-4 sm:px-6 pb-4 sm:pb-6">{children}</div>}
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
    generateCoachPlan(formData, scores).then(setPlan);
    // CoachSummaryContent mounts only when the coach summary section is expanded; run once per mount
    // to avoid re-calling the AI/plan pipeline on every parent re-render with the same snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot on expand; parent remounts when collapsed
  }, []);

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
      <CoachReport plan={plan} scores={scores} bodyComp={bodyComp} formData={formData} />
    </Suspense>
  );
}

export default function ClientOverview() {
  const ctx = useOutletContext<ClientDetailOutletContext>();
  const {
    currentAssessment,
    categoryBreakdown,
    categoryChanges,
    stats,
    handleNewAssessment,
    profile,
    snapshots,
  } = ctx;

  const checkinHints = useMemo(() => getClientCheckinHints(profile), [profile]);

  const scores = useMemo(
    () => currentAssessment ? computeScores(currentAssessment.formData) : null,
    [currentAssessment],
  );

  const shareToken = profile?.shareToken;
  type PreSessionCheckin = PreSessionCheckinPayload & { createdAt: Date; id: string };
  const [preSessionCheckin, setPreSessionCheckin] = useState<PreSessionCheckin | null>(null);
  const [checkinDismissed, setCheckinDismissed] = useState(false);

  const loadPreSessionCheckin = useCallback(async () => {
    if (!shareToken) return;
    try {
      const checkin = await getLatestPreSessionCheckin(shareToken);
      setPreSessionCheckin(checkin);
    } catch {
      // non-fatal — pre-session check-in is optional
    }
  }, [shareToken]);

  useEffect(() => {
    void loadPreSessionCheckin();
  }, [loadPreSessionCheckin]);

  return (
    <div className="space-y-8">
      {profile && checkinHints.length > 0 ? (
        <ClientCheckinStrip
          hints={checkinHints}
          onRun={(id) => {
            void handleNewAssessment(id === 'lifestyle' ? 'lifestyle' : 'posture');
          }}
        />
      ) : null}
      <CollapsibleSection title="Overview" icon={<TrendingUp className="h-5 w-5 text-primary" />}>
        <div className="grid gap-2 sm:gap-3 grid-cols-2 md:grid-cols-4">
          <div className="rounded-xl bg-muted p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-2">Total</div>
            <div className="text-2xl font-bold text-foreground">{stats.totalAssessments}</div>
          </div>
          <div className="rounded-xl bg-muted p-4">
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
          <div className="rounded-xl bg-muted p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-2">Average</div>
            <div className="text-2xl font-bold text-foreground">{stats.averageScore}</div>
          </div>
          <div className="rounded-xl bg-muted p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-2">Change</div>
            <div className={`text-2xl font-bold ${stats.scoreChange > 0 ? 'text-score-green-fg' : stats.scoreChange < 0 ? 'text-score-red-fg' : 'text-foreground'}`}>
              {stats.scoreChange > 0 ? '+' : ''}{stats.scoreChange}
            </div>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Pillar Scores" icon={<Activity className="h-5 w-5 text-primary" />}>
        {!currentAssessment ? (
          <div className="py-12 text-center bg-muted rounded-xl">
            <p className="text-sm text-muted-foreground mb-6">No assessment data found for this client.</p>
            <Button onClick={() => handleNewAssessment()} className="bg-foreground text-white rounded-xl h-12 px-8">
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
              <div key={cat.id} className="text-center p-4 sm:p-5 rounded-xl bg-muted transition-all hover:bg-muted">
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

      {preSessionCheckin && !checkinDismissed && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-amber-900">Pre-session note</span>
            </div>
            <button
              type="button"
              onClick={() => setCheckinDismissed(true)}
              className="text-xs text-amber-600 hover:text-amber-800 font-medium shrink-0"
            >
              Dismiss
            </button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3 text-sm">
            {preSessionCheckin.energyLevel !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-600">Energy</span>
                <span className="font-semibold text-amber-900">{preSessionCheckin.energyLevel}/5</span>
              </div>
            )}
            {preSessionCheckin.hasPain !== undefined && (
              <div className="flex items-center gap-2">
                {preSessionCheckin.hasPain
                  ? <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  : null}
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-600">Pain</span>
                <span className={`font-semibold ${preSessionCheckin.hasPain ? 'text-red-700' : 'text-emerald-700'}`}>
                  {preSessionCheckin.hasPain ? 'Yes' : 'No'}
                </span>
              </div>
            )}
            {preSessionCheckin.painDetails && (
              <p className="sm:col-span-3 text-xs text-amber-800 bg-amber-100 rounded-lg px-3 py-2">
                {preSessionCheckin.painDetails}
              </p>
            )}
            {preSessionCheckin.focusArea && (
              <div className="sm:col-span-3">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-600">Focus: </span>
                <span className="text-sm text-amber-900">{preSessionCheckin.focusArea}</span>
              </div>
            )}
          </div>
          <p className="text-[10px] text-amber-500 mt-2">
            Submitted {preSessionCheckin.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
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
              className="flex flex-col items-center gap-2 h-auto py-3 sm:py-4 rounded-xl border-border hover:border-primary/20 hover:bg-brand-light"
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
