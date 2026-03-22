import { ArrowRight, Heart, ScanLine, Activity, Smartphone, Dumbbell } from 'lucide-react';
import SectionHeader from '@/components/landing/SectionHeader';
import StickyCardStack from '@/components/ui/StickyCardStack';
import { LANDING_COPY } from '@/constants/landingCopy';

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden border-t border-slate-200/80 bg-white px-6 pt-16 sm:pt-20 pb-24 sm:pb-32"
    >
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[20%] right-[-5%] w-96 h-96 bg-blue-100/40 rounded-full blur-3xl" />
        <div className="absolute bottom-[10%] left-[-5%] w-96 h-96 bg-indigo-100/40 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <StickyCardStack
          variant="slide-up"
          desktopCols={3}
          desktopGap="gap-8"
          breakpoint="lg"
          header={
            <SectionHeader
              pill="The Workflow"
              title="A Connected Ecosystem"
              subtitle="From first contact to long-term retention. One Assess unifies every step of the coaching journey."
              spacing="mb-16 sm:mb-20 lg:mb-24"
            />
          }
        >
          {/* Step 1: Guided Assessment */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-white rounded-3xl" />
            <div className="relative p-8 border border-slate-200 bg-white/50 backdrop-blur-sm rounded-3xl h-full flex flex-col shadow-sm">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-200">1</div>
                <h3 className="text-xl font-bold text-slate-900">Guided Intake</h3>
              </div>
              
              {/* UI Mockup */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Movement Screen</span>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Step 4/12</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full mb-6 overflow-hidden">
                  <div className="h-full w-1/3 bg-blue-500 rounded-full" />
                </div>
                <p className="text-sm font-bold text-slate-900 mb-3">Knee Alignment (Squat)</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 bg-slate-50">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                    <span className="text-xs text-slate-600 font-medium">Stable / Neutral</span>
                  </div>
                  <div className="flex items-center gap-3 p-2.5 rounded-xl border-2 border-blue-600 bg-blue-50">
                    <div className="w-4 h-4 rounded-full border-[5px] border-blue-600" />
                    <span className="text-xs text-blue-900 font-bold">Valgus (Caves In)</span>
                  </div>
                </div>
              </div>

              <p className="text-slate-500 text-sm leading-relaxed mt-auto">
                No more paper forms. A streamlined, tablet-friendly interface guides you through PAR-Q, body comp, and movement screens ensuring consistent data collection every time.
              </p>
            </div>
          </div>

          {/* Step 2: The Report */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-50 to-white rounded-3xl" />
            <div className="relative p-8 border border-slate-200 bg-white/50 backdrop-blur-sm rounded-3xl h-full flex flex-col shadow-sm">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200">2</div>
                <h3 className="text-xl font-bold text-slate-900">Instant Report</h3>
              </div>

              {/* UI Mockup: Gap Analysis */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-rose-100 rounded-lg text-rose-600"><Heart size={14} /></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">Metabolic Fitness</span>
                </div>
                
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="text-center">
                    <div className="text-xl font-black text-slate-900">58</div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Current</div>
                  </div>
                  <ArrowRight className="text-indigo-300" size={16} />
                  <div className="text-center">
                    <div className="text-xl font-black text-indigo-600">65</div>
                    <div className="text-[10px] text-indigo-300 uppercase font-bold">Target</div>
                  </div>
                </div>
                
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-[10px] text-slate-600 leading-relaxed font-medium">
                    "Aerobic capacity is the primary limiter. We will focus on Zone 2 training to build your engine."
                  </p>
                </div>
              </div>

              <p className="text-slate-500 text-sm leading-relaxed mt-auto">
                {LANDING_COPY.howItWorksStep2Footer}
              </p>
            </div>
          </div>

          {/* Step 3: Micro-Updates */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 to-white rounded-3xl" />
            <div className="relative p-8 border border-slate-200 bg-white/50 backdrop-blur-sm rounded-3xl h-full flex flex-col shadow-sm">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-200">3</div>
                <h3 className="text-xl font-bold text-slate-900">Micro-Updates</h3>
              </div>

              {/* UI Mockup: Quick Actions */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Client Dashboard</span>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex flex-col items-center gap-2">
                    <ScanLine size={16} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase">Body Comp Scan</span>
                  </div>
                  <div className="p-3 rounded-xl border border-emerald-500 bg-emerald-50 flex flex-col items-center gap-2 relative overflow-hidden">
                    <Activity size={16} className="text-emerald-600" />
                    <span className="text-[10px] font-bold text-emerald-800 uppercase">Log Fitness</span>
                    <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white" />
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

              <p className="text-slate-500 text-sm leading-relaxed mt-auto">
                {LANDING_COPY.howItWorksStep3Footer}
              </p>
            </div>
          </div>
        </StickyCardStack>
      </div>
    </section>
  );
}
