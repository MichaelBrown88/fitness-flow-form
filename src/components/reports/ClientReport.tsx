/**
 * Simplified Client Report
 * Clean, focused report structure:
 * 1. Where you're at now (Scores, Archetype, Gap Analysis, Strengths/Focus, Lifestyle)
 * 2. Where you want to get to (Goals, Issue Resolution)
 * 3. How we'll help (Blueprint, Sample Workout, Timeline)
 */

import React, { useState, lazy, Suspense, useEffect } from 'react';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring';
import type { CoachPlan } from '@/lib/recommendations';
import { Loader2 } from 'lucide-react';

import { LifestyleFactorsBar } from './LifestyleFactorsBar';
import { MovementPostureMobility } from './MovementPostureMobility';
const CoachReport = lazy(() => import('./CoachReport'));
import { generateBodyCompInterpretation } from '@/lib/recommendations';

// Sub-components
import { ReportHeader } from './client/sub-components/ReportHeader';
import { ClientInfoBar } from './client/sub-components/ClientInfoBar';
import { StartingPointSection } from './client/sub-components/StartingPointSection';
import { GapAnalysisSection } from './client/sub-components/GapAnalysisSection';
import { StrengthsFocusSection } from './client/sub-components/StrengthsFocusSection';
import { DestinationSection } from './client/sub-components/DestinationSection';
import { BlueprintSection } from './client/sub-components/BlueprintSection';
import { TimelineSection } from './client/sub-components/TimelineSection';

// Hook
import { useClientReportData } from './client/useClientReportData';

export default function ClientReport({
  scores,
  goals,
  formData,
  plan,
  bodyComp,
  previousScores,
  standalone = true,
}: {
  scores: ScoreSummary;
  goals?: string[];
  formData?: FormData;
  plan?: CoachPlan;
  bodyComp?: { timeframeWeeks: number };
  previousScores?: ScoreSummary | null;
  standalone?: boolean;
}) {
  const {
    safeScores,
    orderedCats,
    archetype,
    strengths,
    areasForImprovement,
    maxWeeks,
    clientName,
    hasAnyData,
    overallRadarData,
    previousRadarData,
    gapAnalysisData,
    reportDate,
    blueprintPillars,
    weeksByCategory,
  } = useClientReportData({ scores, goals, formData, previousScores });

  // In standalone/public mode, always show client report (no coach tab)
  const [activeView, setActiveView] = useState<'client' | 'coach'>(standalone ? 'client' : 'client');
  
  // Force client view if standalone (prevent switching to coach report)
  useEffect(() => {
    if (standalone && activeView === 'coach') {
      setActiveView('client');
    }
  }, [standalone, activeView]);
  
  if (!scores || !scores.categories || scores.categories.length === 0 || !hasAnyData) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-semibold mb-2">No assessment data available</p>
        <p>Please complete at least one section of the assessment to generate a report.</p>
      </div>
    );
  }

  const containerClass = standalone 
    ? "min-h-screen bg-zinc-50 text-zinc-900 px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12 py-2 sm:py-4 md:py-6 lg:py-8 xl:py-12 overflow-x-hidden"
    : "w-full text-zinc-900 overflow-x-hidden";

  const contentClass = standalone
    ? "max-w-[1400px] mx-auto space-y-4 sm:space-y-6 md:space-y-8 lg:space-y-10 xl:space-y-12 2xl:space-y-16 w-full min-w-0"
    : "space-y-4 sm:space-y-6 md:space-y-8 lg:space-y-10 xl:space-y-12 2xl:space-y-16 w-full min-w-0";
  
  return (
    <div className={containerClass}>
      <div className={`${contentClass} overflow-x-hidden`}>
        
        <ReportHeader 
          clientName={clientName}
          reportDate={reportDate}
          standalone={standalone}
          activeView={activeView}
          setActiveView={setActiveView}
        />
        
        <ClientInfoBar formData={formData} />
        
        {activeView === 'coach' ? (
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-zinc-200">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm font-black uppercase tracking-widest text-zinc-400">Loading Coach Plan...</p>
            </div>
          }>
            {plan ? (
              <CoachReport
                plan={plan}
                scores={scores}
                bodyComp={formData ? generateBodyCompInterpretation(formData) : undefined}
                formData={formData}
              />
            ) : (
              <div className="bg-white rounded-xl p-8 border border-zinc-200">
                <h2 className="text-xl font-bold text-zinc-900 mb-4">Coach Report</h2>
                <p className="text-zinc-600">Generating coach plan...</p>
              </div>
            )}
          </Suspense>
        ) : (
          <>
            <StartingPointSection 
              scores={safeScores}
              archetype={archetype}
              overallRadarData={overallRadarData}
              previousRadarData={previousRadarData}
            />
            
            <GapAnalysisSection 
              gapAnalysisData={gapAnalysisData}
              goals={goals}
              formData={formData}
            />

            <StrengthsFocusSection 
              strengths={strengths}
              areasForImprovement={areasForImprovement}
            />

            <LifestyleFactorsBar formData={formData} />
            
            <MovementPostureMobility formData={formData} scores={scores} standalone={standalone} />
            
            <DestinationSection goals={goals} formData={formData} />
            
            <BlueprintSection blueprintPillars={blueprintPillars} />
            
            <TimelineSection 
              orderedCats={orderedCats}
              weeksByCategory={weeksByCategory}
              maxWeeks={maxWeeks}
            />
          </>
        )}
      </div>
    </div>
  );
}
