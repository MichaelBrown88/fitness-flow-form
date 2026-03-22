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
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-md dark:border-border dark:bg-card sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600 dark:bg-muted dark:text-slate-300">
            {r.reportBadge}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">{r.reportDate}</span>
        </div>
        <h4 className="mt-3 text-lg font-bold leading-tight text-slate-900 dark:text-slate-50 sm:text-xl">
          {r.clientNameLine}
        </h4>
        <p className="mt-1 hidden text-xs text-slate-500 dark:text-slate-400 sm:block">{r.reportTagline}</p>

        <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100 dark:divide-border dark:border-border">
          <div className="flex items-center gap-2.5 bg-slate-50/50 p-2.5 dark:bg-muted/30">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-card">
              <Activity className="h-4 w-4 text-slate-600 dark:text-slate-300" strokeWidth={2.25} />
            </div>
            <span className="min-w-0 flex-1 text-xs font-semibold text-slate-800 dark:text-slate-200">
              {r.sectionStartingPoint}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          </div>
          <div className="flex items-center gap-2.5 p-2.5 opacity-80">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-muted">
              <BarChart3 className="h-4 w-4 text-slate-500 dark:text-slate-400" strokeWidth={2.25} />
            </div>
            <span className="min-w-0 flex-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
              {r.sectionGapAnalysis}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          </div>
        </div>
      </div>

      <div className="absolute -bottom-1 right-0 w-[min(100%,11.75rem)] rounded-2xl border-2 border-indigo-200 bg-white shadow-xl dark:border-indigo-800 dark:bg-card motion-safe:animate-fade-in-up sm:-right-2 sm:bottom-0 sm:w-[12.5rem]">
        <div className="border-b border-slate-100 px-3 py-2 dark:border-border">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {r.linkCaption}
          </p>
          <p className="text-[11px] font-bold text-slate-900 dark:text-slate-50">{r.mobilePreviewTitle}</p>
        </div>
        <div className="space-y-1.5 bg-slate-50/90 px-2.5 py-2 dark:bg-muted/40">
          <div className="h-1.5 w-full rounded bg-slate-200/90 dark:bg-slate-600" />
          <div className="h-1.5 w-4/5 rounded bg-slate-200/90 dark:bg-slate-600" />
          <div className="h-1.5 w-3/5 rounded bg-slate-200/90 dark:bg-slate-600" />
        </div>
        <nav className="flex items-stretch justify-between gap-0.5 border-t border-slate-200 bg-white px-1 py-1.5 dark:border-border dark:bg-card">
          {tabs.map(({ label, Icon, active }) => (
            <div
              key={label}
              className={`flex min-h-9 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-0.5 py-1 ${
                active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {active ? (
                <div className="h-0.5 w-6 rounded-full bg-indigo-500 dark:bg-indigo-400" />
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
