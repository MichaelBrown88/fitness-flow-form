import { useEffect, useState, lazy, Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { getPublicReportByToken } from '@/services/publicReports';
import type { FormData } from '@/contexts/FormContext';
import { computeScores, buildRoadmap, type ScoreSummary, type RoadmapPhase } from '@/lib/scoring';
import { generateBodyCompInterpretation, generateCoachPlan } from '@/lib/recommendations';
import { Loader2 } from 'lucide-react';

const ClientReport = lazy(() => import('@/components/reports/ClientReport'));

/**
 * Public report page accessible via secure token
 * Route: /r/:token
 * 
 * This page does NOT require authentication and loads the report
 * directly from Firestore using the token as the document ID.
 * 
 * Security: The token is a UUID, making it impossible to guess
 * other clients' reports without the exact token.
 */
const PublicReportByToken = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData | null>(null);
  const [scores, setScores] = useState<ScoreSummary | null>(null);
  const [roadmap, setRoadmap] = useState<RoadmapPhase[]>([]);
  const [plan, setPlan] = useState<import('@/lib/recommendations').CoachPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError('Invalid report link.');
      setLoading(false);
      return;
    }
    
    (async () => {
      try {
        setLoading(true);
        const data = await getPublicReportByToken(token);
        
        if (!data) {
          setError('This report is no longer available or has expired.');
          setLoading(false);
          return;
        }
        
        const fd = data.formData;
        setFormData(fd);
        const s = computeScores(fd);
        setScores(s);
        setRoadmap(buildRoadmap(s, fd));
        
        // Generate coach plan asynchronously
        generateCoachPlan(fd, s)
          .then(result => {
            setPlan(result);
          })
          .catch(e => {
            console.error('Error generating coach plan:', e);
            // Continue without plan - report is still viewable
          });
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'Unable to load this report.',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <AppShell title="Your fitness report">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-slate-600">Loading your report…</p>
        </div>
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

  // Wait for plan to load before showing report
  if (!plan) {
    return (
      <AppShell title="Your fitness report">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm font-black uppercase tracking-widest text-slate-400">Generating Report...</p>
        </div>
      </AppShell>
    );
  }

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
            goals={Array.isArray(formData.clientGoals) ? formData.clientGoals : []}
            bodyComp={bodyComp ? { timeframeWeeks: bodyComp.timeframeWeeks } : undefined}
            formData={formData}
            plan={plan}
          />
        </Suspense>
      </div>
    </AppShell>
  );
};

export default PublicReportByToken;

