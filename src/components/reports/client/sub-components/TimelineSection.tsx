import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Clock, CheckCircle2, Repeat, Zap, Lock, MessageSquare } from 'lucide-react';
import { niceLabel } from '../../ClientReportConstants';
import type { ScoreCategory } from '@/lib/scoring';

interface TimelineSectionProps {
  orderedCats: ScoreCategory[];
  weeksByCategory: Record<string, number>;
  maxWeeks: number;
  hideHeader?: boolean;
}

export const TimelineSection: React.FC<TimelineSectionProps> = ({
  orderedCats,
  weeksByCategory,
  maxWeeks,
  hideHeader,
}) => {
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);

  return (
    <section className="w-full min-w-0 overflow-x-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 md:gap-6 lg:gap-8 mb-6 md:mb-8">
        <div className="lg:col-span-12 flex flex-col">
          {!hideHeader && (
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 mb-2 sm:mb-3 md:mb-4 lg:mb-5 xl:mb-6">
              <div className="p-1 sm:p-1.5 md:p-2 bg-gradient-light text-zinc-900 rounded-lg">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
              </div>
              <h3 className="text-xs md:text-sm lg:text-base font-bold text-zinc-900 uppercase tracking-widest">Your Timeline</h3>
            </div>
          )}
          
          <Card className="p-4 sm:p-5 md:p-6 rounded-2xl overflow-hidden">
            <div className="glass-subtle rounded-xl p-3 sm:p-4 mb-4 sm:mb-5 md:mb-6">
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                <span className="font-bold text-zinc-900">This timeline shows when you can expect to start seeing results.</span> More sessions per week means faster progress—adjust the slider below to see how training frequency affects your timeline.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-5 md:mb-6 w-full min-w-0">
              <span className="text-xs sm:text-sm font-medium text-zinc-500 shrink-0 w-full sm:w-auto">Sessions per week:</span>
              <div className="flex-grow w-full sm:w-auto min-w-0 max-w-full overflow-hidden">
                <div className="px-2">
                  <input 
                    type="range" min={3} max={5} step={1}
                    value={sessionsPerWeek}
                    onChange={(e) => setSessionsPerWeek(parseInt(e.target.value))}
                    className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer hover:bg-zinc-300 transition-colors slider-apple max-w-full"
                  />
                  <div className="flex justify-between text-xs text-zinc-400 font-bold uppercase mt-1.5 sm:mt-2 max-w-full">
                    <span>3</span>
                    <span>4</span>
                    <span>5</span>
                  </div>
                </div>
              </div>
              <span className="font-bold text-zinc-900 bg-gradient-light px-2.5 sm:px-3 py-1 rounded-lg shrink-0 text-center text-xs sm:text-sm w-full sm:w-auto sm:min-w-[90px]">
                {sessionsPerWeek} / Week
              </span>
            </div>
            
            <div className="space-y-3 sm:space-y-4 w-full">
              {orderedCats.map((cat, i) => {
                const weeks = Math.round((weeksByCategory[cat.id] ?? 0) * (sessionsPerWeek === 3 ? 1 : sessionsPerWeek === 4 ? 0.85 : 0.70));
                const width = (weeks / 40) * 100;
                return (
                  <div key={i} className="group w-full min-w-0">
                    <div className="flex justify-between items-center gap-2 text-xs font-bold mb-2 w-full min-w-0">
                      <span className="text-zinc-800 truncate flex-1 min-w-0">{niceLabel(cat.id)}</span>
                      <span className="text-zinc-400 font-medium shrink-0 text-left text-xs">~{weeks} weeks</span>
                    </div>
                    <div className="h-2.5 w-full bg-zinc-100 rounded-full overflow-hidden relative max-w-full">
                      <div 
                        className="h-full rounded-full gradient-bg transition-all duration-700 ease-out" 
                        style={{ width: `${Math.min(100, width)}%` }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 sm:mt-5 md:mt-6 pt-3 sm:pt-4 border-t border-zinc-100 w-full">
              <p className="text-xs text-zinc-500 leading-relaxed text-center break-words">
                <span className="text-zinc-900 font-bold">Total estimated timeline: ~{Math.round(maxWeeks * (sessionsPerWeek === 3 ? 1 : sessionsPerWeek === 4 ? 0.85 : 0.70))} weeks.</span><br className="hidden sm:block"/>
                <span className="block sm:inline">Increasing frequency can reduce this timeline by up to 30%.</span>
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Non-Negotiables */}
      <Card className="bg-zinc-900 text-white p-3 sm:p-6 md:p-8 lg:p-10 rounded-2xl ring-1 ring-zinc-800 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-start gap-4 sm:gap-8 md:gap-10 lg:gap-12 w-full min-w-0">
          <div className="md:w-1/3 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-5">
              <div className="p-1.5 sm:p-2.5 gradient-bg rounded-lg">
                <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <h4 className="text-base sm:text-2xl font-black text-white tracking-tight">Non-Negotiables</h4>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-3 sm:mb-6 md:mb-8">
              We handle the programming, the tracking, and the analysis. Your job is simple but demanding: execute the plan.
            </p>
            <div className="hidden sm:inline-block px-4 sm:px-5 py-2 sm:py-3 bg-white/5 rounded-xl border border-white/5 backdrop-blur-sm">
              <p className="text-xs font-bold text-white/80 uppercase tracking-wider break-words">
                "As long as you do your part, we'll do ours."
              </p>
            </div>
          </div>

          <div className="md:w-2/3 grid grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-4 md:gap-5 w-full min-w-0">
            {[
              { icon: Repeat, title: 'Consistency is King', desc: 'Show up. 90% attendance is the baseline. Missing sessions compounds negatively over time.' },
              { icon: Zap, title: 'Maximum Effort', desc: "We track the weights, you bring the intensity. Leave nothing in the tank when you're on the floor." },
              { icon: Lock, title: 'Trust the Process', desc: "Adherence to the macro cycle is mandatory. Don't freelance. We optimize the plan, you execute it." },
              { icon: MessageSquare, title: 'Open Communication', desc: "If something feels off, tell us immediately. We can't adjust what we don't know about." }
            ].map((item, i) => (
              <div key={i} className="flex flex-col sm:flex-row items-center sm:items-start gap-1.5 sm:gap-4 p-2.5 sm:p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300 group min-w-0 text-center sm:text-left">
                <div className="p-1.5 sm:p-2 bg-zinc-800 rounded-lg h-fit group-hover:bg-gradient-from/20 group-hover:text-gradient-from transition-colors shrink-0">
                  <item.icon className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400 group-hover:text-gradient-from" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] sm:text-sm font-bold text-white mb-0 sm:mb-1.5">{item.title}</div>
                  <div className="hidden sm:block text-xs text-zinc-400 leading-relaxed group-hover:text-zinc-300 break-words">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </section>
  );
};
