import { LANDING_CAPABILITY_VISUAL_COPY } from '@/constants/landingCopy';

export function CaptureCapabilityGraphic() {
  const c = LANDING_CAPABILITY_VISUAL_COPY.capture;
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 sm:flex-row sm:items-end sm:gap-5">
      <div className="relative w-[9.75rem] shrink-0 rounded-[1.65rem] border-[3px] border-landing-contrast-border bg-landing-contrast-bg shadow-xl">
        <div className="relative aspect-[9/16] overflow-hidden rounded-[1.35rem]">
          <div className="absolute inset-0 bg-gradient-to-b from-landing-contrast-surface to-landing-contrast-bg" />
          <div className="pointer-events-none absolute inset-3 rounded-lg border border-white/25" />
          <div className="pointer-events-none absolute left-4 top-4 h-3 w-3 border-l-2 border-t-2 border-white/50" />
          <div className="pointer-events-none absolute right-4 top-4 h-3 w-3 border-r-2 border-t-2 border-white/50" />
          <div className="pointer-events-none absolute bottom-12 left-4 h-3 w-3 border-b-2 border-l-2 border-white/50" />
          <div className="pointer-events-none absolute bottom-12 right-4 h-3 w-3 border-b-2 border-r-2 border-white/50" />
          <div className="absolute inset-0 flex flex-col items-center justify-center pb-8 pt-4">
            <div className="relative h-28 w-14">
              <div className="absolute left-1/2 top-0 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white/45" />
              <div className="absolute left-1/2 top-[1.15rem] h-[4.5rem] w-px -translate-x-1/2 bg-background/35" />
              <div className="absolute left-1/2 top-[3.25rem] h-px w-10 -translate-x-1/2 bg-background/35" />
              <div className="absolute bottom-2 left-1/2 h-7 w-px -translate-x-1/2 bg-background/35" />
              <div className="absolute bottom-2 left-[calc(50%-1.1rem)] h-px w-4 rotate-[68deg] bg-background/30" />
              <div className="absolute bottom-2 right-[calc(50%-1.1rem)] h-px w-4 -rotate-[68deg] bg-background/30" />
            </div>
          </div>
          <p className="absolute bottom-2.5 left-0 right-0 text-center text-[9px] font-semibold uppercase tracking-wide text-white/75">
            {c.poseGuideLabel}
          </p>
          <p className="absolute top-2.5 left-0 right-0 text-center text-[8px] font-medium text-white/50">
            {c.framingHint}
          </p>
        </div>
      </div>

      <div className="w-full max-w-[11rem] space-y-2 rounded-2xl border border-border bg-card p-3.5 shadow-md dark:border-border dark:bg-card sm:mb-1">
        <p className="text-[10px] font-bold uppercase tracking-wide text-foreground-tertiary">
          {c.bodyCompTitle}
        </p>
        <div className="flex items-center justify-between gap-2 border-b border-border pb-2 text-xs dark:border-border">
          <span className="text-muted-foreground">{c.weightRow}</span>
          <span className="font-semibold tabular-nums text-foreground">
            {c.weightValue}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">{c.bodyFatRow}</span>
          <span className="font-semibold tabular-nums text-foreground">
            {c.bodyFatValue}
          </span>
        </div>
        <p className="text-center text-[10px] font-medium text-primary">{c.confirmHint}</p>
      </div>
    </div>
  );
}
