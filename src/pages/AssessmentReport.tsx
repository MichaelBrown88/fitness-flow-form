import { useState, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAssessmentLogic } from '@/hooks/useAssessmentLogic';
import { useVersionSelector } from '@/hooks/useVersionSelector';
import AssessmentVersionSelector from '@/components/reports/AssessmentVersionSelector';
import AppShell from '@/components/layout/AppShell';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { generateBodyCompInterpretation } from '@/lib/recommendations';
import { requestShareArtifacts, sendReportEmail, type ShareArtifacts } from '@/services/share';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Share2, Link as LinkIcon, Mail, MessageCircle, MoreVertical, ArrowLeft, Edit2, Plus } from 'lucide-react';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { copyTextToClipboard } from '@/lib/utils/clipboard';

const ClientReport = lazy(() => import('@/components/reports/ClientReport'));
const CoachReport = lazy(() => import('@/components/reports/CoachReport'));

import { ROUTES } from '@/constants/routes';
import { UI_TOASTS } from '@/constants/ui';
import { logger } from '@/lib/utils/logger';

const AssessmentReport = () => {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
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

  const [reportView, setReportView] = useState<'client' | 'coach'>('client');

  const [shareCache, setShareCache] = useState<Record<'client' | 'coach', ShareArtifacts | null>>({
    client: null,
    coach: null,
  });
  const [shareLoading, setShareLoading] = useState(false);

  // Sharing Handlers (kept in UI layer as they interact with user actions/toasts)
  const ensureShareArtifacts = useCallback(async (view: 'client' | 'coach' = 'client') => {
    if (!user || !id || !formData) throw new Error('Missing assessment reference.');
    if (shareCache[view]) return shareCache[view]!;
    const artifacts = await requestShareArtifacts({ 
      assessmentId: id, 
      view,
      coachUid: user.uid,
      formData,
      organizationId: profile?.organizationId,
      profile: profile || null,
    });
    setShareCache((prev) => ({ ...prev, [view]: artifacts }));
    return artifacts;
  }, [id, shareCache, user, formData, profile?.organizationId]);

  const handleEmailLink = useCallback(async () => {
    if (!formData || !id) return;
    const email = (formData.email || '').trim();
    if (!email) {
      toast({ title: UI_TOASTS.ERROR.CLIENT_EMAIL_MISSING, description: UI_TOASTS.ERROR.CLIENT_EMAIL_MISSING_DESC, variant: 'destructive' });
      return;
    }
    try {
      setShareLoading(true);
      await sendReportEmail({ assessmentId: id, view: 'client', to: email, clientName: formData.fullName });
      toast({ title: UI_TOASTS.SUCCESS.REPORT_EMAILED, description: `Sent to ${email}` });
    } catch (e) {
      logger.error('Email share failed', e);
      toast({ title: UI_TOASTS.ERROR.EMAIL_NOT_SENT, description: UI_TOASTS.ERROR.EMAIL_NOT_SENT_DESC, variant: 'destructive' });
    } finally {
      setShareLoading(false);
    }
  }, [formData, id, toast]);

  const handleCopyLink = useCallback(async () => {
    if (!id || !formData || !user) return;
    try {
      setShareLoading(true);
      // Pass a Promise to copyTextToClipboard so Safari preserves the user gesture
      const urlPromise = requestShareArtifacts({
        assessmentId: id, view: 'client', coachUid: user.uid, formData, organizationId: profile?.organizationId, profile: profile || null,
      }).then(a => a.shareUrl);
      await copyTextToClipboard(urlPromise);
      toast({ title: UI_TOASTS.SUCCESS.LINK_COPIED, description: UI_TOASTS.SUCCESS.LINK_COPIED_DESC });
    } catch (e) {
      logger.error('Copy link failed', e);
      toast({ title: UI_TOASTS.ERROR.COPY_FAILED, variant: 'destructive' });
    } finally {
      setShareLoading(false);
    }
  }, [id, formData, user, profile?.organizationId, toast]);

  const handleSystemShare = useCallback(async () => {
    if (!id || !formData || !user || typeof window === 'undefined') return;
    try {
      setShareLoading(true);
      const artifacts = await requestShareArtifacts({
        assessmentId: id, view: 'client', coachUid: user.uid, formData, organizationId: profile?.organizationId, profile: profile || null,
      });
      if (navigator.share) {
        try {
          await navigator.share({
            title: `${formData.fullName || 'Client'}'s Fitness Report`,
            text: 'Here is your interactive fitness assessment results.',
            url: artifacts.shareUrl,
          });
          toast({ title: UI_TOASTS.SUCCESS.SHARED_SUCCESSFULLY, description: UI_TOASTS.SUCCESS.SHARED_DESC });
        } catch (shareError) {
          if ((shareError as Error).name !== 'AbortError') {
            logger.error('Share failed:', shareError);
          }
        }
      } else {
        handleCopyLink();
      }
    } catch (e) {
      logger.error('System share failed', e);
      toast({ title: UI_TOASTS.ERROR.UNABLE_TO_SHARE, description: UI_TOASTS.ERROR.UNABLE_TO_SHARE_DESC, variant: 'destructive' });
    } finally {
      setShareLoading(false);
    }
  }, [id, formData, user, profile?.organizationId, toast, handleCopyLink]);

  const handleWhatsAppShare = useCallback(async () => {
    if (!id || !formData || !user || typeof window === 'undefined') return;
    try {
      setShareLoading(true);
      const artifacts = await requestShareArtifacts({
        assessmentId: id, view: 'client', coachUid: user.uid, formData, organizationId: profile?.organizationId, profile: profile || null,
      });
      const url = `https://wa.me/?text=${encodeURIComponent(artifacts.whatsappText)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      logger.error('WhatsApp share failed', e);
      toast({ title: UI_TOASTS.ERROR.UNABLE_TO_SHARE_WHATSAPP, description: UI_TOASTS.ERROR.UNABLE_TO_SHARE_WHATSAPP_DESC, variant: 'destructive' });
    } finally {
      setShareLoading(false);
    }
  }, [id, formData, user, profile?.organizationId, toast]);

  if (loading) {
    return (
      <AppShell title="Assessment report">
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm font-medium text-slate-400">Loading Assessment...</p>
        </div>
      </AppShell>
    );
  }

  if (!formData || !scores) {
    return (
      <AppShell title="Assessment report">
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-700">
          <p>{error ?? 'Assessment not available.'}</p>
          <Button onClick={() => {
            // CRITICAL: Clear all assessment modes to prevent data bleed
            sessionStorage.removeItem(STORAGE_KEYS.PARTIAL_ASSESSMENT);
            sessionStorage.removeItem(STORAGE_KEYS.EDIT_ASSESSMENT);
            sessionStorage.removeItem(STORAGE_KEYS.PREFILL_CLIENT);
            sessionStorage.removeItem(STORAGE_KEYS.IS_DEMO);
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
            <Button onClick={() => navigate(ROUTES.DASHBOARD)} className="w-full sm:w-auto">Return to Dashboard</Button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!plan) {
    return (
      <AppShell title="Assessment report">
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm font-medium text-slate-400">Generating Report...</p>
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
      navigate('/dashboard');
    }
  };

  const navigateToEdit = () => {
    if (!id || !formData) return;
    sessionStorage.setItem(STORAGE_KEYS.EDIT_ASSESSMENT, JSON.stringify({
      assessmentId: id,
      formData: formData,
      clientName: formData.fullName,
    }));
    sessionStorage.removeItem(STORAGE_KEYS.PARTIAL_ASSESSMENT);
    sessionStorage.removeItem(STORAGE_KEYS.PREFILL_CLIENT);
    sessionStorage.removeItem(STORAGE_KEYS.IS_DEMO);
    navigate('/assessment');
  };

  const navigateToNew = () => {
    sessionStorage.removeItem(STORAGE_KEYS.PARTIAL_ASSESSMENT);
    sessionStorage.removeItem(STORAGE_KEYS.EDIT_ASSESSMENT);
    sessionStorage.removeItem(STORAGE_KEYS.PREFILL_CLIENT);
    sessionStorage.removeItem(STORAGE_KEYS.IS_DEMO);
    navigate('/assessment');
  };

  return (
    <ErrorBoundary>
      <AppShell
        title=""
        variant="full-width"
        actions={
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={navigateToDashboard} className="h-9 w-9 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-xl">
                <DropdownMenuItem onClick={handleCopyLink} disabled={shareLoading}>
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Copy Link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSystemShare}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleEmailLink}>
                  <Mail className="mr-2 h-4 w-4" />
                  Email Report
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleWhatsAppShare}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp
                </DropdownMenuItem>
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
          { label: 'Dashboard', href: ROUTES.DASHBOARD },
          ...(formData.fullName
            ? [{ label: formData.fullName, href: `/client/${encodeURIComponent(formData.fullName)}` }]
            : []),
          { label: 'Report' },
        ]} />
        <div className="flex items-center justify-between">
          <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
            {formData.fullName || 'Assessment'}
          </h1>
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 shrink-0 ml-3">
            <button
              onClick={() => setReportView('client')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                reportView === 'client'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              Client
            </button>
            <button
              onClick={() => setReportView('coach')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                reportView === 'coach'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              Coach
            </button>
          </div>
        </div>
      </div>

      <div
        className="transition-opacity duration-150"
        style={{
          opacity: versionSelector.isTransitioning ? 0 : 1,
          transitionTimingFunction: 'var(--easing-apple, cubic-bezier(0.25, 0.1, 0.25, 1))',
        }}
      >
        {/* Version selector — anchored above the report content */}
        {versionSelector.totalCount >= 1 && (
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-10 pt-2 pb-3 flex justify-center">
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
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-10 pb-8 sm:pb-12">
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm font-medium text-slate-400">Generating Report...</p>
            </div>
          }>
            {reportView === 'client' ? (
              <ClientReport
                scores={versionSelector.selectedScores ?? scores}
                goals={Array.isArray((versionSelector.selectedFormData ?? formData).clientGoals) ? (versionSelector.selectedFormData ?? formData).clientGoals : []}
                formData={versionSelector.selectedFormData ?? formData}
                plan={plan}
                previousScores={versionSelector.previousScores ?? previousScores}
                previousFormData={(versionSelector.previousFormData ?? previousFormData) ?? undefined}
                standalone={false}
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
    </AppShell>
    </ErrorBoundary>
  );
};

export default AssessmentReport;


