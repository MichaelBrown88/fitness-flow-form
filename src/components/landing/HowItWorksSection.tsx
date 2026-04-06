import { ArrowRight, Heart, ScanLine, Activity, Smartphone, Dumbbell } from 'lucide-react';
import SectionHeader from '@/components/landing/SectionHeader';
import StickyCardStack from '@/components/ui/StickyCardStack';
import {
  LANDING_COPY,
  LANDING_H2_ACCENT_LIGHT_READABLE,
} from '@/constants/landingCopy';

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden border-t border-border/80 bg-background px-6 pb-24 pt-16 dark:border-border dark:bg-background sm:pb-32 sm:pt-20"
    >
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[20%] right-[-5%] h-96 w-96 rounded-full bg-muted/20 blur-3xl" />
        <div className="absolute bottom-[10%] left-[-5%] h-96 w-96 rounded-full bg-muted/20 blur-3xl" />
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
                  <span className={LANDING_H2_ACCENT_LIGHT_READABLE}>
                    {LANDING_COPY.howItWorksTitleAccent}
                  </span>
                </>
              }
              subtitle={LANDING_COPY.howItWorksSubtitle}
              subtitleClassName="text-muted-foreground"
              spacing="mb-16 sm:mb-20 lg:mb-24"
            />
          }
        >
          {/* Step 1: Guided Assessment */}
          <div className="group relative">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-muted/30 to-transparent dark:from-card/80 dark:to-background" />
            <div className="relative flex h-full flex-col rounded-lg border border-border/90 bg-card/70 p-8 shadow-sm backdrop-blur-sm dark:border-border dark:bg-card/75">
              <div className="mb-8 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-primary-foreground shadow-md">1</div>
                <h3 className="text-xl font-bold text-foreground">{LANDING_COPY.howItWorksStep1Title}</h3>
              </div>
              
              {/* UI Mockup */}
              <div className="mb-6 rounded-lg border border-border/60 bg-background/95 p-5 dark:border-border dark:bg-background-secondary/60">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                    Movement Screen
                  </span>
                  <span className="rounded-full bg-gradient-light px-2 py-1 text-[10px] font-bold text-on-brand-tint">
                    Step 4/12
                  </span>
                </div>
                <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-muted dark:bg-background-tertiary">
                  <div className="h-full w-1/3 rounded-full bg-primary" />
                </div>
                <p className="mb-3 text-sm font-bold text-foreground">Knee Alignment (Squat)</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-muted p-2.5 dark:border-border dark:bg-background-tertiary/80">
                    <div className="h-4 w-4 rounded-full border-2 border-border-medium dark:border-border" />
                    <span className="text-xs font-medium text-foreground">Stable / Neutral</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border-2 border-primary bg-gradient-light/90 p-2.5 dark:bg-primary/20 dark:text-foreground">
                    <div className="h-4 w-4 rounded-full border-[5px] border-primary" />
                    <span className="text-xs font-bold text-foreground">Valgus (Caves In)</span>
                  </div>
                </div>
              </div>

              <p className="mt-auto text-balance text-sm leading-relaxed text-muted-foreground">
                {LANDING_COPY.howItWorksStep1Footer}
              </p>
            </div>
          </div>

          {/* Step 2: The Report */}
          <div className="group relative">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-muted/30 to-transparent dark:from-card/80 dark:to-background" />
            <div className="relative flex h-full flex-col rounded-lg border border-border/90 bg-card/70 p-8 shadow-sm backdrop-blur-sm dark:border-border dark:bg-card/75">
              <div className="mb-8 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-primary-foreground shadow-md">2</div>
                <h3 className="text-xl font-bold text-foreground">{LANDING_COPY.howItWorksStep2Title}</h3>
              </div>

              {/* UI Mockup: Gap Analysis */}
              <div className="mb-6 rounded-lg border border-border/60 bg-background/95 p-5 dark:border-border dark:bg-background-secondary/60">
                <div className="mb-4 flex items-center gap-2">
                  <div className="rounded-lg bg-muted p-1.5 text-foreground/70">
                    <Heart size={14} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                    Metabolic Fitness
                  </span>
                </div>
                
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div className="text-center">
                    <div className="text-xl font-black text-foreground">58</div>
                    <div className="text-[10px] font-bold uppercase text-muted-foreground">Current</div>
                  </div>
                  <ArrowRight className="text-foreground-tertiary" size={16} />
                  <div className="text-center">
                    <div className="text-xl font-black text-foreground">65</div>
                    <div className="text-[10px] font-bold uppercase text-muted-foreground">Target</div>
                  </div>
                </div>
                
                <div className="rounded-xl border border-border bg-muted p-2.5 dark:border-border dark:bg-background-tertiary/90">
                  <p className="text-[10px] font-medium leading-relaxed text-foreground">
                    &ldquo;Aerobic capacity is the primary limiter. We will focus on Zone 2 training to build your
                    engine.&rdquo;
                  </p>
                </div>
              </div>

              <p className="mt-auto text-balance text-sm leading-relaxed text-muted-foreground">
                {LANDING_COPY.howItWorksStep2Footer}
              </p>
            </div>
          </div>

          {/* Step 3: Stay on track */}
          <div className="group relative">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-muted/20 to-transparent dark:from-card/80 dark:to-background" />
            <div className="relative flex h-full flex-col rounded-lg border border-border/90 bg-card/70 p-8 shadow-sm backdrop-blur-sm dark:border-border dark:bg-card/75">
              <div className="mb-8 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-primary-foreground shadow-md">3</div>
                <h3 className="text-xl font-bold text-foreground">{LANDING_COPY.howItWorksStep3Title}</h3>
              </div>

              {/* UI Mockup: Quick Actions */}
              <div className="mb-6 rounded-lg border border-border/60 bg-background/95 p-5 dark:border-border dark:bg-background-secondary/60">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                    Client Dashboard
                  </span>
                  <div className="h-2 w-2 animate-pulse rounded-full bg-score-green" />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-muted p-3 dark:border-border dark:bg-background-tertiary/80">
                    <ScanLine size={16} className="text-muted-foreground" />
                    <span className="text-[10px] font-bold uppercase text-foreground">Body Comp Scan</span>
                  </div>
                  <div className="relative flex flex-col items-center gap-2 overflow-hidden rounded-lg border border-border bg-muted p-3 dark:border-border dark:bg-background-tertiary/80">
                    <Activity size={16} className="text-foreground/70" />
                    <span className="text-[10px] font-bold uppercase text-foreground">Log Fitness</span>
                    <div className="absolute right-0 top-0 h-2 w-2 rounded-full border border-white bg-score-green dark:border-background" />
                  </div>
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-muted p-3 dark:border-border dark:bg-background-tertiary/80">
                    <Smartphone size={16} className="text-muted-foreground" />
                    <span className="text-[10px] font-bold uppercase text-foreground">Posture</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-muted p-3 dark:border-border dark:bg-background-tertiary/80">
                    <Dumbbell size={16} className="text-muted-foreground" />
                    <span className="text-[10px] font-bold uppercase text-foreground">Strength</span>
                  </div>
                </div>
              </div>

              <p className="mt-auto text-balance text-sm leading-relaxed text-muted-foreground">
                {LANDING_COPY.howItWorksStep3Footer}
              </p>
            </div>
          </div>
        </StickyCardStack>
      </div>
    </section>
  );
}
