import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Scale, Dumbbell, Heart, ArrowRight, Lightbulb } from 'lucide-react';
import { truncateInsight } from '../clientReportUtils';
import type { GapAnalysisData } from '../../useGapAnalysisData';
import type { FormData } from '@/contexts/FormContext';

interface GapAnalysisSectionProps {
  gapAnalysisData: GapAnalysisData[];
  goals?: string[];
  formData?: FormData;
}

const GapMetricRow: React.FC<{
  label: string;
  current: string | number;
  target: string | number;
  isDesktop?: boolean;
}> = ({ label, current, target, isDesktop }) => {
  const containerStyle = isDesktop 
    ? { } 
    : { width: '140px', flexShrink: 0, justifyContent: 'space-between', paddingRight: '2px' };
  
  const spanStyle = isDesktop ? { width: '64px' } : { width: '64px' };

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium text-zinc-700 text-left whitespace-nowrap flex-shrink-0">{label}</span>
      <div className="flex items-center gap-2" style={isDesktop ? {} : containerStyle}>
        <span className="text-sm text-zinc-600 text-right w-16" style={isDesktop ? {} : spanStyle}>{current}</span>
        <ArrowRight className={`w-3 h-3 ${typeof current === 'number' || current !== '--' ? 'text-gradient-dark' : 'text-zinc-300'} flex-shrink-0`} />
        <span className="text-sm font-bold text-gradient-dark text-right w-16" style={isDesktop ? {} : spanStyle}>{target}</span>
      </div>
    </div>
  );
};

export const GapAnalysisSection: React.FC<GapAnalysisSectionProps> = ({
  gapAnalysisData,
  goals,
  formData,
}) => {
  const bodyComp = gapAnalysisData[0];
  const functional = gapAnalysisData[1];
  const metabolic = gapAnalysisData[2];

  const renderBodyCompCard = (isDesktop: boolean) => (
    <Card className={isDesktop ? "p-4 sm:p-5 md:p-6 flex flex-col" : "p-5 sm:p-6 md:p-7 flex flex-col"}>
      <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6 h-[44px]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-light text-zinc-900 rounded-lg">
            <Scale className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-zinc-900">Body Composition</h4>
        </div>
        <Badge className="glass-button-active text-white border-transparent whitespace-nowrap">
          {bodyComp?.status === 'red' ? 'Priority Focus' : 'Optimize'}
        </Badge>
      </div>
      
      <div className={`flex flex-col justify-between flex-1 ${isDesktop ? 'min-h-[140px]' : 'min-h-[120px] sm:min-h-[140px]'} mb-6`}>
        <div className={`flex items-center justify-end gap-2 mb-3 ${isDesktop ? '' : 'pr-0.5'}`} style={isDesktop ? {} : { width: '140px', marginLeft: 'auto', justifyContent: 'space-between', paddingRight: '2px' }}>
          <span className="text-[9px] text-zinc-400 uppercase tracking-wider text-center w-16">Current</span>
          <div className="w-3"></div>
          <span className="text-[9px] text-zinc-400 uppercase tracking-wider text-center w-16">Target</span>
        </div>
        
        <GapMetricRow 
          label="Body Weight (kg)" 
          current={bodyComp?.bodyCompGaps ? bodyComp.bodyCompGaps.weight.current.toFixed(1) : '--'} 
          target={bodyComp?.bodyCompGaps ? bodyComp.bodyCompGaps.weight.target.toFixed(1) : '--'}
          isDesktop={isDesktop}
        />
        <GapMetricRow 
          label="Muscle Mass (kg)" 
          current={bodyComp?.bodyCompGaps ? bodyComp.bodyCompGaps.muscle.current.toFixed(1) : '--'} 
          target={bodyComp?.bodyCompGaps ? bodyComp.bodyCompGaps.muscle.target.toFixed(1) : '--'}
          isDesktop={isDesktop}
        />
        <GapMetricRow 
          label="Body Fat (%)" 
          current={bodyComp?.bodyCompGaps ? bodyComp.bodyCompGaps.fat.current.toFixed(1) : '--'} 
          target={bodyComp?.bodyCompGaps ? bodyComp.bodyCompGaps.fat.target.toFixed(1) : '--'}
          isDesktop={isDesktop}
        />
      </div>
      
      <div className="pt-3 sm:pt-4 border-t border-zinc-100">
        <div className="flex items-start gap-1.5 sm:gap-2">
          <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-[10px] sm:text-xs text-zinc-600 leading-relaxed">{truncateInsight(bodyComp?.insight || '')}</p>
        </div>
      </div>
    </Card>
  );

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
      <Card className={isDesktop ? "p-4 sm:p-5 md:p-6 flex flex-col" : "p-5 sm:p-6 md:p-7 flex flex-col"}>
        <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6 h-[44px]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-light text-zinc-900 rounded-lg">
              <Dumbbell className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-zinc-900">Functional Strength</h4>
          </div>
          <Badge className="glass-button-active text-white border-transparent whitespace-nowrap">
            {functional?.status === 'red' ? 'Priority Focus' : 'Optimize'}
          </Badge>
        </div>
        
        <div className={`flex flex-col justify-between flex-1 ${isDesktop ? 'min-h-[140px]' : 'min-h-[120px] sm:min-h-[140px]'} mb-6`}>
          <div className={`flex items-center justify-end gap-2 mb-3 ${isDesktop ? '' : 'pr-0.5'}`} style={isDesktop ? {} : { width: '140px', marginLeft: 'auto', justifyContent: 'space-between', paddingRight: '2px' }}>
            <span className="text-[9px] text-zinc-400 uppercase tracking-wider text-center w-16">Current</span>
            <div className="w-3"></div>
            <span className="text-[9px] text-zinc-400 uppercase tracking-wider text-center w-16">Target</span>
          </div>
          
          <GapMetricRow 
            label="Muscular Endurance (reps)" 
            current={functional?.functionalGaps ? functional.functionalGaps.endurance.current : '--'} 
            target={functional?.functionalGaps ? functional.functionalGaps.endurance.target : '--'}
            isDesktop={isDesktop}
          />
          <GapMetricRow 
            label={isDesktop ? "Core Stability (time)" : "Core Stability (secs)"} 
            current={currentCore} 
            target={targetCore}
            isDesktop={isDesktop}
          />
          <GapMetricRow 
            label={strengthLabel} 
            current={currentStrength} 
            target={targetStrength}
            isDesktop={isDesktop}
          />
        </div>
        
        <div className="pt-3 sm:pt-4 border-t border-zinc-100">
          <div className="flex items-start gap-1.5 sm:gap-2">
            <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] sm:text-xs text-zinc-600 leading-relaxed">{truncateInsight(functional?.insight || '')}</p>
          </div>
        </div>
      </Card>
    );
  };

  const renderMetabolicCard = (isDesktop: boolean) => (
    <Card className={isDesktop ? "p-4 sm:p-5 md:p-6 flex flex-col" : "p-5 sm:p-6 md:p-7 flex flex-col"}>
      <div className="flex items-center justify-between mb-4 sm:mb-5 md:mb-6 h-[44px]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-light text-zinc-900 rounded-lg">
            <Heart className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-zinc-900">Metabolic Fitness</h4>
        </div>
        <Badge className="glass-button-active text-white border-transparent whitespace-nowrap">
          {metabolic?.status === 'red' ? 'Priority Focus' : (metabolic?.status === 'yellow' || (goals || []).includes('improve-fitness')) ? 'Optimize' : 'Maintain'}
        </Badge>
      </div>
      
      <div className={`flex flex-col justify-between flex-1 ${isDesktop ? 'min-h-[140px]' : 'min-h-[120px] sm:min-h-[140px]'} mb-6`}>
        <div className={`flex items-center justify-end gap-2 mb-3 ${isDesktop ? '' : 'pr-0.5'}`} style={isDesktop ? {} : { width: '140px', marginLeft: 'auto', justifyContent: 'space-between', paddingRight: '2px' }}>
          <span className="text-[9px] text-zinc-400 uppercase tracking-wider text-center w-16">Current</span>
          <div className="w-3"></div>
          <span className="text-[9px] text-zinc-400 uppercase tracking-wider text-center w-16">Target</span>
        </div>
        
        <GapMetricRow 
          label="Resting HR (bpm)" 
          current={metabolic?.cardioGaps && metabolic.cardioGaps.rhr.current > 0 ? Math.round(metabolic.cardioGaps.rhr.current) : '--'} 
          target={metabolic?.cardioGaps && metabolic.cardioGaps.rhr.target > 0 ? Math.round(metabolic.cardioGaps.rhr.target) : '--'}
          isDesktop={isDesktop}
        />
        <GapMetricRow 
          label="Recovery HR (bpm)" 
          current={metabolic?.cardioGaps && metabolic.cardioGaps.recovery.current > 0 ? Math.round(metabolic.cardioGaps.recovery.current) : '--'} 
          target={metabolic?.cardioGaps && metabolic.cardioGaps.recovery.target > 0 ? Math.round(metabolic.cardioGaps.recovery.target) : '--'}
          isDesktop={isDesktop}
        />
        <GapMetricRow 
          label="VO2 Max (ml/kg/min)" 
          current={metabolic?.cardioGaps && metabolic.cardioGaps.vo2.current > 0 ? metabolic.cardioGaps.vo2.current.toFixed(1) : '--'} 
          target={metabolic?.cardioGaps && metabolic.cardioGaps.vo2.target > 0 ? metabolic.cardioGaps.vo2.target.toFixed(1) : '--'}
          isDesktop={isDesktop}
        />
      </div>
      
      <div className="pt-3 sm:pt-4 border-t border-zinc-100">
        <div className="flex items-start gap-1.5 sm:gap-2">
          <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-[10px] sm:text-xs text-zinc-600 leading-relaxed">{truncateInsight(metabolic?.insight || '')}</p>
        </div>
      </div>
    </Card>
  );

  return (
    <section className="w-full min-w-0 overflow-x-hidden">
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 mb-2 sm:mb-3 md:mb-4 lg:mb-5 xl:mb-6">
        <div className="p-1 sm:p-1.5 md:p-2 bg-gradient-light text-zinc-900 rounded-lg">
          <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
        </div>
        <h3 className="text-[10px] sm:text-xs md:text-sm lg:text-base font-bold text-zinc-900 uppercase tracking-widest">Gap Analysis</h3>
      </div>
      <p className="text-[10px] sm:text-xs md:text-sm text-zinc-500 mb-3 sm:mb-4 md:mb-5 lg:mb-6">Current metrics vs. optimal performance targets.</p>
      
      {/* Desktop Layout */}
      <div className="hidden lg:grid grid-cols-3 gap-4 sm:gap-5 md:gap-6 mb-6 md:mb-8">
        {renderBodyCompCard(true)}
        {renderFunctionalCard(true)}
        {renderMetabolicCard(true)}
      </div>

      {/* Mobile/Tablet Layout */}
      <Tabs defaultValue="body-comp" className="w-full mb-6 md:mb-8 lg:hidden">
        <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 mb-3 sm:mb-4 scrollbar-hide">
          <TabsList className="w-full sm:w-auto justify-start rounded-lg sm:rounded-xl glass-button h-auto p-1 sm:p-1.5 gap-1 inline-flex min-w-max sm:min-w-0">
            <TabsTrigger value="body-comp" className="text-[9px] sm:text-[10px] font-semibold px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 rounded-md data-[state=active]:glass-button-active">Body Composition</TabsTrigger>
            <TabsTrigger value="strength" className="text-[9px] sm:text-[10px] font-semibold px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 rounded-md data-[state=active]:glass-button-active">Functional Strength</TabsTrigger>
            <TabsTrigger value="metabolic" className="text-[9px] sm:text-[10px] font-semibold px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 rounded-md data-[state=active]:glass-button-active">Metabolic Fitness</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="body-comp" className="m-0">{renderBodyCompCard(false)}</TabsContent>
        <TabsContent value="strength" className="m-0">{renderFunctionalCard(false)}</TabsContent>
        <TabsContent value="metabolic" className="m-0">{renderMetabolicCard(false)}</TabsContent>
      </Tabs>
    </section>
  );
};
