/**
 * Client Report tab: client-facing report for the latest assessment (embedded in client detail).
 */

import { Suspense, lazy } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAssessmentLogic } from '@/hooks/useAssessmentLogic';
import { Loader2, FileText } from 'lucide-react';
import type { ClientDetailOutletContext } from './ClientDetailLayout';

const ClientReport = lazy(() => import('@/components/reports/ClientReport'));

export default function ClientReportTab() {
  const { assessments } = useOutletContext<ClientDetailOutletContext>();
  const assessmentId = assessments[0]?.id;

  const {
    formData,
    scores,
    plan,
    previousScores,
    previousFormData,
    loading,
    error,
  } = useAssessmentLogic(assessmentId);

  if (!assessmentId) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
        <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-600">No assessment yet</p>
        <p className="text-xs text-slate-500 mt-1">Complete an assessment to see the client report here.</p>
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

  if (error || !formData || !scores) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-slate-600">{error ?? 'Report not available.'}</p>
      </div>
    );
  }

  const goals = Array.isArray(formData.clientGoals) ? formData.clientGoals : [];

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
        <ClientReport
          scores={scores}
          goals={goals}
          formData={formData}
          plan={plan ?? undefined}
          previousScores={previousScores ?? undefined}
          previousFormData={previousFormData ?? undefined}
          standalone={true}
        />
      </Suspense>
    </div>
  );
}
