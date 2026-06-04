import { useEffect } from 'react';
import { useFormContext } from '@/contexts/FormContext';
import { Button } from '@/components/ui/button';
import { IntakeReviewSummary } from '@/components/client/IntakeReviewSummary';
import { PRE_ASSESSMENT_COPY } from '@/constants/preAssessment';
import { hasActiveBaselineSession, hasRemoteIntakeResumeSession } from '@/lib/assessment/baselineSession';
import { readBaselineIntakeMode } from '@/lib/assessment/baselineSession';

export interface AssessmentStudioStepsProps {
  onComplete: () => void;
}

/** Shown only when remote pre-assessment was started but not finished. */
export function AssessmentStudioSteps({ onComplete }: AssessmentStudioStepsProps) {
  const { formData } = useFormContext();
  const remoteIntakeResume = hasRemoteIntakeResumeSession();
  const intakeReviewVariant =
    readBaselineIntakeMode() === 'studio' && !remoteIntakeResume ? 'studio' : 'remote';

  useEffect(() => {
    if (!hasActiveBaselineSession()) return;
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <IntakeReviewSummary formData={formData} variant={intakeReviewVariant} />
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={onComplete}>
          {PRE_ASSESSMENT_COPY.continueToPhysical}
        </Button>
        <p className="text-xs text-muted-foreground self-center">
          {PRE_ASSESSMENT_COPY.intakeReviewNextHint}
        </p>
      </div>
    </div>
  );
}
