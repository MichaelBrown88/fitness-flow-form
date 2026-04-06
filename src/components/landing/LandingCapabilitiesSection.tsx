import SectionHeader from '@/components/landing/SectionHeader';
import { LandingCapabilityRow } from '@/components/landing/LandingCapabilityRow';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import {
  LANDING_CAPABILITY_ROWS,
  LANDING_COPY,
  LANDING_H2_ACCENT_LIGHT_READABLE,
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
      className="relative overflow-x-hidden border-t border-border/80 bg-background px-6 py-28 dark:border-border dark:bg-background sm:py-36"
    >
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute right-[-6%] top-[18%] h-96 w-96 rounded-full bg-muted/22 blur-3xl dark:bg-background-tertiary/30" />
        <div className="absolute bottom-[12%] left-[-8%] h-96 w-96 rounded-full bg-muted/15 blur-3xl dark:bg-background-tertiary/25" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        <div ref={headerRef}>
          <SectionHeader
            pill={LANDING_COPY.capabilitiesPill}
            title={
              <>
                {LANDING_COPY.capabilitiesSectionTitleBefore}
                <span className={LANDING_H2_ACCENT_LIGHT_READABLE}>
                  {LANDING_COPY.capabilitiesSectionTitleAccent}
                </span>
              </>
            }
            subtitle={LANDING_COPY.capabilitiesSectionSubtitle}
            subtitleClassName="text-muted-foreground"
            spacing="mb-16 sm:mb-20"
          />
        </div>

        <div className="flex flex-col gap-14 lg:gap-20">
          {LANDING_CAPABILITY_ROWS.map((row, i) => (
            <LandingCapabilityRow key={row.title} ref={rowRefs[i]} row={row} />
          ))}
        </div>

        <div
          className="mt-14 rounded-lg border border-border/90 bg-card/80 px-6 py-8 shadow-sm backdrop-blur-sm dark:border-border dark:bg-card/45 sm:mt-20 sm:px-8 sm:py-10"
          aria-label={LANDING_COPY.capabilitiesComplianceAriaLabel}
        >
          <p className="mb-5 text-[10px] font-black uppercase tracking-[0.15em] text-foreground-tertiary">
            {LANDING_COPY.capabilitiesComplianceHeading}
          </p>
          <div className="flex flex-wrap gap-3">
            <div className="flex min-h-11 min-w-[44px] items-center gap-3 rounded-lg border border-border/90 bg-card/90 px-3.5 py-2 shadow-sm dark:border-border dark:bg-card/50">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-[10px] font-bold text-background dark:bg-foreground/90">
                {LANDING_COPY.capabilitiesHipaaBadgeAbbrev}
              </div>
              <span className="text-sm font-semibold text-foreground">
                {LANDING_COPY.capabilitiesCompliantLabel}
              </span>
            </div>
            <div className="flex min-h-11 min-w-[44px] items-center gap-3 rounded-lg border border-border/90 bg-card/90 px-3.5 py-2 shadow-sm dark:border-border dark:bg-card/50">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-[10px] font-bold text-background dark:bg-foreground dark:text-background">
                {LANDING_COPY.capabilitiesGdprBadgeAbbrev}
              </div>
              <span className="text-sm font-semibold text-foreground">
                {LANDING_COPY.capabilitiesCompliantLabel}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
