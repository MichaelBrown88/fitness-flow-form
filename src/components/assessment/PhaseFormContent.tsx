import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useFormContext, type FormData } from '@/contexts/FormContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Check,
  Loader2,
  X,
} from 'lucide-react';
import { phaseDefinitions, type PhaseField, type PhaseSection } from '@/lib/phaseConfig';
import { computeScores, buildRoadmap } from '@/lib/scoring';
import { generateCoachPlan, generateBodyCompInterpretation } from '@/lib/recommendations';
import { useAuth } from '@/hooks/useAuth';
import { requestShareArtifacts, sendReportEmail } from '@/services/share';
import { useToast } from '@/components/ui/use-toast';
import { generateInteractiveHtml } from '@/lib/htmlExport';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAssessmentNavigation } from '@/hooks/useAssessmentNavigation';
import { useAssessmentSave } from '@/hooks/useAssessmentSave';
import { useCameraHandler } from '@/hooks/useCameraHandler';
import { useDemoAssessment } from '@/hooks/useDemoAssessment';
import { AssessmentSidebar } from './AssessmentSidebar';
import { AssessmentModals } from './AssessmentModals';
import { SingleFieldFlow } from './SingleFieldFlow';


// Lazy load results component
const AssessmentResults = React.lazy(() => import('./AssessmentResults'));

type IntakeSection = {
  id: string;
  title: string;
  fields: PhaseField[];
};

type SectionType = PhaseSection | IntakeSection;

export const PhaseFormContent = ({ 
  demoTrigger, 
  sidebarOpen, 
  setSidebarOpen 
}: { 
  demoTrigger?: number;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
}) => {
  const { formData, updateFormData } = useFormContext();
  const { user, profile, orgSettings } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Determine client name from storage or form
  const clientNameFromStorage = useMemo(() => {
    try {
      const partialData = sessionStorage.getItem('partialAssessment');
      if (partialData) return JSON.parse(partialData).clientName as string;
      const prefillData = sessionStorage.getItem('prefillClientData');
      if (prefillData) return JSON.parse(prefillData).clientName as string;
    } catch { /* ignore */ }
    return '';
  }, []);

  const activeClientName = clientNameFromStorage || formData.fullName || '';
  
  // Use navigation hook
  const navigation = useAssessmentNavigation({ formData, orgSettings });
  const {
    activePhaseIdx,
    setActivePhaseIdx,
    visiblePhases,
    totalPhases,
    activePhase,
    isResultsPhase,
    isPartialAssessment,
    setIsPartialAssessment,
    partialCategory,
    setPartialCategory,
    isSectionCompleted,
    isPhaseCompleted,
    progressValue,
  } = navigation;


  // Load current assessment data when starting partial assessment
  useEffect(() => {
    const loadCurrentAssessment = async () => {
      if (!user || !activeClientName) return;

      // EXCLUSIVE COACH USE: Never pre-fill previous assessment results for a fresh assessment.
      if (!isPartialAssessment) {
        return;
      }

      try {
        const { getCurrentAssessment } = await import('@/services/assessmentHistory');
        const current = await getCurrentAssessment(user.uid, activeClientName);
        if (current?.formData) {
          
          let fieldsToSkip: string[] = [];
          if (isPartialAssessment && partialCategory) {
            const categoryConfig: Record<string, string[]> = {
              'inbody': ['inbody', 'segmental', 'bmr', 'visceral', 'waistHip'],
              'posture': ['posture', 'ohs', 'hinge', 'lunge', 'mobility'],
              'fitness': ['cardio', 'ymca', 'treadmill'],
              'strength': ['pushup', 'squat', 'plank', 'grip', 'chairStand', 'dynamometer'],
              'lifestyle': ['activityLevel', 'stepsPerDay', 'sedentaryHours', 'workHours', 'sleep', 'stress', 'nutrition', 'hydration', 'caffeine'],
            };
            fieldsToSkip = categoryConfig[partialCategory] || [];
          }

          const updates: Partial<FormData> = {};
          Object.keys(current.formData).forEach((key) => {
            const formKey = key as keyof FormData;
            const value = current.formData[formKey];
            if (value !== undefined && value !== null) {
              const shouldSkip = fieldsToSkip.some(prefix => key.toLowerCase().includes(prefix.toLowerCase()));
              if (!isPartialAssessment || !shouldSkip) {
                (updates as Record<string, unknown>)[formKey] = value;
              }
            }
          });
          updateFormData(updates);
        }
      } catch (e) {
        console.error('Failed to load current assessment:', e);
      }
    };
    loadCurrentAssessment();
  }, [user, activeClientName, isPartialAssessment, partialCategory, updateFormData]);
  
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [recentlyCompletedSections, setRecentlyCompletedSections] = useState<Set<string>>(new Set());
  const [activeFieldIdx, setActiveFieldIdx] = useState(0);
  const [isDemoAssessment, setIsDemoAssessment] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  
  const scores = useMemo(() => {
    try {
      return computeScores(formData);
    } catch (e) {
      console.error('Error computing scores:', e);
      return { overall: 0, categories: [], synthesis: [] };
    }
  }, [formData]);
  
  const saveHook = useAssessmentSave({
    user,
    profile,
    formData,
    scores,
    isResultsPhase,
    isDemoAssessment,
  });
  const {
    savingId,
    shareLoading,
    setShareLoading,
    handleSaveToDashboard,
    ensureShareArtifacts,
    fetchReportPdfBlob,
  } = saveHook;

  const cameraHook = useCameraHandler({
    formData,
    updateFormData,
    activePhaseId: activePhase.id,
    activePhaseIdx,
    visiblePhases,
    isPartialAssessment,
    onPhaseChange: setActivePhaseIdx,
  });
  const {
    showCamera,
    setShowCamera,
    showPostureCompanion,
    setShowPostureCompanion,
    showInBodyCompanion,
    setShowInBodyCompanion,
    ocrReviewData,
    setOcrReviewData,
    isProcessingOcr,
    postureStep,
    setPostureStep,
    handleCapture,
    applyOcrData,
    handlePostureCompanionComplete,
    handleInBodyCompanionComplete,
  } = cameraHook;


  const roadmap = useMemo(() => {
    try {
      return buildRoadmap(scores, formData);
    } catch (e) {
      console.error('Error building roadmap:', e);
      return [];
    }
  }, [scores, formData]);

  const [plan, setPlan] = useState<import('@/lib/recommendations').CoachPlan>({
    keyIssues: [],
    clientScript: { findings: [], whyItMatters: [], actionPlan: [], threeMonthOutlook: [], clientCommitment: [] },
    internalNotes: { doingWell: [], needsAttention: [] },
    programmingStrategies: [],
    movementBlocks: [],
    segmentalGuidance: []
  });

  useEffect(() => {
    let cancelled = false;
    generateCoachPlan(formData, scores)
      .then(result => {
        if (!cancelled) setPlan(result);
      })
      .catch(e => {
        console.error('Error generating coach plan:', e);
        if (!cancelled) {
          setPlan({
            keyIssues: [],
            clientScript: { findings: [], whyItMatters: [], actionPlan: [], threeMonthOutlook: [], clientCommitment: [] },
            internalNotes: { doingWell: [], needsAttention: [] },
            programmingStrategies: [],
            movementBlocks: [],
            segmentalGuidance: []
          });
        }
      });
    return () => { cancelled = true; };
  }, [formData, scores]);

  const bodyCompInterp = useMemo(() => {
    try {
      return generateBodyCompInterpretation(formData);
    } catch (e) {
      console.error('Error generating body comp interpretation:', e);
      return undefined;
    }
  }, [formData]);


  const handlePrint = useCallback(async (view: 'client' | 'coach') => {
    try {
      setShareLoading(true);
      const { blob } = await fetchReportPdfBlob(view);
      const blobUrl = URL.createObjectURL(blob);
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.focus();
          printWindow.print();
        }, { once: true });
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (error) {
      console.error('Print failed', error);
      toast({ title: 'Print failed', variant: 'destructive' });
    } finally {
      setShareLoading(false);
    }
  }, [fetchReportPdfBlob, toast, setShareLoading]);

  const handleShare = useCallback(async (view: 'client' | 'coach') => {
    try {
      setShareLoading(true);
      let shareUrl = window.location.origin;
      if (user && savingId) {
          const artifacts = await ensureShareArtifacts(view);
        shareUrl = `${window.location.origin}/share/${user.uid}/${savingId}`;
      }
      if (navigator.share) {
        await navigator.share({ title: 'Assessment Report', url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({ title: 'Link copied' });
      }
    } catch (error) {
      toast({ title: 'Share failed', variant: 'destructive' });
    } finally {
      setShareLoading(false);
    }
  }, [ensureShareArtifacts, toast, user, savingId, setShareLoading]);

  const handleEmailLink = useCallback(async (view: 'client' | 'coach') => {
    const email = (formData.email || '').trim();
    if (!email) {
      toast({ title: 'Client email missing', variant: 'destructive' });
      return;
    }
    if (!savingId) return;
    try {
      setShareLoading(true);
      await sendReportEmail({ assessmentId: savingId, view, to: email, clientName: formData.fullName });
      toast({ title: 'Report emailed', description: `Sent to ${email}` });
    } catch (error) {
      toast({ title: 'Email failed', variant: 'destructive' });
    } finally {
      setShareLoading(false);
    }
  }, [formData.email, formData.fullName, savingId, toast, setShareLoading]);

  const handleWhatsAppShare = useCallback(async (view: 'client' | 'coach') => {
    try {
      setShareLoading(true);
      const artifacts = await ensureShareArtifacts(view);
      window.open(`https://wa.me/?text=${encodeURIComponent(artifacts.whatsappText)}`, '_blank');
    } catch (error) {
      toast({ title: 'WhatsApp share failed', variant: 'destructive' });
    } finally {
      setShareLoading(false);
    }
  }, [ensureShareArtifacts, toast, setShareLoading]);

  const handleCopyLink = useCallback(async (view: 'client' | 'coach') => {
    try {
      setShareLoading(true);
      // Use the share artifacts to get the proper /r/:token URL
      const artifacts = await ensureShareArtifacts(view);
      await navigator.clipboard.writeText(artifacts.shareUrl);
      toast({ 
        title: 'Link Copied!', 
        description: 'Send this URL to your client. They can view it on any device.' 
      });
    } catch (error) {
      toast({ title: 'Copy failed', variant: 'destructive' });
    } finally {
      setShareLoading(false);
    }
  }, [ensureShareArtifacts, toast, setShareLoading]);

  const handleDownloadPdf = useCallback(async (view: 'client' | 'coach') => {
    const safeName = (formData.fullName || 'report').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    try {
      setShareLoading(true);
      const { blob } = await fetchReportPdfBlob(view);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeName}-${view}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast({ title: 'PDF downloaded' });
    } catch (error) {
      toast({ title: 'Download failed', variant: 'destructive' });
    } finally {
      setShareLoading(false);
    }
  }, [fetchReportPdfBlob, formData.fullName, toast, setShareLoading]);

  const handleDownloadInteractiveHtml = useCallback(async () => {
    try {
      setShareLoading(true);
      const { generateBodyCompInterpretation } = await import('@/lib/recommendations');
      const htmlBlob = await generateInteractiveHtml({
        formData, scores, roadmap, bodyComp: generateBodyCompInterpretation(formData, scores) || undefined, view: 'client',
      });
      const url = URL.createObjectURL(htmlBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(formData.fullName || 'report').toLowerCase()}-interactive.html`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast({ title: 'HTML downloaded' });
    } catch (error) {
      console.error('HTML download failed', error);
      toast({ title: 'Download failed', variant: 'destructive' });
    } finally {
      setShareLoading(false);
    }
  }, [formData, scores, roadmap, toast, setShareLoading]);


  const isIntakeCompleted = useCallback(() => {
    const p0Sections = phaseDefinitions[0]?.sections ?? [];
    const p0Fields = p0Sections.flatMap(section => section.fields ?? []);
    if (p0Fields.length === 0) return false;
    return p0Fields.every(field => {
      const value = formData[field.id];
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null && value !== '';
    });
  }, [formData]);

  const maxUnlockedPhaseIdx = useMemo(() => {
    return totalPhases - 1;
  }, [totalPhases]);

  const anyAssessmentCompleted = useMemo(() => {
    const categories = ['inbodyScore', 'postureHeadOverall', 'pushupsOneMinuteReps', 'cardioTestSelected'];
    return categories.some((field) => {
      const val = formData[field as keyof FormData];
      return val !== '' && val !== undefined && val !== null;
    });
  }, [formData]);

  const allAssessmentsCompleted = useMemo(() => {
    const requiredFields = ['parqQuestionnaire', 'postureHeadOverall', 'pushupsOneMinuteReps', 'plankDurationSeconds', 'cardioTestSelected', 'clientGoals'];
    const basicsCompleted = requiredFields.every((field) => {
      const val = formData[field as keyof FormData] as unknown;
      if (Array.isArray(val)) return val.length > 0;
      return val !== '' && val !== undefined && val !== null;
    });

    if (!basicsCompleted) return false;

    const goals = Array.isArray(formData.clientGoals) ? formData.clientGoals : [];
    if (goals.includes('weight-loss') && !formData.goalLevelWeightLoss) return false;
    if (goals.includes('build-muscle') && !formData.goalLevelMuscle) return false;
    if (goals.includes('build-strength') && !formData.goalLevelStrength) return false;
    if (goals.includes('improve-fitness') && !formData.goalLevelFitness) return false;

    return true;
  }, [formData]);

  const canAutoAdvance = useMemo(() => 
    (!isReviewMode && !allAssessmentsCompleted) && !isPartialAssessment, 
    [isReviewMode, allAssessmentsCompleted, isPartialAssessment]
  );

  const getAllSections = useCallback(() => {
    const sections: SectionType[] = [];
    if (activePhase.sections && activePhase.sections.length > 0) {
      sections.push(...(activePhase.sections as SectionType[]));
    }
    return sections;
  }, [activePhase]);

  useEffect(() => {
    const allSections = getAllSections();
    const newExpandedSections: Record<string, boolean> = {};
    allSections.forEach((section, index) => { newExpandedSections[section.id] = index === 0; });
    setExpandedSections(newExpandedSections);
  }, [activePhaseIdx, getAllSections]);

  useEffect(() => {
    if ((activePhase.sections?.length ?? 0) === 0 && activePhaseIdx < totalPhases - 1) {
      const timeout = setTimeout(() => {
        const nextVisibleIdx = visiblePhases.findIndex((p, i) => i > activePhaseIdx);
        if (nextVisibleIdx !== -1) {
          setActivePhaseIdx(nextVisibleIdx);
        }
      }, 250);
      return () => clearTimeout(timeout);
    }
  }, [activePhase, activePhaseIdx, totalPhases, visiblePhases, setActivePhaseIdx]);

  useEffect(() => {
    if (!canAutoAdvance) return;
    const p0FirstSectionId = visiblePhases[0]?.sections?.[0]?.id ?? 'phase0';
    if (activePhaseIdx === 0 && isIntakeCompleted() && !recentlyCompletedSections.has(p0FirstSectionId)) {
      setRecentlyCompletedSections(prev => new Set(prev).add(p0FirstSectionId));
      if (visiblePhases.length > 1) {
        setTimeout(() => setActivePhaseIdx(1), 1500);
      }
      return;
    }
    const allSections = getAllSections();
    const expandedSectionId = Object.keys(expandedSections).find(id => expandedSections[id]);
    if (!expandedSectionId) return;
    const currentSection = allSections.find(section => section.id === expandedSectionId);
    if (!currentSection) return;
    
    // CRITICAL FIX: Disable auto-advance for sections that use SingleFieldFlow
    const sectionsUsingSingleFieldFlow = [
      'lifestyle-overview',
      'body-comp',
      'fitness-assessment',
      'strength-endurance',
      'mobility',
    ];
    
    if (sectionsUsingSingleFieldFlow.includes(currentSection.id)) {
      return;
    }
    
    const currentSectionCompleted = isSectionCompleted(currentSection);
    const wasRecentlyCompleted = recentlyCompletedSections.has(expandedSectionId);
    if (currentSectionCompleted && !wasRecentlyCompleted) {
      if (currentSection.id === 'goals') return;
      setRecentlyCompletedSections(prev => new Set(prev).add(expandedSectionId));
      const currentIndex = allSections.findIndex(section => section.id === expandedSectionId);
      setTimeout(() => {
        if (currentIndex < allSections.length - 1) {
          const nextSection = allSections[currentIndex + 1];
          setExpandedSections({ [expandedSectionId]: false, [nextSection.id]: true });
        } else if (activePhaseIdx < totalPhases - 1) {
          const nextVisibleIdx = visiblePhases.findIndex((p, i) => i > activePhaseIdx);
          if (nextVisibleIdx !== -1) {
            setActivePhaseIdx(nextVisibleIdx);
          }
        }
      }, 1500);
    }
    if (currentSection.id === 'parq' && formData.parqQuestionnaire === 'completed' && !wasRecentlyCompleted) {
      setRecentlyCompletedSections(prev => new Set(prev).add('parq'));
        const currentIndex = allSections.findIndex(section => section.id === expandedSectionId);
      setTimeout(() => {
        if (currentIndex < allSections.length - 1) {
          const nextSection = allSections[currentIndex + 1];
          setExpandedSections({ [expandedSectionId]: false, [nextSection.id]: true });
        } else if (activePhaseIdx < totalPhases - 1) {
          const nextVisibleIdx = visiblePhases.findIndex((p, i) => i > activePhaseIdx);
          if (nextVisibleIdx !== -1) {
            setActivePhaseIdx(nextVisibleIdx);
          }
        }
      }, 1500);
    }
  }, [formData, expandedSections, activePhaseIdx, totalPhases, getAllSections, isIntakeCompleted, recentlyCompletedSections, isSectionCompleted, canAutoAdvance, visiblePhases, setActivePhaseIdx]);

  useEffect(() => { setActiveFieldIdx(0); }, [activePhaseIdx, expandedSections]);

  const handleViewResults = () => {
    if (activePhaseIdx === totalPhases - 1) return;
    void handleSaveToDashboard();
    setIsReviewMode(false);
    setActivePhaseIdx(totalPhases - 1);
    
    setTimeout(() => { 
      try { 
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
      } catch (_e) { 
        console.error('Scroll failed:', _e); 
      } 
    }, 100);

    toast({
      title: "Generating Reports",
      description: "Analyzing data and building your coaching strategy...",
    });
  };

  const handleStartNewAssessment = () => {
    setIsReviewMode(false);
    window.location.reload();
  };

  const { runDemoSequential } = useDemoAssessment(
    updateFormData,
    setActivePhaseIdx,
    setActiveFieldIdx,
    setExpandedSections,
    setIsDemoAssessment,
    totalPhases,
    isDemoAssessment
  );


  useEffect(() => {
    if (demoTrigger && demoTrigger > 0) {
      if (isDemoAssessment) return;
      void runDemoSequential();
    }
  }, [demoTrigger, isDemoAssessment, runDemoSequential]);

  const toggleSection = (sectionId: string) => {
    setIsReviewMode(true);
    const phaseIdx = phaseDefinitions.findIndex(p => p.sections?.some(s => s.id === sectionId));
    if (phaseIdx !== -1) {
      setActivePhaseIdx(phaseIdx);
    }
    setExpandedSections({ [sectionId]: true });
    setActiveFieldIdx(0);
    setSidebarOpen(false); 
  };

  const renderAllSections = () => {
    if (activePhase?.id === 'P7') return null;
    const allSections = getAllSections();
    if (allSections.length === 0) return null;
    const expandedSectionId = Object.keys(expandedSections).find(id => expandedSections[id]);
    const activeSection = allSections.find(s => s.id === expandedSectionId) || allSections[0];
    if (!activeSection) return null;
    return (
      <SingleFieldFlow 
        key={activeSection.id}
        section={activeSection} 
        activeFieldIdx={activeFieldIdx}
        setActiveFieldIdx={setActiveFieldIdx}
        onShowCamera={(mode) => {
          setShowCamera(mode);
          if (mode === 'posture') setPostureStep(0);
        }}
        onShowPostureCompanion={() => setShowPostureCompanion(true)}
        onShowInBodyCompanion={() => setShowInBodyCompanion(true)}
        onComplete={() => {
          const currentIndex = allSections.findIndex(s => s.id === activeSection.id);
          if (currentIndex < allSections.length - 1) {
            setExpandedSections({ [allSections[currentIndex + 1].id]: true });
          } else if (activePhaseIdx < totalPhases - 1) {
            if (isPartialAssessment) {
              handleViewResults();
            } else {
              const nextVisibleIdx = visiblePhases.findIndex((p, i) => i > activePhaseIdx);
              if (nextVisibleIdx !== -1) {
                setActivePhaseIdx(nextVisibleIdx);
              }
            }
          }
        }}
      />
    );
  };

  if (totalPhases === 0) return <div className="text-center py-20">No phases configured.</div>;

    return (

    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-64px)] relative">
      {!isPartialAssessment && (
        <AssessmentSidebar 
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          progressValue={progressValue}
          visiblePhases={visiblePhases}
          activePhaseIdx={activePhaseIdx}
          setActivePhaseIdx={setActivePhaseIdx}
          isPhaseCompleted={isPhaseCompleted}
          maxUnlockedPhaseIdx={maxUnlockedPhaseIdx}
          expandedSections={expandedSections}
          setExpandedSections={setExpandedSections}
          isSectionCompleted={isSectionCompleted}
          toggleSection={toggleSection}
          setIsReviewMode={setIsReviewMode}
          setActiveFieldIdx={setActiveFieldIdx}
          isMobile={isMobile}
          // @ts-expect-error - PhaseSection type mismatch with inferred type
          visiblePhases={visiblePhases}

        />
      )}

      <main className={`flex-1 bg-slate-50/50 p-6 lg:p-10 overflow-y-auto ${isPartialAssessment ? 'w-full' : ''}`}>
        <div className={`mx-auto ${activePhase?.id === 'P7' ? 'max-w-none' : 'max-w-3xl'} space-y-8`}>
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-primary mb-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{activePhase.id}</span>
              <div className="h-px w-8 bg-brand-light"></div>
              {isPartialAssessment && <span className="text-[10px] font-black uppercase tracking-widest bg-brand-light px-2 py-0.5 rounded text-primary">Quick Update: {partialCategory}</span>}
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">{activePhase.title}</h2>
            <p className="text-slate-500 text-lg leading-relaxed max-w-2xl">{activePhase.summary}</p>
          </section>

          <section className="space-y-6">
            {renderAllSections()}
            
            {activePhaseIdx >= 1 && activePhaseIdx < totalPhases - 1 && allAssessmentsCompleted && (
              <div className="flex items-center justify-center border-t border-slate-200 pt-8">
                <Button onClick={handleViewResults} className="h-14 px-10 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-xl transition-all hover:scale-[1.05]">
                  {isPartialAssessment ? '📊 Update Live Report' : '📊 Generate Full Report'}
                </Button>
              </div>
            )}

            {isPartialAssessment && activePhaseIdx >= 1 && activePhaseIdx < totalPhases - 1 && !allAssessmentsCompleted && anyAssessmentCompleted && (
              <div className="flex items-center justify-center border-t border-slate-200 pt-8">
                <Button variant="outline" onClick={handleViewResults} className="h-14 px-10 rounded-2xl border-primary/20 text-primary font-bold hover:bg-brand-light transition-all">
                  📊 Update Live Report
                </Button>
              </div>
            )}

            {activePhase?.id === 'P7' && (
              <React.Suspense fallback={
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-sm font-black uppercase tracking-widest text-slate-400">Finalizing Report...</p>
                  </div>
              }>
                <AssessmentResults
                  formData={formData}
                      scores={scores} 
                      roadmap={roadmap} 
                      plan={plan} 
                  bodyCompInterp={bodyCompInterp}
                  savingId={savingId}
                  onStartNew={handleStartNewAssessment}
                  onShare={(view) => {
                    handleShare(view);
                  }}
                  onDownloadPdf={(view) => {
                    handleDownloadPdf(view);
                  }}
                  onDownloadHtml={handleDownloadInteractiveHtml}
                  onPrint={(view) => {
                    handlePrint(view);
                  }}
                  onCopyLink={(view) => {
                    handleCopyLink(view);
                  }}
                  onEmailLink={(view) => {
                    handleEmailLink(view);
                  }}
                  onWhatsAppShare={(view) => {
                    handleWhatsAppShare(view);
                  }}
                  shareLoading={shareLoading}
                    />
              </React.Suspense>
            )}
          </section>
          <footer className="pt-12 pb-8 text-center text-[10px] font-bold uppercase tracking-widest text-slate-300">
            {orgSettings?.name || 'FitnessFlow'} Professional v2.1 • Confidential Client Data
          </footer>
        </div>
      </main>

      {/* Assessment Modals */}
      <AssessmentModals 
        showCamera={showCamera}
        setShowCamera={setShowCamera}
        handleCapture={handleCapture}
        showPostureCompanion={showPostureCompanion}
        setShowPostureCompanion={setShowPostureCompanion}
        handlePostureCompanionComplete={handlePostureCompanionComplete}
        showInBodyCompanion={showInBodyCompanion}
        setShowInBodyCompanion={setShowInBodyCompanion}
        handleInBodyCompanionComplete={handleInBodyCompanionComplete}
        postureStep={postureStep}
        setPostureStep={setPostureStep}
        isProcessingOcr={isProcessingOcr}
        ocrReviewData={ocrReviewData}
        setOcrReviewData={setOcrReviewData}
        applyOcrData={applyOcrData}
      />

    </div>
  );
};
