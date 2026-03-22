import { Smartphone, ScanLine, Check } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import SectionHeader from '@/components/landing/SectionHeader';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { LANDING_COPY } from '@/constants/landingCopy';

export function ScannerShowcase() {
  const headerRef = useScrollReveal({ staggerDelay: 150, staggerIndex: 0 });
  const card1Ref = useScrollReveal({ staggerDelay: 150, staggerIndex: 1 });
  const card2Ref = useScrollReveal({ staggerDelay: 150, staggerIndex: 2 });

  return (
    <section className="py-24 px-6 bg-white/50 border-y border-white/50">
      <div className="max-w-7xl mx-auto">
        <div ref={headerRef}>
          <SectionHeader
            title="Intelligent Capture"
            subtitle={LANDING_COPY.scannerShowcaseSubtitle}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Posture Scanner */}
          <GlassCard ref={card1Ref} className="p-0 overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800 border-slate-700 text-white group">
            <div className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                   <Smartphone size={20} />
                </div>
                <h3 className="text-xl font-bold">AI Posture Analysis</h3>
              </div>
              <p className="text-slate-400 mb-8">
                Simply point your iPhone. Our AI detects landmarks, draws reference lines, and flags deviations like forward head posture or rounded shoulders in real-time.
              </p>
            </div>
            
            <div className="relative h-64 bg-black/50 border-t border-white/10 flex items-end justify-center overflow-hidden">
               {/* Phone UI Mockup */}
               <div className="relative w-48 h-full bg-gray-900 border-x-4 border-t-4 border-gray-700 rounded-t-3xl overflow-hidden translate-y-4 shadow-2xl">
                  {/* Screen Content */}
                  <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                     {/* User Silhouette */}
                     <div className="w-20 h-40 bg-slate-700 rounded-full opacity-50 relative">
                        {/* AI Lines */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-0.5 h-32 bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-16 h-0.5 bg-emerald-500"></div>
                        <div className="absolute top-6 left-1/2 w-12 h-0.5 bg-red-500 rotate-12 origin-left animate-pulse"></div>
                        {/* Landmarks */}
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
                     </div>
                  </div>
                  {/* UI Overlay */}
                  <div className="absolute top-4 left-0 right-0 flex justify-center">
                    <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-bold text-white uppercase tracking-[0.15em] border border-white/10">
                      Right Side View
                    </div>
                  </div>
               </div>
            </div>
          </GlassCard>

          {/* Body Comp Scanner */}
          <GlassCard ref={card2Ref} className="p-0 overflow-hidden bg-white border-white/60 group">
             <div className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                   <ScanLine size={20} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Report Photo Import</h3>
              </div>
              <p className="text-slate-500 mb-8">
                Skip the manual typing. Snap a photo of any body comp report and we'll read the numbers for you -- weight, muscle mass, body fat, and more.
              </p>
            </div>

            <div className="relative h-64 bg-slate-50 border-t border-slate-100 flex items-center justify-center overflow-hidden">
                {/* Document Mockup */}
                <div className="w-48 h-60 bg-white shadow-xl border border-slate-200 rounded-lg p-4 relative transform rotate-[-5deg] group-hover:rotate-0 transition-transform duration-300">
                   <div className="h-2 w-20 bg-slate-300 rounded mb-4"></div>
                   <div className="space-y-2">
                      <div className="h-1.5 w-full bg-slate-100 rounded"></div>
                      <div className="h-1.5 w-full bg-slate-100 rounded"></div>
                      <div className="h-1.5 w-2/3 bg-slate-100 rounded"></div>
                   </div>
                   <div className="mt-6 grid grid-cols-2 gap-2">
                      <div className="h-12 bg-blue-50 rounded border border-blue-100 flex flex-col justify-center items-center">
                         <div className="h-1 w-8 bg-blue-200 rounded mb-1"></div>
                         <div className="h-3 w-12 bg-blue-300 rounded"></div>
                      </div>
                      <div className="h-12 bg-slate-50 rounded border border-slate-100"></div>
                   </div>
                   
                   {/* Scanning Line */}
                   <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 shadow-[0_0_15px_#3b82f6] animate-scan opacity-80"></div>
                </div>

                {/* Extracted Data Bubble */}
                <div className="absolute bottom-6 right-8 bg-white p-3 rounded-xl shadow-lg border border-slate-100 flex items-center gap-3 animate-fade-in-up">
                   <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                      <Check size={16} strokeWidth={3} />
                   </div>
                   <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Body Fat %</p>
                      <p className="text-sm font-bold text-slate-900">18.5%</p>
                   </div>
                </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
