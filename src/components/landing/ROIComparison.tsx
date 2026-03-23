import { 
  Clock, Moon, FileSpreadsheet, FileText, Smartphone, 
  Calculator, Sun, Check 
} from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { LandingTrialCtaLink } from '@/components/landing/LandingTrialCtaLink';
import { landingTrialAriaLabel } from '@/constants/landingCopy';
import { LANDING_GUEST_CHECKOUT_ENABLED } from '@/constants/platform';
import SectionHeader from '@/components/landing/SectionHeader';
import StickyCardStack from '@/components/ui/StickyCardStack';
import { LANDING_H2_ACCENT_LIGHT } from '@/constants/landingCopy';

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
              title={
                <>
                  Reclaim Your{' '}
                  <span className={LANDING_H2_ACCENT_LIGHT}>Evenings</span>
                </>
              }
              subtitle="Stop the admin night shift. One platform replaces your spreadsheet-photo-email patchwork."
              spacing="mb-16 sm:mb-20"
            />
          }
        >
          {/* The "Old Way" - Chaos */}
          <div className="relative group">
            <div className="absolute inset-0 scale-[1.02] rotate-[-1.5deg] rounded-2xl bg-slate-200/25 transition-transform duration-300 group-hover:rotate-[-2deg]" />
            <GlassCard className="relative overflow-hidden border-slate-200/90 bg-slate-50/70 p-8">
              <div className="absolute right-0 top-0 p-4 opacity-[0.07]">
                <Clock size={120} className="text-slate-900" />
              </div>
              
              <div className="relative z-10">
                <div className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-600">
                  <Moon size={14} /> 9:45 PM - The Admin Grind
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">The "Frankenstein" Stack</h3>
                <p className="text-slate-500 text-sm mb-8">Disjointed tools that don't talk to each other.</p>

                <div className="space-y-3">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-slate-100 p-2 text-slate-600"><FileSpreadsheet size={18} /></div>
                      <div className="text-sm">
                        <p className="font-bold text-slate-900">Google Sheets</p>
                        <p className="text-xs text-slate-500">Manual data entry & formulas</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-400">Time Sink</span>
                  </div>

                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-slate-100 p-2 text-slate-600"><FileText size={18} /></div>
                      <div className="text-sm">
                        <p className="font-bold text-slate-900">Word Docs</p>
                        <p className="text-xs text-slate-500">Copy-pasting reports</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-400">Manual</span>
                  </div>

                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-slate-100 p-2 text-slate-600"><Smartphone size={18} /></div>
                      <div className="text-sm">
                        <p className="font-bold text-slate-900">Posture App</p>
                        <p className="text-xs text-slate-500">$29/mo separate sub</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-400">Siloed</span>
                  </div>

                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-slate-100 p-2 text-slate-600"><Calculator size={18} /></div>
                      <div className="text-sm">
                        <p className="font-bold text-slate-900">1RM Calculator</p>
                        <p className="text-xs text-slate-500">Another browser tab open</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-400">Distraction</span>
                  </div>
                </div>

                <div className="mt-8 border-t border-slate-200 pt-6">
                  <div className="flex items-center justify-between text-slate-800">
                    <span className="font-bold text-sm">Weekly Unpaid Admin</span>
                    <span className="font-black text-xl">10+ Hours</span>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* The New Way - Flow */}
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl" />
            <GlassCard className="relative z-10 border-gradient-medium/50 bg-white p-8 shadow-md">
              <div className="absolute right-0 top-0 p-4 opacity-[0.08]">
                <Sun size={120} className="text-primary" />
              </div>

              <div className="relative z-10">
                <div className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-primary">
                  <Sun size={14} /> 5:00 PM - Done for the day
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">The All-in-One Flow</h3>
                <p className="text-slate-500 text-sm mb-8">Assessment finished? Your work is done.</p>

                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-8 relative overflow-hidden">
                  <div className="absolute left-0 top-0 h-full w-1 bg-primary" />
                  <div className="mb-4 flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check size={20} strokeWidth={3} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Session Complete</p>
                      <p className="text-xs text-slate-500">Data auto-synced & processed</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Check size={14} className="text-primary" />
                      <span>Posture analyzed automatically</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Check size={14} className="text-primary" />
                      <span>1RM & Zones calculated</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Check size={14} className="text-primary" />
                      <span>Report generated & sent to client</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <div className="flex items-center justify-between text-slate-900">
                    <span className="text-sm font-bold">Weekly Unpaid Admin</span>
                    <span className="text-xl font-black">0 Hours</span>
                  </div>
                  <p className="mt-2 text-xs font-medium text-primary">"Spend less time planning, more time coaching."</p>
                </div>
                
                <LandingTrialCtaLink
                  className="inline-flex items-center justify-center gap-2 mt-6 px-6 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl"
                  ariaLabel={landingTrialAriaLabel('roi', LANDING_GUEST_CHECKOUT_ENABLED)}
                >
                  Start Free Trial
                </LandingTrialCtaLink>
              </div>
            </GlassCard>
          </div>
        </StickyCardStack>
      </div>
    </section>
  );
}
