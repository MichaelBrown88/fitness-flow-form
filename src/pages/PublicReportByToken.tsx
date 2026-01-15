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
  const [orgDetails, setOrgDetails] = useState<{ name: string; logoUrl?: string } | null>(null);
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
        console.log('[PublicReport] Fetching report for token:', token);
        const data = await getPublicReportByToken(token);
        console.log('[PublicReport] Data received:', data ? 'Found' : 'Null');
        
        if (!data) {
          console.error('[PublicReport] Report lookup failed for token:', token);
          setError('This report is no longer available or has expired.');
          setLoading(false);
          return;
        }

        // Set page title immediately for better UX
        if (data.clientName) {
          document.title = `${data.clientName}'s Fitness Report | FitnessFlow`;
        }

        // Fetch organization details for branding if organizationId is present
        if (data.organizationId) {
          try {
            const { getOrgSettings } = await import('@/services/organizations');
            const settings = await getOrgSettings(data.organizationId);
            setOrgDetails({
              name: settings.name,
              logoUrl: settings.logoUrl,
            });
            // Update title with org name if available
            if (settings.name && data.clientName) {
              document.title = `${data.clientName}'s Fitness Report | ${settings.name}`;
            }
          } catch (orgErr) {
            console.warn('[PublicReport] Failed to fetch organization branding:', orgErr);
          }
        }
        
        // Try to fetch live data from the assessment if available
        // This ensures clients always see the most current version
        let fd = data.formData;
        try {
          if (data.assessmentId && data.coachUid) {
            const { getCoachAssessment } = await import('@/services/coachAssessments');
            const liveData = await getCoachAssessment(data.coachUid, data.assessmentId, data.clientName);
            if (liveData && liveData.formData) {
              // Use live data if available (more current)
              fd = liveData.formData;
            }
          }
        } catch (liveErr) {
          // If live fetch fails, use snapshot data (non-blocking)
          console.warn('Failed to fetch live assessment data, using snapshot:', liveErr);
        }
        
        setFormData(fd);
        const s = computeScores(fd);
        setScores(s);
        setRoadmap(buildRoadmap(s, fd));
        
        // Generate coach plan asynchronously
        generateCoachPlan(fd, s)
          .then(result => {
            setPlan(result);
          })
          .catch(async (e) => {
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
      <AppShell title="Your fitness report" mode="public">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-slate-600">Loading your report…</p>
        </div>
      </AppShell>
    );
  }

  if (!formData || !scores) {
    return (
      <AppShell title="Your fitness report" mode="public">
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-700">
          <p>{error ?? 'This report is not available.'}</p>
        </div>
      </AppShell>
    );
  }

  const bodyComp = formData && scores ? generateBodyCompInterpretation(formData, scores) : null;

  // Wait for plan to load before showing report
  if (!plan) {
    return (
      <AppShell 
        title={`${formData.fullName}'s Report`} 
        mode="public"
        publicLogoUrl={orgDetails?.logoUrl}
        publicOrgName={orgDetails?.name}
      >
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm font-black uppercase tracking-widest text-slate-400">Generating Report...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell 
      title={`${formData.fullName}'s Report`} 
      mode="public"
      publicLogoUrl={orgDetails?.logoUrl}
      publicOrgName={orgDetails?.name}
    >
      <div className="max-w-4xl mx-auto">
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-100">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm font-black uppercase tracking-widest text-slate-400">Loading Your Report...</p>
          </div>
        }>
          <ClientReport
            scores={scores}
            goals={Array.isArray(formData.clientGoals) ? formData.clientGoals : []}
            bodyComp={bodyComp ? { timeframeWeeks: (() => {
              const match = bodyComp.timeframeWeeks.match(/\d+/);
              return match ? parseInt(match[0], 10) : 12;
            })() } : undefined}
            formData={formData}
            plan={plan}
            standalone={true}
          />
        </Suspense>
      </div>
    </AppShell>
  );
};

export default PublicReportByToken;

