import { useCallback, useEffect, useState } from 'react';
import { useFormContext } from '@/contexts/FormContext';
import { Button } from '@/components/ui/button';
import { IntakeReviewSummary } from '@/components/client/IntakeReviewSummary';
import { ConsultationPanel } from '@/components/client/ConsultationPanel';
import { CONSULTATION_COPY } from '@/constants/consultation';
import { hasActiveBaselineSession, hasRemoteIntakeResumeSession } from '@/lib/assessment/baselineSession';
import {
  isConsultationCompleteInSession,
  markConsultationCompleteInSession,
  readStudioSessionStep,
  writeStudioSessionStep,
} from '@/lib/assessment/assessmentSessionStorage';
import { readBaselineIntakeMode } from '@/lib/assessment/baselineSession';
import {
  reconcileStudioSessionStep,
  shouldShowRemoteIntakeReview,
  type StudioSessionStep,
} from '@/lib/assessment/studioSessionSteps';
import { usePhaseFormClientName } from '@/hooks/usePhaseFormClientName';

export interface AssessmentStudioStepsProps {
  onComplete: () => void;
}

export function AssessmentStudioSteps({ onComplete }: AssessmentStudioStepsProps) {
  const { formData, updateFormData } = useFormContext();
  const clientName = usePhaseFormClientName(formData.fullName);

  const remoteIntakeResume = hasRemoteIntakeResumeSession();
  const stepOptions = {
    formData,
    consultationComplete: isConsultationCompleteInSession(),
    remoteIntakeResume,
  };

  const [step, setStep] = useState<StudioSessionStep>(() =>
    reconcileStudioSessionStep(readStudioSessionStep(), stepOptions),
  );

  useEffect(() => {
    if (!hasActiveBaselineSession()) return;
    writeStudioSessionStep(step);
  }, [step]);

  const goToConsultation = useCallback(() => {
    setStep('consultation');
    writeStudioSessionStep('consultation');
  }, []);

  const finishConsultation = useCallback(() => {
    const goals = Array.isArray(formData.clientGoals) ? formData.clientGoals : [];
    if (goals.length === 0) {
      return;
    }
    markConsultationCompleteInSession();
    onComplete();
  }, [formData.clientGoals, onComplete]);

  const showRemoteIntakeReview = shouldShowRemoteIntakeReview(formData, remoteIntakeResume);
  const intakeReviewVariant =
    readBaselineIntakeMode() === 'studio' && !remoteIntakeResume ? 'studio' : 'remote';

  if (step === 'intake-review') {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <IntakeReviewSummary formData={formData} variant={intakeReviewVariant} />
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={goToConsultation}>
            {CONSULTATION_COPY.continueToConsultation}
          </Button>
          {!showRemoteIntakeReview ? (
            <p className="text-xs text-muted-foreground self-center">
              Next: consultation, then client info, PAR-Q, and lifestyle before physical tests.
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (step === 'consultation') {
    const goals = Array.isArray(formData.clientGoals) ? formData.clientGoals : [];
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <ConsultationPanel
          clientName={clientName}
          formData={formData}
          updateFormData={updateFormData}
          showPrepNotes={false}
          footerAction={
            <Button
              type="button"
              size="lg"
              disabled={goals.length === 0}
              onClick={finishConsultation}
            >
              {CONSULTATION_COPY.continueToPhysical}
            </Button>
          }
        />
      </div>
    );
  }

  return null;
}
