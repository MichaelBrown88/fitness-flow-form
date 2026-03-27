/**
 * Coach Report — one-page phased overview: goals, starting point, phases, good/needs work/avoid, lifestyle, nutrition.
 */

import type { CoachPlan, BodyCompInterpretation } from '@/lib/recommendations';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring';
import { Target, CheckCircle, AlertCircle, XCircle, Moon, Utensils } from 'lucide-react';
import { dedupeTrimmedStrings } from '@/lib/utils/stringListDedupe';
import { COACH_REPORT_COPY } from '@/constants/coachReport';

export default function CoachReport({
  plan,
  scores,
  bodyComp,
  formData,
}: {
  plan: CoachPlan;
  scores: ScoreSummary;
  bodyComp?: BodyCompInterpretation;
  formData?: FormData;
  highlightCategory?: string;
}) {
  if (!scores || !scores.categories || scores.categories.length === 0) {
    return (
      <div className="rounded-md border border-score-amber-muted bg-score-amber-light p-4 text-sm text-score-amber-fg">
        {COACH_REPORT_COPY.RESULTS_UNAVAILABLE}
      </div>
    );
  }

  const C = COACH_REPORT_COPY;
  const clientName = (formData?.fullName || '').trim();
  const goals = Array.isArray(formData?.clientGoals) ? (formData.clientGoals as string[]) : [];
  const overall = Math.round(scores.overall);
  const phase1Consider = dedupeTrimmedStrings([...plan.keyIssues, ...plan.internalNotes.needsAttention], 4);
  const needsWork = dedupeTrimmedStrings([...plan.keyIssues, ...plan.internalNotes.needsAttention]);
  const focus = plan.coachExerciseLists?.priorities.focus ?? plan.programmingStrategies?.[0]?.title ?? '';
  const actionPlan = plan.clientScript.actionPlan ?? [];
  const outlook = plan.clientScript.threeMonthOutlook ?? [];
  const outlookText = outlook.length > 0 ? outlook.join(' ') : C.OUTLOOK_FALLBACK;
  const avoidHints = [
    plan.coachExerciseLists?.issueSpecific.postural.length ? 'postural corrections' : null,
    plan.coachExerciseLists?.issueSpecific.mobility.length ? 'high-load mobility' : null,
    plan.coachExerciseLists?.issueSpecific.asymmetry.length ? 'loaded asymmetry' : null,
  ].filter(Boolean) as string[];
  const avoidCopy =
    avoidHints.length > 0
      ? `Minimise or modify: ${avoidHints.join(', ')} until baseline improves. Reintroduce when ${outlookText.slice(0, 60)}${outlookText.length > 60 ? '…' : ''}.`
      : needsWork.length > 0
        ? `Focus on foundations first; reintroduce advanced work when ${outlookText.slice(0, 80)}${outlookText.length > 80 ? '…' : ''}.`
        : null;

  const hasLifestyle = bodyComp?.lifestyle || formData;
  const hasNutrition =
    bodyComp?.nutrition &&
    (bodyComp.nutrition.calorieRange ||
      bodyComp.nutrition.proteinTarget ||
      bodyComp.nutrition.hydration ||
      bodyComp.nutrition.carbTiming);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-foreground">{clientName || C.CLIENT_FALLBACK}</h2>
          <span className="text-2xl font-bold text-foreground tabular-nums" aria-label={C.OVERALL_SCORE_ARIA}>
            {overall}
          </span>
        </div>
        {goals.length > 0 && (
          <p className="text-sm leading-relaxed text-foreground-secondary mb-3">
            <span className="font-semibold text-foreground">{C.PRIMARY_GOAL_LABEL}</span>
            {goals[0].replace(/-/g, ' ')}
            {goals.length > 1 && (
              <>
                {' · '}
                <span className="font-semibold text-foreground">{C.SECONDARY_GOAL_LABEL}</span>
                {goals.slice(1).map((g) => g.replace(/-/g, ' ')).join(', ')}
              </>
            )}
          </p>
        )}
        <p className="text-sm leading-relaxed text-foreground-secondary">
          <span className="font-semibold text-foreground">{C.STARTING_POINT_LABEL}</span>
          {plan.clientScript.findings?.[0] ?? phase1Consider[0] ?? C.STARTING_POINT_FALLBACK}
        </p>
        {phase1Consider.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground-secondary mb-2">
              {C.CONSIDER_PHASE_1}
            </p>
            <ul className="list-disc list-inside text-sm leading-relaxed text-foreground space-y-1">
              {phase1Consider.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
        <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
          <Target className="h-4 w-4 text-primary shrink-0" />
          {C.PHASES_TITLE}
        </h3>
        <div className="space-y-5 text-sm leading-relaxed">
          <div>
            <p className="font-semibold text-foreground mb-1.5">{C.PHASE_1_NOW}</p>
            <p className="text-foreground-secondary mb-2">{focus}</p>
            {actionPlan.length > 0 && (
              <ul className="list-disc list-inside text-foreground-secondary space-y-1">
                {actionPlan.slice(0, 4).map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1.5">{C.WHEN_TO_PROGRESS}</p>
            <p className="text-foreground-secondary">{outlookText}</p>
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1.5">{C.PHASE_2_THEN_3_TITLE}</p>
            <p className="text-foreground-secondary">{C.PHASE_2_THEN_3_BODY}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
        <h3 className="text-base font-bold text-foreground mb-4">{C.AT_A_GLANCE}</h3>
        <div className="grid gap-6 sm:grid-cols-3 text-sm leading-relaxed">
          {plan.internalNotes.doingWell.length > 0 && (
            <div className="min-w-0">
              <p className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-score-green shrink-0" />
                {C.GOOD}
              </p>
              <ul className="list-disc list-inside text-foreground-secondary space-y-1">
                {plan.internalNotes.doingWell.slice(0, 3).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {needsWork.length > 0 && (
            <div className="min-w-0">
              <p className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-score-amber shrink-0" />
                {C.NEEDS_WORK}
              </p>
              <ul className="list-disc list-inside text-foreground-secondary space-y-1">
                {needsWork.slice(0, 4).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {avoidCopy && (
            <div className="min-w-0 sm:col-span-1">
              <p className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <XCircle className="h-4 w-4 text-foreground-secondary shrink-0" />
                {C.AVOID_WHEN_OK}
              </p>
              <p className="text-foreground-secondary">{avoidCopy}</p>
            </div>
          )}
        </div>
      </section>

      {(hasLifestyle || hasNutrition) && (
        <div className="grid gap-6 sm:grid-cols-2">
          {hasLifestyle && (
            <section className="rounded-xl border border-border bg-muted/30 p-4 sm:p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-secondary mb-3 flex items-center gap-2">
                <Moon className="h-4 w-4 shrink-0" />
                {C.LIFESTYLE}
              </h3>
              <div className="text-sm leading-relaxed text-foreground-secondary space-y-2">
                {bodyComp?.lifestyle?.sleep && (
                  <p>
                    <span className="font-medium text-foreground">{C.LABEL_SLEEP}</span> {bodyComp.lifestyle.sleep}
                  </p>
                )}
                {bodyComp?.lifestyle?.stress && (
                  <p>
                    <span className="font-medium text-foreground">{C.LABEL_STRESS}</span> {bodyComp.lifestyle.stress}
                  </p>
                )}
                {bodyComp?.lifestyle?.dailyMovement && (
                  <p>
                    <span className="font-medium text-foreground">{C.LABEL_DAILY_MOVEMENT}</span>{' '}
                    {bodyComp.lifestyle.dailyMovement}
                  </p>
                )}
                {bodyComp?.lifestyle?.inflammationReduction && (
                  <p>
                    <span className="font-medium text-foreground">{C.LABEL_INFLAMMATION}</span>{' '}
                    {bodyComp.lifestyle.inflammationReduction}
                  </p>
                )}
                {formData?.stressLevel && !bodyComp?.lifestyle?.stress && (
                  <p>
                    <span className="font-medium text-foreground">{C.LABEL_STRESS}</span>{' '}
                    {String(formData.stressLevel).replace(/-/g, ' ')}
                  </p>
                )}
                {formData?.sleepQuality && !bodyComp?.lifestyle?.sleep && (
                  <p>
                    <span className="font-medium text-foreground">{C.LABEL_SLEEP}</span>{' '}
                    {String(formData.sleepQuality).replace(/-/g, ' ')}
                  </p>
                )}
                {!bodyComp?.lifestyle?.sleep &&
                  !bodyComp?.lifestyle?.stress &&
                  !bodyComp?.lifestyle?.dailyMovement &&
                  !bodyComp?.lifestyle?.inflammationReduction &&
                  !formData?.stressLevel &&
                  !formData?.sleepQuality && <p className="italic">{C.NO_LIFESTYLE_DATA}</p>}
              </div>
            </section>
          )}
          {hasNutrition && bodyComp?.nutrition && (
            <section className="rounded-xl border border-border bg-muted/30 p-4 sm:p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-secondary mb-3 flex items-center gap-2">
                <Utensils className="h-4 w-4 shrink-0" />
                {C.NUTRITION}
              </h3>
              <div className="text-sm leading-relaxed text-foreground-secondary space-y-2">
                {bodyComp.nutrition.calorieRange && (
                  <p>
                    <span className="font-medium text-foreground">{C.LABEL_ENERGY}</span>{' '}
                    {bodyComp.nutrition.calorieRange}
                  </p>
                )}
                {bodyComp.nutrition.proteinTarget && (
                  <p>
                    <span className="font-medium text-foreground">{C.LABEL_PROTEIN}</span>{' '}
                    {bodyComp.nutrition.proteinTarget}
                  </p>
                )}
                {bodyComp.nutrition.hydration && (
                  <p>
                    <span className="font-medium text-foreground">{C.LABEL_HYDRATION}</span>{' '}
                    {bodyComp.nutrition.hydration}
                  </p>
                )}
                {bodyComp.nutrition.carbTiming && (
                  <p>
                    <span className="font-medium text-foreground">{C.LABEL_CARB_TIMING}</span>{' '}
                    {bodyComp.nutrition.carbTiming}
                  </p>
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
