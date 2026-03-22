import { Brain, BarChart3, Users, Shield, X, Check, ArrowRight } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import SectionHeader from '@/components/landing/SectionHeader';
import StickyCardStack from '@/components/ui/StickyCardStack';
import { LANDING_COPY, LANDING_FEATURE_CARDS } from '@/constants/landingCopy';

const FEATURE_ICONS = [Brain, BarChart3, Users, Shield] as const;

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 sm:py-32 px-6 relative bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <StickyCardStack
          variant="crossfade"
          desktopCols={2}
          desktopGap="gap-16"
          breakpoint="lg"
          header={
            <SectionHeader
              title={<>Why Top Facilities Switch to <span className="text-indigo-600">One Assess</span></>}
              subtitle={LANDING_COPY.featuresSubtitle}
            />
          }
        >
          {/* Left: Feature list */}
          <div>
            <div className="grid gap-6">
              {LANDING_FEATURE_CARDS.map((f, i) => {
                const Icon = FEATURE_ICONS[i] ?? Brain;
                return (
                  <div key={f.title} className="flex gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0 text-indigo-600">
                      <Icon size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{f.title}</h3>
                      <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Compliance Badges */}
            <div className="mt-8 pt-8 border-t border-slate-200">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-4">Certified Compliance</p>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">HIPAA</div>
                  <span className="text-xs font-semibold text-blue-900">Compliant</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-lg border border-indigo-200">
                  <div className="w-7 h-7 rounded bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">GDPR</div>
                  <span className="text-xs font-semibold text-indigo-900">Compliant</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Visual */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-3xl rotate-3 opacity-10" />
            <GlassCard className="p-8 bg-white border-white/60 shadow-xl relative z-10">
              <div className="space-y-6">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">The Old Way</span>
                    <X size={16} className="text-red-400" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600"><span className="w-1.5 h-1.5 rounded-full bg-slate-300" />Take photo on phone</div>
                    <div className="flex items-center gap-2 text-sm text-slate-600"><span className="w-1.5 h-1.5 rounded-full bg-slate-300" />Upload to Drive</div>
                    <div className="flex items-center gap-2 text-sm text-slate-600"><span className="w-1.5 h-1.5 rounded-full bg-slate-300" />Type into Excel</div>
                    <div className="flex items-center gap-2 text-sm text-slate-600"><span className="w-1.5 h-1.5 rounded-full bg-slate-300" />Write email manually</div>
                  </div>
                </div>
                
                <div className="flex justify-center">
                  <ArrowRight className="text-slate-300 rotate-90 md:rotate-0" />
                </div>

                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.15em]">The One Assess Way</span>
                    <Check size={16} className="text-emerald-500" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-indigo-900 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />Scan Client (AI Auto-Capture)</div>
                    <div className="flex items-center gap-2 text-sm text-indigo-900 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />Instant Analysis & Report</div>
                    <div className="flex items-center gap-2 text-sm text-indigo-900 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />Auto-sent to Client</div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </StickyCardStack>
      </div>
    </section>
  );
}
