import type { LandingCapabilityVisualId } from '@/constants/landingCopy';
import { CaptureCapabilityGraphic } from '@/components/landing/capabilityGraphics/CaptureCapabilityGraphic';
import { ReportPortalCapabilityGraphic } from '@/components/landing/capabilityGraphics/ReportPortalCapabilityGraphic';
import { ProgressCapabilityGraphic } from '@/components/landing/capabilityGraphics/ProgressCapabilityGraphic';

interface LandingCapabilityVisualProps {
  visualId: LandingCapabilityVisualId;
}

/**
 * Stripped-down echoes of real product UI (assessment capture, ClientReport, public roadmap).
 * Decorative only — entire tree is aria-hidden.
 */
export function LandingCapabilityVisual({ visualId }: LandingCapabilityVisualProps) {
  return (
    <div className="relative" aria-hidden>
      {visualId === 'capture' ? <CaptureCapabilityGraphic /> : null}
      {visualId === 'reportPortal' ? <ReportPortalCapabilityGraphic /> : null}
      {visualId === 'progress' ? <ProgressCapabilityGraphic /> : null}
    </div>
  );
}
