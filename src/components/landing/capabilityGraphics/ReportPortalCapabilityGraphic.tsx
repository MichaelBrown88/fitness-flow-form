import { Activity, BarChart3, ChevronDown, Heart, Map } from 'lucide-react';
import { LANDING_CAPABILITY_VISUAL_COPY } from '@/constants/landingCopy';

export function ReportPortalCapabilityGraphic() {
  const r = LANDING_CAPABILITY_VISUAL_COPY.reportPortal;
  const tabs = [
    { label: r.tabOverview, Icon: Activity, active: true },
    { label: r.tabAnalysis, Icon: BarChart3, active: false },
    { label: r.tabMovement, Icon: Heart, active: false },
    { label: r.tabPlan, Icon: Map, active: false },
  ];

  return (
    <div className="relative mx-auto max-w-lg pb-10 pl-1 pr-2 pt-1 sm:pr-8 sm:pb-12">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-md dark:border-border dark:bg-card sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
            {r.reportBadge}
          </span>
          <span className="text-[10px] text-foreground-tertiary">{r.reportDate}</span>
        </div>
        <h4 className="mt-3 text-lg font-bold leading-tight text-foreground sm:text-xl">
          {r.clientNameLine}
        </h4>
        <p className="mt-1 hidden text-xs text-muted-foreground sm:block">{r.reportTagline}</p>

        <div className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border dark:divide-border dark:border-border">
          <div className="flex items-center gap-2.5 bg-muted/50 p-2.5 dark:bg-muted/30">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-card shadow-sm dark:bg-card">
              <Activity className="h-4 w-4 text-muted-foreground" strokeWidth={2.25} />
            </div>
            <span className="min-w-0 flex-1 text-xs font-semibold text-foreground">
              {r.sectionStartingPoint}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-foreground-tertiary" />
          </div>
          <div className="flex items-center gap-2.5 p-2.5 opacity-80">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted dark:bg-muted">
              <BarChart3 className="h-4 w-4 text-muted-foreground" strokeWidth={2.25} />
            </div>
            <span className="min-w-0 flex-1 text-xs font-semibold text-foreground">
              {r.sectionGapAnalysis}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-foreground-tertiary" />
          </div>
        </div>
      </div>

      <div className="absolute -bottom-1 right-0 w-[min(100%,11.75rem)] rounded-2xl border-2 border-primary/35 bg-card shadow-xl dark:border-primary/40 dark:bg-card motion-safe:animate-fade-in-up sm:-right-2 sm:bottom-0 sm:w-[12.5rem]">
        <div className="border-b border-border px-3 py-2 dark:border-border">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-foreground-tertiary">
            {r.linkCaption}
          </p>
          <p className="text-[11px] font-bold text-foreground">{r.mobilePreviewTitle}</p>
        </div>
        <div className="space-y-1.5 bg-muted/90 px-2.5 py-2 dark:bg-muted/40">
          <div className="h-1.5 w-full rounded bg-border/90 dark:bg-border" />
          <div className="h-1.5 w-4/5 rounded bg-border/90 dark:bg-border" />
          <div className="h-1.5 w-3/5 rounded bg-border/90 dark:bg-border" />
        </div>
        <nav className="flex items-stretch justify-between gap-0.5 border-t border-border bg-card px-1 py-1.5">
          {tabs.map(({ label, Icon, active }) => (
            <div
              key={label}
              className={`flex min-h-9 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-0.5 py-1 ${
                active ? 'text-primary' : 'text-foreground-tertiary'
              }`}
            >
              {active ? (
                <div className="h-0.5 w-6 rounded-full bg-primary" />
              ) : (
                <div className="h-0.5 w-6" />
              )}
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
              <span className="max-w-full truncate text-[8px] font-bold uppercase tracking-wide">{label}</span>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
