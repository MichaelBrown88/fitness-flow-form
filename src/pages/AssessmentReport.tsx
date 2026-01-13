import { useEffect, useMemo, useState, useCallback, useRef, lazy, Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { getCoachAssessment } from '@/services/coachAssessments';
import { publishPublicReport } from '@/services/publicReports';
import type { FormData } from '@/contexts/FormContext';
import { computeScores, buildRoadmap, type ScoreSummary, type RoadmapPhase } from '@/lib/scoring';
import { generateCoachPlan, generateBodyCompInterpretation } from '@/lib/recommendations';
import { requestShareArtifacts, sendReportEmail, type ShareArtifacts } from '@/services/share';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Share2 } from 'lucide-react';
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

const AssessmentReport = () => {
  const { id } = useParams();
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData | null>(null);
  const [scores, setScores] = useState<ScoreSummary | null>(null);
  const [roadmap, setRoadmap] = useState<RoadmapPhase[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const publishedKeyRef = useRef<string | null>(null);
  const [shareCache, setShareCache] = useState<Record<'client' | 'coach', ShareArtifacts | null>>({
    client: null,
    coach: null,
  });
  const [shareLoading, setShareLoading] = useState(false);
  const [plan, setPlan] = useState<import('@/lib/recommendations').CoachPlan | null>(null);
  const [previousScores, setPreviousScores] = useState<ScoreSummary | null>(null);

  const ensureShareArtifacts = useCallback(async (view: 'client' | 'coach' = 'client') => {
    if (!user || !id || !formData) {
      throw new Error('Missing assessment reference.');
    }
    if (shareCache[view]) return shareCache[view]!;
    const artifacts = await requestShareArtifacts({ 
      assessmentId: id, 
      view,
      coachUid: user.uid,
      formData,
      organizationId: profile?.organizationId,
    });
    setShareCache((prev) => ({ ...prev, [view]: artifacts }));
    return artifacts;
  }, [id, shareCache, user, formData, profile?.organizationId]);

  const handleEmailLink = useCallback(async () => {
    if (!formData || !id) return;
    const email = (formData.email || '').trim();
    if (!email) {
      toast({
        title: 'Client email missing',
        description: 'Add an email to the intake before emailing a report.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setShareLoading(true);
      await sendReportEmail({
        assessmentId: id,
        view: 'client', // Default to client view
        to: email,
        clientName: formData.fullName,
      });
      toast({
        title: 'Report emailed',
        description: `Sent to ${email}`,
      });
    } catch (error) {
      console.error('Email share failed', error);
      toast({
        title: 'Email not sent',
        description: 'Check your Firebase functions SendGrid configuration.',
        variant: 'destructive',
      });
    } finally {
      setShareLoading(false);
    }
  }, [formData, id, toast]);

  const handleSystemShare = useCallback(async () => {
    if (!id || !formData || !user || typeof window === 'undefined') return;
    try {
      setShareLoading(true);
      const artifacts = await requestShareArtifacts({
        assessmentId: id,
        view: 'client', // Default to client view
        coachUid: user.uid,
        formData,
        organizationId: profile?.organizationId,
      });
      
      // Use Web Share API for native sharing (AirDrop, etc.)
      // Note: navigator.share works on:
      // - iOS Safari (mobile) - ✅ Full support including AirDrop
      // - Android Chrome - ✅ Full support
      // - Desktop browsers - ⚠️ Limited support (Chrome/Edge on Windows/Mac)
      // - Localhost - ✅ Works for testing (HTTPS or localhost)
      if (navigator.share) {
        try {
          await navigator.share({
            title: `${formData.fullName || 'Client'}'s Fitness Report`,
            text: 'Here is your interactive fitness assessment results.',
            url: artifacts.shareUrl, // iOS treats this as an AirDrop-able link
          });
          toast({
            title: 'Shared successfully',
            description: 'The report link has been shared.',
          });
        } catch (shareError) {
          // User cancelled or share failed
          if ((shareError as Error).name !== 'AbortError') {
            console.error('Share failed:', shareError);
            // Fallback to clipboard
            try {
              await navigator.clipboard.writeText(artifacts.shareUrl);
              toast({
                title: 'Link copied to clipboard',
                description: 'Share was cancelled, but the link is in your clipboard.',
              });
            } catch (clipboardError) {
              // Last resort: show the URL in a toast
              toast({
                title: 'Share URL',
                description: artifacts.shareUrl,
                duration: 10000,
              });
            }
          }
        }
      } else {
        // Fallback for browsers without Web Share API: Copy to clipboard
        try {
          await navigator.clipboard.writeText(artifacts.shareUrl);
          toast({
            title: 'Link copied to clipboard',
            description: 'Paste the link to share it. On mobile devices, you can use AirDrop by sharing this link.',
          });
        } catch (clipboardError) {
          // Last resort: show the URL
          toast({
            title: 'Share URL',
            description: artifacts.shareUrl,
            duration: 10000,
          });
        }
      }
    } catch (error) {
      console.error('System share failed', error);
      toast({
        title: 'Unable to share',
        description: 'Please try copying the link manually.',
        variant: 'destructive',
      });
    } finally {
      setShareLoading(false);
    }
  }, [id, formData, user, profile?.organizationId, toast]);

  const handleWhatsAppShare = useCallback(async () => {
    if (!id || !formData || !user || typeof window === 'undefined') return;
    try {
      setShareLoading(true);
      const artifacts = await requestShareArtifacts({
        assessmentId: id,
        view: 'client', // Default to client view
        coachUid: user.uid,
        formData,
        organizationId: profile?.organizationId,
      });
      const url = `https://wa.me/?text=${encodeURIComponent(artifacts.whatsappText)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('WhatsApp share failed', error);
      toast({
        title: 'Unable to share via WhatsApp',
        description: 'Copy the link instead.',
        variant: 'destructive',
      });
    } finally {
      setShareLoading(false);
    }
  }, [id, formData, user, profile?.organizationId, toast]);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      try {
        setLoadingData(true);
        // Get clientName from query params if available
        const params = new URLSearchParams(window.location.search);
        const clientName = params.get('clientName');
        
        const data = await getCoachAssessment(user.uid, id, clientName || undefined);
        if (!data) {
          setError('Assessment not found for this coach.');
          return;
        }
        let fd = data.formData;
        
        // Check for posture data in formData
        const hasPostureImages = fd.postureImages && typeof fd.postureImages === 'object' && Object.keys(fd.postureImages).length > 0;
        const hasPostureStorage = fd.postureImagesStorage && typeof fd.postureImagesStorage === 'object' && Object.keys(fd.postureImagesStorage).length > 0;
        const hasPostureAnalysis = fd.postureAiResults && typeof fd.postureAiResults === 'object' && Object.keys(fd.postureAiResults).length > 0;
        
        // If posture data is missing, try to fetch from current assessment or live sessions
        if ((!hasPostureImages && !hasPostureStorage) || !hasPostureAnalysis) {
          const clientNameForLookup = clientName || fd.fullName;
          if (clientNameForLookup && user) {
            try {
              // First, try to get from current assessment (might have posture data)
              const { getCurrentAssessment } = await import('@/services/assessmentHistory');
              const current = await getCurrentAssessment(user.uid, clientNameForLookup, profile?.organizationId);
              
              if (current?.formData) {
                const currentPostureImages = current.formData.postureImagesStorage || current.formData.postureImages;
                const currentPostureAnalysis = current.formData.postureAiResults;
                
                // If no images at all, replace with current assessment images
                if ((!hasPostureImages && !hasPostureStorage) && currentPostureImages && typeof currentPostureImages === 'object' && Object.keys(currentPostureImages).length > 0) {
                  fd = {
                    ...fd,
                    postureImagesStorage: currentPostureImages,
                  };
                } else if (currentPostureImages && typeof currentPostureImages === 'object') {
                  // Merge missing images from current assessment (fill in gaps)
                  const existingImages = fd.postureImagesStorage || fd.postureImages || {};
                  const mergedImages = { ...existingImages };
                  let hasNewImages = false;
                  
                  // Check each view and add if missing
                  Object.entries(currentPostureImages).forEach(([view, url]) => {
                    if (!mergedImages[view] && url) {
                      mergedImages[view] = url;
                      hasNewImages = true;
                    }
                  });
                  
                  if (hasNewImages) {
                    fd = {
                      ...fd,
                      postureImagesStorage: mergedImages,
                    };
                  }
                }
                
                if (!hasPostureAnalysis && currentPostureAnalysis && typeof currentPostureAnalysis === 'object' && Object.keys(currentPostureAnalysis).length > 0) {
                  fd = {
                    ...fd,
                    postureAiResults: currentPostureAnalysis,
                  };
                }
              }
              
              // If still missing, try live sessions
              const stillMissingImages = !fd.postureImagesStorage && !fd.postureImages;
              const stillMissingAnalysis = !fd.postureAiResults;
              
              if ((stillMissingImages || stillMissingAnalysis)) {
                const { getClientPostureImages } = await import('@/services/liveSessions');
                const sessions = await getClientPostureImages(clientNameForLookup, profile?.organizationId);
                
                const sessionsWithPosture = Object.values(sessions).filter(s => 
                  (s.images && Object.keys(s.images).length > 0) || (s.analysis && Object.keys(s.analysis).length > 0)
                );
                
                if (sessionsWithPosture.length > 0) {
                  const latestSession = sessionsWithPosture.sort((a, b) => 
                    b.createdAt.toMillis() - a.createdAt.toMillis()
                  )[0];
                  
                  if (stillMissingImages && latestSession.images && Object.keys(latestSession.images).length > 0) {
                    fd = {
                      ...fd,
                      postureImagesStorage: { ...fd.postureImagesStorage, ...latestSession.images },
                    };
                  }
                  
                  if (stillMissingAnalysis && latestSession.analysis && Object.keys(latestSession.analysis).length > 0) {
                    fd = {
                      ...fd,
                      postureAiResults: { ...fd.postureAiResults, ...latestSession.analysis },
                    };
                  }
                }
              }
            } catch (err) {
              console.warn('[AssessmentReport] Failed to fetch posture images:', err);
              // Continue without posture data
            }
          }
        }
        
        setFormData(fd);
        const s = computeScores(fd);
        setScores(s);
        setRoadmap(buildRoadmap(s, fd));
        
        // Try to get previous assessment for comparison
        try {
          const clientNameForLookup = clientName || fd.fullName;
          if (clientNameForLookup && user) {
            const { getSnapshots } = await import('@/services/assessmentHistory');
            const snapshots = await getSnapshots(user.uid, clientNameForLookup, 10, profile?.organizationId);
            
            // Get the most recent snapshot before the current assessment
            // If viewing a specific assessment, find snapshots before that date
            // Otherwise, get the second most recent snapshot (first is likely the current one)
            if (snapshots.length > 1) {
              // Get the second most recent snapshot
              const previousSnapshot = snapshots[1];
              if (previousSnapshot?.formData) {
                const prevScores = computeScores(previousSnapshot.formData);
                setPreviousScores(prevScores);
              }
            }
          }
        } catch (err) {
          console.warn('[AssessmentReport] Failed to load previous assessment for comparison:', err);
          // Continue without previous data
        }
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'Unable to load this assessment.',
        );
      } finally {
        setLoadingData(false);
      }
    })();
  }, [user, id, profile?.organizationId]);

  useEffect(() => {
    setShareCache({ client: null, coach: null });
  }, [id]);

  useEffect(() => {
    if (!user || !id || !formData) return;
    const publishKey = `${user.uid}__${id}`;
    if (publishedKeyRef.current === publishKey) return;
    publishedKeyRef.current = publishKey;
    (async () => {
      try {
        await publishPublicReport({
          coachUid: user.uid,
          assessmentId: id,
          formData,
          organizationId: profile?.organizationId,
        });
      } catch (e) {
        const { logger } = await import('@/lib/utils/logger');
        logger.error('Failed to sync public report', e);
        // Non-blocking error - report still works, just sharing may not work
        // Don't show toast as this is background operation
      }
    })();
  }, [user, id, formData, profile?.organizationId]);

  // Generate coach plan asynchronously (dynamic import happens inside)
  // CRITICAL: This hook MUST be before any early returns to follow Rules of Hooks
  useEffect(() => {
    if (!formData || !scores) return;
    let cancelled = false;
    generateCoachPlan(formData, scores)
      .then(result => {
        if (!cancelled) setPlan(result);
      })
      .catch(async (e) => {
        const { logger } = await import('@/lib/utils/logger');
        logger.error('Error generating coach plan:', e);
        if (!cancelled) setPlan(null);
      });
    return () => { cancelled = true; };
  }, [formData, scores]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">
        Checking coach session…
      </div>
    );
  }

  if (loadingData) {
    return (
      <AppShell title="Assessment report">
        <div className="py-10 text-sm text-slate-600">Loading assessment…</div>
      </AppShell>
    );
  }

  if (!formData || !scores) {
    return (
      <AppShell title="Assessment report">
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-700">
          <p>{error ?? 'Assessment not available.'}</p>
          <Button onClick={() => navigate('/assessment')}>New assessment</Button>
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

  const bodyComp = generateBodyCompInterpretation(formData, scores);
  const highlightCategory = sessionStorage.getItem('highlightCategory') || undefined;

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
              sessionStorage.setItem('editAssessmentData', JSON.stringify({
                assessmentId: id,
                formData: formData,
                clientName: formData.fullName,
              }));
              // Clear other assessment modes
              sessionStorage.removeItem('partialAssessment');
              sessionStorage.removeItem('prefillClientData');
              sessionStorage.removeItem('isDemoAssessment');
              navigate('/assessment');
            }}
          >
            Edit Assessment
          </Button>
          <Button onClick={() => {
            // Clear any partial assessment data to ensure full assessment
            sessionStorage.removeItem('partialAssessment');
            sessionStorage.removeItem('editAssessmentData');
            navigate('/assessment');
          }}>
            New assessment
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={shareLoading}>
                {shareLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
                Share
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuItem onClick={handleSystemShare} className="py-3 text-sm font-medium">
                System Share
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleEmailLink} className="py-3 text-sm font-medium">
                Email PDF Link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleWhatsAppShare} className="py-3 text-sm font-medium">
                WhatsApp Message
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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


