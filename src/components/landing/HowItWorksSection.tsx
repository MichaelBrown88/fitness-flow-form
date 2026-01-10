import React from 'react';
import { ArrowRight, Heart, ScanLine, Activity, Smartphone, Dumbbell } from 'lucide-react';

const GlassCard = ({ children, className = "" }: { children?: React.ReactNode; className?: string }) => (
  <div className={`backdrop-blur-2xl bg-white/60 border border-white/50 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:bg-white/80 transition-all duration-500 ${className}`}>
    {children}
  </div>
);

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-32 px-6 relative bg-slate-50 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] right-[-5%] w-96 h-96 bg-blue-100/40 rounded-full blur-3xl" />
        <div className="absolute bottom-[10%] left-[-5%] w-96 h-96 bg-indigo-100/40 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-24">
          <div className="inline-block px-4 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-widest mb-4 shadow-sm">
            The Workflow
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900">A Connected Ecosystem</h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            From first contact to long-term retention. See how FitnessFlow unifies every step of the coaching journey.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Step 1: Guided Assessment */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-white rounded-3xl transform transition-transform duration-500 group-hover:-translate-y-2"></div>
            <div className="relative p-8 border border-slate-200 bg-white/50 backdrop-blur-sm rounded-3xl h-full flex flex-col shadow-sm hover:shadow-xl transition-all duration-500">
              <div className="flex items-center gap-4 mb-8">
                 <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-200">1</div>
                 <h3 className="text-xl font-bold text-slate-900">Guided Intake</h3>
              </div>
              
              {/* UI Mockup: Assessment Interface */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6 transform transition-transform group-hover:scale-[1.02]">
                 <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Movement Screen</span>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Step 4/12</span>
                 </div>
                 <div className="h-1.5 w-full bg-slate-100 rounded-full mb-6 overflow-hidden">
                    <div className="h-full w-1/3 bg-blue-500 rounded-full"></div>
                 </div>
                 <p className="text-sm font-bold text-slate-900 mb-3">Knee Alignment (Squat)</p>
                 <div className="space-y-2">
                    <div className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 bg-slate-50">
                       <div className="w-4 h-4 rounded-full border-2 border-slate-300"></div>
                       <span className="text-xs text-slate-600 font-medium">Stable / Neutral</span>
                    </div>
                    <div className="flex items-center gap-3 p-2.5 rounded-xl border-2 border-blue-600 bg-blue-50">
                       <div className="w-4 h-4 rounded-full border-[5px] border-blue-600"></div>
                       <span className="text-xs text-blue-900 font-bold">Valgus (Caves In)</span>
                    </div>
                 </div>
              </div>

              <p className="text-slate-500 text-sm leading-relaxed mt-auto">
                No more paper forms. A streamlined, tablet-friendly interface guides you through PAR-Q, body comp, and movement screens ensuring consistent data collection every time.
              </p>
            </div>
          </div>

          {/* Step 2: The Report (Gap Analysis) */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-50 to-white rounded-3xl transform transition-transform duration-500 group-hover:-translate-y-2"></div>
            <div className="relative p-8 border border-slate-200 bg-white/50 backdrop-blur-sm rounded-3xl h-full flex flex-col shadow-sm hover:shadow-xl transition-all duration-500">
              <div className="flex items-center gap-4 mb-8">
                 <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200">2</div>
                 <h3 className="text-xl font-bold text-slate-900">Instant Report</h3>
              </div>

              {/* UI Mockup: Gap Analysis Card */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6 transform transition-transform group-hover:scale-[1.02]">
                 <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-rose-100 rounded-lg text-rose-600"><Heart size={14} /></div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Metabolic Fitness</span>
                 </div>
                 
                 <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="text-center">
                       <div className="text-xl font-black text-slate-900">58</div>
                       <div className="text-[9px] text-slate-400 uppercase font-bold">Current (VO2)</div>
                    </div>
                    <ArrowRight className="text-indigo-300" size={16} />
                    <div className="text-center">
                       <div className="text-xl font-black text-indigo-600">65</div>
                       <div className="text-[9px] text-indigo-300 uppercase font-bold">Target</div>
                    </div>
                 </div>
                 
                 <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-600 leading-relaxed font-medium">
                       "Aerobic capacity is the primary limiter. We will focus on Zone 2 training to build your engine."
                    </p>
                 </div>
              </div>

              <p className="text-slate-500 text-sm leading-relaxed mt-auto">
                Turn data into a narrative. The system instantly generates a "Gap Analysis" report, showing clients exactly where they are versus where they need to be.
              </p>
            </div>
          </div>

          {/* Step 3: Coach Dashboard (Reassessment) */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 to-white rounded-3xl transform transition-transform duration-500 group-hover:-translate-y-2"></div>
            <div className="relative p-8 border border-slate-200 bg-white/50 backdrop-blur-sm rounded-3xl h-full flex flex-col shadow-sm hover:shadow-xl transition-all duration-500">
              <div className="flex items-center gap-4 mb-8">
                 <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-200">3</div>
                 <h3 className="text-xl font-bold text-slate-900">Micro-Updates</h3>
              </div>

              {/* UI Mockup: Quick Actions */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6 transform transition-transform group-hover:scale-[1.02]">
                 <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Client Dashboard</span>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex flex-col items-center gap-2 cursor-pointer hover:border-emerald-200 hover:bg-emerald-50 transition-colors">
                       <ScanLine size={16} className="text-slate-400" />
                       <span className="text-[9px] font-bold text-slate-600 uppercase">Scan InBody</span>
                    </div>
                    <div className="p-3 rounded-xl border border-emerald-500 bg-emerald-50 flex flex-col items-center gap-2 cursor-pointer relative overflow-hidden">
                       <Activity size={16} className="text-emerald-600" />
                       <span className="text-[9px] font-bold text-emerald-800 uppercase">Log Fitness</span>
                       <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></div>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex flex-col items-center gap-2 cursor-pointer hover:border-emerald-200 hover:bg-emerald-50 transition-colors">
                       <Smartphone size={16} className="text-slate-400" />
                       <span className="text-[9px] font-bold text-slate-600 uppercase">Posture</span>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex flex-col items-center gap-2 cursor-pointer hover:border-emerald-200 hover:bg-emerald-50 transition-colors">
                       <Dumbbell size={16} className="text-slate-400" />
                       <span className="text-[9px] font-bold text-slate-600 uppercase">Strength</span>
                    </div>
                 </div>
              </div>

              <p className="text-slate-500 text-sm leading-relaxed mt-auto">
                Retaining clients requires showing progress. Quickly re-assess specific pillars (like just Fitness or Body Comp) without re-doing the whole intake.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
