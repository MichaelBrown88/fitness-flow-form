import React from 'react';
import type { CoachPlan, BodyCompInterpretation } from '@/lib/recommendations';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring';
import { CoachReportHeader } from './CoachReportHeader';
import { CoachReportSessionScript } from './CoachReportSessionScript';
import { CoachReportInternalNotes } from './CoachReportInternalNotes';
import { CoachReportExerciseGuidance } from './CoachReportExerciseGuidance';
import { CoachReportLegacyStrategies } from './CoachReportLegacyStrategies';
import { CoachReportPostureAnalysis } from './CoachReportPostureAnalysis';
import { CoachReportBodyComp } from './CoachReportBodyComp';

export default function CoachReport({
  plan,
  scores,
  bodyComp,
  formData,
  highlightCategory,
}: {
  plan: CoachPlan;
  scores: ScoreSummary;
  bodyComp?: BodyCompInterpretation;
  formData?: FormData;
  highlightCategory?: string;
}) {
  // Clear highlight after some time
  const [tempHighlight, setTempHighlight] = React.useState<string | undefined>(highlightCategory);
  React.useEffect(() => {
    if (tempHighlight) {
      const timer = setTimeout(() => {
        setTempHighlight(undefined);
        sessionStorage.removeItem('highlightCategory');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [tempHighlight]);

  if (!scores || !scores.categories || scores.categories.length === 0) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Results are not available yet. Please complete the assessment steps and try again.
      </div>
    );
  }
  const clientName = (formData?.fullName || '').trim();
  const goals = Array.isArray(formData?.clientGoals) ? (formData!.clientGoals as string[]) : [];

  return (
    <div className="space-y-10">
      <CoachReportHeader clientName={clientName} goals={goals} scores={scores} />

      <CoachReportSessionScript clientScript={plan.clientScript} />

      <CoachReportInternalNotes plan={plan} />

      <CoachReportExerciseGuidance plan={plan} />

      <CoachReportLegacyStrategies plan={plan} />

      {formData && <CoachReportPostureAnalysis formData={formData} />}

      <CoachReportBodyComp bodyComp={bodyComp} segmentalGuidance={plan.segmentalGuidance} />
    </div>
  );
}


