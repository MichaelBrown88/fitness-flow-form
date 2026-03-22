import { Link } from "react-router-dom";
import { LandingTrialCtaLink } from "@/components/landing/LandingTrialCtaLink";
import { LANDING_COPY, landingTrialAriaLabel } from "@/constants/landingCopy";
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
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-blue-100/40 rounded-full blur-[120px] motion-safe:animate-blob mix-blend-multiply" />
        <div className="absolute top-1/2 left-0 w-[800px] h-[800px] bg-indigo-100/40 rounded-full blur-[120px] motion-safe:animate-blob animation-delay-2000 mix-blend-multiply" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-rose-100/40 rounded-full blur-[120px] motion-safe:animate-blob animation-delay-4000 mix-blend-multiply" />
      </div>

      <div className="max-w-6xl mx-auto w-full relative z-10">
        {/* ── Text Block — larger type, clear hierarchy ── */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14 lg:mb-16">
          {/* Headline */}
          <h1
            className="text-balance text-[3rem] leading-[1.06] sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-5 sm:mb-6 text-slate-900 motion-safe:animate-fade-in-up"
            style={{ animationDelay: "0.05s" }}
          >
            {isPricing ? (
              <>
                {LANDING_COPY.heroPricingTitleLine1}
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
                  {LANDING_COPY.heroPricingTitleAccent}
                </span>
              </>
            ) : (
              <>
                Assess Smarter.
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
                  Retain Longer.
                </span>
              </>
            )}
          </h1>

          {/* Subtitle — one block under H1 (copy blends SEO terms into the product line). */}
          <p
            className="text-balance text-lg sm:text-xl md:text-2xl text-slate-600 max-w-xl md:max-w-2xl mx-auto mb-7 sm:mb-10 leading-snug sm:leading-relaxed motion-safe:animate-fade-in-up"
            style={{ animationDelay: "0.15s" }}
          >
            {isPricing ? LANDING_COPY.heroPricingSubtitle : LANDING_COPY.heroSubtitle}
          </p>

          {/* CTA cluster — compact inline, clear primary/secondary distinction */}
          <div
            className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-5 motion-safe:animate-fade-in-up"
            style={{ animationDelay: "0.25s" }}
          >
            {user ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-slate-900 text-white text-base font-semibold hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-900/20 group"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ) : (
              <>
                <LandingTrialCtaLink
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-slate-900 text-white text-base font-semibold hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-900/20 group"
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
                  className="inline-flex items-center gap-2 text-base font-semibold text-slate-700 rounded-full border border-slate-200/90 bg-white/70 px-5 py-3 shadow-sm backdrop-blur-sm hover:border-slate-300 hover:bg-white hover:text-slate-900 transition-colors"
                >
                  <Play className="w-4 h-4 shrink-0 fill-slate-600" aria-hidden />
                  See Demo
                </Link>
              </>
            )}
          </div>

          <p
            className="flex flex-wrap items-center justify-center gap-x-2 text-sm sm:text-base font-medium text-slate-500 motion-safe:animate-fade-in-up"
            style={{ animationDelay: "0.3s" }}
          >
            <Check
              className="h-4 w-4 shrink-0 text-emerald-500"
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
            <div className="relative rounded-3xl border border-white/60 bg-white/60 p-6 shadow-2xl backdrop-blur-xl sm:p-10">
              {/* Header */}
              <div className="mb-6 flex items-start justify-between gap-3 sm:mb-10">
                <div className="min-w-0">
                  <p className="text-xl font-bold text-slate-900 sm:text-3xl">
                    Fitness Score
                  </p>
                  <p className="text-sm text-slate-500 sm:text-base">
                    Comprehensive Athlete Profile
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm sm:px-4 sm:py-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 sm:h-2.5 sm:w-2.5" />
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.15em] sm:text-xs">
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
                      <div className="h-full w-full rounded-full border border-slate-200" />
                      <div className="absolute h-[77%] w-[77%] rounded-full border border-slate-200" />
                      <div className="absolute h-[54%] w-[54%] rounded-full border border-slate-200" />
                    </div>

                    <svg
                      viewBox="0 0 100 100"
                      className="absolute h-full w-full drop-shadow-xl"
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

                    <div className="absolute left-1/2 top-1/2 z-30 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-4 border-slate-50 bg-white shadow-lg sm:h-28 sm:w-28">
                      <span className="text-2xl font-black text-slate-900 sm:text-4xl">
                        82
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 sm:text-xs">
                        Overall
                      </span>
                    </div>
                  </div>

                  {/* Desktop: pillar cards in outer ring (full box); chart lives in inset above */}
                  <HeroRadarPillarsAround />
                </div>
              </div>

              {/* Metrics: two wide pills below lg only */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:hidden">
                <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3 sm:gap-4 sm:rounded-2xl sm:p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 sm:h-11 sm:w-11">
                    <Scale className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase text-emerald-800 sm:text-xs">
                      Body Comp
                    </p>
                    <p className="text-sm font-bold text-slate-900 sm:text-base">
                      18.5% BF
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 p-3 sm:gap-4 sm:rounded-2xl sm:p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 sm:h-11 sm:w-11">
                    <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase text-amber-800 sm:text-xs">
                      Movement
                    </p>
                    <p className="text-sm font-bold text-slate-900 sm:text-base">
                      85/100
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements — md+ only */}
            <div
              className="absolute -left-8 bottom-64 z-10 hidden rounded-2xl border border-emerald-100 bg-white p-3 shadow-xl motion-safe:animate-float sm:-left-10 sm:bottom-72 sm:p-4 lg:-left-12 lg:bottom-80 md:block"
              style={{ animationDelay: "0.4s" }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 sm:h-12 sm:w-12">
                  <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-slate-500 sm:text-sm">
                    Milestone
                  </p>
                  <p className="text-sm font-bold text-slate-900 sm:text-base">
                    Unlocked
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute -right-8 top-[5.25rem] hidden rounded-2xl border border-slate-100 bg-white p-3 shadow-xl motion-safe:animate-float sm:-right-12 sm:top-[6.75rem] sm:p-4 lg:-right-14 md:block">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 sm:h-12 sm:w-12">
                  <ScanLine className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 sm:text-sm">
                    Body Comp Scan
                  </p>
                  <p className="text-sm font-bold text-slate-900 sm:text-base">
                    Imported
                  </p>
                </div>
                <Check
                  className="ml-1 shrink-0 text-emerald-500 sm:ml-2"
                  size={18}
                  strokeWidth={3}
                />
              </div>
            </div>

            <div
              className="absolute -left-8 bottom-28 hidden rounded-2xl border border-slate-100 bg-white p-3 shadow-xl motion-safe:animate-float sm:-left-10 sm:bottom-36 lg:-left-12 lg:bottom-44 sm:p-4 md:block"
              style={{ animationDelay: "1s" }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-rose-600 sm:h-12 sm:w-12">
                  <Activity className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 sm:text-sm">
                    Forward Head
                  </p>
                  <p className="text-sm font-bold text-slate-900 sm:text-base">
                    Detected
                  </p>
                </div>
                <AlertCircle
                  className="ml-1 shrink-0 text-amber-500 sm:ml-2"
                  size={18}
                />
              </div>
            </div>

            <div
              className="absolute -right-8 bottom-16 z-10 hidden rounded-2xl border border-indigo-100 bg-white p-3 shadow-xl motion-safe:animate-float sm:-right-12 sm:bottom-20 sm:p-4 lg:-right-14 lg:bottom-24 md:block"
              style={{ animationDelay: "1.4s" }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 sm:h-11 sm:w-11">
                  <FileCheck className="h-5 w-5 sm:h-[22px] sm:w-[22px]" aria-hidden />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 sm:text-sm">
                    Report
                  </p>
                  <p className="text-sm font-bold text-slate-900 sm:text-base">
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
