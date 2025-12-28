import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getCoachAssessment } from '@/services/coachAssessments';
import { publishPublicReport } from '@/services/publicReports';
import type { FormData } from '@/contexts/FormContext';
import { computeScores, buildRoadmap, type ScoreSummary, type RoadmapPhase } from '@/lib/scoring';
import { generateCoachPlan, generateBodyCompInterpretation } from '@/lib/recommendations';
import ClientReport from '@/components/reports/ClientReport';
import CoachReport from '@/components/reports/CoachReport';
import { requestShareArtifacts, sendReportEmail, type ShareArtifacts } from '@/services/share';
import { useToast } from '@/components/ui/use-toast';

const AssessmentReport = () => {
  const { id } = useParams();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData | null>(null);
  const [scores, setScores] = useState<ScoreSummary | null>(null);
  const [roadmap, setRoadmap] = useState<RoadmapPhase[]>([]);
  const [view, setView] = useState<'client' | 'coach'>('client');
  const [error, setError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const publishedKeyRef = useRef<string | null>(null);
  const [shareCache, setShareCache] = useState<Record<'client' | 'coach', ShareArtifacts | null>>({
    client: null,
    coach: null,
  });
  const [shareLoading, setShareLoading] = useState(false);

  const ensureShareArtifacts = useCallback(async (view: 'client' | 'coach') => {
    if (!user || !id) {
      throw new Error('Missing assessment reference.');
    }
    if (shareCache[view]) return shareCache[view]!;
    const artifacts = await requestShareArtifacts({ assessmentId: id, view });
    setShareCache((prev) => ({ ...prev, [view]: artifacts }));
    return artifacts;
  }, [id, shareCache, user]);

  const handleEmailLink = useCallback(async () => {
    if (!formData || !id) return;
    const email = (formData.email || '').trim();
    if (!email) {
      toast({
        title: 'Client email missing',
        description: 'Add an email to the intake before emailing a report.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setShareLoading(true);
      await sendReportEmail({
        assessmentId: id,
        view,
        to: email,
        clientName: formData.fullName,
      });
      toast({
        title: 'Report emailed',
        description: `Sent to ${email}`,
      });
    } catch (error) {
      console.error('Email share failed', error);
      toast({
        title: 'Email not sent',
        description: 'Check your Firebase functions SendGrid configuration.',
        variant: 'destructive',
      });
    } finally {
      setShareLoading(false);
    }
  }, [formData, id, toast, view]);

  const handleWhatsAppShare = useCallback(async () => {
    if (!id || typeof window === 'undefined') return;
    try {
      setShareLoading(true);
      const artifacts = await ensureShareArtifacts(view);
      const url = `https://wa.me/?text=${encodeURIComponent(artifacts.whatsappText)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('WhatsApp share failed', error);
      toast({
        title: 'Unable to share via WhatsApp',
        description: 'Copy the link instead.',
        variant: 'destructive',
      });
    } finally {
      setShareLoading(false);
    }
  }, [ensureShareArtifacts, id, toast, view]);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      try {
        setLoadingData(true);
        // Get clientName from query params if available
        const params = new URLSearchParams(window.location.search);
        const clientName = params.get('clientName');
        
        const data = await getCoachAssessment(user.uid, id, clientName || undefined);
        if (!data) {
          setError('Assessment not found for this coach.');
          return;
        }
        const fd = data.formData;
        setFormData(fd);
        const s = computeScores(fd);
        setScores(s);
        setRoadmap(buildRoadmap(s, fd));
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'Unable to load this assessment.',
        );
      } finally {
        setLoadingData(false);
      }
    })();
  }, [user, id]);

  useEffect(() => {
    setShareCache({ client: null, coach: null });
  }, [id]);

  useEffect(() => {
    if (!user || !id || !formData) return;
    const publishKey = `${user.uid}__${id}`;
    if (publishedKeyRef.current === publishKey) return;
    publishedKeyRef.current = publishKey;
    (async () => {
      try {
        await publishPublicReport({
          coachUid: user.uid,
          assessmentId: id,
          formData,
        });
      } catch (e) {
        console.error('Failed to sync public report', e);
      }
    })();
  }, [user, id, formData]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">
        Checking coach session…
      </div>
    );
  }

  if (loadingData) {
    return (
      <AppShell title="Assessment report">
        <div className="py-10 text-sm text-slate-600">Loading assessment…</div>
      </AppShell>
    );
  }

  if (!formData || !scores) {
    return (
      <AppShell title="Assessment report">
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-700">
          <p>{error ?? 'Assessment not available.'}</p>
          <Button onClick={() => navigate('/assessment')}>New assessment</Button>
        </div>
      </AppShell>
    );
  }

  const plan = generateCoachPlan(formData, scores);
  const bodyComp = generateBodyCompInterpretation(formData, scores);
  const highlightCategory = sessionStorage.getItem('highlightCategory') || undefined;

  return (
    <AppShell
      title={formData.fullName || 'Client assessment'}
      subtitle="Saved assessment report"
      actions={
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              // Navigate to client dashboard if we have client name, otherwise main dashboard
              if (formData?.fullName) {
                navigate(`/client/${encodeURIComponent(formData.fullName)}`);
              } else {
                navigate('/dashboard');
              }
            }}
          >
            Dashboard
          </Button>
          <Button onClick={() => {
            // Clear any partial assessment data to ensure full assessment
            sessionStorage.removeItem('partialAssessment');
            navigate('/assessment');
          }}>
            New assessment
          </Button>
          <Button variant="outline" onClick={handleEmailLink} disabled={shareLoading}>
            ✉️ Email link
          </Button>
          <Button variant="outline" onClick={handleWhatsAppShare} disabled={shareLoading}>
            💬 WhatsApp
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-md border border-slate-200 bg-white p-1">
            <button
              onClick={() => setView('client')}
              className={`px-3 py-1.5 text-sm font-medium rounded ${
                view === 'client'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
              aria-pressed={view === 'client'}
            >
              Client report
            </button>
            <button
              onClick={() => setView('coach')}
              className={`px-3 py-1.5 text-sm font-medium rounded ${
                view === 'coach'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
              aria-pressed={view === 'coach'}
            >
              Coach report
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          {view === 'client' ? (
            <ClientReport
              scores={scores}
              roadmap={roadmap}
              goals={Array.isArray(formData.clientGoals) ? formData.clientGoals : []}
              bodyComp={bodyComp ? { timeframeWeeks: bodyComp.timeframeWeeks } : undefined}
              formData={formData}
              plan={plan}
              highlightCategory={highlightCategory}
            />
          ) : (
            <CoachReport
              plan={plan}
              scores={scores}
              bodyComp={bodyComp}
              formData={formData}
              highlightCategory={highlightCategory}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default AssessmentReport;


