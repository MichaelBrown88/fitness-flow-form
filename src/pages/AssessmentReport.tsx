import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAssessmentLogic } from '@/hooks/useAssessmentLogic';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { generateBodyCompInterpretation } from '@/lib/recommendations';
import { requestShareArtifacts, sendReportEmail, type ShareArtifacts } from '@/services/share';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Share2, ChevronDown, Link as LinkIcon, Mail, MessageCircle } from 'lucide-react';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
// Load re-analysis utility
import '@/lib/utils/reanalyzePosture';
// Load restore utility
import '@/lib/utils/restoreAssessment';

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
  
  // Use new Logic Hook
  const { 
    formData, 
    scores, 
    plan, 
    previousScores, 
    loading, 
    error, 
    planError 
  } = useAssessmentLogic(id);

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
      const artifacts = await requestShareArtifacts({
        assessmentId: id, view: 'client', coachUid: user.uid, formData, organizationId: profile?.organizationId, profile: profile || null,
      });
      await navigator.clipboard.writeText(artifacts.shareUrl);
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
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-100">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm font-black uppercase tracking-widest text-slate-400">Loading Assessment...</p>
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
        <div className="flex flex-col items-center justify-center py-20 bg-amber-50 rounded-xl border border-amber-200 p-8 text-center max-w-2xl mx-auto mt-10">
          <div className="bg-amber-100 p-3 rounded-full mb-4">
             <Loader2 className="h-6 w-6 text-amber-600" /> 
           </div> 
          <h3 className="text-lg font-bold text-amber-900 mb-2">Report Generation Issue</h3>
          <p className="text-amber-700 mb-6">We encountered an issue creating the AI Coach Plan. The raw assessment data is safe, but the recommendations could not be generated.</p>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
            <Button onClick={() => navigate(ROUTES.DASHBOARD)}>Return to Dashboard</Button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!plan) {
    return (
      <AppShell title="Assessment report">
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-100">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm font-black uppercase tracking-widest text-slate-400">Generating Report...</p>
        </div>
      </AppShell>
    );
  }

  // Calculate generic body comp for display logic
  const bodyComp = generateBodyCompInterpretation(formData, scores);
  const highlightCategory = sessionStorage.getItem(STORAGE_KEYS.HIGHLIGHT_CATEGORY) || undefined;

  return (
    <ErrorBoundary>
      <AppShell
        title=""
        variant="full-width"
        actions={
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              // Navigate to client dashboard if we have client name, otherwise main dashboard
              if (formData?.fullName) {
                navigate(`/client/${encodeURIComponent(formData.fullName)}`);
              } else {
                navigate('/dashboard');
              }
            }}
          >
            Dashboard
          </Button>
          <Button 
            variant="outline"
            onClick={() => {
              if (!id || !formData) return;
              // Store assessment data for editing
              sessionStorage.setItem(STORAGE_KEYS.EDIT_ASSESSMENT, JSON.stringify({
                assessmentId: id,
                formData: formData,
                clientName: formData.fullName,
              }));
              // Clear other assessment modes
              sessionStorage.removeItem(STORAGE_KEYS.PARTIAL_ASSESSMENT);
              sessionStorage.removeItem(STORAGE_KEYS.PREFILL_CLIENT);
              sessionStorage.removeItem(STORAGE_KEYS.IS_DEMO);
              navigate('/assessment');
            }}
          >
            Edit Assessment
          </Button>
          <Button onClick={() => {
            // Clear any partial assessment data to ensure full assessment
            sessionStorage.removeItem(STORAGE_KEYS.PARTIAL_ASSESSMENT);
            sessionStorage.removeItem(STORAGE_KEYS.EDIT_ASSESSMENT);
            sessionStorage.removeItem(STORAGE_KEYS.PREFILL_CLIENT);
            sessionStorage.removeItem(STORAGE_KEYS.IS_DEMO);
            navigate('/assessment');
          }}>
            New assessment
          </Button>
          <div className="flex -space-x-px">
            <Button
              variant="outline"
              className="rounded-r-none focus:z-10"
              onClick={handleCopyLink}
              disabled={shareLoading}
            >
              {shareLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LinkIcon className="mr-2 h-4 w-4" />
              )}
              Share Live Link
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="rounded-l-none px-2 focus:z-10"
                  disabled={shareLoading}
                >
                  <ChevronDown className="h-4 w-4" />
                  <span className="sr-only">More share options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuItem onClick={handleSystemShare} className="py-3 text-sm font-medium">
                  <Share2 className="mr-2 h-4 w-4" />
                  System Share
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleEmailLink} className="py-3 text-sm font-medium">
                  <Mail className="mr-2 h-4 w-4" />
                  Email Report Link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleWhatsAppShare} className="py-3 text-sm font-medium">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp Message
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      }
    >
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-100">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm font-black uppercase tracking-widest text-slate-400">Generating Report...</p>
        </div>
      }>
        <ClientReport
          scores={scores}
          goals={Array.isArray(formData.clientGoals) ? formData.clientGoals : []}
          formData={formData}
          plan={plan}
          previousScores={previousScores}
        />
      </Suspense>
    </AppShell>
    </ErrorBoundary>
  );
};

export default AssessmentReport;


