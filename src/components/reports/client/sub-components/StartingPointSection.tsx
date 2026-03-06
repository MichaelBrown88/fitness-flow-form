import React from 'react';
import { Card } from '@/components/ui/card';
import { Activity, Trophy, TrendingUp, TrendingDown } from 'lucide-react';
import OverallRadarChart, { type RadarData } from '../../OverallRadarChart';
import { useIsMobile } from '@/hooks/use-mobile';
import { CardInfoDrawer } from '../../CardInfoDrawer';
import { useAnimateOnView } from '@/hooks/useAnimateOnView';

const OVERALL_SCORE_ANIMATION_DURATION_MS = 1200;

interface StartingPointSectionProps {
  scores: { overall: number };
  previousOverallScore?: number | null;
  archetype: { name: string; description: string };
  overallRadarData: RadarData[];
  previousRadarData?: RadarData[];
  hideHeader?: boolean;
}

export const StartingPointSection: React.FC<StartingPointSectionProps> = ({
  scores,
  previousOverallScore,
  archetype,
  overallRadarData,
  previousRadarData,
  hideHeader,
}) => {
  const isMobile = useIsMobile();
  const gaugeStroke = isMobile ? 6 : 8;
  // Animate from previous score to current score (or from 0 on first view), re-triggers on scroll
  const animateFrom = previousOverallScore != null ? previousOverallScore : 0;
  const { ref: scoreRef, displayValue: animatedScore } = useAnimateOnView({
    value: scores.overall,
    from: animateFrom,
    duration: OVERALL_SCORE_ANIMATION_DURATION_MS,
  });
  const scoreDiff = previousOverallScore != null ? scores.overall - previousOverallScore : null;
  const hasScoreChange = scoreDiff !== null && scoreDiff !== 0;

  return (
    <section className="w-full min-w-0 overflow-x-hidden">
      {!hideHeader && (
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 mb-2 sm:mb-3 md:mb-4 lg:mb-5 xl:mb-6">
          <div className="p-1 sm:p-1.5 md:p-2 bg-gradient-light text-zinc-900 rounded-lg">
            <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
          </div>
          <h3 className="text-xs md:text-sm lg:text-base font-semibold text-zinc-900">Your Starting Point</h3>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
        {/* Score Card */}
        <Card className="col-span-1 flex flex-col items-center justify-center p-3 sm:p-4 md:p-6 lg:p-8 text-center relative overflow-hidden min-h-0 sm:min-h-[320px] md:min-h-[360px] lg:min-h-[420px]">
          <CardInfoDrawer title="Overall Score">
            <p>Your overall score of <strong>{scores.overall}/100</strong> is calculated from 5 health pillars: Body Composition, Functional Strength, Metabolic Fitness, Movement Quality, and Lifestyle.</p>
            <p>Each pillar contributes equally to your total score. Improving any single pillar will raise your overall number.</p>
          </CardInfoDrawer>
          {/* Circular Progress Gauge */}
          <div ref={scoreRef} className={`relative w-28 h-28 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 xl:w-64 xl:h-64 flex items-center justify-center mb-1 sm:mb-2 md:mb-4 lg:mb-6 mt-1 sm:mt-2 md:mt-3 lg:mt-4 ${hasScoreChange ? 'animate-score-pulse' : ''}`}>
            <svg className="w-full h-full" viewBox="-4 -4 108 108">
              <circle 
                cx="50" cy="50" r="42" 
                fill="transparent" 
                stroke="#f4f4f5" 
                strokeWidth={gaugeStroke} 
                strokeLinecap="round"
                strokeDasharray="190 264" 
                transform="rotate(140 50 50)" 
              />
              <circle 
                cx="50" cy="50" r="42" 
                fill="transparent" 
                stroke="url(#gradient-score)" 
                strokeWidth={gaugeStroke} 
                strokeLinecap="round"
                strokeDasharray={`${(scores.overall / 100) * 190} 264`}
                transform="rotate(140 50 50)"
                className="transition-all duration-1000 ease-out" 
              />
              {/* Glow ring when score changed */}
              {hasScoreChange && (
                <circle 
                  cx="50" cy="50" r="42" 
                  fill="transparent" 
                  stroke={scoreDiff > 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}
                  strokeWidth={gaugeStroke + 4} 
                  strokeLinecap="round"
                  strokeDasharray={`${(scores.overall / 100) * 190} 264`}
                  transform="rotate(140 50 50)"
                  className="animate-glow-fade" 
                />
              )}
              <defs>
                <linearGradient id="gradient-score" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--gradient-from-hex)" />
                  <stop offset="100%" stopColor="var(--gradient-to-hex)" />
                </linearGradient>
              </defs>
            </svg>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-zinc-900 tracking-tight leading-none">{animatedScore}</span>
            </div>
          </div>

          {/* Score label + trend indicator -- sits below ring */}
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.15em] mb-1 sm:mb-1.5">Overall Score</span>
          {scoreDiff !== null && scoreDiff !== 0 && (
            <div className={`inline-flex items-center gap-0.5 text-[10px] sm:text-xs font-semibold mb-2 sm:mb-3 ${scoreDiff > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {scoreDiff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{scoreDiff > 0 ? '+' : ''}{scoreDiff} since last assessment</span>
            </div>
          )}
          {(scoreDiff === null || scoreDiff === 0) && <div className="mb-2 sm:mb-3" />}

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 rounded-full bg-gradient-light text-zinc-900 text-xs sm:text-sm font-bold border border-gradient-medium mb-2 sm:mb-3 md:mb-4">
            <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 fill-current text-zinc-900" />
            <span className="text-center">{archetype.name}</span>
          </div>

          {/* Description -- visible on all screens */}
          <p className="text-xs sm:text-xs md:text-sm text-zinc-500 font-medium leading-relaxed max-w-[240px] sm:max-w-[260px] mx-auto">
            {archetype.description}
          </p>
        </Card>

        {/* Radar Chart */}
        <Card className="col-span-1 lg:col-span-2 p-3 sm:p-4 md:p-5 lg:p-8 relative min-h-[280px] sm:min-h-[320px] md:min-h-[360px] lg:min-h-[420px] overflow-hidden">
          <CardInfoDrawer title="Performance Profile">
            <p>This radar chart shows your performance across all health pillars relative to your goals.</p>
            <p>The further the shape extends toward the edge, the closer you are to optimal in that area. A perfectly balanced shape indicates even development across all pillars.</p>
            {previousRadarData && previousRadarData.length > 0 && (
              <p>The lighter shaded area shows your previous assessment, allowing you to see progress over time.</p>
            )}
          </CardInfoDrawer>
          <div className="flex justify-between items-start mb-1 sm:mb-4">
            <div>
              <h4 className="text-sm font-bold text-zinc-900">Performance Profile</h4>
              <p className="text-xs text-zinc-500 mt-0.5 sm:mt-1">
                Visualizing your current baseline across health pillars.
              </p>
            </div>
          </div>
          <div className="h-[240px] sm:h-[260px] md:h-[280px] lg:h-[320px] w-full mt-0 sm:mt-2 md:mt-4">
            <OverallRadarChart data={overallRadarData} previousData={previousRadarData} compact={isMobile} />
          </div>
        </Card>
      </div>
    </section>
  );
};
