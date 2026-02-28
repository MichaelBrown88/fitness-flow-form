import { Link } from "react-router-dom";
import {
  ArrowRight,
  Play,
  Activity,
  Scale,
  Zap,
  Check,
  ScanLine,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useScrollProgress } from "@/hooks/useScrollProgress";

export function HeroSection() {
  const { user } = useAuth();
  const { ref: visualRef, progress } = useScrollProgress<HTMLDivElement>();

  // Scroll-driven transforms for the product visual
  const visualOpacity = Math.min(1, progress * 2.5);
  const visualScale = 0.92 + Math.min(0.08, progress * 0.2);
  const visualY = 40 * (1 - Math.min(1, progress * 2));

  return (
    <section className="relative pt-24 sm:pt-32 lg:pt-36 pb-4 px-5 sm:px-6 overflow-hidden">
      {/* Soft Pastel Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-blue-100/40 rounded-full blur-[120px] -z-10 animate-blob mix-blend-multiply" />
      <div className="absolute top-1/2 left-0 w-[800px] h-[800px] bg-indigo-100/40 rounded-full blur-[120px] -z-10 animate-blob animation-delay-2000 mix-blend-multiply" />
      <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-rose-100/40 rounded-full blur-[120px] -z-10 animate-blob animation-delay-4000 mix-blend-multiply" />

      <div className="max-w-5xl mx-auto w-full relative z-10">
        {/* ── Text Block — tight, compact, high hierarchy ── */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12 lg:mb-16">
          {/* Headline — visually dominant, first thing the eye hits */}
          <h1
            className="text-[2.5rem] leading-[1.08] sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4 sm:mb-5 text-slate-900 animate-fade-in-up"
            style={{ animationDelay: "0.05s" }}
          >
            Assess Smarter.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
              Retain Longer.
            </span>
          </h1>

          {/* Subtitle — secondary, tight proximity to headline */}
          <p
            className="text-base sm:text-lg text-slate-500 max-w-md mx-auto mb-6 sm:mb-8 leading-relaxed animate-fade-in-up"
            style={{ animationDelay: "0.15s" }}
          >
            One platform for every assessment. Clients love the reports. You
            love the retention.
          </p>

          {/* CTA cluster — compact inline, clear primary/secondary distinction */}
          <div
            className="flex items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-5 animate-fade-in-up"
            style={{ animationDelay: "0.25s" }}
          >
            {user ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-900/20 group"
              >
                Go to Dashboard
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ) : (
              <>
                {/* Primary — solid, compact */}
                <Link
                  to="/onboarding"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-900/20 group"
                >
                  Start Free Trial
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                {/* Secondary — text link weight, not a competing button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    document
                      .getElementById("how-it-works")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-slate-600" />
                  See Demo
                </button>
              </>
            )}
          </div>

          {/* Trust badges — tight proximity to CTA, reduces friction at decision point */}
          <div
            className="flex items-center justify-center gap-3 text-xs sm:text-sm font-medium text-slate-400 animate-fade-in-up"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>5,000+ assessments</span>
            </div>
            <span className="text-slate-300">·</span>
            <span>14-day free trial</span>
          </div>
        </div>

        {/* ── Product Visual — scroll-driven reveal, peeks above fold ── */}
        <div ref={visualRef} className="relative max-w-2xl lg:max-w-3xl mx-auto">
          <div
            className="will-change-transform"
            style={{
              opacity: visualOpacity,
              transform: `translateY(${visualY}px) scale(${visualScale})`,
            }}
          >
            {/* Main Report Card */}
            <div className="relative bg-white/60 backdrop-blur-xl border border-white/60 rounded-3xl shadow-2xl p-5 sm:p-8">
              {/* Header */}
              <div className="flex justify-between items-start mb-5 sm:mb-8">
                <div>
                  <h3 className="text-lg sm:text-2xl font-bold text-slate-900">
                    Fitness Score
                  </h3>
                  <p className="text-slate-500 text-xs sm:text-sm">
                    Comprehensive Athlete Profile
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-sm">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-[0.15em]">
                    Active
                  </span>
                </div>
              </div>

              {/* Radar Chart Visual */}
              <div className="relative h-44 sm:h-64 w-full flex items-center justify-center mb-5 sm:mb-8">
                {/* Background Circles */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-44 sm:w-64 h-44 sm:h-64 rounded-full border border-slate-200" />
                  <div className="w-32 sm:w-48 h-32 sm:h-48 rounded-full border border-slate-200 absolute" />
                  <div className="w-20 sm:w-32 h-20 sm:h-32 rounded-full border border-slate-200 absolute" />
                </div>

                {/* The Radar Shape */}
                <svg
                  viewBox="0 0 100 100"
                  className="w-full h-full absolute drop-shadow-xl"
                >
                  <polygon
                    points="50,15 85,35 75,80 25,80 15,35"
                    fill="rgba(99, 102, 241, 0.2)"
                    stroke="#6366f1"
                    strokeWidth="2"
                  />
                  <circle cx="50" cy="15" r="3" fill="#6366f1" />
                  <circle cx="85" cy="35" r="3" fill="#6366f1" />
                  <circle cx="75" cy="80" r="3" fill="#6366f1" />
                  <circle cx="25" cy="80" r="3" fill="#6366f1" />
                  <circle cx="15" cy="35" r="3" fill="#6366f1" />
                </svg>

                {/* Center Score */}
                <div className="absolute flex flex-col items-center justify-center bg-white rounded-full w-16 h-16 sm:w-24 sm:h-24 shadow-lg border-4 border-slate-50">
                  <span className="text-xl sm:text-3xl font-black text-slate-900">
                    82
                  </span>
                  <span className="text-[10px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                    Overall
                  </span>
                </div>
              </div>

              {/* Metrics Pills */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="bg-emerald-50 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-emerald-100 flex items-center gap-2 sm:gap-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-emerald-800 uppercase">
                      Body Comp
                    </p>
                    <p className="text-xs sm:text-sm font-bold text-slate-900">
                      18.5% BF
                    </p>
                  </div>
                </div>
                <div className="bg-amber-50 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-amber-100 flex items-center gap-2 sm:gap-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                    <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-amber-800 uppercase">
                      Movement
                    </p>
                    <p className="text-xs sm:text-sm font-bold text-slate-900">
                      85/100
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements — desktop only, add visual interest */}
            <div className="absolute -right-4 sm:-right-8 top-8 sm:top-12 bg-white p-3 sm:p-4 rounded-2xl shadow-xl border border-slate-100 animate-float hidden md:block">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                  <ScanLine size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Body Comp Scan
                  </p>
                  <p className="text-sm font-bold text-slate-900">Imported</p>
                </div>
                <Check
                  className="text-emerald-500 ml-2"
                  size={16}
                  strokeWidth={3}
                />
              </div>
            </div>

            <div
              className="absolute -left-4 sm:-left-6 bottom-16 sm:bottom-24 bg-white p-3 sm:p-4 rounded-2xl shadow-xl border border-slate-100 animate-float hidden md:block"
              style={{ animationDelay: "1s" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600">
                  <Activity size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Forward Head
                  </p>
                  <p className="text-sm font-bold text-slate-900">Detected</p>
                </div>
                <AlertCircle className="text-amber-500 ml-2" size={16} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
