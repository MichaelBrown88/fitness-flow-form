import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormContext, type FormData } from '@/contexts/FormContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Check,
  Loader2,
  X,
  ArrowLeft,
} from 'lucide-react';
import { phaseDefinitions, type PhaseField, type PhaseSection } from '@/lib/phaseConfig';
import { computeScores, buildRoadmap } from '@/lib/scoring';
import type { ScoreSummary } from '@/lib/scoring/types';
import { generateCoachPlan, generateBodyCompInterpretation } from '@/lib/recommendations';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAssessmentFlow } from '@/hooks/useAssessmentFlow';
import { useAssessmentSave } from '@/hooks/useAssessmentSave';
import { useCameraHandler } from '@/hooks/useCameraHandler';
import { useDemoAssessment } from '@/hooks/useDemoAssessment';
import { useAssessmentShareHandlers } from '@/hooks/useAssessmentShareHandlers';
import { useAssessmentDraft, getDraft, clearDraft } from '@/hooks/useAssessmentDraft';
import { logger } from '@/lib/utils/logger';
import { UI_DRAFT } from '@/constants/ui';
import { ROUTES } from '@/constants/routes';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { ASSESSMENT_COPY } from '@/constants/assessmentCopy';
import { ASSESSMENT_SUBMIT_LABELS } from '@/constants/assessment';
import { isAssessmentComplete, type PartialCategory } from '@/lib/assessmentCompleteness';
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

const FALLBACK_SCORE_SUMMARY: ScoreSummary = {
  overall: 0,
  fullProfileScore: null,
  categories: [],
  synthesis: [],
};

export const PhaseFormContent = ({ 
  demoTrigger, 
  sidebarOpen, 
  setSidebarOpen 
}: { 
  demoTrigger?: number;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
}) => {
  const { formData, updateFormData, resetForm } = useFormContext();
  const { user, profile, orgSettings } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

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

  const [coachGuidanceOn, setCoachGuidanceOn] = useState(true);
  useEffect(() => {
    try {
      setCoachGuidanceOn(localStorage.getItem(STORAGE_KEYS.COACH_GUIDANCE_IN_ASSESSMENT) !== '0');
    } catch {
      setCoachGuidanceOn(true);
    }
  }, []);
  
  const flow = useAssessmentFlow({ formData, orgSettings });
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
    expandedSections,
    setExpandedSections,
    activeFieldIdx,
    setActiveFieldIdx,
    isReviewMode,
    setIsReviewMode,
    maxUnlockedPhaseIdx,
    toggleSection: flowToggleSection,
  } = flow;


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
        const current = await getCurrentAssessment(user.uid, activeClientName, profile?.organizationId);
        if (current?.formData) {
          
          let fieldsToSkip: string[] = [];
          if (isPartialAssessment && partialCategory) {
            const categoryConfig: Record<string, string[]> = {
              'bodycomp': ['inbody', 'segmental', 'bmr', 'visceral', 'waistHip'],
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
        logger.error('Failed to load current assessment:', e);
      }
    };
    loadCurrentAssessment();
  }, [user, activeClientName, isPartialAssessment, partialCategory, profile?.organizationId, updateFormData]);
  
  // ── Draft auto-save + recovery ──────────────────────────────────
  const [draftBanner, setDraftBanner] = useState<{ clientName: string; timestamp: number } | null>(null);

  // On mount: check for an existing draft (only if NOT in edit/prefill mode)
  useEffect(() => {
    const hasEdit = !!sessionStorage.getItem('editAssessmentData');
    const hasPrefill = !!sessionStorage.getItem('prefillClientData');
    if (hasEdit || hasPrefill) return;

    const draft = getDraft();
    if (draft && draft.clientName) {
      setDraftBanner({ clientName: draft.clientName, timestamp: draft.timestamp });
    }
  }, []);

  // Activate the debounced auto-save (writes formData → sessionStorage)
  useAssessmentDraft(formData, isResultsPhase);

  const handleResumeDraft = useCallback(() => {
    const draft = getDraft();
    if (draft?.formData) {
      updateFormData(draft.formData as Partial<FormData>);
    }
    setDraftBanner(null);
  }, [updateFormData]);

  const handleDiscardDraft = useCallback(() => {
    clearDraft();
    setDraftBanner(null);
  }, []);

  const handleSaveAndExit = useCallback(() => {
    // Draft is already auto-saved by the hook, just navigate away
    toast({ title: UI_DRAFT.DRAFT_SAVED, description: 'You can resume this assessment any time.' });
    navigate(ROUTES.DASHBOARD);
  }, [navigate, toast]);

  const [recentlyCompletedSections, setRecentlyCompletedSections] = useState<Set<string>>(new Set());
  const [isDemoAssessment, setIsDemoAssessment] = useState(false);

  const toggleSection = (sectionId: string) => {
    flowToggleSection(sectionId);
    setSidebarOpen(false);
  };
  
  const scores = useMemo((): ScoreSummary => {
    try {
      return computeScores(formData);
    } catch (e) {
      logger.error('Error computing scores:', e);
      return FALLBACK_SCORE_SUMMARY;
    }
  }, [formData]);
  
  const saveHook = useAssessmentSave({
    user,
    profile,
    formData,
    scores,
    isResultsPhase,
    isDemoAssessment,
    orgSettings,
  });
  const {
    savingId,
    isEditMode,
    setIsEditMode,
    shareLoading,
    setShareLoading,
    handleSaveToDashboard,
    ensureShareArtifacts,
    highlightCategory,
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
    showBodyCompCompanion,
    setShowBodyCompCompanion,
    ocrReviewData,
    setOcrReviewData,
    isProcessingOcr,
    processingMode,
    postureRetakeWarning,
    clearPostureRetakeWarning,
    postureStep,
    setPostureStep,
    handleCapture,
    applyOcrData,
    handlePostureCompanionComplete,
    handleBodyCompCompanionComplete,
  } = cameraHook;


  const roadmap = useMemo(() => {
    try {
      return buildRoadmap(scores, formData);
    } catch (e) {
      logger.error('Error building roadmap:', e);
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
        logger.error('Error generating coach plan:', e);
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
      logger.error('Error generating body comp interpretation:', e);
      return undefined;
    }
  }, [formData]);


  const {
    handleShare,
    handleEmailLink,
    handleWhatsAppShare,
    handleCopyLink,
  } = useAssessmentShareHandlers({
    formData,
    user,
    savingId,
    ensureShareArtifacts,
    setShareLoading,
    toast,
  });

  const anyAssessmentCompleted = useMemo(() => {
    const categories = ['inbodyScore', 'postureHeadOverall', 'pushupsOneMinuteReps', 'cardioTestSelected'];
    return categories.some((field) => {
      const val = formData[field as keyof FormData];
      return val !== '' && val !== undefined && val !== null;
    });
  }, [formData]);

  const assessmentMode = isPartialAssessment ? 'partial' : 'full';
  const partialCategoryFromStorage = useMemo((): PartialCategory | undefined => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEYS.PARTIAL_ASSESSMENT);
      if (!raw) return undefined;
      const { category } = JSON.parse(raw);
      return category;
    } catch {
      return undefined;
    }
  }, []);
  const isComplete = isAssessmentComplete(formData, assessmentMode, partialCategoryFromStorage);
  const hasExistingContext = isPartialAssessment || !!sessionStorage.getItem(STORAGE_KEYS.EDIT_ASSESSMENT);
  const submitButtonLabel = !isComplete
    ? ASSESSMENT_SUBMIT_LABELS.SAVE_FOR_LATER
    : hasExistingContext
      ? ASSESSMENT_SUBMIT_LABELS.UPDATE_REPORT
      : ASSESSMENT_SUBMIT_LABELS.GENERATE_REPORT;
  const submitButtonDisabled = !anyAssessmentCompleted;
  const submitButtonHint = !anyAssessmentCompleted ? ASSESSMENT_SUBMIT_LABELS.COMPLETE_SECTION_HINT : submitButtonLabel;

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
  }, [activePhaseIdx, getAllSections, setExpandedSections]);

  // Skip empty phases (e.g. filtered-out equipment phases)
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

  const handleViewResults = () => {
    if (activePhaseIdx === totalPhases - 1) return;
    void handleSaveToDashboard();
    setIsReviewMode(false);
    setActivePhaseIdx(totalPhases - 1);
    
    setTimeout(() => { 
      try { 
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
      } catch (_e) { 
        logger.error('Scroll failed:', _e); 
      } 
    }, 100);

    toast({
      title: "Generating Reports",
      description: "Analyzing data and building your coaching strategy...",
    });
  };

  const handleStartNewAssessment = () => {
    resetForm();
    setIsReviewMode(false);
    setIsPartialAssessment(false);
    setPartialCategory(null);
    setActivePhaseIdx(0);
    setActiveFieldIdx(0);
    setExpandedSections({});
    setRecentlyCompletedSections(new Set());
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const renderAllSections = () => {
    if (activePhase?.id === 'P7') return null;
    const allSections = getAllSections();
    if (allSections.length === 0) return null;
    const expandedSectionId = Object.keys(expandedSections).find(id => expandedSections[id]);
    const activeSection = allSections.find(s => s.id === expandedSectionId) || allSections[0];
    if (!activeSection) return null;
    // Handle going to previous section/phase
    const handleGoToPreviousSection = () => {
      const currentIndex = allSections.findIndex(s => s.id === activeSection.id);
      if (currentIndex > 0) {
        // Go to last field of previous section in same phase
        const prevSection = allSections[currentIndex - 1];
        setExpandedSections({ [prevSection.id]: true });
        // Set to last field of previous section
        const prevSectionFields = (prevSection.fields || []).length;
        setActiveFieldIdx(Math.max(0, prevSectionFields - 1));
      } else if (activePhaseIdx > 0) {
        // Go to last field of last section in previous phase
        const prevPhaseIdx = visiblePhases.findIndex((_, i) => i === activePhaseIdx) - 1;
        if (prevPhaseIdx >= 0) {
          const prevPhase = visiblePhases[prevPhaseIdx];
          const prevPhaseSections = prevPhase.sections || [];
          if (prevPhaseSections.length > 0) {
            const lastSection = prevPhaseSections[prevPhaseSections.length - 1];
            setActivePhaseIdx(prevPhaseIdx);
            setExpandedSections({ [lastSection.id]: true });
            const lastSectionFields = (lastSection.fields || []).length;
            setActiveFieldIdx(Math.max(0, lastSectionFields - 1));
          } else {
            setActivePhaseIdx(prevPhaseIdx);
          }
        }
      }
    };

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
        onShowBodyCompCompanion={() => setShowBodyCompCompanion(true)}
        onGoToPreviousSection={handleGoToPreviousSection}
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
        />
      )}

      <main className={`flex-1 bg-muted/50 p-6 lg:p-10 pb-24 lg:pb-10 overflow-y-auto ${isPartialAssessment ? 'w-full' : ''}`}>
        <div className={`mx-auto ${activePhase?.id === 'P7' ? 'max-w-none' : 'max-w-3xl'} space-y-8`}>

          {/* Draft recovery banner */}
          {coachGuidanceOn && !isPartialAssessment && activePhase.id !== 'P7' && (
            <div className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              {ASSESSMENT_COPY.COACH_GUIDANCE_TOGGLE}
            </div>
          )}

          {draftBanner && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 rounded-xl border border-border bg-background p-3 sm:p-4 shadow-sm animate-fade-in-up">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{UI_DRAFT.TITLE}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {draftBanner.clientName} &middot; {new Date(draftBanner.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={handleDiscardDraft} className="text-xs font-bold">
                  {UI_DRAFT.START_FRESH}
                </Button>
                <Button size="sm" onClick={handleResumeDraft} className="text-xs font-bold">
                  {UI_DRAFT.RESUME}
                </Button>
              </div>
            </div>
          )}

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              {isPartialAssessment ? (
                <span className="text-[10px] font-black uppercase tracking-[0.15em] bg-brand-light px-2 py-0.5 rounded text-on-brand-tint">Quick Update: {partialCategory}</span>
              ) : <span />}
              {activePhase.id !== 'P7' && (
                <button
                  onClick={handleSaveAndExit}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground-secondary transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Save &amp; Exit
                </button>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-foreground">{activePhase.title}</h2>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl">{activePhase.summary}</p>
          </section>

          <section className="space-y-6">
            {renderAllSections()}
            
            {activePhaseIdx >= 1 && activePhaseIdx < totalPhases - 1 && (
              <div className="flex items-center justify-center border-t border-border pt-8">
                <Button
                  onClick={handleViewResults}
                  disabled={submitButtonDisabled}
                  className="h-14 px-10 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-lg transition-all hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100 disabled:shadow-none"
                >
                  {submitButtonHint}
                </Button>
              </div>
            )}

            {activePhase?.id === 'P7' && (
              <React.Suspense fallback={
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-sm font-medium text-muted-foreground">Finalizing Report...</p>
                  </div>
              }>
                <AssessmentResults
                  formData={formData}
                  scores={scores}
                  roadmap={roadmap}
                  plan={plan}
                  savingId={savingId}
                  isEditMode={isEditMode}
                  onClearEditMode={() => setIsEditMode(false)}
                  onStartNew={handleStartNewAssessment}
                  onShare={(view) => handleShare(view)}
                  onCopyLink={(view) => handleCopyLink(view)}
                  onEmailLink={(view) => handleEmailLink(view)}
                  onWhatsAppShare={(view) => handleWhatsAppShare(view)}
                  shareLoading={shareLoading}
                />
              </React.Suspense>
            )}
          </section>
          <footer className="pt-12 pb-8 text-center text-[10px] font-black uppercase tracking-[0.15em] text-foreground-tertiary">
            {orgSettings?.name || 'One Assess'} Professional v2.1 • Confidential Client Data
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
        showBodyCompCompanion={showBodyCompCompanion}
        setShowBodyCompCompanion={setShowBodyCompCompanion}
        handleBodyCompCompanionComplete={handleBodyCompCompanionComplete}
        postureStep={postureStep}
        setPostureStep={setPostureStep}
        isProcessingOcr={isProcessingOcr}
        processingMode={processingMode}
        postureRetakeWarning={postureRetakeWarning}
        clearPostureRetakeWarning={clearPostureRetakeWarning}
        ocrReviewData={ocrReviewData}
        setOcrReviewData={setOcrReviewData}
        applyOcrData={applyOcrData}
      />

    </div>
  );
};
