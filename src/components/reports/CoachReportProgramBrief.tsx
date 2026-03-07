/**
 * Program Brief — at-a-glance summary for the coach: who, score, top limitations, session focus, warm-up, watch-outs.
 */

import type { CoachPlan } from '@/lib/recommendations';
import type { ScoreSummary } from '@/lib/scoring';
import type { FormData } from '@/contexts/FormContext';
import { getCoachReportSectionId } from '@/constants/coachReport';

function getTopLimitations(plan: CoachPlan, maxItems: number): string[] {
  const combined = [...plan.keyIssues, ...plan.internalNotes.needsAttention];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of combined) {
    const n = item.trim().toLowerCase();
    if (n && !seen.has(n) && out.length < maxItems) {
      seen.add(n);
      out.push(item.trim());
    }
  }
  return out;
}

function getSessionFocus(plan: CoachPlan): string {
  const focus = plan.coachExerciseLists?.priorities.focus?.trim();
  if (focus) return focus;
  const first = plan.programmingStrategies?.[0];
  if (first) return `${first.title}. ${first.strategy.slice(0, 80)}${first.strategy.length > 80 ? '…' : ''}`;
  return '—';
}

function getWarmUpFocus(plan: CoachPlan): string {
  const warmUp = plan.coachExerciseLists?.warmUp;
  if (!warmUp?.length) return '—';
  const items = warmUp.slice(0, 3).map((w) => w.addresses || w.name).filter(Boolean);
  return items.length ? items.join('; ') : '—';
}

function getWatchOuts(plan: CoachPlan, formData?: FormData | null): string[] {
  const out: string[] = [];
  if (plan.clientScript.actionPlan?.length) {
    plan.clientScript.actionPlan.slice(0, 2).forEach((a) => a.trim() && out.push(a.trim()));
  }
  if (out.length >= 2) return out;
  if (formData?.postureAiResults) {
    const views = Object.values(formData.postureAiResults);
    const hasDeviations = views.some((v) => v && typeof v === 'object' && Object.values(v).some((o: unknown) => (o as { status?: string })?.status && !['Neutral', 'Normal', 'Centered', 'Straight', 'Good', 'Optimal'].includes((o as { status: string }).status)));
    if (hasDeviations && out.length < 2) out.push('Posture deviations noted — see Posture section.');
  }
  return out.slice(0, 2);
}

interface CoachReportProgramBriefProps {
  clientName: string;
  scores: ScoreSummary;
  plan: CoachPlan;
  formData?: FormData | null;
}

export function CoachReportProgramBrief({ clientName, scores, plan, formData }: CoachReportProgramBriefProps) {
  const overall = Math.round(scores.overall);
  const topLimitations = getTopLimitations(plan, 3);
  const sessionFocus = getSessionFocus(plan);
  const warmUpFocus = getWarmUpFocus(plan);
  const watchOuts = getWatchOuts(plan, formData);

  return (
    <section
      id={getCoachReportSectionId('brief')}
      className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm transition-apple"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
        <h2 className="text-lg font-bold text-foreground truncate">{clientName || 'Client'}</h2>
        <span className="text-2xl font-bold text-foreground tabular-nums">{overall}</span>
      </div>
      <dl className="grid gap-3 text-sm">
        {topLimitations.length > 0 && (
          <>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-foreground-secondary">Top limitations</dt>
            <dd className="text-foreground">
              <ul className="list-disc list-inside space-y-0.5">
                {topLimitations.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </dd>
          </>
        )}
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-foreground-secondary">Session focus</dt>
          <dd className="text-foreground mt-0.5">{sessionFocus}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-foreground-secondary">Warm-up focus</dt>
          <dd className="text-foreground mt-0.5">{warmUpFocus}</dd>
        </div>
        {watchOuts.length > 0 && (
          <>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-foreground-secondary">Watch-outs</dt>
            <dd className="text-foreground">
              <ul className="list-disc list-inside space-y-0.5">
                {watchOuts.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </dd>
          </>
        )}
      </dl>
    </section>
  );
}
