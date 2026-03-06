import { useState, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import AppShell from '@/components/layout/AppShell';
import { usePublicReport } from '@/hooks/usePublicReport';
import { getPublicSnapshot } from '@/services/publicReports';
import AssessmentVersionSelector from '@/components/reports/AssessmentVersionSelector';
import type { VersionSelectorSnapshot } from '@/components/reports/AssessmentVersionSelector';
import type { FormData } from '@/contexts/FormContext';
import { computeScores } from '@/lib/scoring';
import { generateBodyCompInterpretation } from '@/lib/recommendations';
import { Loader2 } from 'lucide-react';
import { logger } from '@/lib/utils/logger';

const ClientReport = lazy(() => import('@/components/reports/ClientReport'));

/**
 * Public report page accessible via secure token
 * Route: /r/:token
 *
 * Uses usePublicReport for real-time updates when coach saves assessment.
 */

const PublicReportViewer = () => {
  const { token } = useParams<{ token: string }>();
  const queryClient = useQueryClient();
  const {
    formData,
    scores,
    previousFormData,
    previousScores,
    snapshotSummaries,
    orgDetails,
    plan,
    error,
    loading,
    clientName,
  } = usePublicReport(token);

  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);
  const [versionPage, setVersionPage] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activeFormData, setActiveFormData] = useState<FormData | null>(null);
  const [activeScores, setActiveScores] = useState<typeof scores>(null);
  const [activePreviousFormData, setActivePreviousFormData] = useState<FormData | undefined>(undefined);
  const [activePreviousScores, setActivePreviousScores] = useState<typeof previousScores>(null);

  useEffect(() => {
    if (formData && scores) {
      setActiveFormData(formData);
      setActiveScores(scores);
      setActivePreviousFormData(previousFormData);
      setActivePreviousScores(previousScores);
    }
  }, [formData, scores, previousFormData, previousScores]);

  const PAGE_SIZE = 9;
  const versionSnapshots = useMemo<VersionSelectorSnapshot[]>(() => {
    if (!snapshotSummaries.length) return [];
    const hasInitial = snapshotSummaries.length >= 2;
    const paginable = hasInitial ? snapshotSummaries.slice(0, -1) : snapshotSummaries;
    const start = versionPage * PAGE_SIZE;
    return paginable.slice(start, start + PAGE_SIZE).map((s) => ({
      id: s.id,
      score: s.score,
      date: s.date?.toDate ? s.date.toDate() : new Date(),
      type: s.type,
    }));
  }, [snapshotSummaries, versionPage]);

  const initialAssessment = useMemo<VersionSelectorSnapshot | null>(() => {
    if (snapshotSummaries.length < 2) return null;
    const last = snapshotSummaries[snapshotSummaries.length - 1];
    return {
      id: last.id,
      score: last.score,
      date: last.date?.toDate ? last.date.toDate() : new Date(),
      type: last.type,
    };
  }, [snapshotSummaries]);

  const paginableCount = snapshotSummaries.length >= 2 ? snapshotSummaries.length - 1 : snapshotSummaries.length;
  const totalPages = Math.max(1, Math.ceil(paginableCount / PAGE_SIZE));

  const getTrend = useCallback(
    (idx: number): 'up' | 'down' | 'neutral' => {
      if (idx >= snapshotSummaries.length - 1) return 'neutral';
      const curr = snapshotSummaries[idx];
      const prev = snapshotSummaries[idx + 1];
      if (!curr || !prev) return 'neutral';
      if (curr.score > prev.score) return 'up';
      if (curr.score < prev.score) return 'down';
      return 'neutral';
    },
    [snapshotSummaries],
  );

  const fetchSnapshot = useCallback(
    async (snapshotId: string): Promise<FormData | null> => {
      if (!token) return null;
      const cacheKey = ['publicSnapshot', token, snapshotId];
      const cached = queryClient.getQueryData<FormData>(cacheKey);
      if (cached) return cached;

      const snap = await getPublicSnapshot(token, snapshotId);
      if (!snap) return null;
      queryClient.setQueryData(cacheKey, snap.formData);
      return snap.formData;
    },
    [token, queryClient],
  );

  const handleVersionSelect = useCallback(
    async (index: number) => {
      if (!token || index === selectedVersionIndex || !formData) return;
      const clamped = Math.max(0, Math.min(index, snapshotSummaries.length - 1));
      const summary = snapshotSummaries[clamped];
      if (!summary) return;

      setIsTransitioning(true);

      try {
        let fd: FormData | null;
        if (clamped === 0) {
          fd = formData;
        } else {
          fd = await fetchSnapshot(summary.id);
        }
        if (!fd) {
          setIsTransitioning(false);
          return;
        }

        let prevFd: FormData | undefined;
        if (clamped < snapshotSummaries.length - 1) {
          const prevSummary = snapshotSummaries[clamped + 1];
          if (clamped + 1 === 0) {
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
    },
    [token, selectedVersionIndex, snapshotSummaries, formData, fetchSnapshot, paginableCount, totalPages],
  );

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
    const isEmptyToken = !token || error === 'Invalid report link.';
    return (
      <AppShell title="Your fitness report" mode="public" showClientNav={!!token} shareToken={token ?? undefined} clientName={clientName}>
        <div className="max-w-md mx-auto rounded-xl border border-border bg-white p-6 sm:p-8 text-center space-y-4">
          {isEmptyToken ? (
            <>
              <p className="text-sm font-medium text-foreground">
                Open the link your coach sent you to view your report.
              </p>
              <p className="text-xs text-muted-foreground">
                Add to home screen from that link to open it quickly next time.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{error ?? 'This report is not available.'}</p>
          )}
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
        shareToken={token ?? undefined}
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
      shareToken={token ?? undefined}
      clientName={clientName}
    >
      {snapshotSummaries.length >= 2 && (
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
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-100">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm font-medium text-slate-400">Loading Your Report...</p>
            </div>
          }
        >
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
