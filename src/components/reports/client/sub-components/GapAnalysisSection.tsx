import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselDots } from '@/components/ui/carousel';
import { BarChart3, Scale, Dumbbell, Heart, ArrowRight, Lightbulb, TrendingUp, TrendingDown } from 'lucide-react';
import { truncateInsight } from '../clientReportUtils';
import type { GapAnalysisData } from '../../useGapAnalysisData';
import type { FormData } from '@/contexts/FormContext';
import { CardInfoDrawer } from '../../CardInfoDrawer';
import { AnimatedValue } from './AnimatedValue';
import { useAnimateOnView } from '@/hooks/useAnimateOnView';

interface GapAnalysisSectionProps {
  gapAnalysisData: GapAnalysisData[];
  previousGapAnalysisData?: GapAnalysisData[];
  goals?: string[];
  formData?: FormData;
  hideHeader?: boolean;
}

const DeltaIndicator: React.FC<{ delta?: number }> = ({ delta }) => {
  if (delta === undefined || delta === 0) return null;
  const isPositive = delta > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
      {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
    </span>
  );
};

const GAP_PHASE_DURATION_MS = 550;

const GapMetricRow: React.FC<{
  label: string;
  current: string | number;
  target: string | number;
  isDesktop?: boolean;
  delta?: number;
  /** Previous numeric value for scroll-triggered animation */
  fromValue?: number;
  /** Original gap target (previous assessment target) for two-phase: first animate to this, then reveal new target */
  originalTarget?: number;
  /** Decimal places for animated value */
  decimals?: number;
}> = ({ label, current, target, isDesktop, delta, fromValue, originalTarget, decimals = 1 }) => {
  const numericCurrent = typeof current === 'number' ? current : parseFloat(String(current));
  const numericTarget = typeof target === 'number' ? target : parseFloat(String(target));
  const hasTwoPhase = originalTarget != null && !isNaN(originalTarget) && fromValue !== undefined
    && !isNaN(numericCurrent) && originalTarget !== numericTarget;

  const [phase, setPhase] = useState<1 | 2>(1);
  const phase1Value = hasTwoPhase ? originalTarget! : numericCurrent;
  const phase1From = hasTwoPhase ? fromValue! : (fromValue ?? numericCurrent);
  const phase2Value = numericCurrent;
  const phase2From = originalTarget ?? numericCurrent;

  const value = phase === 1 ? phase1Value : phase2Value;
  const from = phase === 1 ? phase1From : phase2From;

  const { ref, displayValue, directionClassName } = useAnimateOnView({
    value,
    from,
    decimals,
    delta,
    duration: GAP_PHASE_DURATION_MS,
    onComplete: phase === 1 && hasTwoPhase ? () => setPhase(2) : undefined,
  });

  useEffect(() => {
    if (!hasTwoPhase) setPhase(1);
  }, [hasTwoPhase]);

  const canAnimate = fromValue !== undefined && !isNaN(numericCurrent) && (fromValue !== numericCurrent || hasTwoPhase);
  const targetDisplay = hasTwoPhase ? (phase === 1 ? originalTarget!.toFixed(decimals) : (typeof target === 'number' ? target.toFixed(decimals) : target)) : target;

  const renderCurrent = () => {
    if (canAnimate) {
      if (hasTwoPhase) {
        return <span ref={ref} className={directionClassName}>{displayValue}</span>;
      }
      return <AnimatedValue value={numericCurrent} from={fromValue} decimals={decimals} delta={delta} duration={GAP_PHASE_DURATION_MS} />;
    }
    return <>{current}</>;
  };

  if (!isDesktop) {
    return (
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground-secondary text-left whitespace-nowrap flex-shrink-0">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground-secondary text-right tabular-nums inline-flex items-center gap-0.5">
            {renderCurrent()}
            <DeltaIndicator delta={delta} />
          </span>
          <ArrowRight className={`w-3 h-3 ${typeof current === 'number' || current !== '--' ? 'text-gradient-dark' : 'text-muted-foreground/60'} flex-shrink-0`} />
          <span className="text-sm font-bold text-gradient-dark text-right tabular-nums">{targetDisplay}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid items-center gap-3 grid-cols-[minmax(0,1fr)_auto_16px_auto]">
      <span className="min-w-0 text-sm font-medium text-foreground-secondary text-left truncate">{label}</span>
      <span className="text-sm text-foreground-secondary text-right tabular-nums inline-flex items-center gap-0.5">
        {renderCurrent()}
        <DeltaIndicator delta={delta} />
      </span>
      <ArrowRight className={`w-3 h-3 ${typeof current === 'number' || current !== '--' ? 'text-gradient-dark' : 'text-muted-foreground/60'} justify-self-center`} />
      <span className="text-sm font-bold text-gradient-dark text-right tabular-nums">{targetDisplay}</span>
    </div>
  );
};


export const GapAnalysisSection: React.FC<GapAnalysisSectionProps> = ({
  gapAnalysisData,
  previousGapAnalysisData,
  goals,
  formData,
  hideHeader,
}) => {
  const bodyComp = gapAnalysisData[0];
  const functional = gapAnalysisData[1];
  const metabolic = gapAnalysisData[2];
  const prevBodyComp = previousGapAnalysisData?.[0];
  const prevFunctional = previousGapAnalysisData?.[1];
  const prevMetabolic = previousGapAnalysisData?.[2];


  const renderBodyCompCard = (isDesktop: boolean) => {
    return (
      <Card className={isDesktop ? "p-4 sm:p-5 md:p-6 flex flex-col relative" : "p-5 sm:p-6 md:p-7 flex flex-col h-full relative"}>
        <CardInfoDrawer title="Body Composition">
          <p>Body composition measures the ratio of muscle, fat, and bone in your body. These targets are personalised based on your goals and current measurements.</p>
          <p>The &ldquo;Current &rarr; Target&rdquo; values show where you are now versus where you need to be for optimal health and performance.</p>
        </CardInfoDrawer>
        <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6 h-[44px]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-light text-foreground rounded-lg">
            <Scale className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-foreground">Body Composition</h4>
        </div>
        <Badge className="glass-button-active border-transparent whitespace-nowrap mr-5">
          {bodyComp?.status === 'red' ? 'Priority Focus' : 'Optimize'}
        </Badge>
      </div>
      
      <div className={`flex flex-col justify-between flex-1 ${isDesktop ? 'min-h-[140px]' : 'min-h-[120px] sm:min-h-[140px]'} mb-6`}>
        {isDesktop ? (
          <>
            <div className="grid items-center gap-3 grid-cols-[minmax(0,1fr)_auto_16px_auto] mb-3">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] text-right col-start-2">Current</span>
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] text-right col-start-4">Target</span>
            </div>
            <GapMetricRow
              label="Body Weight (kg)"
              current={bodyComp?.bodyCompGaps ? bodyComp.bodyCompGaps.weight.current.toFixed(1) : '--'}
              target={bodyComp?.bodyCompGaps ? bodyComp.bodyCompGaps.weight.target.toFixed(1) : '--'}
              isDesktop
              delta={bodyComp?.deltas?.weight}
              fromValue={prevBodyComp?.bodyCompGaps?.weight.current}
              originalTarget={prevBodyComp?.bodyCompGaps?.weight.target}
            />
            <GapMetricRow
              label="Muscle Mass (kg)"
              current={bodyComp?.bodyCompGaps ? bodyComp.bodyCompGaps.muscle.current.toFixed(1) : '--'}
              target={bodyComp?.bodyCompGaps ? bodyComp.bodyCompGaps.muscle.target.toFixed(1) : '--'}
              isDesktop
              delta={bodyComp?.deltas?.muscle}
              fromValue={prevBodyComp?.bodyCompGaps?.muscle.current}
              originalTarget={prevBodyComp?.bodyCompGaps?.muscle.target}
            />
            <GapMetricRow
              label="Body Fat (%)"
              current={bodyComp?.bodyCompGaps ? bodyComp.bodyCompGaps.fat.current.toFixed(1) : '--'}
              target={bodyComp?.bodyCompGaps ? bodyComp.bodyCompGaps.fat.target.toFixed(1) : '--'}
              isDesktop
              delta={bodyComp?.deltas?.fat}
              fromValue={prevBodyComp?.bodyCompGaps?.fat.current}
              originalTarget={prevBodyComp?.bodyCompGaps?.fat.target}
            />
          </>
        ) : (
          <div className="flex flex-col gap-2.5">
            <GapMetricRow
              label="Body Weight (kg)"
              current={bodyComp?.bodyCompGaps ? bodyComp.bodyCompGaps.weight.current.toFixed(1) : '--'}
              target={bodyComp?.bodyCompGaps ? bodyComp.bodyCompGaps.weight.target.toFixed(1) : '--'}
              delta={bodyComp?.deltas?.weight}
              fromValue={prevBodyComp?.bodyCompGaps?.weight.current}
              originalTarget={prevBodyComp?.bodyCompGaps?.weight.target}
            />
            <GapMetricRow
              label="Muscle Mass (kg)"
              current={bodyComp?.bodyCompGaps ? bodyComp.bodyCompGaps.muscle.current.toFixed(1) : '--'}
              target={bodyComp?.bodyCompGaps ? bodyComp.bodyCompGaps.muscle.target.toFixed(1) : '--'}
              delta={bodyComp?.deltas?.muscle}
              fromValue={prevBodyComp?.bodyCompGaps?.muscle.current}
              originalTarget={prevBodyComp?.bodyCompGaps?.muscle.target}
            />
            <GapMetricRow
              label="Body Fat (%)"
              current={bodyComp?.bodyCompGaps ? bodyComp.bodyCompGaps.fat.current.toFixed(1) : '--'}
              target={bodyComp?.bodyCompGaps ? bodyComp.bodyCompGaps.fat.target.toFixed(1) : '--'}
              delta={bodyComp?.deltas?.fat}
              fromValue={prevBodyComp?.bodyCompGaps?.fat.current}
              originalTarget={prevBodyComp?.bodyCompGaps?.fat.target}
            />
          </div>
        )}
      </div>
      
      <div className="pt-3 sm:pt-4 border-t border-border mt-auto">
        <div className="flex items-start gap-1.5 sm:gap-2">
          <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-score-amber mt-0.5 flex-shrink-0" />
          <p className="text-xs text-foreground-secondary leading-relaxed">{truncateInsight(bodyComp?.insight || '')}</p>
        </div>
      </div>
      </Card>
    );
  };

  const renderFunctionalCard = (isDesktop: boolean) => {
    const coreGaps = functional?.functionalGaps?.core;
    const currentCore = coreGaps ? (coreGaps.current >= 60 ? `${Math.floor(coreGaps.current / 60)}:${(coreGaps.current % 60).toString().padStart(2, '0')}` : `${coreGaps.current}s`) : '--';
    const targetCore = coreGaps ? (coreGaps.target >= 60 ? `${Math.floor(coreGaps.target / 60)}:${(coreGaps.target % 60).toString().padStart(2, '0')}` : `${coreGaps.target}s`) : '--';

    const strength = functional?.functionalGaps?.strength;
    let strengthLabel = 'Overall Strength';
    let currentStrength: string | number = '--';
    let targetStrength: string | number = '--';

    if (strength) {
      if (strength.method === 'deadhang' || strength.method === 'pinch') {
        strengthLabel = strength.method === 'deadhang' ? 'Overall Strength (s)' : `Overall Strength (s, ${(formData?.gender?.toLowerCase() === 'female' ? 10 : 15)}kg)`;
        currentStrength = strength.currentTime?.toFixed(0) || '--';
        targetStrength = strength.targetTime?.toFixed(0) || '--';
      } else {
        strengthLabel = 'Overall Strength (kg)';
        currentStrength = strength.current?.toFixed(1) || '--';
        targetStrength = strength.target?.toFixed(1) || '--';
      }
    }

    return (
      <Card className={isDesktop ? "p-4 sm:p-5 md:p-6 flex flex-col relative" : "p-5 sm:p-6 md:p-7 flex flex-col h-full relative"}>
        <CardInfoDrawer title="Functional Strength">
          <p>Functional strength measures your body&rsquo;s ability to produce force, maintain endurance, and stabilise through your core in real-world movement patterns.</p>
          <p>These metrics reflect your muscular endurance, core stability, and overall strength capacity based on your assessment results.</p>
        </CardInfoDrawer>
        <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6 h-[44px]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-light text-foreground rounded-lg">
              <Dumbbell className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-foreground">Functional Strength</h4>
          </div>
          <Badge className="glass-button-active border-transparent whitespace-nowrap mr-5">
            {functional?.status === 'red' ? 'Priority Focus' : 'Optimize'}
          </Badge>
        </div>
        
        <div className={`flex flex-col justify-between flex-1 ${isDesktop ? 'min-h-[140px]' : 'min-h-[120px] sm:min-h-[140px]'} mb-6`}>
          {isDesktop ? (
            <>
              <div className="grid items-center gap-3 grid-cols-[minmax(0,1fr)_auto_16px_auto] mb-3">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] text-right col-start-2">Current</span>
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] text-right col-start-4">Target</span>
              </div>
              <GapMetricRow 
                label="Muscular Endurance (reps)" 
                current={functional?.functionalGaps ? functional.functionalGaps.endurance.current : '--'} 
                target={functional?.functionalGaps ? functional.functionalGaps.endurance.target : '--'}
                isDesktop
                delta={functional?.deltas?.endurance}
                fromValue={prevFunctional?.functionalGaps?.endurance.current}
                decimals={0}
              />
              <GapMetricRow 
                label="Core Stability (time)" 
                current={currentCore} 
                target={targetCore}
                isDesktop
                delta={functional?.deltas?.core}
              />
              <GapMetricRow 
                label={strengthLabel} 
                current={currentStrength} 
                target={targetStrength}
                isDesktop
                delta={functional?.deltas?.strength}
              />
            </>
          ) : (
            <div className="flex flex-col gap-2.5">
              <GapMetricRow
                label="Endurance (reps)"
                current={functional?.functionalGaps ? functional.functionalGaps.endurance.current : '--'}
                target={functional?.functionalGaps ? functional.functionalGaps.endurance.target : '--'}
                delta={functional?.deltas?.endurance}
                fromValue={prevFunctional?.functionalGaps?.endurance.current}
                decimals={0}
              />
              <GapMetricRow
                label="Core Stability"
                current={currentCore}
                target={targetCore}
                delta={functional?.deltas?.core}
              />
              <GapMetricRow
                label={strengthLabel}
                current={currentStrength}
                target={targetStrength}
                delta={functional?.deltas?.strength}
              />
            </div>
          )}
        </div>
        
        <div className="pt-3 sm:pt-4 border-t border-border mt-auto">
          <div className="flex items-start gap-1.5 sm:gap-2">
            <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-score-amber mt-0.5 flex-shrink-0" />
            <p className="text-xs text-foreground-secondary leading-relaxed">{truncateInsight(functional?.insight || '')}</p>
          </div>
        </div>
      </Card>
    );
  };

  const renderMetabolicCard = (isDesktop: boolean) => {
    return (
      <Card className={isDesktop ? "p-4 sm:p-5 md:p-6 flex flex-col relative" : "p-5 sm:p-6 md:p-7 flex flex-col h-full relative"}>
        <CardInfoDrawer title="Metabolic Fitness">
          <p>Metabolic fitness reflects your cardiovascular health — how efficiently your heart and lungs deliver oxygen to working muscles.</p>
          <p>Resting heart rate, recovery heart rate, and VO2 max are the key markers that indicate your aerobic capacity and recovery ability.</p>
        </CardInfoDrawer>
        <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6 h-[44px]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-light text-foreground rounded-lg">
            <Heart className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-foreground">Metabolic Fitness</h4>
        </div>
        <Badge className="glass-button-active border-transparent whitespace-nowrap mr-5">
          {metabolic?.status === 'red' ? 'Priority Focus' : (metabolic?.status === 'yellow' || (goals || []).includes('improve-fitness')) ? 'Optimize' : 'Maintain'}
        </Badge>
      </div>
      
      <div className={`flex flex-col justify-between flex-1 ${isDesktop ? 'min-h-[140px]' : 'min-h-[120px] sm:min-h-[140px]'} mb-6`}>
        {isDesktop ? (
          <>
            <div className="grid items-center gap-3 grid-cols-[minmax(0,1fr)_auto_16px_auto] mb-3">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] text-right col-start-2">Current</span>
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] text-right col-start-4">Target</span>
            </div>
            <GapMetricRow 
              label="Resting HR (bpm)" 
              current={metabolic?.cardioGaps && metabolic.cardioGaps.rhr.current > 0 ? Math.round(metabolic.cardioGaps.rhr.current) : '--'} 
              target={metabolic?.cardioGaps && metabolic.cardioGaps.rhr.target > 0 ? Math.round(metabolic.cardioGaps.rhr.target) : '--'}
              isDesktop
              delta={metabolic?.deltas?.rhr}
              fromValue={prevMetabolic?.cardioGaps?.rhr.current ? Math.round(prevMetabolic.cardioGaps.rhr.current) : undefined}
              decimals={0}
            />
            <GapMetricRow 
              label="Recovery HR (bpm)" 
              current={metabolic?.cardioGaps && metabolic.cardioGaps.recovery.current > 0 ? Math.round(metabolic.cardioGaps.recovery.current) : '--'} 
              target={metabolic?.cardioGaps && metabolic.cardioGaps.recovery.target > 0 ? Math.round(metabolic.cardioGaps.recovery.target) : '--'}
              isDesktop
              delta={metabolic?.deltas?.recovery}
              fromValue={prevMetabolic?.cardioGaps?.recovery.current ? Math.round(prevMetabolic.cardioGaps.recovery.current) : undefined}
              decimals={0}
            />
            <GapMetricRow 
              label="VO2 Max (ml/kg/min)" 
              current={metabolic?.cardioGaps && metabolic.cardioGaps.vo2.current > 0 ? metabolic.cardioGaps.vo2.current.toFixed(1) : '--'} 
              target={metabolic?.cardioGaps && metabolic.cardioGaps.vo2.target > 0 ? metabolic.cardioGaps.vo2.target.toFixed(1) : '--'}
              isDesktop
              delta={metabolic?.deltas?.vo2}
              fromValue={prevMetabolic?.cardioGaps?.vo2.current && prevMetabolic.cardioGaps.vo2.current > 0 ? prevMetabolic.cardioGaps.vo2.current : undefined}
            />
          </>
        ) : (
          <div className="flex flex-col gap-2.5">
            <GapMetricRow
              label="Resting HR (bpm)"
              current={metabolic?.cardioGaps && metabolic.cardioGaps.rhr.current > 0 ? Math.round(metabolic.cardioGaps.rhr.current) : '--'}
              target={metabolic?.cardioGaps && metabolic.cardioGaps.rhr.target > 0 ? Math.round(metabolic.cardioGaps.rhr.target) : '--'}
              delta={metabolic?.deltas?.rhr}
              fromValue={prevMetabolic?.cardioGaps?.rhr.current ? Math.round(prevMetabolic.cardioGaps.rhr.current) : undefined}
              decimals={0}
            />
            <GapMetricRow
              label="Recovery HR (bpm)"
              current={metabolic?.cardioGaps && metabolic.cardioGaps.recovery.current > 0 ? Math.round(metabolic.cardioGaps.recovery.current) : '--'}
              target={metabolic?.cardioGaps && metabolic.cardioGaps.recovery.target > 0 ? Math.round(metabolic.cardioGaps.recovery.target) : '--'}
              delta={metabolic?.deltas?.recovery}
              fromValue={prevMetabolic?.cardioGaps?.recovery.current ? Math.round(prevMetabolic.cardioGaps.recovery.current) : undefined}
              decimals={0}
            />
            <GapMetricRow
              label="VO2 Max (ml/kg/min)"
              current={metabolic?.cardioGaps && metabolic.cardioGaps.vo2.current > 0 ? metabolic.cardioGaps.vo2.current.toFixed(1) : '--'}
              target={metabolic?.cardioGaps && metabolic.cardioGaps.vo2.target > 0 ? metabolic.cardioGaps.vo2.target.toFixed(1) : '--'}
              delta={metabolic?.deltas?.vo2}
              fromValue={prevMetabolic?.cardioGaps?.vo2.current && prevMetabolic.cardioGaps.vo2.current > 0 ? prevMetabolic.cardioGaps.vo2.current : undefined}
            />
          </div>
        )}
      </div>
      
      <div className="pt-3 sm:pt-4 border-t border-border mt-auto">
        <div className="flex items-start gap-1.5 sm:gap-2">
          <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-score-amber mt-0.5 flex-shrink-0" />
          <p className="text-xs text-foreground-secondary leading-relaxed">{truncateInsight(metabolic?.insight || '')}</p>
        </div>
      </div>
      </Card>
    );
  };

  return (
    <section className="w-full min-w-0 overflow-x-hidden">
      {!hideHeader && (
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 mb-2 sm:mb-3 md:mb-4 lg:mb-5 xl:mb-6">
          <div className="p-1 sm:p-1.5 md:p-2 bg-gradient-light text-foreground rounded-lg">
            <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
          </div>
          <h3 className="text-xs md:text-sm lg:text-base font-semibold text-foreground">Gap Analysis</h3>
        </div>
      )}
      <p className="text-xs md:text-sm text-muted-foreground mb-3 sm:mb-4 md:mb-5 lg:mb-6">Current metrics vs. optimal performance targets.</p>

      {gapAnalysisData.some((g) => g.projectionMessage) && (
        <div className="rounded-xl border border-border bg-muted/30 p-4 mb-4 sm:mb-5 text-sm text-foreground">
          <p className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-score-green shrink-0 mt-0.5" />
            {gapAnalysisData.find((g) => g.projectionMessage)?.projectionMessage}
          </p>
        </div>
      )}
      
      {/* Desktop Layout */}
      <div className="hidden lg:grid grid-cols-3 gap-4 sm:gap-5 md:gap-6 mb-6 md:mb-8">
        {renderBodyCompCard(true)}
        {renderFunctionalCard(true)}
        {renderMetabolicCard(true)}
      </div>

      {/* Mobile/Tablet Layout -- swipeable carousel */}
      <div className="lg:hidden mb-6 md:mb-8">
        <Carousel opts={{ align: 'start', containScroll: 'trimSnaps' }} className="w-full">
          <CarouselContent className="-ml-3 items-stretch">
            <CarouselItem className="basis-[85%] pl-3">{renderBodyCompCard(false)}</CarouselItem>
            <CarouselItem className="basis-[85%] pl-3">{renderFunctionalCard(false)}</CarouselItem>
            <CarouselItem className="basis-[85%] pl-3">{renderMetabolicCard(false)}</CarouselItem>
          </CarouselContent>
          <CarouselDots count={3} />
        </Carousel>
      </div>
    </section>
  );
};
