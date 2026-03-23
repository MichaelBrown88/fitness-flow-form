import { ArrowRight, Heart, ScanLine, Activity, Smartphone, Dumbbell } from 'lucide-react';
import SectionHeader from '@/components/landing/SectionHeader';
import StickyCardStack from '@/components/ui/StickyCardStack';
import {
  LANDING_COPY,
  LANDING_H2_ACCENT_LIGHT,
} from '@/constants/landingCopy';

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden border-t border-slate-200/80 bg-white px-6 pt-16 sm:pt-20 pb-24 sm:pb-32"
    >
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[20%] right-[-5%] h-96 w-96 rounded-full bg-gradient-light/35 blur-3xl" />
        <div className="absolute bottom-[10%] left-[-5%] h-96 w-96 rounded-full bg-slate-300/12 blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <StickyCardStack
          variant="slide-up"
          desktopCols={3}
          desktopGap="gap-8"
          breakpoint="lg"
          header={
            <SectionHeader
              pill={LANDING_COPY.howItWorksPill}
              title={
                <>
                  {LANDING_COPY.howItWorksTitleBefore}
                  <span className={LANDING_H2_ACCENT_LIGHT}>
                    {LANDING_COPY.howItWorksTitleAccent}
                  </span>
                </>
              }
              subtitle={LANDING_COPY.howItWorksSubtitle}
              spacing="mb-16 sm:mb-20 lg:mb-24"
            />
          }
        >
          {/* Step 1: Guided Assessment */}
          <div className="group relative">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-gradient-light/70 to-white" />
            <div className="relative flex h-full flex-col rounded-2xl border border-slate-200/90 bg-white/70 p-8 shadow-sm backdrop-blur-sm">
              <div className="mb-8 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-primary-foreground shadow-md">1</div>
                <h3 className="text-xl font-bold text-slate-900">{LANDING_COPY.howItWorksStep1Title}</h3>
              </div>
              
              {/* UI Mockup */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Movement Screen</span>
                  <span className="rounded-full bg-gradient-light px-2 py-1 text-[10px] font-bold text-gradient-dark">Step 4/12</span>
                </div>
                <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-1/3 rounded-full bg-primary" />
                </div>
                <p className="text-sm font-bold text-slate-900 mb-3">Knee Alignment (Squat)</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 bg-slate-50">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                    <span className="text-xs text-slate-600 font-medium">Stable / Neutral</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border-2 border-primary bg-gradient-light/90 p-2.5">
                    <div className="h-4 w-4 rounded-full border-[5px] border-primary" />
                    <span className="text-xs font-bold text-slate-900">Valgus (Caves In)</span>
                  </div>
                </div>
              </div>

              <p className="text-balance text-slate-500 text-sm leading-relaxed mt-auto">
                {LANDING_COPY.howItWorksStep1Footer}
              </p>
            </div>
          </div>

          {/* Step 2: The Report */}
          <div className="group relative">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-gradient-light/70 to-white" />
            <div className="relative flex h-full flex-col rounded-2xl border border-slate-200/90 bg-white/70 p-8 shadow-sm backdrop-blur-sm">
              <div className="mb-8 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-primary-foreground shadow-md">2</div>
                <h3 className="text-xl font-bold text-slate-900">{LANDING_COPY.howItWorksStep2Title}</h3>
              </div>

              {/* UI Mockup: Gap Analysis */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="rounded-lg bg-primary/15 p-1.5 text-primary"><Heart size={14} /></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">Metabolic Fitness</span>
                </div>
                
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="text-center">
                    <div className="text-xl font-black text-slate-900">58</div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Current</div>
                  </div>
                  <ArrowRight className="text-primary/40" size={16} />
                  <div className="text-center">
                    <div className="text-xl font-black text-primary">65</div>
                    <div className="text-[10px] font-bold uppercase text-primary/50">Target</div>
                  </div>
                </div>
                
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-[10px] text-slate-600 leading-relaxed font-medium">
                    "Aerobic capacity is the primary limiter. We will focus on Zone 2 training to build your engine."
                  </p>
                </div>
              </div>

              <p className="text-balance text-slate-500 text-sm leading-relaxed mt-auto">
                {LANDING_COPY.howItWorksStep2Footer}
              </p>
            </div>
          </div>

          {/* Step 3: Stay on track */}
          <div className="group relative">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-gradient-light/50 to-white" />
            <div className="relative flex h-full flex-col rounded-2xl border border-slate-200/90 bg-white/70 p-8 shadow-sm backdrop-blur-sm">
              <div className="mb-8 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-primary-foreground shadow-md">3</div>
                <h3 className="text-xl font-bold text-slate-900">{LANDING_COPY.howItWorksStep3Title}</h3>
              </div>

              {/* UI Mockup: Quick Actions */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Client Dashboard</span>
                  <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex flex-col items-center gap-2">
                    <ScanLine size={16} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase">Body Comp Scan</span>
                  </div>
                  <div className="relative flex flex-col items-center gap-2 overflow-hidden rounded-lg border border-primary/35 bg-gradient-light/90 p-3">
                    <Activity size={16} className="text-primary" />
                    <span className="text-[10px] font-bold uppercase text-slate-900">Log Fitness</span>
                    <div className="absolute right-0 top-0 h-2 w-2 rounded-full border border-white bg-primary" />
                  </div>
                  <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex flex-col items-center gap-2">
                    <Smartphone size={16} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase">Posture</span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex flex-col items-center gap-2">
                    <Dumbbell size={16} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase">Strength</span>
                  </div>
                </div>
              </div>

              <p className="text-balance text-slate-500 text-sm leading-relaxed mt-auto">
                {LANDING_COPY.howItWorksStep3Footer}
              </p>
            </div>
          </div>
        </StickyCardStack>
      </div>
    </section>
  );
}
