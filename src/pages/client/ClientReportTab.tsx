/**
 * Client Report tab: client-facing report for the latest assessment (embedded in client detail).
 */

import { Suspense, lazy, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAssessmentLogic } from '@/hooks/useAssessmentLogic';
import { useReportShare } from '@/hooks/useReportShare';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, FileText, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ShareWithClientReportDialog } from '@/components/reports/ShareWithClientReportDialog';
import type { ClientDetailOutletContext } from './ClientDetailLayout';

const ClientReport = lazy(() => import('@/components/reports/ClientReport'));

export default function ClientReportTab() {
  const { assessments, clientName } = useOutletContext<ClientDetailOutletContext>();
  const assessmentId = assessments[0]?.id;
  const { user, profile } = useAuth();
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const {
    formData,
    scores,
    plan,
    previousScores,
    previousFormData,
    loading,
    error,
  } = useAssessmentLogic(assessmentId, clientName);

  const scoreDelta =
    scores && previousScores ? scores.overall - previousScores.overall : undefined;

  const {
    handleCopyLink,
    handleEmailLink,
    handleSystemShare,
    handleWhatsAppShare,
    shareLoading,
  } = useReportShare({
    assessmentId,
    formData: formData ?? null,
    user,
    profile: profile ?? null,
    overallScore: scores?.overall,
    scoreDelta,
  });

  if (!assessmentId && !clientName) {
    return (
      <div className="rounded-2xl border border-border bg-muted p-8 text-center">
        <FileText className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground-secondary">No assessment yet</p>
        <p className="text-xs text-muted-foreground mt-1">Complete an assessment to see the client report here.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Loading report…</p>
      </div>
    );
  }

  if (error || !formData || !scores) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-foreground-secondary">{error ?? 'Report not available.'}</p>
      </div>
    );
  }

  const goals = Array.isArray(formData.clientGoals) ? formData.clientGoals : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          size="sm"
          className="h-9 rounded-lg bg-foreground text-white font-medium gap-1.5"
          onClick={() => setShareModalOpen(true)}
          disabled={shareLoading}
        >
          <Share2 className="h-4 w-4" />
          Share with client
        </Button>
      </div>

      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Generating report…</p>
          </div>
        }
      >
        <ClientReport
          scores={scores}
          goals={goals}
          formData={formData}
          plan={plan ?? undefined}
          previousScores={previousScores ?? undefined}
          previousFormData={previousFormData ?? undefined}
          standalone={true}
        />
      </Suspense>

      <ShareWithClientReportDialog
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        shareLoading={shareLoading}
        onCopyLink={handleCopyLink}
        onEmailLink={handleEmailLink}
        onSystemShare={handleSystemShare}
        onWhatsAppShare={handleWhatsAppShare}
      />
    </div>
  );
}
