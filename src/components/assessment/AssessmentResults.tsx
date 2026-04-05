import React, { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Share2, 
  Loader2,
  Eye,
  Link as LinkIcon,
  CheckCircle2
} from 'lucide-react';
const ClientReport = lazy(() => import('@/components/reports/ClientReport'));
import { useAuth } from '@/hooks/useAuth';
import { type FormData } from '@/contexts/FormContext';
import { type ScoreSummary } from '@/lib/scoring';
import { PHASE_FORM_COPY } from '@/constants/phaseFormCopy';

interface AssessmentResultsProps {
  formData: FormData;
  scores: ScoreSummary;
  roadmap: import('@/lib/scoring').RoadmapPhase[];
  plan: import('@/lib/recommendations').CoachPlan;
  /** True while Firestore save is in progress (before savingId is set). */
  saving?: boolean;
  savingId: string | null;
  isEditMode?: boolean;
  onClearEditMode?: () => void;
  onStartNew: () => void;
  onShare: (view: 'client' | 'coach') => void;
  onCopyLink: (view: 'client' | 'coach') => void;
  onEmailLink: (view: 'client' | 'coach') => void;
  onWhatsAppShare: (view: 'client' | 'coach') => void;
  shareLoading: boolean;
}

const AssessmentResults: React.FC<AssessmentResultsProps> = ({
  formData,
  scores,
  plan,
  saving = false,
  savingId,
  isEditMode,
  onClearEditMode,
  onStartNew,
  onShare,
  onCopyLink,
  onEmailLink,
  onWhatsAppShare,
  shareLoading,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [shared, setShared] = React.useState(false);

  const handleViewReport = () => {
    if (!user || !savingId || !isEditMode) return;
    onClearEditMode?.();
    navigate(`/coach/assessments/${savingId}`);
  };

  const wrapShare = (fn: (v: 'client' | 'coach') => void) => () => {
    fn('client');
    setShared(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {saving && !savingId ? (
        <div
          className="flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3 text-sm font-medium text-foreground"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
          {PHASE_FORM_COPY.RESULTS_SAVING_STATUS}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-foreground">Client Report</h2>

        <div className="flex flex-wrap gap-2">
          <div className="flex -space-x-px">
            <Button 
              onClick={wrapShare(onCopyLink)}
              size="lg" 
              className="bg-indigo-600 text-white gap-2 shadow-lg hover:bg-indigo-700 rounded-lg rounded-r-none px-4 h-12 focus:z-10" 
              disabled={shareLoading}
            >
              {shareLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
              Copy Link
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="lg" className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg rounded-l-none px-2 h-12 focus:z-10" disabled={shareLoading}>
                  <Share2 className="h-4 w-4" />
                  <span className="sr-only">More share options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-lg">
                <DropdownMenuItem onClick={wrapShare(onShare)} className="py-3 text-sm font-medium">System Share</DropdownMenuItem>
                <DropdownMenuItem onClick={wrapShare(onEmailLink)} className="py-3 text-sm font-medium">Email Link</DropdownMenuItem>
                <DropdownMenuItem onClick={wrapShare(onWhatsAppShare)} className="py-3 text-sm font-medium">WhatsApp Message</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {isEditMode && savingId && (
            <Button 
              variant="outline" 
              size="lg" 
              onClick={handleViewReport}
              className="rounded-lg h-12 text-sm font-bold"
            >
              <Eye className="mr-2 h-4 w-4" />
              View Updated Report
            </Button>
          )}
          <Button variant="ghost" size="lg" onClick={onStartNew} className="rounded-lg h-12 text-sm font-bold">
            New Client
          </Button>
        </div>
      </div>

      {shared && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-lg px-4 py-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Tasks have been added to your dashboard.</span>
        </div>
      )}

      <Suspense fallback={
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm font-medium text-muted-foreground">Loading Report...</p>
        </div>
      }>
        <ClientReport 
          scores={scores} 
          goals={Array.isArray(formData.clientGoals) ? formData.clientGoals : []} 
          formData={formData} 
          plan={plan} 
          standalone={false}
        />
      </Suspense>
    </div>
  );
};

export default AssessmentResults;
