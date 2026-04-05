import { useState, lazy, Suspense, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAssessmentLogic } from '@/hooks/useAssessmentLogic';
import { useVersionSelector } from '@/hooks/useVersionSelector';
import { useReportShare } from '@/hooks/useReportShare';
import AssessmentVersionSelector from '@/components/reports/AssessmentVersionSelector';
import AppShell from '@/components/layout/AppShell';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { generateBodyCompInterpretation } from '@/lib/recommendations';
import { Loader2, Share2, MoreVertical, ArrowLeft, Edit2, Plus, Eye } from 'lucide-react';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import {
  removeEditAssessment,
  removeIsDemoFlag,
  removePartialAssessment,
  removePrefillClient,
  writeEditAssessmentPayload,
} from '@/lib/assessment/assessmentSessionStorage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ShareWithClientReportDialog } from '@/components/reports/ShareWithClientReportDialog';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

const ClientReport = lazy(() => import('@/components/reports/ClientReport'));
const CoachReport = lazy(() => import('@/components/reports/CoachReport'));

import { ROUTES, COACH_ASSESSMENT_QUERY } from '@/constants/routes';
import { COACH_ASSESSMENT_REPORT_NAV } from '@/constants/assessmentCopy';
import { UI_COMMAND_MENU } from '@/constants/ui';

const AssessmentReport = () => {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    formData,
    scores,
    plan,
    previousScores,
    previousFormData,
    loading,
    error,
    planError,
    allSnapshots,
  } = useAssessmentLogic(id);

  const versionSelector = useVersionSelector(allSnapshots);
  const [previewingClientView, setPreviewingClientView] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [versionSelectorExpanded, setVersionSelectorExpanded] = useState(false);

  const scoreDelta = (scores && previousScores)
    ? (scores.overall - previousScores.overall)
    : undefined;

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
    assessmentId: id,
    formData: formData ?? null,
    user,
    profile: profile ?? null,
    overallScore: scores?.overall,
    scoreDelta,
  });

  useEffect(() => {
    const wantsShare =
      searchParams.get(COACH_ASSESSMENT_QUERY.OPEN_SHARE_MODAL) ===
      COACH_ASSESSMENT_QUERY.OPEN_SHARE_VALUE;
    if (!wantsShare) return;
    if (loading || !formData || !scores || !plan) return;
    setShareModalOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete(COACH_ASSESSMENT_QUERY.OPEN_SHARE_MODAL);
    setSearchParams(next, { replace: true });
  }, [loading, formData, scores, plan, searchParams, setSearchParams]);

  if (loading) {
    return (
      <AppShell title="Assessment report">
        <div className="flex flex-col items-center justify-center py-20 bg-background rounded-xl">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm font-medium text-muted-foreground">Loading Assessment...</p>
        </div>
      </AppShell>
    );
  }

  if (!formData || !scores) {
    return (
      <AppShell title="Assessment report">
        <div className="space-y-4 rounded-lg border border-border bg-background p-6 text-sm text-foreground-secondary">
          <p>{error ?? 'Assessment not available.'}</p>
          <Button onClick={() => {
            removePartialAssessment();
            removeEditAssessment();
            removePrefillClient();
            removeIsDemoFlag();
            navigate(ROUTES.ASSESSMENT);
          }}>New assessment</Button>
        </div>
      </AppShell>
    );
  }

  // Handle Plan Generation Failure gracefully
  if (planError) {
     return (
      <AppShell title="Assessment report" variant="full-width">
        <div className="flex flex-col items-center justify-center py-12 sm:py-20 bg-amber-50 rounded-xl border border-amber-200 p-4 sm:p-8 text-center max-w-2xl mx-auto mt-4 sm:mt-10">
          <div className="bg-amber-100 p-3 rounded-full mb-4">
             <Loader2 className="h-6 w-6 text-amber-600" /> 
           </div> 
          <h3 className="text-base sm:text-lg font-bold text-amber-900 mb-2">Report Generation Issue</h3>
          <p className="text-sm sm:text-base text-amber-700 mb-6">We encountered an issue creating the AI Coach Plan. The raw assessment data is safe, but the recommendations could not be generated.</p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
            <Button variant="outline" onClick={() => window.location.reload()} className="w-full sm:w-auto">Retry</Button>
            <Button onClick={() => navigate(ROUTES.DASHBOARD)} className="w-full sm:w-auto">
              Return to {UI_COMMAND_MENU.HOME}
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!plan) {
    return (
      <AppShell title="Assessment report">
        <div className="flex flex-col items-center justify-center py-20 bg-background rounded-xl">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm font-medium text-muted-foreground">Generating Report...</p>
        </div>
      </AppShell>
    );
  }

  // Calculate generic body comp for display logic
  const bodyComp = generateBodyCompInterpretation(formData, scores);
  const highlightCategory = sessionStorage.getItem(STORAGE_KEYS.HIGHLIGHT_CATEGORY) || undefined;

  const navigateToDashboard = () => {
    if (formData?.fullName) {
      navigate(`/client/${encodeURIComponent(formData.fullName)}`);
    } else {
      navigate(ROUTES.DASHBOARD);
    }
  };

  const reportBackLabel = formData.fullName?.trim()
    ? COACH_ASSESSMENT_REPORT_NAV.BACK_TO_CLIENT_ARIA
    : COACH_ASSESSMENT_REPORT_NAV.BACK_TO_DASHBOARD_ARIA;

  const navigateToEdit = () => {
    if (!id || !formData) return;
    writeEditAssessmentPayload({
      assessmentId: id,
      formData: formData,
      clientName: formData.fullName,
    });
    removePartialAssessment();
    removePrefillClient();
    removeIsDemoFlag();
    navigate('/assessment');
  };

  const navigateToNew = () => {
    removePartialAssessment();
    removeEditAssessment();
    removePrefillClient();
    removeIsDemoFlag();
    navigate('/assessment');
  };

  return (
    <ErrorBoundary>
      <AppShell
        title=""
        variant="full-width"
        actions={
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={navigateToDashboard}
              className="h-9 w-9 p-0"
              title={reportBackLabel}
              aria-label={reportBackLabel}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              variant="default"
              size="sm"
              className="h-9 rounded-lg bg-foreground text-white font-medium gap-1.5"
              onClick={() => setShareModalOpen(true)}
              disabled={shareLoading}
            >
              <Share2 className="h-4 w-4" />
              Share with client
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-xl">
                <DropdownMenuItem onClick={navigateToEdit}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit Assessment
                </DropdownMenuItem>
                <DropdownMenuItem onClick={navigateToNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Assessment
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
    >
      {/* Breadcrumb + Header row */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-10 pt-3 pb-1">
        <Breadcrumb items={[
          { label: UI_COMMAND_MENU.HOME, href: ROUTES.DASHBOARD },
          ...(formData.fullName
            ? [{ label: formData.fullName, href: `/client/${encodeURIComponent(formData.fullName)}` }]
            : []),
          { label: 'Report' },
        ]} />
        <div className="flex items-center justify-between">
          <h1 className="text-base sm:text-lg font-bold text-foreground truncate">
            {formData.fullName || 'Assessment'}
          </h1>
          <button
            onClick={() => setPreviewingClientView((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground-secondary transition-colors shrink-0 ml-3"
          >
            <Eye className="h-3.5 w-3.5" />
            {previewingClientView ? 'Back to coach view' : 'Preview client view'}
          </button>
        </div>
      </div>

      <div
        className="transition-opacity duration-150"
        style={{
          opacity: versionSelector.isTransitioning ? 0 : 1,
          transitionTimingFunction: 'var(--easing-apple, cubic-bezier(0.25, 0.1, 0.25, 1))',
        }}
      >
        {/* Version selector — show when expanded or when user opens it */}
        {versionSelector.totalCount > 1 && (
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-10 pt-2 pb-3">
            {!versionSelectorExpanded ? (
              <button
                type="button"
                onClick={() => setVersionSelectorExpanded(true)}
                className="text-xs font-medium text-muted-foreground hover:text-foreground-secondary"
              >
                Compare versions ({versionSelector.totalCount})
              </button>
            ) : (
              <div className="flex justify-center">
                <AssessmentVersionSelector
              snapshots={versionSelector.gridItems}
              selectedIndex={versionSelector.selectedIndex}
              totalCount={versionSelector.totalCount}
              initialAssessment={versionSelector.initialAssessment}
              initialAssessmentGlobalIndex={versionSelector.initialAssessmentGlobalIndex}
              currentPage={versionSelector.currentPage}
              totalPages={versionSelector.totalPages}
              pageSize={versionSelector.pageSize}
              onSelect={versionSelector.handleSelect}
              onPageChange={versionSelector.handlePageChange}
              getTrend={versionSelector.getTrend}
            />
              </div>
            )}
          </div>
        )}
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-10 pb-8 sm:pb-12">
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-20 bg-background rounded-xl">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm font-medium text-muted-foreground">Generating Report...</p>
            </div>
          }>
            {previewingClientView ? (
              <ClientReport
                scores={versionSelector.selectedScores ?? scores}
                goals={Array.isArray((versionSelector.selectedFormData ?? formData).clientGoals) ? (versionSelector.selectedFormData ?? formData).clientGoals : []}
                formData={versionSelector.selectedFormData ?? formData}
                plan={plan}
                previousScores={versionSelector.previousScores ?? previousScores}
                previousFormData={(versionSelector.previousFormData ?? previousFormData) ?? undefined}
                standalone={true}
              />
            ) : (
              <CoachReport
                plan={plan}
                scores={versionSelector.selectedScores ?? scores}
                bodyComp={bodyComp}
                formData={versionSelector.selectedFormData ?? formData}
                highlightCategory={highlightCategory}
              />
            )}
          </Suspense>
        </div>
      </div>

      <ShareWithClientReportDialog
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        shareLoading={shareLoading}
        onCopyLink={handleCopyLink}
        onEmailLink={handleEmailLink}
        onSystemShare={handleSystemShare}
        onWhatsAppShare={handleWhatsAppShare}
        assessmentId={id}
        socialShareGenerating={socialShareGenerating}
        socialShareArtifacts={socialShareArtifacts}
        onGenerateSocialShareArtifacts={handleGenerateSocialShareArtifacts}
      />
    </AppShell>
    </ErrorBoundary>
  );
};

export default AssessmentReport;


