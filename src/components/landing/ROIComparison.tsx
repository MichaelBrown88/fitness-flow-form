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
import { LANDING_H2_ACCENT_LIGHT_READABLE } from '@/constants/landingCopy';

export function ROIComparison() {
  return (
    <section className="relative overflow-hidden bg-muted px-6 py-24 dark:bg-background">
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
                  <span className={LANDING_H2_ACCENT_LIGHT_READABLE}>Evenings</span>
                </>
              }
              subtitle="Stop the admin night shift. One platform replaces your spreadsheet-photo-email patchwork."
              subtitleClassName="text-muted-foreground"
              spacing="mb-16 sm:mb-20"
            />
          }
        >
          {/* The "Old Way" - Chaos */}
          <div className="relative group">
            <div className="absolute inset-0 scale-[1.02] rotate-[-1.5deg] rounded-lg bg-border/25 transition-transform duration-300 group-hover:rotate-[-2deg]" />
            <GlassCard className="relative overflow-hidden border-border/90 bg-muted/70 p-8 dark:border-border dark:bg-card/80">
              <div className="absolute right-0 top-0 p-4 opacity-[0.07] dark:opacity-[0.12]">
                <Clock size={120} className="text-foreground" />
              </div>
              
              <div className="relative z-10">
                <div className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                  <Moon size={14} /> 9:45 PM - The Admin Grind
                </div>
                <h3 className="mb-2 text-2xl font-bold text-foreground">The &quot;Frankenstein&quot; Stack</h3>
                <p className="mb-8 text-sm text-muted-foreground">Disjointed tools that don&apos;t talk to each other.</p>

                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4 opacity-80 shadow-sm transition-opacity hover:opacity-100 dark:border-border dark:bg-background-secondary/90">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-muted p-2 text-muted-foreground dark:bg-background-tertiary"><FileSpreadsheet size={18} /></div>
                      <div className="text-sm">
                        <p className="font-bold text-foreground">Google Sheets</p>
                        <p className="text-xs text-muted-foreground">Manual data entry & formulas</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-foreground-tertiary">Time Sink</span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4 opacity-80 shadow-sm transition-opacity hover:opacity-100 dark:border-border dark:bg-background-secondary/90">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-muted p-2 text-muted-foreground dark:bg-background-tertiary"><FileText size={18} /></div>
                      <div className="text-sm">
                        <p className="font-bold text-foreground">Word Docs</p>
                        <p className="text-xs text-muted-foreground">Copy-pasting reports</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-foreground-tertiary">Manual</span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4 opacity-80 shadow-sm transition-opacity hover:opacity-100 dark:border-border dark:bg-background-secondary/90">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-muted p-2 text-muted-foreground dark:bg-background-tertiary"><Smartphone size={18} /></div>
                      <div className="text-sm">
                        <p className="font-bold text-foreground">Posture App</p>
                        <p className="text-xs text-muted-foreground">$29/mo separate sub</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-foreground-tertiary">Siloed</span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4 opacity-80 shadow-sm transition-opacity hover:opacity-100 dark:border-border dark:bg-background-secondary/90">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-muted p-2 text-muted-foreground dark:bg-background-tertiary"><Calculator size={18} /></div>
                      <div className="text-sm">
                        <p className="font-bold text-foreground">1RM Calculator</p>
                        <p className="text-xs text-muted-foreground">Another browser tab open</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-foreground-tertiary">Distraction</span>
                  </div>
                </div>

                <div className="mt-8 border-t border-border pt-6 dark:border-border">
                  <div className="flex items-center justify-between text-foreground">
                    <span className="text-sm font-bold">Weekly Unpaid Admin</span>
                    <span className="text-xl font-black">10+ Hours</span>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* The New Way - Flow */}
          <div className="relative">
            <div className="absolute inset-0 rounded-lg bg-primary/10 blur-xl" />
            <GlassCard className="relative z-10 border-border bg-card p-8 shadow-md dark:bg-card/90">
              <div className="absolute right-0 top-0 p-4 opacity-[0.08] dark:opacity-[0.15]">
                <Sun size={120} className="text-primary" />
              </div>

              <div className="relative z-10">
                <div className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                  <Sun size={14} /> 5:00 PM - Done for the day
                </div>
                <h3 className="mb-2 text-2xl font-bold text-foreground">The All-in-One Flow</h3>
                <p className="mb-8 text-sm text-muted-foreground">Assessment finished? Your work is done.</p>

                <div className="relative mb-8 overflow-hidden rounded-lg border border-border bg-muted p-6 dark:border-border dark:bg-background-secondary/90">
                  <div className="mb-4 flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check size={20} strokeWidth={3} />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">Session Complete</p>
                      <p className="text-xs text-muted-foreground">Data auto-synced & processed</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check size={14} className="shrink-0 text-primary" />
                      <span>Posture analysed automatically</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check size={14} className="shrink-0 text-primary" />
                      <span>1RM & Zones calculated</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check size={14} className="shrink-0 text-primary" />
                      <span>Report generated & sent to client</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 border-t border-border pt-6 dark:border-border">
                  <div className="flex items-center justify-between text-foreground">
                    <span className="text-sm font-bold">Weekly Unpaid Admin</span>
                    <span className="text-xl font-black">0 Hours</span>
                  </div>
                  <p className="mt-2 text-xs font-medium text-muted-foreground">&ldquo;Spend less time planning, more time coaching.&rdquo;</p>
                </div>
                
                <LandingTrialCtaLink
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
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
