import React from 'react';
import { Card } from '@/components/ui/card';
import { Activity, Trophy } from 'lucide-react';
import OverallRadarChart, { type RadarData } from '../../OverallRadarChart';

interface StartingPointSectionProps {
  scores: { overall: number };
  archetype: { name: string; description: string };
  overallRadarData: RadarData[];
  previousRadarData?: RadarData[];
}

export const StartingPointSection: React.FC<StartingPointSectionProps> = ({
  scores,
  archetype,
  overallRadarData,
  previousRadarData,
}) => {
  return (
    <section className="w-full min-w-0 overflow-x-hidden">
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 mb-2 sm:mb-3 md:mb-4 lg:mb-5 xl:mb-6">
        <div className="p-1 sm:p-1.5 md:p-2 bg-gradient-light text-zinc-900 rounded-lg">
          <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
        </div>
        <h3 className="text-xs md:text-sm lg:text-base font-bold text-zinc-900 uppercase tracking-widest">Your Starting Point</h3>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
        {/* Score Card */}
        <Card className="col-span-1 flex flex-col items-center justify-center p-3 sm:p-4 md:p-6 lg:p-8 text-center relative overflow-hidden min-h-[280px] sm:min-h-[320px] md:min-h-[360px] lg:min-h-[420px]">
          {/* Circular Progress Gauge */}
          <div className="relative w-36 h-36 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 xl:w-64 xl:h-64 flex items-center justify-center mb-3 sm:mb-4 md:mb-6 lg:mb-8 mt-1 sm:mt-2 md:mt-3 lg:mt-4">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle 
                cx="50" cy="50" r="42" 
                fill="transparent" 
                stroke="#f4f4f5" 
                strokeWidth="8" 
                strokeLinecap="round"
                strokeDasharray="190 264" 
                transform="rotate(140 50 50)" 
              />
              <circle 
                cx="50" cy="50" r="42" 
                fill="transparent" 
                stroke="url(#gradient-score)" 
                strokeWidth="8" 
                strokeLinecap="round"
                strokeDasharray={`${(scores.overall / 100) * 190} 264`}
                transform="rotate(140 50 50)"
                className="transition-all duration-1000 ease-out" 
              />
              <defs>
                <linearGradient id="gradient-score" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--gradient-from-hex)" />
                  <stop offset="100%" stopColor="var(--gradient-to-hex)" />
                </linearGradient>
              </defs>
            </svg>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-zinc-900 tracking-tighter leading-none">{scores.overall}</span>
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-[0.2em] mt-1 sm:mt-1.5 md:mt-2">Overall Score</span>
            </div>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 rounded-full bg-gradient-light text-zinc-900 text-xs sm:text-sm font-bold border border-gradient-medium mb-4 sm:mb-5 md:mb-6">
            <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 fill-current text-zinc-900" />
            <span className="text-center">{archetype.name}</span>
          </div>

          {/* Description */}
          <p className="text-xs md:text-sm text-zinc-500 font-medium leading-relaxed max-w-[240px] sm:max-w-[260px] mx-auto">
            {archetype.description}
          </p>
        </Card>

        {/* Radar Chart */}
        <Card className="col-span-1 lg:col-span-2 p-3 sm:p-4 md:p-5 lg:p-8 relative min-h-[280px] sm:min-h-[320px] md:min-h-[360px] lg:min-h-[420px]">
          <div className="flex justify-between items-start mb-3 sm:mb-4">
            <div>
              <h4 className="text-sm font-bold text-zinc-900">Performance Profile</h4>
              <p className="text-xs text-zinc-500 mt-0.5 sm:mt-1">
                Visualizing your current baseline across health pillars.
              </p>
            </div>
          </div>
          <div className="h-[240px] sm:h-[260px] md:h-[280px] lg:h-[320px] w-full mt-1 sm:mt-2 md:mt-4">
            <OverallRadarChart data={overallRadarData} previousData={previousRadarData} />
          </div>
        </Card>
      </div>
    </section>
  );
};
