import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppShell from '@/components/layout/AppShell';
import { getRoadmapByShareToken } from '@/services/roadmaps';
import RoadmapClientView from '@/components/roadmap/RoadmapClientView';
import { RoadmapLoadDiagnostics } from '@/components/roadmap/RoadmapLoadDiagnostics';
import {
  type AppShellOuterProps,
  PublicRoadmapViewerLoading,
  PublicRoadmapViewerMissing,
} from '@/components/roadmap/PublicRoadmapViewerStates';
import { logger } from '@/lib/utils/logger';
import { PUBLIC_CLIENT_URL_QUERY, ROUTES } from '@/constants/routes';

const PublicRoadmapViewer = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const reportToken = searchParams.get('reportToken');
  const showRoadmapLoadDebug =
    searchParams.get(PUBLIC_CLIENT_URL_QUERY.ROADMAP_DEBUG) === '1';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roadmap, setRoadmap] = useState<{
    clientName: string;
    summary: string;
    items: import('@/lib/roadmap/types').RoadmapItem[];
    activePhase?: import('@/lib/roadmap/types').RoadmapPhase;
    clientGoals?: string[];
  } | null>(null);
  const [refetchNonce, setRefetchNonce] = useState(0);

  useEffect(() => {
    const trimmed = token?.trim();
    if (!trimmed) {
      setLoading(false);
      setError('This ARC™ link is invalid or incomplete.');
      setRoadmap(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        let loaded = await getRoadmapByShareToken(trimmed);
        if (
          !loaded &&
          reportToken &&
          reportToken.trim() !== trimmed
        ) {
          loaded = await getRoadmapByShareToken(reportToken.trim());
        }
        if (cancelled) return;
        if (!loaded) {
          setError('This ARC™ link is no longer active.');
          setRoadmap(null);
          return;
        }
        setRoadmap({
          clientName: loaded.clientName,
          summary: loaded.summary,
          items: Array.isArray(loaded.items) ? loaded.items : [],
          activePhase: loaded.activePhase,
          clientGoals: Array.isArray(loaded.clientGoals) ? loaded.clientGoals : undefined,
        });
      } catch (err) {
        if (cancelled) return;
        logger.error('Failed to load public roadmap', err);
        setError('Something went wrong loading this ARC™.');
        setRoadmap(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [token, reportToken, refetchNonce]);

  const effectiveShareToken = reportToken?.trim() || token?.trim() || undefined;

  const shellProps: AppShellOuterProps = {
    title: roadmap ? `${roadmap.clientName}'s ARC™` : 'Your ARC™',
    mode: 'public',
    showClientNav: !!effectiveShareToken,
    shareToken: effectiveShareToken,
    clientName: roadmap?.clientName ?? 'Client',
  };

  if (loading) {
    return <PublicRoadmapViewerLoading shellProps={shellProps} />;
  }

  if (error || !roadmap) {
    return (
      <PublicRoadmapViewerMissing
        shellProps={shellProps}
        error={error}
        reportToken={reportToken}
        showRoadmapLoadDebug={showRoadmapLoadDebug}
        onRetry={() => setRefetchNonce((n) => n + 1)}
      />
    );
  }

  return (
    <AppShell {...shellProps}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {reportToken ? (
          <div className="mb-4">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 shrink-0" asChild>
              <Link to={`/r/${reportToken}`} aria-label="Back to report">
                <ArrowLeft className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="mb-4">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 shrink-0" asChild>
              <Link to={ROUTES.HOME} aria-label="Go to One Assess home">
                <ArrowLeft className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>
        )}
        <RoadmapClientView
          embedded
          clientName={roadmap.clientName}
          summary={roadmap.summary}
          items={roadmap.items}
          activePhase={roadmap.activePhase}
          clientGoals={roadmap.clientGoals}
        />
        {showRoadmapLoadDebug && <RoadmapLoadDiagnostics variant="success" />}
      </div>
    </AppShell>
  );
};

export default PublicRoadmapViewer;
