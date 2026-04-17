import React, { Suspense, lazy, useEffect, useState } from 'react';
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
  Target,
} from 'lucide-react';
const ClientReport = lazy(() => import('@/components/reports/ClientReport'));
import { useAuth } from '@/hooks/useAuth';
import { type FormData } from '@/contexts/FormContext';
import { type ScoreSummary } from '@/lib/scoring';
import { PHASE_FORM_COPY } from '@/constants/phaseFormCopy';
import { getRoadmapForClient } from '@/services/roadmaps';
import type { Trackable, RoadmapItem } from '@/lib/roadmap/types';

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
  const { profile, effectiveOrgId } = useAuth();
  const [shared, setShared] = React.useState(false);
  const [arcTrackables, setArcTrackables] = useState<(Trackable & { itemTitle: string })[]>([]);

  // Fetch ARC milestones after save completes so the coach sees progress movement
  useEffect(() => {
    if (!savingId || !effectiveOrgId || !formData.fullName) return;
    let cancelled = false;
    getRoadmapForClient(effectiveOrgId, formData.fullName.trim())
      .then(doc => {
        if (cancelled || !doc?.items) return;
        const all: (Trackable & { itemTitle: string })[] = [];
        for (const item of doc.items) {
          if (item.trackables) {
            for (const t of item.trackables) {
              all.push({ ...t, itemTitle: item.title });
            }
          }
        }
        setArcTrackables(all);
      })
      .catch(() => { /* non-critical */ });
    return () => { cancelled = true; };
  }, [savingId, effectiveOrgId, formData.fullName]);

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
                navigate(`/coach/assessments/${savingId}`);
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
              onClick={() => navigate(`/client/${encodeURIComponent(formData.fullName?.trim() ?? '')}`)}
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

      {arcTrackables.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card px-5 py-4 space-y-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">ARC™ Milestone Progress</h3>
            <span className="text-[10px] font-bold text-muted-foreground ml-auto">
              {arcTrackables.filter(t => t.target > t.baseline ? t.current >= t.target : t.current <= t.target).length}/{arcTrackables.length} reached
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {arcTrackables.slice(0, 6).map(t => {
              const range = Math.abs(t.target - t.baseline);
              const progress = range > 0
                ? Math.min(100, Math.max(0, Math.round((Math.abs(t.current - t.baseline) / range) * 100)))
                : t.current >= t.target ? 100 : 0;
              const isAchieved = t.target > t.baseline ? t.current >= t.target : t.current <= t.target;
              return (
                <div key={t.id} className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-foreground truncate">{t.label}</span>
                      <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap tabular-nums">
                        {t.current}{t.unit ? ` ${t.unit}` : ''} → {t.target}{t.unit ? ` ${t.unit}` : ''}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-border/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isAchieved ? 'bg-score-green' : 'bg-primary'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  {isAchieved && <CheckCircle2 className="h-3.5 w-3.5 text-score-green shrink-0" />}
                </div>
              );
            })}
          </div>
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
        <ClientReport
          scores={scores}
          goals={Array.isArray(formData.clientGoals) ? formData.clientGoals : []}
          formData={formData}
          plan={plan}
          standalone={false}
          organizationId={profile?.organizationId}
        />
      </Suspense>
    </div>
  );
};

export default AssessmentResults;
