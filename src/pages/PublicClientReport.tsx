import { useEffect, useState, lazy, Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { getPublicReport } from '@/services/publicReports';
import type { FormData } from '@/contexts/FormContext';
import { computeScores, buildRoadmap, type ScoreSummary, type RoadmapPhase } from '@/lib/scoring';
import { generateBodyCompInterpretation } from '@/lib/recommendations';
import { Loader2 } from 'lucide-react';

const ClientReport = lazy(() => import('@/components/reports/ClientReport'));

const PublicClientReport = () => {
  const { coachUid, assessmentId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData | null>(null);
  const [scores, setScores] = useState<ScoreSummary | null>(null);
  const [roadmap, setRoadmap] = useState<RoadmapPhase[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coachUid || !assessmentId) {
      setError('Invalid report link.');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const data = await getPublicReport({ coachUid, assessmentId });
        if (!data || data.visibility !== 'public') {
          setError('This report is no longer available.');
          return;
        }
        const fd = data.formData;
        setFormData(fd);
        const s = computeScores(fd);
        setScores(s);
        setRoadmap(buildRoadmap(s, fd));
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'Unable to load this report.',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [coachUid, assessmentId]);

  if (loading) {
    return (
      <AppShell title="Your fitness report">
        <div className="py-10 text-sm text-slate-600">Loading report…</div>
      </AppShell>
    );
  }

  if (!formData || !scores) {
    return (
      <AppShell title="Your fitness report">
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-700">
          <p>{error ?? 'This report is not available.'}</p>
          <Button onClick={() => navigate('/')}>Back to One Fitness</Button>
        </div>
      </AppShell>
    );
  }

  const bodyComp = formData && scores ? generateBodyCompInterpretation(formData, scores) : null;

  return (
    <AppShell
      title={
        formData.fullName
          ? `${formData.fullName}, your report is ready`
          : 'Your report is ready'
      }
      subtitle="Saved assessment report from your One Fitness coach."
    >
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-100">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm font-black uppercase tracking-widest text-slate-400">Loading Your Report...</p>
          </div>
        }>
          <ClientReport
            scores={scores}
            roadmap={roadmap}
            goals={Array.isArray(formData.clientGoals) ? formData.clientGoals : []}
            bodyComp={bodyComp ? { timeframeWeeks: bodyComp.timeframeWeeks } : undefined}
            formData={formData}
          />
        </Suspense>
      </div>
    </AppShell>
  );
};

export default PublicClientReport;


