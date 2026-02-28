import { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import AppShell from '@/components/layout/AppShell';
import { getPublicReportByToken, getPublicSnapshot, type SnapshotSummary } from '@/services/publicReports';
import AssessmentVersionSelector from '@/components/reports/AssessmentVersionSelector';
import type { VersionSelectorSnapshot } from '@/components/reports/AssessmentVersionSelector';
import type { FormData } from '@/contexts/FormContext';
import { computeScores, buildRoadmap, type ScoreSummary, type RoadmapPhase } from '@/lib/scoring';
import { generateBodyCompInterpretation, generateCoachPlan } from '@/lib/recommendations';
import { Loader2 } from 'lucide-react';
import { logger } from '@/lib/utils/logger';

const ClientReport = lazy(() => import('@/components/reports/ClientReport'));

/**
 * Public report page accessible via secure token
 * Route: /r/:token
 * 
 * This page does NOT require authentication. The share token IS the client identity.
 * All client features (notifications, achievements, profile dropdown) use
 * token-scoped Firestore subcollections: publicReports/{token}/achievements and /notifications.
 */

const PublicReportViewer = () => {
  const { token } = useParams<{ token: string }>();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<FormData | null>(null);
  const [previousFormData, setPreviousFormData] = useState<FormData | undefined>(undefined);
  const [scores, setScores] = useState<ScoreSummary | null>(null);
  const [previousScores, setPreviousScores] = useState<ScoreSummary | null>(null);
  const [_roadmap, setRoadmap] = useState<RoadmapPhase[]>([]);
  const [plan, setPlan] = useState<import('@/lib/recommendations').CoachPlan | null>(null);
  const [orgDetails, setOrgDetails] = useState<{ name: string; logoUrl?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [snapshotSummaries, setSnapshotSummaries] = useState<SnapshotSummary[]>([]);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);
  const [versionPage, setVersionPage] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activeFormData, setActiveFormData] = useState<FormData | null>(null);
  const [activeScores, setActiveScores] = useState<ScoreSummary | null>(null);
  const [activePreviousFormData, setActivePreviousFormData] = useState<FormData | undefined>(undefined);
  const [activePreviousScores, setActivePreviousScores] = useState<ScoreSummary | null>(null);

  // PWA manifest + apple-touch-icon are baked into client.html (served by Firebase
  // hosting for /r/* routes), so no client-side swapping is needed.

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

        if (data.revoked) {
          setError('This report is no longer available.');
          setLoading(false);
          return;
        }

        if (data.clientName) {
          document.title = `${data.clientName}'s Fitness Report | One Assess`;
        }

        if (data.organizationId) {
          try {
            const { getOrgSettings } = await import('@/services/organizations');
            const settings = await getOrgSettings(data.organizationId);
            setOrgDetails({
              name: settings.name,
              logoUrl: settings.logoUrl,
            });
            if (settings.name && data.clientName) {
              document.title = `${data.clientName}'s Fitness Report | ${settings.name}`;
            }
          } catch (orgErr) {
            logger.warn('[PublicReport] Failed to fetch organization branding:', orgErr);
          }
        }
        
        const fd = data.formData;
        
        setFormData(fd);
        const s = computeScores(fd);
        setScores(s);
        setRoadmap(buildRoadmap(s, fd));

        setActiveFormData(fd);
        setActiveScores(s);

        if (data.previousFormData) {
          try {
            const prevS = computeScores(data.previousFormData);
            setPreviousScores(prevS);
            setPreviousFormData(data.previousFormData);
            setActivePreviousFormData(data.previousFormData);
            setActivePreviousScores(prevS);
          } catch {
            logger.debug('[PublicReport] Could not compute previous scores');
          }
        }

        if (data.snapshotSummaries?.length) {
          setSnapshotSummaries(data.snapshotSummaries);
        }
        
        generateCoachPlan(fd, s)
          .then(result => {
            setPlan(result);
          })
          .catch((e) => {
            logger.error('Error generating coach plan:', e);
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

  void _roadmap;

  const PAGE_SIZE = 9;
  const versionSnapshots = useMemo<VersionSelectorSnapshot[]>(() => {
    if (!snapshotSummaries.length) return [];
    const hasInitial = snapshotSummaries.length >= 2;
    const paginable = hasInitial ? snapshotSummaries.slice(0, -1) : snapshotSummaries;
    const start = versionPage * PAGE_SIZE;
    return paginable.slice(start, start + PAGE_SIZE).map(s => ({
      id: s.id,
      score: s.score,
      date: s.date?.toDate ? s.date.toDate() : new Date(),
      type: s.type,
    }));
  }, [snapshotSummaries, versionPage]);

  const initialAssessment = useMemo<VersionSelectorSnapshot | null>(() => {
    if (snapshotSummaries.length < 2) return null;
    const last = snapshotSummaries[snapshotSummaries.length - 1];
    return { id: last.id, score: last.score, date: last.date?.toDate ? last.date.toDate() : new Date(), type: last.type };
  }, [snapshotSummaries]);

  const paginableCount = snapshotSummaries.length >= 2 ? snapshotSummaries.length - 1 : snapshotSummaries.length;
  const totalPages = Math.max(1, Math.ceil(paginableCount / PAGE_SIZE));

  const getTrend = useCallback((idx: number): 'up' | 'down' | 'neutral' => {
    if (idx >= snapshotSummaries.length - 1) return 'neutral';
    const curr = snapshotSummaries[idx];
    const prev = snapshotSummaries[idx + 1];
    if (!curr || !prev) return 'neutral';
    if (curr.score > prev.score) return 'up';
    if (curr.score < prev.score) return 'down';
    return 'neutral';
  }, [snapshotSummaries]);

  const fetchSnapshot = useCallback(async (snapshotId: string): Promise<FormData | null> => {
    const cacheKey = ['publicSnapshot', token, snapshotId];
    const cached = queryClient.getQueryData<FormData>(cacheKey);
    if (cached) return cached;

    const snap = await getPublicSnapshot(token!, snapshotId);
    if (!snap) return null;
    queryClient.setQueryData(cacheKey, snap.formData);
    return snap.formData;
  }, [token, queryClient]);

  const handleVersionSelect = useCallback(async (index: number) => {
    if (!token || index === selectedVersionIndex) return;
    const clamped = Math.max(0, Math.min(index, snapshotSummaries.length - 1));
    const summary = snapshotSummaries[clamped];
    if (!summary) return;

    setIsTransitioning(true);

    try {
      let fd: FormData | null;
      if (clamped === 0 && formData) {
        fd = formData;
      } else {
        fd = await fetchSnapshot(summary.id);
      }
      if (!fd) { setIsTransitioning(false); return; }

      let prevFd: FormData | undefined;
      if (clamped < snapshotSummaries.length - 1) {
        const prevSummary = snapshotSummaries[clamped + 1];
        if (clamped + 1 === 0 && formData) {
          prevFd = formData;
        } else {
          const result = await fetchSnapshot(prevSummary.id);
          if (result) prevFd = result;
        }
      }

      setTimeout(() => {
        const s = computeScores(fd!);
        setActiveFormData(fd);
        setActiveScores(s);
        setActivePreviousFormData(prevFd);
        setActivePreviousScores(prevFd ? computeScores(prevFd) : null);
        setSelectedVersionIndex(clamped);
        const newPage = clamped >= paginableCount ? Math.max(0, totalPages - 1) : Math.floor(clamped / PAGE_SIZE);
        setVersionPage(newPage);
        setTimeout(() => setIsTransitioning(false), 50);
      }, 100);
    } catch (err) {
      logger.error('[PublicReport] Version select failed:', err);
      setIsTransitioning(false);
    }
  }, [token, selectedVersionIndex, snapshotSummaries, formData, fetchSnapshot, paginableCount, totalPages]);

  const clientName = formData?.fullName || 'Client';

  if (loading) {
    return (
      <AppShell title="Your fitness report" mode="public">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-slate-600">Loading your report...</p>
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

  const bodyComp = generateBodyCompInterpretation(formData, scores);

  if (!plan) {
    return (
      <AppShell 
        title={`${clientName}'s Report`} 
        mode="public"
        publicLogoUrl={orgDetails?.logoUrl}
        publicOrgName={orgDetails?.name}
        showClientNav={!!token}
        shareToken={token}
        clientName={clientName}
      >
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm font-medium text-slate-400">Generating Report...</p>
        </div>
      </AppShell>
    );
  }

  const displayFormData = activeFormData ?? formData;
  const displayScores = activeScores ?? scores;
  const displayPrevFormData = activePreviousFormData ?? previousFormData;
  const displayPrevScores = activePreviousScores ?? previousScores;

  return (
    <AppShell 
      title={`${clientName}'s Report`} 
      mode="public"
      publicLogoUrl={orgDetails?.logoUrl}
      publicOrgName={orgDetails?.name}
      showClientNav={!!token}
      shareToken={token}
      clientName={clientName}
    >
      {snapshotSummaries.length >= 1 && (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-10 pt-4">
          <AssessmentVersionSelector
            snapshots={versionSnapshots}
            selectedIndex={selectedVersionIndex}
            totalCount={snapshotSummaries.length}
            initialAssessment={initialAssessment}
            initialAssessmentGlobalIndex={snapshotSummaries.length - 1}
            currentPage={versionPage}
            totalPages={totalPages}
            pageSize={PAGE_SIZE}
            onSelect={handleVersionSelect}
            onPageChange={setVersionPage}
            getTrend={getTrend}
          />
        </div>
      )}

      <div
        className="transition-opacity duration-150"
        style={{
          opacity: isTransitioning ? 0 : 1,
          transitionTimingFunction: 'var(--easing-apple, cubic-bezier(0.25, 0.1, 0.25, 1))',
        }}
      >
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-100">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm font-medium text-slate-400">Loading Your Report...</p>
          </div>
        }>
          <ClientReport
            scores={displayScores}
            goals={Array.isArray(displayFormData.clientGoals) ? displayFormData.clientGoals : []}
            bodyComp={bodyComp ? { timeframeWeeks: bodyComp.timeframeWeeks } : undefined}
            formData={displayFormData}
            plan={plan}
            previousScores={displayPrevScores}
            previousFormData={displayPrevFormData}
            standalone={true}
          />
        </Suspense>
      </div>
    </AppShell>
  );
};

export default PublicReportViewer;
