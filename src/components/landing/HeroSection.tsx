import { Link } from "react-router-dom";
import { LandingTrialCtaLink } from "@/components/landing/LandingTrialCtaLink";
import {
  LANDING_COPY,
  LANDING_H2_ACCENT_LIGHT_READABLE,
  landingTrialAriaLabel,
} from "@/constants/landingCopy";
import { LANDING_GUEST_CHECKOUT_ENABLED } from "@/constants/platform";
import {
  ArrowRight,
  Play,
  Activity,
  Scale,
  Zap,
  Check,
  ScanLine,
  AlertCircle,
  Sparkles,
  FileCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/constants/routes";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { HeroRadarPillarsAround } from "@/components/landing/HeroRadarPillarsAround";

export type HeroSectionVariant = "home" | "pricing";

export type HeroSectionProps = {
  /** `/` uses brand H1 + heroSubtitle; `/pricing` uses pricing H1 + heroPricingSubtitle. */
  variant?: HeroSectionVariant;
};

export function HeroSection({ variant = "home" }: HeroSectionProps) {
  const { user } = useAuth();
  const isPricing = variant === "pricing";
  /** Fixed-duration entrance after headline CSS stagger — not tied to scroll position. */
  const visualRevealRef = useScrollReveal<HTMLDivElement>({
    staggerIndex: 1,
    staggerDelay: 420,
    distance: 48,
    duration: 1100,
    threshold: 0.04,
  });

  return (
    <section className="relative pt-24 sm:pt-32 lg:pt-36 pb-16 sm:pb-20 lg:pb-24 px-5 sm:px-6">
      {/* Blobs only: overflow hidden here so card shadows / floaters are not clipped */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        aria-hidden
      >
        <div className="absolute left-1/2 top-0 h-[880px] w-[880px] -translate-x-1/2 rounded-full bg-muted/25 blur-[100px] motion-safe:animate-blob dark:bg-muted/8" />
        <div className="absolute left-0 top-1/2 h-[720px] w-[720px] rounded-full bg-muted/15 blur-[100px] motion-safe:animate-blob animation-delay-2000 dark:bg-background-tertiary/20" />
        <div className="absolute bottom-0 right-0 h-[640px] w-[640px] rounded-full bg-foreground/5 blur-[100px] motion-safe:animate-blob animation-delay-4000 dark:bg-background-tertiary/40" />
      </div>

      <div className="max-w-6xl mx-auto w-full relative z-10">
        {/* ── Text Block — larger type, clear hierarchy ── */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14 lg:mb-16">
          {/* Headline */}
          <h1
            className="text-balance mb-5 text-[4rem] font-bold leading-[1.06] tracking-tight text-foreground motion-safe:animate-fade-in-up sm:mb-6 sm:text-8xl md:text-[6rem] lg:text-[7rem]"
            style={{ animationDelay: "0.05s" }}
          >
            {isPricing ? (
              <>
                {LANDING_COPY.heroPricingTitleLine1}
                <br />
                <span className={LANDING_H2_ACCENT_LIGHT_READABLE}>
                  {LANDING_COPY.heroPricingTitleAccent}
                </span>
              </>
            ) : (
              <>
                Assess Smarter<span className="text-primary">.</span>{' '}
                <br />
                Retain Longer<span className="text-primary">.</span>
              </>
            )}
          </h1>

          {/* Subtitle — one block under H1 (copy blends SEO terms into the product line). */}
          <p
            className="mx-auto mb-7 max-w-2xl text-base leading-snug text-muted-foreground motion-safe:animate-fade-in-up sm:mb-10 sm:text-lg sm:leading-relaxed md:max-w-3xl md:text-xl line-clamp-3"
            style={{ animationDelay: "0.15s" }}
          >
            {isPricing ? LANDING_COPY.heroPricingSubtitle : (
              <>
                Fitness assessment software for coaches and gyms. AI posture checks, professional reports, and a clear{' '}
                <strong className="text-foreground">AXIS Score™</strong>
                {' '}for clients.{' '}
                <strong className="text-foreground">ARC™</strong>
                {' '}plans and milestones between sessions — less admin for you.
              </>
            )}
          </p>

          {/* CTA cluster — compact inline, clear primary/secondary distinction */}
          <div
            className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-5 motion-safe:animate-fade-in-up"
            style={{ animationDelay: "0.25s" }}
          >
            {user && !user.isAnonymous ? (
              <Link
                to={ROUTES.DASHBOARD}
                className="group inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-md transition-all hover:opacity-90 active:scale-[0.99]"
              >
                {LANDING_COPY.heroLoggedInDashboardCta}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ) : user?.isAnonymous ? (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  to={ROUTES.ASSESSMENT}
                  className="group inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-md transition-all hover:opacity-90 active:scale-[0.99]"
                >
                  {LANDING_COPY.heroAnonymousContinueTrial}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link
                  to={ROUTES.SIGNUP}
                  className="inline-flex items-center gap-2 rounded-xl border border-border/90 bg-card/90 px-5 py-3 text-base font-semibold text-foreground shadow-sm backdrop-blur-sm transition-colors hover:border-border-medium hover:bg-card dark:border-border dark:bg-card/90"
                >
                  {LANDING_COPY.heroAnonymousCreateAccount}
                </Link>
              </div>
            ) : (
              <>
                <LandingTrialCtaLink
                  className="group inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-md transition-all hover:opacity-90 active:scale-[0.99]"
                  ariaLabel={landingTrialAriaLabel(
                    "hero",
                    LANDING_GUEST_CHECKOUT_ENABLED,
                  )}
                >
                  Start Free Trial
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </LandingTrialCtaLink>
                <Link
                  to="/demo"
                  className="inline-flex items-center gap-2 rounded-xl border border-border/90 bg-card/90 px-5 py-3 text-base font-semibold text-foreground shadow-sm backdrop-blur-sm transition-colors hover:border-border-medium hover:bg-card dark:border-border dark:bg-card/90"
                >
                  <Play className="h-4 w-4 shrink-0 fill-muted-foreground" aria-hidden />
                  See Demo
                </Link>
              </>
            )}
          </div>

          <p
            className="flex flex-wrap items-center justify-center gap-x-2 text-sm font-medium text-muted-foreground motion-safe:animate-fade-in-up sm:text-base"
            style={{ animationDelay: "0.3s" }}
          >
            <Check
              className="h-4 w-4 shrink-0 text-primary"
              aria-hidden
            />
            <span className="text-center text-balance">{LANDING_COPY.heroTrustMicro}</span>
          </p>
        </div>

        {/* ── Product Visual — intersection-triggered reveal (pace independent of scroll speed) ── */}
        <div
          ref={visualRevealRef}
          className="relative mx-auto max-w-3xl lg:max-w-4xl xl:max-w-5xl pb-6 md:pb-12 motion-safe:will-change-transform"
          aria-hidden
        >
          <div className="relative">
            {/* Main Report Card (decorative preview — parent has aria-hidden) */}
            <div className="relative rounded-lg border border-border/80 bg-card/90 p-6 shadow-md backdrop-blur-md dark:border-border dark:bg-card/95 dark:shadow-lg dark:shadow-black/35 sm:p-10">
              {/* Header */}
              <div className="mb-6 flex items-start justify-between gap-3 sm:mb-10">
                <div className="min-w-0">
                  <p className="text-xl font-bold text-foreground sm:text-3xl">
                    AXIS Score™
                  </p>
                  <p className="text-sm text-muted-foreground sm:text-base">
                    Five-pillar fitness profile
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 rounded-full bg-card px-3 py-1.5 shadow-sm dark:bg-background-secondary sm:px-4 sm:py-2">
                  <div className="h-2 w-2 rounded-full bg-score-green sm:h-2.5 sm:w-2.5" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-foreground sm:text-xs">
                    Active
                  </span>
                </div>
              </div>

              {/* Radar chart: inset graphic on lg+ so pillar cards sit in the outer margin (not on the polygon) */}
              <div className="relative mb-6 flex w-full justify-center overflow-visible sm:mb-10 lg:mb-12">
                <div className="relative aspect-square h-52 w-52 shrink-0 overflow-visible sm:h-72 sm:w-72 lg:h-[22rem] lg:w-[22rem] xl:h-[23rem] xl:w-[23rem]">
                  {/* Background Circles + SVG + score — inset on large screens */}
                  <div className="absolute inset-0 lg:inset-[12%]">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-full w-full rounded-full border border-border dark:border-border/70" />
                      <div className="absolute h-[77%] w-[77%] rounded-full border border-border dark:border-border/70" />
                      <div className="absolute h-[54%] w-[54%] rounded-full border border-border dark:border-border/70" />
                    </div>

                    <svg
                      viewBox="0 0 100 100"
                      className="absolute h-full w-full drop-shadow-xl dark:opacity-90"
                      aria-hidden
                    >
                      <polygon
                        points="50,15 85,35 75,80 25,80 15,35"
                        fill="color-mix(in srgb, var(--gradient-from-hex) 22%, transparent)"
                        stroke="var(--gradient-from-hex)"
                        strokeWidth="2"
                      />
                      <circle cx="50" cy="15" r="3" fill="var(--gradient-from-hex)" />
                      <circle cx="85" cy="35" r="3" fill="var(--gradient-from-hex)" />
                      <circle cx="75" cy="80" r="3" fill="var(--gradient-from-hex)" />
                      <circle cx="25" cy="80" r="3" fill="var(--gradient-from-hex)" />
                      <circle cx="15" cy="35" r="3" fill="var(--gradient-from-hex)" />
                    </svg>

                    <div className="absolute left-1/2 top-1/2 z-30 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-4 border-background bg-card shadow-lg dark:border-border dark:bg-background-secondary sm:h-28 sm:w-28">
                      <span className="text-2xl font-black text-foreground sm:text-4xl">
                        82
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground sm:text-xs">
                        AXIS Score™
                      </span>
                    </div>
                  </div>

                  {/* Desktop: pillar cards in outer ring (full box); chart lives in inset above */}
                  <HeroRadarPillarsAround />
                </div>
              </div>

              {/* Metrics: two wide pills below lg only */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:hidden">
                <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-muted/60 p-3 dark:border-border dark:bg-background-tertiary/60 sm:gap-4 sm:p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground/70 dark:bg-background-secondary dark:text-foreground/60 sm:h-11 sm:w-11">
                    <Scale className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase text-foreground sm:text-xs">
                      Body Comp
                    </p>
                    <p className="text-sm font-bold text-foreground sm:text-base">
                      18.5% BF
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-border/90 bg-muted/80 p-3 dark:border-border dark:bg-background-tertiary/80 sm:gap-4 sm:p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground/70 dark:bg-background-secondary dark:text-foreground/60 sm:h-11 sm:w-11">
                    <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase text-foreground sm:text-xs">
                      Movement
                    </p>
                    <p className="text-sm font-bold text-foreground sm:text-base">
                      85/100
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements — md+ only */}
            <div
              className="absolute -left-8 bottom-64 z-10 hidden rounded-xl border border-border/90 bg-card/95 p-3 shadow-md motion-safe:animate-float dark:border-border dark:bg-card/95 dark:shadow-lg dark:shadow-black/30 sm:-left-10 sm:bottom-72 sm:p-4 lg:-left-12 lg:bottom-80 md:block"
              style={{ animationDelay: "0.4s" }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground/70 dark:bg-background-secondary dark:text-foreground/60 sm:h-12 sm:w-12">
                  <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-muted-foreground sm:text-sm">
                    ARC™ milestone
                  </p>
                  <p className="text-sm font-bold text-foreground sm:text-base">
                    Unlocked
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute -right-8 top-[5.25rem] hidden rounded-xl border border-border/90 bg-card/95 p-3 shadow-md motion-safe:animate-float dark:border-border dark:bg-card/95 dark:shadow-lg dark:shadow-black/30 sm:-right-12 sm:top-[6.75rem] sm:p-4 lg:-right-14 md:block">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-foreground/70 dark:bg-background-secondary dark:text-foreground/60 sm:h-12 sm:w-12">
                  <ScanLine className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground sm:text-sm">
                    Body Comp Scan
                  </p>
                  <p className="text-sm font-bold text-foreground sm:text-base">
                    Imported
                  </p>
                </div>
                <Check
                  className="ml-1 shrink-0 text-score-green dark:text-score-green sm:ml-2"
                  size={18}
                  strokeWidth={3}
                />
              </div>
            </div>

            <div
              className="absolute -left-8 bottom-28 hidden rounded-xl border border-border/90 bg-card/95 p-3 shadow-md motion-safe:animate-float dark:border-border dark:bg-card/95 dark:shadow-lg dark:shadow-black/30 sm:-left-10 sm:bottom-36 lg:-left-12 lg:bottom-44 sm:p-4 md:block"
              style={{ animationDelay: "1s" }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-muted-foreground dark:bg-background-tertiary sm:h-12 sm:w-12">
                  <Activity className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground sm:text-sm">
                    Forward Head
                  </p>
                  <p className="text-sm font-bold text-foreground sm:text-base">
                    Detected
                  </p>
                </div>
                <AlertCircle
                  className="ml-1 shrink-0 text-score-amber sm:ml-2"
                  size={18}
                />
              </div>
            </div>

            <div
              className="absolute -right-8 bottom-16 z-10 hidden rounded-xl border border-border/90 bg-card/95 p-3 shadow-md motion-safe:animate-float dark:border-border dark:bg-card/95 dark:shadow-lg dark:shadow-black/30 sm:-right-12 sm:bottom-20 sm:p-4 lg:-right-14 lg:bottom-24 md:block"
              style={{ animationDelay: "1.4s" }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground/70 dark:bg-background-secondary dark:text-foreground/60 sm:h-11 sm:w-11">
                  <FileCheck className="h-5 w-5 sm:h-[22px] sm:w-[22px]" aria-hidden />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground sm:text-sm">
                    Report
                  </p>
                  <p className="text-sm font-bold text-foreground sm:text-base">
                    Ready to share
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
