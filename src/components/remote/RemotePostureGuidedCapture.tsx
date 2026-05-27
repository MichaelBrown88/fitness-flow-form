import { PostureGuidedCapturePanel } from '@/components/camera/PostureGuidedCapturePanel';
import type { RemotePostureView } from '@/lib/types/remoteAssessment';

interface RemotePostureGuidedCaptureProps {
  token: string;
  onComplete: (paths: Partial<Record<RemotePostureView, string>>) => void;
  onClose: () => void;
}

/** Full-screen guided posture capture (same flow as in-studio companion). */
export function RemotePostureGuidedCapture({
  token,
  onComplete,
  onClose,
}: RemotePostureGuidedCaptureProps) {
  return (
    <PostureGuidedCapturePanel
      mode="remoteIntake"
      token={token}
      onClose={onClose}
      onComplete={onComplete}
    />
  );
}
