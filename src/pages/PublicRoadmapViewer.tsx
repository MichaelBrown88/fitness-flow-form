import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { getRoadmapByShareToken } from '@/services/roadmaps';
import RoadmapClientView from '@/components/roadmap/RoadmapClientView';
import { logger } from '@/lib/utils/logger';

const PublicRoadmapViewer = () => {
  const { token } = useParams<{ token: string }>();
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !roadmap) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold text-slate-700">Roadmap Not Found</p>
          <p className="text-sm text-slate-500">{error ?? 'This link may have expired.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <RoadmapClientView
        clientName={roadmap.clientName}
        summary={roadmap.summary}
        items={roadmap.items}
        activePhase={roadmap.activePhase}
      />
    </div>
  );
};

export default PublicRoadmapViewer;
