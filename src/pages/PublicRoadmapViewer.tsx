import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppShell from '@/components/layout/AppShell';
import { getRoadmapByShareToken } from '@/services/roadmaps';
import RoadmapClientView from '@/components/roadmap/RoadmapClientView';
import { logger } from '@/lib/utils/logger';

const PublicRoadmapViewer = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reportToken = searchParams.get('reportToken');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roadmap, setRoadmap] = useState<{
    clientName: string;
    summary: string;
    items: import('@/lib/roadmap/types').RoadmapItem[];
    activePhase?: import('@/lib/roadmap/types').RoadmapPhase;
  } | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    (async () => {
      try {
        const doc = await getRoadmapByShareToken(token);
        if (cancelled) return;
        if (!doc) {
          setError('This roadmap link is no longer active.');
          return;
        }
        setRoadmap({
          clientName: doc.clientName,
          summary: doc.summary,
          items: doc.items,
          activePhase: doc.activePhase,
        });
      } catch (err) {
        if (cancelled) return;
        logger.error('Failed to load public roadmap', err);
        setError('Something went wrong loading this roadmap.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [token]);

  const shellProps = {
    title: roadmap ? `${roadmap.clientName}'s Plan` : 'Your Plan',
    mode: 'public' as const,
    showClientNav: !!token,
    shareToken: token ?? undefined,
    clientName: roadmap?.clientName ?? 'Client',
  };

  if (loading) {
    return (
      <AppShell {...shellProps}>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (error || !roadmap) {
    return (
      <AppShell {...shellProps}>
        <div className="max-w-2xl mx-auto px-4 py-8 text-center space-y-4">
          <p className="text-lg font-semibold text-foreground">Roadmap Not Found</p>
          <p className="text-sm text-muted-foreground">{error ?? 'This link may have expired.'}</p>
          {reportToken && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/r/${reportToken}`}>Back to report</Link>
            </Button>
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell {...shellProps}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {reportToken ? (
          <div className="mb-4">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl shrink-0" asChild>
              <Link to={`/r/${reportToken}`} aria-label="Back to report">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="mb-4">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 rounded-xl shrink-0"
              aria-label="Go back"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        )}
        <RoadmapClientView
          clientName={roadmap.clientName}
          summary={roadmap.summary}
          items={roadmap.items}
          activePhase={roadmap.activePhase}
        />
      </div>
    </AppShell>
  );
};

export default PublicRoadmapViewer;
