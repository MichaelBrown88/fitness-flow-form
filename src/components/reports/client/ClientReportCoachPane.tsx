import React, { lazy, Suspense } from 'react';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring';
import type { CoachPlan } from '@/lib/recommendations';
import { Loader2 } from 'lucide-react';
import { generateBodyCompInterpretation } from '@/lib/recommendations';

const CoachReport = lazy(() => import('@/components/reports/CoachReport'));

export function ClientReportCoachPane({
  plan,
  scores,
  formData,
}: {
  plan: CoachPlan | undefined;
  scores: ScoreSummary;
  formData: FormData | undefined;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-20 bg-card rounded-xl border border-border">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm font-medium text-muted-foreground">Loading Coach Plan...</p>
        </div>
      }
    >
      {plan ? (
        <CoachReport
          plan={plan}
          scores={scores}
          bodyComp={formData ? generateBodyCompInterpretation(formData) : undefined}
          formData={formData}
        />
      ) : (
        <div className="bg-card rounded-xl p-8 border border-border">
          <h2 className="text-xl font-bold text-foreground mb-4">Coach Report</h2>
          <p className="text-foreground-secondary">Generating coach plan...</p>
        </div>
      )}
    </Suspense>
  );
}
