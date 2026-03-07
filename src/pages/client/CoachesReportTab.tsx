/**
 * Coaches Report tab: coach-facing report for the latest assessment (embedded in client detail).
 */

import { Suspense, lazy } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAssessmentLogic } from '@/hooks/useAssessmentLogic';
import { generateBodyCompInterpretation } from '@/lib/recommendations';
import { Loader2, FileText } from 'lucide-react';
import type { ClientDetailOutletContext } from './ClientDetailLayout';

const CoachReport = lazy(() => import('@/components/reports/CoachReport'));

export default function CoachesReportTab() {
  const { assessments } = useOutletContext<ClientDetailOutletContext>();
  const assessmentId = assessments[0]?.id;

  const {
    formData,
    scores,
    plan,
    loading,
    error,
    planError,
  } = useAssessmentLogic(assessmentId);

  if (!assessmentId) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
        <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-600">No assessment yet</p>
        <p className="text-xs text-slate-500 mt-1">Complete an assessment to see the coach report here.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-slate-500">Loading report…</p>
      </div>
    );
  }

  if (planError) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="text-sm font-medium text-amber-900">Report generation issue</p>
        <p className="text-xs text-amber-700 mt-1">The assessment data is saved, but recommendations could not be generated. Try opening the full report to retry.</p>
      </div>
    );
  }

  if (error || !formData || !scores || !plan) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-slate-600">{error ?? 'Report not available.'}</p>
      </div>
    );
  }

  const bodyComp = generateBodyCompInterpretation(formData, scores);

  return (
    <div className="space-y-8">
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-slate-500">Generating report…</p>
          </div>
        }
      >
        <CoachReport
          plan={plan}
          scores={scores}
          bodyComp={bodyComp}
          formData={formData}
        />
      </Suspense>
    </div>
  );
}
