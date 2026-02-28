import { Link } from 'react-router-dom';
import { 
  Clock, Moon, FileSpreadsheet, FileText, Smartphone, 
  Calculator, Sun, Check 
} from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import SectionHeader from '@/components/landing/SectionHeader';
import StickyCardStack from '@/components/ui/StickyCardStack';

export function ROIComparison() {
  return (
    <section className="py-24 px-6 bg-slate-50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <StickyCardStack
          variant="crossfade-scale"
          desktopCols={2}
          desktopGap="gap-12"
          breakpoint="lg"
          header={
            <SectionHeader
              title={<>Reclaim Your <span className="text-indigo-600">Evenings</span></>}
              subtitle="Stop the admin night shift. One platform replaces your spreadsheet-photo-email patchwork."
              spacing="mb-16 sm:mb-20"
            />
          }
        >
          {/* The "Old Way" - Chaos */}
          <div className="relative group">
            <div className="absolute inset-0 bg-red-500/5 rounded-3xl transform rotate-[-2deg] scale-105 transition-transform duration-300 group-hover:rotate-[-3deg]" />
            <GlassCard className="p-8 border-red-100 bg-red-50/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Clock size={120} className="text-red-900" />
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6 text-red-600 font-black uppercase text-[10px] tracking-[0.15em]">
                  <Moon size={14} /> 9:45 PM - The Admin Grind
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">The "Frankenstein" Stack</h3>
                <p className="text-slate-500 text-sm mb-8">Disjointed tools that don't talk to each other.</p>

                <div className="space-y-3">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg text-green-700"><FileSpreadsheet size={18} /></div>
                      <div className="text-sm">
                        <p className="font-bold text-slate-900">Google Sheets</p>
                        <p className="text-xs text-slate-500">Manual data entry & formulas</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-400">Time Sink</span>
                  </div>

                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg text-blue-700"><FileText size={18} /></div>
                      <div className="text-sm">
                        <p className="font-bold text-slate-900">Word Docs</p>
                        <p className="text-xs text-slate-500">Copy-pasting reports</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-400">Manual</span>
                  </div>

                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg text-purple-700"><Smartphone size={18} /></div>
                      <div className="text-sm">
                        <p className="font-bold text-slate-900">Posture App</p>
                        <p className="text-xs text-slate-500">$29/mo separate sub</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-400">Siloed</span>
                  </div>

                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg text-orange-700"><Calculator size={18} /></div>
                      <div className="text-sm">
                        <p className="font-bold text-slate-900">1RM Calculator</p>
                        <p className="text-xs text-slate-500">Another browser tab open</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-400">Distraction</span>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-red-200">
                  <div className="flex items-center justify-between text-red-900">
                    <span className="font-bold text-sm">Weekly Unpaid Admin</span>
                    <span className="font-black text-xl">10+ Hours</span>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* The New Way - Flow */}
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-600/20 rounded-3xl blur-xl" />
            <GlassCard className="p-8 border-indigo-200 bg-white relative z-10 shadow-xl">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sun size={120} className="text-amber-500" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6 text-indigo-600 font-black uppercase text-[10px] tracking-[0.15em]">
                  <Sun size={14} /> 5:00 PM - Done for the day
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">The All-in-One Flow</h3>
                <p className="text-slate-500 text-sm mb-8">Assessment finished? Your work is done.</p>

                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-8 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                      <Check size={20} strokeWidth={3} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Session Complete</p>
                      <p className="text-xs text-slate-500">Data auto-synced & processed</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Check size={14} className="text-emerald-500" />
                      <span>Posture analyzed automatically</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Check size={14} className="text-emerald-500" />
                      <span>1RM & Zones calculated</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Check size={14} className="text-emerald-500" />
                      <span>Report generated & sent to client</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <div className="flex items-center justify-between text-indigo-900">
                    <span className="font-bold text-sm">Weekly Unpaid Admin</span>
                    <span className="font-black text-xl">0 Hours</span>
                  </div>
                  <p className="text-xs text-indigo-500 mt-2 font-medium">"Spend less time planning, more time coaching."</p>
                </div>
                
                <Link 
                  to="/onboarding"
                  className="inline-flex items-center justify-center gap-2 mt-6 px-6 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl"
                >
                  Start Free Trial
                </Link>
              </div>
            </GlassCard>
          </div>
        </StickyCardStack>
      </div>
    </section>
  );
}
