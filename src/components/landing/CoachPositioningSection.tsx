import { Check } from 'lucide-react';
import SectionHeader from '@/components/landing/SectionHeader';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import {
  LANDING_COPY,
  LANDING_COACH_POSITIONING_BULLETS,
  LANDING_H2_ACCENT_LIGHT,
} from '@/constants/landingCopy';

export function CoachPositioningSection() {
  const headerRef = useScrollReveal({ staggerDelay: 120, staggerIndex: 0 });
  const bodyRef = useScrollReveal({ staggerDelay: 120, staggerIndex: 1 });

  return (
    <section
      className="relative overflow-hidden border-t border-slate-200/80 bg-white px-6 py-20 dark:border-border dark:bg-background sm:py-28"
      aria-labelledby="coach-positioning-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute left-[-10%] top-[25%] h-96 w-96 rounded-full bg-indigo-100/35 blur-3xl dark:bg-indigo-950/20" />
        <div className="absolute bottom-[15%] right-[-8%] h-80 w-80 rounded-full bg-violet-100/20 blur-3xl dark:bg-violet-950/15" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        <div ref={headerRef}>
          <SectionHeader
            pill={LANDING_COPY.coachPositioningPill}
            title={
              <span id="coach-positioning-heading">
                {LANDING_COPY.coachPositioningTitleBefore}
                <span className={LANDING_H2_ACCENT_LIGHT}>
                  {LANDING_COPY.coachPositioningTitleAccent}
                </span>
              </span>
            }
            subtitle={LANDING_COPY.coachPositioningSubtitle}
            align="center"
            spacing="mb-10 sm:mb-12"
          />
        </div>

        <div ref={bodyRef} className="mx-auto max-w-2xl">
          <ul className="space-y-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-white/80 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/45">
            {LANDING_COACH_POSITIONING_BULLETS.map((line, index) => (
              <li
                key={line}
                className={`flex gap-4 px-5 py-4 text-left text-sm font-medium leading-relaxed text-slate-600 sm:gap-5 sm:px-7 sm:py-5 sm:text-base dark:text-slate-300 ${
                  index > 0 ? 'border-t border-slate-100 dark:border-slate-700/80' : ''
                }`}
              >
                <span
                  className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300"
                  aria-hidden
                >
                  <Check className="size-4" strokeWidth={2.5} />
                </span>
                <span className="text-balance">{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
