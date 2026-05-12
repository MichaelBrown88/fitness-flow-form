/**
 * Client Report tab: client-facing report for the latest assessment (embedded in client detail).
 */

import { Suspense, lazy, useState, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { useAssessmentLogic } from '@/hooks/useAssessmentLogic';
import { useReportShare } from '@/hooks/useReportShare';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, FileText, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ShareWithClientReportDialog } from '@/components/reports/ShareWithClientReportDialog';
import type { ClientDetailOutletContext } from './ClientDetailLayout';
import { TAB_ACTIONS_SLOT_ID } from './ClientDetailLayout';

const ClientReport = lazy(() => import('@/components/reports/ClientReport'));

export default function ClientReportTab() {
  const { assessments, clientName } = useOutletContext<ClientDetailOutletContext>();
  const assessmentId = assessments[0]?.id;
  const { user, profile } = useAuth();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Auto-open share modal when navigated with ?share=1 (e.g. from Overview "Share Report" button)
  useEffect(() => {
    if (searchParams.get('share') === '1') {
      setShareModalOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('share');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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
    handleGenerateSocialShareArtifacts,
    socialShareArtifacts,
    socialShareGenerating,
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
        <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
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
      <TabActionShare onClick={() => setShareModalOpen(true)} disabled={shareLoading} />

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
          organizationId={profile?.organizationId}
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
        assessmentId={assessmentId}
        socialShareGenerating={socialShareGenerating}
        socialShareArtifacts={socialShareArtifacts}
        onGenerateSocialShareArtifacts={handleGenerateSocialShareArtifacts}
      />
    </div>
  );
}

/**
 * Renders the "Share with client" trigger as an icon button inside the
 * layout's tab-actions slot (right next to Manage). Using a portal keeps
 * share state local to this tab while letting the trigger appear on the
 * shared nav row.
 */
function TabActionShare({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    setTarget(document.getElementById(TAB_ACTIONS_SLOT_ID));
  }, []);
  if (!target) return null;
  return createPortal(
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="h-9 w-9 shrink-0 rounded-full"
      onClick={onClick}
      disabled={disabled}
      aria-label="Share report with client"
    >
      <Share2 className="h-4 w-4" />
    </Button>,
    target,
  );
}
