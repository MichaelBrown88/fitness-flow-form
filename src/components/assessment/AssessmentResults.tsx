import React, { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
  CheckCircle2,
  User,
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
  const { profile } = useAuth();
  const [shared, setShared] = React.useState(false);

  const wrapShare = (fn: (v: 'client' | 'coach') => void) => () => {
    fn('client');
    setShared(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {saving && !savingId ? (
        <div
          className="flex items-center gap-2 rounded-lg border border-score-amber/30 bg-score-amber-muted/40 px-4 py-3 text-sm font-medium text-score-amber-fg"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          {PHASE_FORM_COPY.RESULTS_SAVING_STATUS}
        </div>
      ) : !saving && savingId && !shared ? (
        <div
          className="flex items-center gap-2 rounded-lg border border-score-green/30 bg-score-green-muted/40 px-4 py-3 text-sm font-medium text-score-green-fg animate-in fade-in duration-300"
          role="status"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
          Assessment saved
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-foreground">Client Report</h2>

        <div className="flex flex-wrap gap-2">
          <div className="flex -space-x-px">
            <Button 
              onClick={wrapShare(onCopyLink)}
              size="lg" 
              className="bg-primary text-primary-foreground gap-2 shadow-lg hover:bg-primary/90 rounded-lg rounded-r-none px-4 h-12 focus:z-10" 
              disabled={shareLoading}
            >
              {shareLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
              Copy Link
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg rounded-l-none px-2 h-12 focus:z-10" disabled={shareLoading}>
                  <Share2 className="h-4 w-4" />
                  <span className="sr-only">More share options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-lg">
                <DropdownMenuItem onClick={wrapShare(onShare)} className="py-3 text-sm font-medium">Share…</DropdownMenuItem>
                <DropdownMenuItem onClick={wrapShare(onEmailLink)} className="py-3 text-sm font-medium">Email Link</DropdownMenuItem>
                <DropdownMenuItem onClick={wrapShare(onWhatsAppShare)} className="py-3 text-sm font-medium">WhatsApp Message</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {savingId && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                if (isEditMode) {
                  onClearEditMode?.();
                }
                const name = formData.fullName?.trim();
                if (name) {
                  navigate(`/dashboard/clients/${encodeURIComponent(name)}/report`);
                } else {
                  navigate(`/coach/assessments/${savingId}`);
                }
              }}
              className="rounded-lg h-12 text-sm font-bold"
            >
              <Eye className="mr-2 h-4 w-4" />
              View Report
            </Button>
          )}
          {formData.fullName && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                const name = formData.fullName?.trim();
                if (name) {
                  navigate(`/dashboard/clients/${encodeURIComponent(name)}/report`);
                }
              }}
              className="rounded-lg h-12 text-sm font-bold"
            >
              <User className="mr-2 h-4 w-4" />
              View Client
            </Button>
          )}
          <Button variant="ghost" size="lg" onClick={onStartNew} className="rounded-lg h-12 text-sm font-bold">
            New assessment
          </Button>
        </div>
      </div>

      {shared && (
        <div className="flex items-center gap-2 text-sm font-medium text-score-green-fg bg-score-green-muted/60 border border-score-green/30 rounded-xl px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Report shared successfully!</span>
        </div>
      )}

      <Suspense fallback={
        <div className="space-y-6 py-8">
          <div className="space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      }>
        {/* Coach debrief renders the same v2 the client sees — share/new-assessment actions live above. */}
        <ClientReport
          scores={scores}
          goals={Array.isArray(formData.clientGoals) ? formData.clientGoals : []}
          formData={formData}
          standalone
          organizationId={profile?.organizationId}
        />
      </Suspense>
    </div>
  );
};

export default AssessmentResults;
