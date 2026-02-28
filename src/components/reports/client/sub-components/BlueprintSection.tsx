import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselDots } from '@/components/ui/carousel';
import { Trophy, Lock, Play, ArrowRight } from 'lucide-react';
import { CardInfoDrawer } from '../../CardInfoDrawer';

interface BlueprintPillar {
  title: string;
  weeks: string;
  color: 'blue' | 'red' | 'green';
  headline: string;
  description: string;
  protocol: Array<{ name: string; setsReps: string }>;
  order: number;
  category: string;
}

interface BlueprintSectionProps {
  blueprintPillars: BlueprintPillar[];
  hideHeader?: boolean;
  previousPhase?: string;
}

export const BlueprintSection: React.FC<BlueprintSectionProps> = ({ blueprintPillars, hideHeader, previousPhase }) => {
  if (blueprintPillars.length === 0) return null;

  const renderPillarCard = (pillar: BlueprintPillar, idx: number, isDesktop: boolean) => {
    const isBlue = pillar.color === 'blue';
    const isRed = pillar.color === 'red';
    const iconColor = 'text-gradient-dark';

    return (
      <Card key={idx} className="overflow-hidden flex flex-col h-full relative">
        <CardInfoDrawer title={pillar.title}>
          <p>This phase runs for <strong>{pillar.weeks}</strong> and focuses on {pillar.category}. {pillar.headline}</p>
          <p>{pillar.description}</p>
          <p>The sample protocol gives you a preview of the type of training you can expect during this phase.</p>
        </CardInfoDrawer>
        <div className={isDesktop ? "p-4 sm:p-5 md:p-6 lg:p-8 flex-1" : "p-4 sm:p-5 md:p-6 lg:p-8 flex-1"}>
          <div className="flex justify-between items-start mb-6">
            <Badge className="glass-button-active text-white border-transparent">
              {pillar.weeks}
            </Badge>
            {isBlue && <Lock className={`w-5 h-5 ${iconColor}`} />}
            {isRed && <Play className={`w-5 h-5 ${iconColor}`} />}
            {!isBlue && !isRed && <Trophy className={`w-5 h-5 ${iconColor}`} />}
          </div>

          <h4 className="text-sm font-bold text-zinc-900 mb-2">{pillar.title}</h4>
          <div className="text-xs font-semibold text-gradient-dark mb-4">{pillar.headline}</div>
          
          <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed mb-6">
            {pillar.description}
          </p>

          <div className="glass-subtle rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-200">
              <Play className="w-3 h-3 text-zinc-400 fill-current" />
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.15em]">Sample Protocol</span>
            </div>
            <div className="space-y-3">
              {pillar.protocol.map((row: { name: string; setsReps: string }, rIdx: number) => (
                <div key={rIdx} className="flex justify-between items-center text-xs">
                  <span className="font-bold text-zinc-700">{row.name}</span>
                  <span className="text-zinc-500 glass-label px-2.5 py-1 rounded">{row.setsReps}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <section className="w-full min-w-0 overflow-x-hidden">
      <div className="mb-3 sm:mb-4 md:mb-5 lg:mb-6">
        {!hideHeader && (
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 mb-2 sm:mb-3">
            <div className="p-1 sm:p-1.5 md:p-2 bg-gradient-light text-zinc-900 rounded-lg">
              <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
            </div>
            <h3 className="text-xs md:text-sm lg:text-base font-semibold text-zinc-900">The Blueprint</h3>
          </div>
        )}
        <p className="text-xs md:text-sm text-zinc-500 ml-0 sm:ml-8 md:ml-12">
          3 Strategic Pillars designed to bridge the gap from where you are to where you want to be.
        </p>
        {previousPhase && blueprintPillars[0]?.title && previousPhase !== blueprintPillars[0].title && (
          <div className="flex items-center gap-1.5 ml-0 sm:ml-8 md:ml-12 mt-2">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-score-green-fg bg-score-green-light px-2.5 py-1 rounded-lg">
              Phase shifted: {previousPhase} <ArrowRight className="w-3 h-3" /> {blueprintPillars[0].title}
            </span>
          </div>
        )}
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:grid grid-cols-3 gap-4 sm:gap-5 md:gap-6">
        {blueprintPillars.map((pillar, idx) => renderPillarCard(pillar, idx, true))}
      </div>

      {/* Mobile/Tablet Layout -- swipeable carousel */}
      <div className="lg:hidden">
        <Carousel opts={{ align: 'start', containScroll: 'trimSnaps' }} className="w-full">
          <CarouselContent className="-ml-3 items-stretch">
            {blueprintPillars.map((pillar, idx) => (
              <CarouselItem key={idx} className="basis-[85%] pl-3">
                {renderPillarCard(pillar, idx, false)}
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselDots count={blueprintPillars.length} />
        </Carousel>
      </div>
    </section>
  );
};
