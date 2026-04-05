import { useState, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { getFunctions, httpsCallable } from 'firebase/functions';
import AppShell from '@/components/layout/AppShell';
import { usePublicReport } from '@/hooks/usePublicReport';
import { getPublicSnapshot } from '@/services/publicReports';
import AssessmentVersionSelector from '@/components/reports/AssessmentVersionSelector';
import type { VersionSelectorSnapshot } from '@/components/reports/AssessmentVersionSelector';
import type { FormData } from '@/contexts/FormContext';
import { computeScores } from '@/lib/scoring';
import { generateBodyCompInterpretation } from '@/lib/recommendations';
import { Download, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PostureComparisonCard } from '@/components/client/PostureComparisonCard';
import type { AssessmentSnapshot } from '@/services/assessmentHistory';
import { logger } from '@/lib/utils/logger';
import { Helmet } from 'react-helmet-async';
import {
  publicReportCanonicalUrl,
  publicReportOpenGraphDescription,
  publicReportOpenGraphTitle,
  publicReportOgImageUrl,
} from '@/constants/publicReportShare';
import { SEO_SITE_ORIGIN } from '@/constants/seo';
import { PRODUCT_DISPLAY_NAME } from '@/constants/productBranding';

const ClientReport = lazy(() => import('@/components/reports/ClientReport'));

interface PublicReportHelmetProps {
  token: string | undefined;
  loading: boolean;
  hasReport: boolean;
  clientName: string;
  orgName: string | null;
  overallScore: number | null;
  error: string | null;
  /** Server-generated Open Graph image URL when present. */
  ogImageOverride: string | null;
}

/**
 * Open Graph / Twitter meta for link previews (Facebook, Instagram DMs, iMessage, etc.).
 * Crawlers that execute JS will see these after hydration.
 */
function PublicReportHelmet({
  token,
  loading,
  hasReport,
  clientName,
  orgName,
  overallScore,
  error,
  ogImageOverride,
}: PublicReportHelmetProps) {
  const canonical = token ? publicReportCanonicalUrl(token) : SEO_SITE_ORIGIN;
  const trimmedOverride = ogImageOverride?.trim() ?? '';
  const ogImage = trimmedOverride.length > 0 ? trimmedOverride : publicReportOgImageUrl();
  let title = `Fitness report | ${PRODUCT_DISPLAY_NAME}`;
  let desc = publicReportOpenGraphDescription(null);

  if (token && hasReport && clientName) {
    title = publicReportOpenGraphTitle(clientName, orgName);
    desc = publicReportOpenGraphDescription(overallScore);
  } else if (token && !loading && !hasReport) {
    title = `Report unavailable | ${PRODUCT_DISPLAY_NAME}`;
    desc =
      error && error.length > 0
        ? error.slice(0, 160)
        : 'This assessment link is invalid or is no longer available.';
  }

  const imageAlt = hasReport && clientName ? `${clientName} fitness report preview` : PRODUCT_DISPLAY_NAME;

  return (
    <Helmet prioritizeSeoTags>
      <title>{title}</title>
      <meta name="description" content={desc} />
      <meta name="robots" content="noindex,nofollow" />
      <link rel="canonical" href={canonical} />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={imageAlt} />
      <meta property="og:site_name" content={PRODUCT_DISPLAY_NAME} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@oneassess" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}

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
    changeNarrative,
    socialShareArtifacts,
  } = usePublicReport(token);

  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);
  const [versionPage, setVersionPage] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function handleExportData() {
    if (!token) return;
    setExporting(true);
    setExportError(null);
    try {
      const fn = httpsCallable<{ shareToken: string }, Record<string, unknown>>(
        getFunctions(),
        'exportClientData',
      );
      const result = await fn({ shareToken: token });
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-data-${token.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      logger.warn('[Export] Failed to export client data:', err);
      setExportError('Download failed. Check your connection and try again.');
    } finally {
      setExporting(false);
    }
  }
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

  const postureSnapshots = useMemo<AssessmentSnapshot[]>(() => {
    const displayFormData = activeFormData ?? formData;
    const displayScores = activeScores ?? scores;
    const displayPrevFormData = activePreviousFormData ?? previousFormData;
    const displayPrevScores = activePreviousScores ?? previousScores;
    if (!displayFormData || !scores) return [];
    const latest =
      displayFormData && scores
        ? {
            id: 'latest',
            timestamp: snapshotSummaries[0]?.date ?? null,
            overallScore: displayScores?.overall ?? 0,
            formData: displayFormData,
            type: 'full' as const,
          }
        : null;
    const previous =
      displayPrevFormData && displayPrevScores
        ? {
            id: 'previous',
            timestamp: snapshotSummaries[1]?.date ?? null,
            overallScore: displayPrevScores.overall ?? 0,
            formData: displayPrevFormData,
            type: 'full' as const,
          }
        : null;
    return [latest, previous].filter(Boolean) as AssessmentSnapshot[];
  }, [
    activeFormData,
    formData,
    activeScores,
    scores,
    activePreviousFormData,
    previousFormData,
    activePreviousScores,
    previousScores,
    snapshotSummaries,
  ]);

  const helmet = (
    <PublicReportHelmet
      token={token}
      loading={loading}
      hasReport={Boolean(formData && scores && !error)}
      clientName={clientName}
      orgName={orgDetails?.name ?? null}
      overallScore={scores?.overall ?? null}
      error={error}
      ogImageOverride={socialShareArtifacts?.og1200x630Url ?? null}
    />
  );

  if (loading) {
    return (
      <>
        {helmet}
        <AppShell title="Your fitness report" mode="public">
        <div
          className="flex flex-col items-center justify-center py-20 px-4"
          aria-busy="true"
          aria-live="polite"
        >
          <span className="sr-only">Loading your report</span>
          <Loader2 className="h-8 w-8 text-primary mb-4 motion-safe:animate-spin" aria-hidden />
          <p className="text-sm text-muted-foreground">Loading your report…</p>
        </div>
      </AppShell>
      </>
    );
  }

  if (!formData || !scores) {
    const isEmptyToken = !token || error === 'Invalid report link.';
    return (
      <>
        {helmet}
        <AppShell title="Your fitness report" mode="public" showClientNav={!!token} shareToken={token ?? undefined} clientName={clientName}>
        <div className="max-w-md mx-auto rounded-xl border border-border bg-card text-card-foreground p-6 sm:p-8 text-center space-y-4">
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
      </>
    );
  }

  const bodyComp = generateBodyCompInterpretation(formData, scores);

  if (!plan) {
    return (
      <>
        {helmet}
        <AppShell
        title={`${clientName}'s Report`}
        mode="public"
        publicLogoUrl={orgDetails?.logoUrl}
        publicOrgName={orgDetails?.name}
        showClientNav={!!token}
        shareToken={token ?? undefined}
        clientName={clientName}
      >
        <div
          className="flex flex-col items-center justify-center py-20 px-4"
          aria-busy="true"
          aria-live="polite"
        >
          <span className="sr-only">Generating report</span>
          <Loader2 className="h-8 w-8 text-primary mb-4 motion-safe:animate-spin" aria-hidden />
          <p className="text-sm font-medium text-muted-foreground">Generating report…</p>
        </div>
      </AppShell>
      </>
    );
  }

  const displayFormData = activeFormData ?? formData;
  const displayScores = activeScores ?? scores;
  const displayPrevFormData = activePreviousFormData ?? previousFormData;
  const displayPrevScores = activePreviousScores ?? previousScores;

  return (
    <>
      {helmet}
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

      {changeNarrative && (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-10 pt-4">
          <div className="rounded-xl border border-border bg-muted/50 px-4 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-1.5">What changed</p>
            <p className="text-sm text-foreground leading-relaxed">{changeNarrative}</p>
          </div>
        </div>
      )}


      <div
        className="transition-opacity duration-150"
        aria-busy={isTransitioning}
        aria-live={isTransitioning ? 'polite' : undefined}
        style={{
          opacity: isTransitioning ? 0 : 1,
          transitionTimingFunction: 'var(--easing-apple, cubic-bezier(0.25, 0.1, 0.25, 1))',
        }}
      >
        <Suspense
          fallback={
            <div
              className="flex flex-col items-center justify-center py-20 bg-card rounded-xl border border-border"
              aria-busy="true"
              aria-live="polite"
            >
              <span className="sr-only">Loading report content</span>
              <Loader2 className="h-8 w-8 text-primary mb-4 motion-safe:animate-spin" aria-hidden />
              <p className="text-sm font-medium text-muted-foreground">Loading report…</p>
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

      {postureSnapshots.length >= 2 && (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-10 py-6">
          <PostureComparisonCard snapshots={postureSnapshots} />
        </div>
      )}

      {token && (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-10 pb-12 pt-4 flex flex-col items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => void handleExportData()}
            disabled={exporting}
            className="min-h-11 h-auto py-3 px-4 text-sm text-muted-foreground hover:text-foreground gap-2"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 shrink-0 motion-safe:animate-spin" aria-hidden />
            ) : (
              <Download className="h-4 w-4 shrink-0" aria-hidden />
            )}
            Download my data (GDPR Article 20)
          </Button>
          {exportError ? (
            <p className="text-sm text-destructive text-center max-w-md" role="alert">
              {exportError}
            </p>
          ) : null}
          <Button variant="ghost" size="lg" className="min-h-11 h-auto py-3 px-4 text-sm" asChild>
            <Link to={`/r/${token}/erasure`}>Request data deletion (GDPR Article 17)</Link>
          </Button>
        </div>
      )}
    </AppShell>
    </>
  );
};

export default PublicReportViewer;
