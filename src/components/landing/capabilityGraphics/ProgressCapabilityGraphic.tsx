import { CheckCircle2 } from 'lucide-react';
import { LANDING_CAPABILITY_VISUAL_COPY } from '@/constants/landingCopy';

export function ProgressCapabilityGraphic() {
  const p = LANDING_CAPABILITY_VISUAL_COPY.progress;
  return (
    <div className="mx-auto max-w-sm space-y-4 rounded-lg border border-border bg-card p-5 shadow-sm dark:border-border dark:bg-card">
      <header className="space-y-1 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{p.journeyEyebrow}</p>
        <p className="text-base font-bold text-foreground sm:text-lg">{p.planHeadline}</p>
      </header>

      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
          <span className="font-semibold text-foreground">{p.overallProgress}</span>
          <span className="text-muted-foreground">{p.milestonesSummary}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-[38%] rounded-full bg-primary" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1">
          <div className="h-2 w-2 shrink-0 rounded-full bg-primary" />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {p.phasePill}
          </span>
        </div>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/60 p-3.5 dark:border-emerald-900/50 dark:bg-emerald-950/25">
        <div className="flex gap-3">
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500 bg-emerald-100 dark:border-emerald-600 dark:bg-emerald-900/40">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">{p.milestoneTitle}</span>
              <span className="rounded-full bg-emerald-200/80 px-2 py-0.5 text-[10px] font-semibold text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200">
                {p.completedBadge}
              </span>
            </div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{p.milestoneMeta}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
