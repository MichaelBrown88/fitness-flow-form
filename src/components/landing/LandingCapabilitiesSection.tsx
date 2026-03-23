import SectionHeader from '@/components/landing/SectionHeader';
import { LandingCapabilityRow } from '@/components/landing/LandingCapabilityRow';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import {
  LANDING_CAPABILITY_ROWS,
  LANDING_COPY,
  LANDING_H2_ACCENT_LIGHT,
} from '@/constants/landingCopy';

export function LandingCapabilitiesSection() {
  const headerRef = useScrollReveal({ staggerDelay: 150, staggerIndex: 0 });
  const row0Ref = useScrollReveal({ staggerDelay: 150, staggerIndex: 1 });
  const row1Ref = useScrollReveal({ staggerDelay: 150, staggerIndex: 2 });
  const row2Ref = useScrollReveal({ staggerDelay: 150, staggerIndex: 3 });
  const rowRefs = [row0Ref, row1Ref, row2Ref] as const;

  return (
    <section
      id="features"
      className="relative overflow-hidden border-t border-slate-200/80 bg-white px-6 py-24 dark:border-border dark:bg-background sm:py-32"
    >
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute right-[-6%] top-[18%] h-96 w-96 rounded-full bg-slate-300/14 blur-3xl dark:bg-slate-800/25" />
        <div className="absolute bottom-[12%] left-[-8%] h-96 w-96 rounded-full bg-gradient-light/30 blur-3xl dark:bg-slate-800/20" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        <div ref={headerRef}>
          <SectionHeader
            pill={LANDING_COPY.capabilitiesPill}
            title={
              <>
                {LANDING_COPY.capabilitiesSectionTitleBefore}
                <span className={LANDING_H2_ACCENT_LIGHT}>
                  {LANDING_COPY.capabilitiesSectionTitleAccent}
                </span>
              </>
            }
            subtitle={LANDING_COPY.capabilitiesSectionSubtitle}
            spacing="mb-16 sm:mb-20"
          />
        </div>

        <div className="flex flex-col gap-12 lg:gap-16">
          {LANDING_CAPABILITY_ROWS.map((row, i) => (
            <LandingCapabilityRow key={row.title} ref={rowRefs[i]} row={row} />
          ))}
        </div>

        <div
          className="mt-14 rounded-2xl border border-slate-200/90 bg-white/80 px-6 py-8 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/45 sm:mt-20 sm:px-8 sm:py-10"
          aria-label={LANDING_COPY.capabilitiesComplianceAriaLabel}
        >
          <p className="mb-5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
            {LANDING_COPY.capabilitiesComplianceHeading}
          </p>
          <div className="flex flex-wrap gap-3">
            <div className="flex min-h-11 min-w-[44px] items-center gap-3 rounded-2xl border border-slate-200/90 bg-white/90 px-3.5 py-2 shadow-sm dark:border-slate-600 dark:bg-slate-950/50">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-gradient-from to-gradient-to text-[10px] font-bold text-primary-foreground">
                {LANDING_COPY.capabilitiesHipaaBadgeAbbrev}
              </div>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {LANDING_COPY.capabilitiesCompliantLabel}
              </span>
            </div>
            <div className="flex min-h-11 min-w-[44px] items-center gap-3 rounded-2xl border border-slate-200/90 bg-white/90 px-3.5 py-2 shadow-sm dark:border-slate-600 dark:bg-slate-950/50">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-[10px] font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                {LANDING_COPY.capabilitiesGdprBadgeAbbrev}
              </div>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {LANDING_COPY.capabilitiesCompliantLabel}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
