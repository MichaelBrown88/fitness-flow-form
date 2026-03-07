import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Loader2, Send, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ROUTES } from '@/constants/routes';
import AppShell from '@/components/layout/AppShell';
import RoadmapClientView from '@/components/roadmap/RoadmapClientView';
import { RoadmapEditor } from '@/components/roadmap/RoadmapEditor';
import { RoadmapBuilder } from '@/components/roadmap/RoadmapBuilder';
import { ProgressReviewModal } from '@/components/roadmap/ProgressReviewModal';
import { useRoadmapData } from '@/hooks/useRoadmapData';

export default function ClientRoadmap() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const clientName = decodeURIComponent(name ?? '');
  const [editingRoadmap, setEditingRoadmap] = useState(false);

  const {
    roadmapId,
    summary,
    items,
    loading,
    saving,
    shareState,
    progressSuggestions,
    generatedBlocks,
    allPossibleBlocks,
    needsCreation,
    clientGoals,
    coachBrief,
    activePhase,
    handleCreateRoadmap,
    handleCreateAndShare,
    handleSummaryChange,
    handleItemsChange,
    handleShare,
    handleProgressConfirm,
    dismissSuggestions,
  } = useRoadmapData(clientName);

  const clientPath = `/client/${encodeURIComponent(clientName)}`;

  if (loading) {
    return (
      <AppShell title={clientName ? `${clientName}'s Roadmap` : 'Roadmap'}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  const showBuilder = needsCreation || (items.length === 0 && generatedBlocks.length > 0);

  if (showBuilder) {
    return (
      <AppShell
        title="Create Roadmap"
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate(clientPath)} className="h-9 w-9 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        }
      >
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Breadcrumb items={[
            { label: 'Dashboard', href: ROUTES.DASHBOARD },
            { label: clientName, href: clientPath },
            { label: 'Create Roadmap' },
          ]} />
          <RoadmapBuilder
            clientName={clientName}
            blocks={generatedBlocks}
            allPossibleBlocks={allPossibleBlocks}
            clientGoals={clientGoals}
            coachBrief={coachBrief}
            onCreate={handleCreateRoadmap}
            onAcceptAndSend={handleCreateAndShare}
            saving={saving}
          />
        </div>
      </AppShell>
    );
  }

  const headerActions = (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" onClick={() => navigate(clientPath)} className="h-9 w-9 p-0">
        <ArrowLeft className="h-4 w-4" />
      </Button>
      {editingRoadmap ? (
        <Button variant="outline" size="sm" onClick={() => setEditingRoadmap(false)}>
          Done editing
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setEditingRoadmap(true)}>
          <Pencil className="h-4 w-4 mr-1.5" />
          Edit roadmap
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={handleShare} disabled={!roadmapId}>
        {shareState === 'copied'
          ? <><Check className="h-4 w-4 mr-1.5" />Copied!</>
          : <><Send className="h-4 w-4 mr-1.5" />Send to Client</>
        }
      </Button>
    </div>
  );

  return (
    <AppShell
      title={clientName ? `${clientName}'s Roadmap` : 'Roadmap'}
      actions={headerActions}
    >
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Breadcrumb items={[
        { label: 'Dashboard', href: ROUTES.DASHBOARD },
        { label: clientName, href: clientPath },
        { label: 'Roadmap' },
      ]} />

      {editingRoadmap ? (
        <>
          <h1 className="text-2xl font-bold mb-6">{clientName}&apos;s Journey — Editing</h1>
          <RoadmapEditor
            summary={summary}
            items={items}
            onSummaryChange={handleSummaryChange}
            onItemsChange={handleItemsChange}
            saving={saving}
            generatedBlocks={generatedBlocks}
            allPossibleBlocks={allPossibleBlocks}
          />
        </>
      ) : (
        <RoadmapClientView
          clientName={clientName}
          items={items}
          mode="coach"
          clientGoals={clientGoals}
          activePhase={activePhase}
        />
      )}

      {progressSuggestions.length > 0 && (
        <ProgressReviewModal
          suggestions={progressSuggestions}
          onConfirm={handleProgressConfirm}
          onDismiss={dismissSuggestions}
        />
      )}
    </div>
    </AppShell>
  );
}
