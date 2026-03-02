import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { ROUTES } from '@/constants/routes';
import { RoadmapEditor } from '@/components/roadmap/RoadmapEditor';
import { RoadmapBuilder } from '@/components/roadmap/RoadmapBuilder';
import { ProgressReviewModal } from '@/components/roadmap/ProgressReviewModal';
import { useRoadmapData } from '@/hooks/useRoadmapData';

export default function ClientRoadmap() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const clientName = decodeURIComponent(name ?? '');

  const {
    roadmapId,
    summary,
    items,
    loading,
    saving,
    shareState,
    progressSuggestions,
    generatedBlocks,
    needsCreation,
    clientGoals,
    handleCreateRoadmap,
    handleCreateAndShare,
    handleSummaryChange,
    handleItemsChange,
    handleShare,
    handleProgressConfirm,
    dismissSuggestions,
  } = useRoadmapData(clientName);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const clientPath = `/client/${encodeURIComponent(clientName)}`;

  const showBuilder = needsCreation || (items.length === 0 && generatedBlocks.length > 0);

  if (showBuilder) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Breadcrumb items={[
          { label: 'Dashboard', href: ROUTES.DASHBOARD },
          { label: clientName, href: clientPath },
          { label: 'Create Roadmap' },
        ]} />
        <RoadmapBuilder
          clientName={clientName}
          blocks={generatedBlocks}
          clientGoals={clientGoals}
          onCreate={handleCreateRoadmap}
          onAcceptAndSend={handleCreateAndShare}
          saving={saving}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Breadcrumb items={[
        { label: 'Dashboard', href: ROUTES.DASHBOARD },
        { label: clientName, href: clientPath },
        { label: 'Roadmap' },
      ]} />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(clientPath)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{clientName}&apos;s Journey</h1>
        </div>
        <Button variant="outline" size="sm" onClick={handleShare} disabled={!roadmapId}>
          {shareState === 'copied'
            ? <><Check className="h-4 w-4 mr-1.5" />Copied!</>
            : <><Send className="h-4 w-4 mr-1.5" />Send to Client</>
          }
        </Button>
      </div>

      <RoadmapEditor
        summary={summary}
        items={items}
        onSummaryChange={handleSummaryChange}
        onItemsChange={handleItemsChange}
        saving={saving}
        generatedBlocks={generatedBlocks}
      />

      {progressSuggestions.length > 0 && (
        <ProgressReviewModal
          suggestions={progressSuggestions}
          onConfirm={handleProgressConfirm}
          onDismiss={dismissSuggestions}
        />
      )}
    </div>
  );
}
