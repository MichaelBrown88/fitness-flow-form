import React from 'react';
import { Loader2 } from 'lucide-react';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary, RoadmapPhase } from '@/lib/scoring';
import type { CoachPlan } from '@/lib/recommendations/types';
import { PHASE_FORM_COPY } from '@/constants/phaseFormCopy';

const AssessmentResults = React.lazy(() => import('@/components/assessment/AssessmentResults'));

export interface PhaseFormResultsPanelProps {
  formData: FormData;
  scores: ScoreSummary;
  roadmap: RoadmapPhase[];
  plan: CoachPlan;
  saving?: boolean;
  savingId: string | null;
  isEditMode: boolean;
  onClearEditMode: () => void;
  onStartNew: () => void;
  onShare: (view: 'client' | 'coach') => void;
  onCopyLink: (view: 'client' | 'coach') => void;
  onEmailLink: (view: 'client' | 'coach') => void;
  onWhatsAppShare: (view: 'client' | 'coach') => void;
  shareLoading: boolean;
}

export function PhaseFormResultsPanel(props: PhaseFormResultsPanelProps) {
  return (
    <React.Suspense
      fallback={
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <Loader2 className="h-12 w-12 animate-spin text-primary" aria-hidden />
          <p className="text-sm font-medium text-muted-foreground">{PHASE_FORM_COPY.RESULTS_SUSPENSE_TITLE}</p>
        </div>
      }
    >
      <AssessmentResults
        formData={props.formData}
        scores={props.scores}
        roadmap={props.roadmap}
        plan={props.plan}
        saving={props.saving}
        savingId={props.savingId}
        isEditMode={props.isEditMode}
        onClearEditMode={props.onClearEditMode}
        onStartNew={props.onStartNew}
        onShare={props.onShare}
        onCopyLink={props.onCopyLink}
        onEmailLink={props.onEmailLink}
        onWhatsAppShare={props.onWhatsAppShare}
        shareLoading={props.shareLoading}
      />
    </React.Suspense>
  );
}
