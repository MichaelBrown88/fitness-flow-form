import { Link, useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Map } from 'lucide-react';
import type { ClientDetailOutletContext } from './ClientDetailLayout';

export default function ClientRoadmapTab() {
  const { roadmapStatus, assessments, clientName } = useOutletContext<ClientDetailOutletContext>();
  const roadmapPath = `/coach/clients/${encodeURIComponent(clientName ?? '')}/roadmap`;

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <div className="rounded-2xl bg-white overflow-hidden border border-border">
        <div className="p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
            <Map className="h-5 w-5 text-primary" />
            Client Roadmap
            {roadmapStatus === 'sent' && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Sent</span>
            )}
            {roadmapStatus === 'draft' && (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Draft</span>
            )}
          </h2>
          {assessments.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Complete an assessment first.</p>
          ) : roadmapStatus === 'loading' ? (
            <p className="text-sm text-slate-400 py-4 text-center">Checking roadmap status...</p>
          ) : (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <p className="text-sm text-slate-500">
                {roadmapStatus === 'none' && 'Roadmap not yet created.'}
                {roadmapStatus === 'draft' && 'Roadmap created but not sent.'}
                {roadmapStatus === 'sent' && 'Roadmap has been shared with client.'}
              </p>
              <Button size="sm" className="rounded-lg text-xs shrink-0" asChild>
                <Link to={roadmapPath}>
                  {roadmapStatus === 'none' ? 'Create Roadmap' : roadmapStatus === 'draft' ? 'Review & Send' : 'View / Edit'}
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
