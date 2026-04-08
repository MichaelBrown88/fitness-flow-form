import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormContext } from '@/contexts/FormContext';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAssessmentFlow } from '@/hooks/useAssessmentFlow';
import { useAssessmentSave } from '@/hooks/useAssessmentSave';
import { useCameraHandler } from '@/hooks/useCameraHandler';
import { useDemoAssessment } from '@/hooks/useDemoAssessment';
import { useAssessmentShareHandlers } from '@/hooks/useAssessmentShareHandlers';
import { useAssessmentDraftOrchestration } from '@/hooks/useAssessmentDraftOrchestration';
import { usePartialAssessmentPrefetch } from '@/hooks/usePartialAssessmentPrefetch';
import { usePhaseFormClientName } from '@/hooks/usePhaseFormClientName';
import { useCoachPlanForResults } from '@/hooks/useCoachPlanForResults';
import { usePhaseFormSubmitLabels } from '@/hooks/usePhaseFormSubmitLabels';
import { AssessmentSidebar } from '@/components/assessment/AssessmentSidebar';
import { AssessmentReviewCheckpoint } from '@/components/assessment/AssessmentReviewCheckpoint';
import { AssessmentModals } from '@/components/assessment/AssessmentModals';
import { PhaseFormShell } from '@/components/assessment/phaseForm/PhaseFormShell';
import { PhaseFormPhaseHeader } from '@/components/assessment/phaseForm/PhaseFormPhaseHeader';
import { PhaseFormViewResultsCta } from '@/components/assessment/phaseForm/PhaseFormViewResultsCta';
import { PhaseFormResultsPanel } from '@/components/assessment/phaseForm/PhaseFormResultsPanel';
import { PhaseFormConfidentialFooter } from '@/components/assessment/phaseForm/PhaseFormConfidentialFooter';
import { PhaseFormSingleFieldFlow } from '@/components/assessment/phaseForm/PhaseFormSingleFieldFlow';
import { computeScores, buildRoadmap } from '@/lib/scoring';
import type { ScoreSummary } from '@/lib/scoring/types';
import { logger } from '@/lib/utils/logger';
import { UI_DRAFT } from '@/constants/ui';
import { ROUTES } from '@/constants/routes';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { PHASE_FORM_COPY } from '@/constants/phaseFormCopy';
import { ASSESSMENT_SETUP_COPY } from '@/constants/assessmentSetupCopy';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const FALLBACK_SCORE_SUMMARY: ScoreSummary = {
  overall: 0,
  fullProfileScore: null,
  categories: [],
  synthesis: [],
};

export const PhaseFormContent = ({
  demoTrigger,
  sidebarOpen,
  setSidebarOpen,
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

  const activeClientName = usePhaseFormClientName(formData.fullName);

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

  useAssessmentDraftOrchestration({
    user,
    organizationId: profile?.organizationId,
    formData,
    formDataFullName: formData.fullName,
    activeClientName,
    isPartialAssessment,
    isResultsPhase,
    activePhaseIdx,
    updateFormData,
    setActivePhaseIdx,
  });

  usePartialAssessmentPrefetch({
    user,
    organizationId: profile?.organizationId,
    activeClientName,
    isPartialAssessment,
    partialCategory,
    updateFormData,
  });

  const handleSaveAndExit = useCallback(() => {
    toast({
      title: UI_DRAFT.DRAFT_SAVED,
      description: PHASE_FORM_COPY.SAVE_AND_EXIT_TOAST_DESCRIPTION,
    });
    navigate(ROUTES.DASHBOARD);
  }, [navigate, toast]);

  const [isDemoAssessment, setIsDemoAssessment] = useState(false);
  const [reviewCheckpointOpen, setReviewCheckpointOpen] = useState(false);

  const toggleSection = (sectionId: string) => {
    flowToggleSection(sectionId);
    setSidebarOpen(false);
  };

  const [scoreError, setScoreError] = useState(false);
  const scores = useMemo((): ScoreSummary => {
    try {
      const result = computeScores(formData);
      setScoreError(false);
      return result;
    } catch (e) {
      logger.error('Error computing scores:', e);
      setScoreError(true);
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
    saving,
    savingId,
    isEditMode,
    setIsEditMode,
    shareLoading,
    setShareLoading,
    handleSaveToDashboard,
    ensureShareArtifacts,
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
    handleCapture,
    applyOcrData,
    handlePostureCompanionComplete,
    handleBodyCompCompanionComplete,
  } = cameraHook;

  const roadmap = useMemo(() => {
    try {
      return buildRoadmap(scores, formData);
    } catch (e) {
      logger.error('Error building assessment phase timeline (scoring):', e);
      return [];
    }
  }, [scores, formData]);

  const plan = useCoachPlanForResults(formData, scores);

  const { handleShare, handleEmailLink, handleWhatsAppShare, handleCopyLink } = useAssessmentShareHandlers({
    formData,
    user,
    savingId,
    ensureShareArtifacts,
    setShareLoading,
    toast,
  });

  const { submitButtonDisabled, submitButtonHint, submitButtonLabel, isCompleteForReport } =
    usePhaseFormSubmitLabels(formData, isPartialAssessment);

  const openPreResultsReview = useCallback(() => {
    setReviewCheckpointOpen(true);
  }, []);

  // Skip empty phases (e.g. filtered-out equipment phases or org-filtered lifestyle phases)
  useEffect(() => {
    if ((filteredActivePhase.sections?.length ?? 0) === 0 && activePhaseIdx < totalPhases - 1) {
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
      } catch (e) {
        logger.error('Scroll failed:', e);
      }
    }, 100);

    toast({
      title: PHASE_FORM_COPY.GENERATING_REPORTS_TITLE,
      description: PHASE_FORM_COPY.GENERATING_REPORTS_DESCRIPTION,
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const { runDemoSequential } = useDemoAssessment(
    updateFormData,
    setActivePhaseIdx,
    setActiveFieldIdx,
    setExpandedSections,
    setIsDemoAssessment,
    totalPhases,
    isDemoAssessment,
  );

  useEffect(() => {
    if (demoTrigger && demoTrigger > 0) {
      if (isDemoAssessment) return;
      void runDemoSequential();
    }
  }, [demoTrigger, isDemoAssessment, runDemoSequential]);

  // Filter optional lifestyle fields based on org config.
  // Fields with no orgConfigKey are always shown. Fields with orgConfigKey are shown
  // unless the org has explicitly set that key to false. Undefined = enabled (backward compat).
  const filteredActivePhase = useMemo(() => {
    const optionalFields = orgSettings?.lifestyleOptionalFields;
    if (!optionalFields || activePhase.id !== 'P1') return activePhase;
    return {
      ...activePhase,
      sections: activePhase.sections?.map((section) => ({
        ...section,
        fields: section.fields.filter((field) => {
          if (!field.orgConfigKey) return true;
          const enabled = optionalFields[field.orgConfigKey as keyof typeof optionalFields];
          return enabled !== false;
        }),
      })),
    };
  }, [activePhase, orgSettings?.lifestyleOptionalFields]);

  if (totalPhases === 0) {
    return <div className="py-20 text-center">{PHASE_FORM_COPY.NO_PHASES_CONFIGURED}</div>;
  }

  const sidebar =
    !isPartialAssessment ? (
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
    ) : null;

  const main = (
    <main
      className={`flex-1 overflow-y-auto bg-muted/50 p-6 pb-24 lg:p-10 lg:pb-10 ${isPartialAssessment ? 'w-full' : ''}`}
    >
      <div className={`mx-auto space-y-8 ${activePhase?.id === 'P7' ? 'max-w-none' : 'max-w-3xl'}`}>
        {isReviewMode && !isResultsPhase && !isPartialAssessment ? (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Badge variant="secondary">{ASSESSMENT_SETUP_COPY.JUMP_REVIEW_TITLE}</Badge>
                <p className="mt-1 text-sm text-muted-foreground">{ASSESSMENT_SETUP_COPY.JUMP_REVIEW_DESC}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <PhaseFormPhaseHeader
          isPartialAssessment={isPartialAssessment}
          partialCategory={partialCategory}
          showSaveAndExit={activePhase.id !== 'P7'}
          onSaveAndExit={handleSaveAndExit}
          phaseTitle={activePhase.title}
          phaseSummary={activePhase.summary}
          activePhaseId={activePhase.id}
          coachGuidanceOn={coachGuidanceOn}
        />

        <section className="space-y-6">
          <PhaseFormSingleFieldFlow
            activePhase={filteredActivePhase}
            activePhaseIdx={activePhaseIdx}
            totalPhases={totalPhases}
            visiblePhases={visiblePhases}
            expandedSections={expandedSections}
            activeFieldIdx={activeFieldIdx}
            setActiveFieldIdx={setActiveFieldIdx}
            setExpandedSections={setExpandedSections}
            setActivePhaseIdx={setActivePhaseIdx}
            isPartialAssessment={isPartialAssessment}
            onShowCamera={(mode) => setShowCamera(mode)}
            onShowPostureCompanion={() => setShowPostureCompanion(true)}
            onShowBodyCompCompanion={() => setShowBodyCompCompanion(true)}
            onRequestPreResultsReview={openPreResultsReview}
          />

          <PhaseFormViewResultsCta
            visible={activePhaseIdx >= 1 && activePhaseIdx < totalPhases - 1}
            buttonText={submitButtonHint}
            onClick={openPreResultsReview}
          />

          {activePhase?.id === 'P7' && scoreError ? (
            <div className="mx-auto max-w-lg rounded-xl border border-rose-200 bg-rose-50 p-6 text-center space-y-3">
              <p className="text-sm font-semibold text-rose-800">Couldn't generate results</p>
              <p className="text-xs text-rose-700">Something went wrong while calculating the scores. Your data is saved — go back and check for any incomplete required fields, then try again.</p>
              <button
                type="button"
                onClick={() => { setScoreError(false); }}
                className="text-xs font-semibold text-rose-700 underline hover:text-rose-900"
              >
                Try again
              </button>
            </div>
          ) : activePhase?.id === 'P7' ? (
            <PhaseFormResultsPanel
              formData={formData}
              scores={scores}
              roadmap={roadmap}
              plan={plan}
              saving={saving}
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
          ) : null}
        </section>

        <PhaseFormConfidentialFooter orgDisplayName={orgSettings?.name} />
      </div>
    </main>
  );

  return (
    <>
      <PhaseFormShell sidebar={sidebar} main={main} />
      <AssessmentReviewCheckpoint
        open={reviewCheckpointOpen}
        onOpenChange={setReviewCheckpointOpen}
        clientDisplayName={activeClientName || formData.fullName || '—'}
        progressPercent={progressValue}
        isCompleteForReport={isCompleteForReport}
        primaryActionLabel={submitButtonDisabled ? submitButtonHint : submitButtonLabel}
        primaryDisabled={submitButtonDisabled}
        onGenerate={handleViewResults}
        onKeepEditing={() => setReviewCheckpointOpen(false)}
        onSaveAndExit={handleSaveAndExit}
      />
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
        isProcessingOcr={isProcessingOcr}
        processingMode={processingMode}
        postureRetakeWarning={postureRetakeWarning}
        clearPostureRetakeWarning={clearPostureRetakeWarning}
        ocrReviewData={ocrReviewData}
        setOcrReviewData={setOcrReviewData}
        applyOcrData={applyOcrData}
      />
    </>
  );
};
