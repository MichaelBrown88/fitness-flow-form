/**
 * Roadmap tab: shows the client roadmap inline. Create/edit remains on the dedicated roadmap page.
 */

import { Link, useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useRoadmapData } from '@/hooks/useRoadmapData';
import RoadmapClientView from '@/components/roadmap/RoadmapClientView';
import { AlertTriangle, Loader2, Map, Plus } from 'lucide-react';
import type { ClientDetailOutletContext } from './ClientDetailLayout';

export default function ClientRoadmapTab() {
  const { clientName, assessments, isRoadmapStale } = useOutletContext<ClientDetailOutletContext>();
  const effectiveName = clientName ?? '';

  const {
    items,
    loading,
    needsCreation,
    summary,
    clientGoals,
    activePhase,
  } = useRoadmapData(effectiveName);

  const roadmapPath = `/coach/clients/${encodeURIComponent(effectiveName)}/roadmap`;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-slate-500">Loading roadmap…</p>
      </div>
    );
  }

  if (assessments.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center max-w-md mx-auto">
        <Map className="h-10 w-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-600">Complete an assessment first</p>
        <p className="text-xs text-slate-500 mt-1">Then you can create a roadmap for this client.</p>
      </div>
    );
  }

  if (needsCreation || items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center max-w-md mx-auto">
        <Map className="h-10 w-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-600">No roadmap yet</p>
        <p className="text-xs text-slate-500 mt-2 mb-4">Create and send a roadmap from the full roadmap page.</p>
        <Button size="sm" className="rounded-lg gap-1.5" asChild>
          <Link to={roadmapPath}>
            <Plus className="h-4 w-4" />
            Create roadmap
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isRoadmapStale && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span>
            This client's scores have shifted significantly since this plan was built. Consider reviewing
            and updating the roadmap to reflect their current progress.
          </span>
        </div>
      )}
      <RoadmapClientView
        clientName={effectiveName}
        summary={summary}
        items={items}
        clientGoals={clientGoals}
        activePhase={activePhase}
        mode="coach"
      />
      <div className="mt-6">
        <Button variant="outline" size="sm" className="rounded-lg" asChild>
          <Link to={roadmapPath}>Edit or send roadmap</Link>
        </Button>
      </div>
    </div>
  );
}
