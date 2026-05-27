import { ASSESSMENT_COPY } from '@/constants/assessmentCopy';
import { hasRemoteIntakeResumeSession } from '@/lib/assessment/baselineSession';

export function IntakePrefillBanner() {
  if (!hasRemoteIntakeResumeSession()) {
    return null;
  }

  return (
    <div
      className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 mb-4"
      role="status"
    >
      <p className="text-sm font-semibold text-foreground">{ASSESSMENT_COPY.INTAKE_PREFILL_BANNER_TITLE}</p>
      <p className="text-xs text-muted-foreground mt-1">{ASSESSMENT_COPY.INTAKE_PREFILL_BANNER_BODY}</p>
      <p className="text-xs text-muted-foreground mt-2">{ASSESSMENT_COPY.AWAITING_STUDIO_HINT}</p>
    </div>
  );
}
