import React from 'react';
import { Card } from '@/components/ui/card';
import { Clock, CheckCircle2, Repeat, Zap, Lock, MessageSquare } from 'lucide-react';
import { PillarCountdownCards } from '../../PillarCountdownCards';
import { CardInfoDrawer } from '../../CardInfoDrawer';
import type { GoalCountdownData } from '@/hooks/useGoalCountdown';

interface TimelineSectionProps {
  countdownData: GoalCountdownData;
  hideHeader?: boolean;
}

export const TimelineSection: React.FC<TimelineSectionProps> = ({
  countdownData,
  hideHeader,
}) => {
  return (
    <section className="w-full min-w-0 overflow-x-hidden">
      <div className="mb-6 md:mb-8">
        {!hideHeader && (
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 mb-2 sm:mb-3 md:mb-4 lg:mb-5 xl:mb-6">
            <div className="p-1 sm:p-1.5 md:p-2 bg-gradient-light text-foreground rounded-lg">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
            </div>
            <h3 className="text-xs md:text-sm lg:text-base font-semibold text-foreground">Your Timeline</h3>
          </div>
        )}

        <Card className="p-4 sm:p-5 md:p-6 rounded-2xl overflow-hidden relative">
          <CardInfoDrawer title="Time to Goal">
            <p>Each card shows how many weeks remain for a specific health pillar to reach its target score based on your current trajectory.</p>
            <p>Trend indicators update after each reassessment — if progress accelerates or slows, you will see it reflected here along with tailored coaching advice.</p>
            <p>The frequency comparison shows how adding sessions can shorten your timeline.</p>
          </CardInfoDrawer>

          <div className="mb-4 sm:mb-5">
            <h4 className="text-sm font-bold text-foreground mb-1">Time to Goal</h4>
            <p className="text-xs text-muted-foreground">
              Estimated weeks remaining for each pillar, updated with every reassessment.
            </p>
          </div>

          <PillarCountdownCards data={countdownData} />
        </Card>
      </div>

      {/* Non-Negotiables */}
      <Card className="bg-foreground text-white p-3 sm:p-6 md:p-8 lg:p-10 rounded-2xl ring-1 ring-border overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-start gap-4 sm:gap-8 md:gap-10 lg:gap-12 w-full min-w-0">
          <div className="md:w-1/3 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-5">
              <div className="p-1.5 sm:p-2.5 gradient-bg rounded-lg">
                <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <h4 className="text-base sm:text-2xl font-bold text-white tracking-tight">Your Non-Negotiables</h4>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-3 sm:mb-6 md:mb-8">
              The minimum commitment required to reach your goals. We handle the programming, tracking, and analysis — your role is to show up and give it your best.
            </p>
            <div className="hidden sm:inline-block px-4 sm:px-5 py-2 sm:py-3 bg-card/5 rounded-xl border border-white/5 backdrop-blur-sm">
              <p className="text-[10px] font-black text-white/80 uppercase tracking-[0.15em] break-words">
                &ldquo;As long as you do your part, we&rsquo;ll do ours.&rdquo;
              </p>
            </div>
          </div>

          <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 md:gap-5 w-full min-w-0">
            {[
              { icon: Repeat, title: 'Show Up Consistently', desc: 'Aim for 90% attendance. Consistency is the single biggest factor in reaching your goals.' },
              { icon: Zap, title: 'Give Your Best Effort', desc: 'We programme the sessions — you bring the energy. Push yourself in every workout.' },
              { icon: Lock, title: 'Trust the Process', desc: 'Stick to the plan. Every phase is designed to build on the last. Trust the structure and stay the course.' },
              { icon: MessageSquare, title: 'Communicate Openly', desc: 'If something feels off or life gets in the way, let your coach know. We adapt the plan together.' },
            ].map((item, i) => (
              <div key={i} className="flex flex-row items-start gap-3 sm:gap-4 p-3 sm:p-5 rounded-2xl bg-card/5 border border-white/5 hover:bg-card/10 hover:border-white/10 transition-all duration-300 group min-w-0 text-left">
                <div className="p-1.5 sm:p-2 bg-foreground/90 rounded-lg h-fit group-hover:bg-gradient-from/20 group-hover:text-gradient-from transition-colors shrink-0">
                  <item.icon className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-hover:text-gradient-from" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-sm font-bold text-white mb-1 sm:mb-1.5">{item.title}</div>
                  <div className="text-xs sm:text-xs text-muted-foreground leading-relaxed group-hover:text-muted-foreground/60 break-words">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </section>
  );
};
