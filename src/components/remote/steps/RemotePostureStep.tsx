import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, SkipForward } from 'lucide-react';
import { PublicRemotePostureFields } from '@/components/remote/PublicRemotePostureFields';
import type { RemotePostureView } from '@/lib/types/remoteAssessment';

interface RemotePostureStepProps {
  token: string;
  skipped: boolean;
  consentGiven: boolean;
  posturePaths: Partial<Record<RemotePostureView, string>>;
  onSkip: () => void;
  onConsentGiven: () => void;
  onPosturePathsChange: (paths: Partial<Record<RemotePostureView, string>>) => void;
}

export function RemotePostureStep({
  token,
  skipped,
  consentGiven,
  posturePaths,
  onSkip,
  onConsentGiven,
  onPosturePathsChange,
}: RemotePostureStepProps) {
  const [showCapture, setShowCapture] = useState(false);

  if (skipped) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-3">
        <p className="text-sm text-muted-foreground">
          No problem -- posture photos will be taken with your coach in studio.
        </p>
        <button
          type="button"
          className="text-xs text-primary underline"
          onClick={onSkip}
        >
          Take photos instead
        </button>
      </div>
    );
  }

  // Gate screen
  if (!showCapture) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Your coach has invited you to take posture photos as part of your fitness assessment.
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Photos are stored securely and visible only to your coach. You can skip this and do it in studio instead.
        </p>
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 rounded-xl justify-start gap-3"
            onClick={() => setShowCapture(true)}
          >
            <Camera className="h-4 w-4 shrink-0" />
            Take photos now
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full h-11 rounded-xl text-muted-foreground justify-start gap-3"
            onClick={onSkip}
          >
            <SkipForward className="h-4 w-4 shrink-0" />
            Skip -- we'll do it in studio
          </Button>
        </div>
      </div>
    );
  }

  // Consent screen before capture
  if (!consentGiven) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-5 space-y-4">
        <p className="text-sm font-medium text-foreground">About your posture photos</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your photos are stored securely and are visible only to your coach and their organisation.
        </p>
        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
          This is not a medical assessment. Posture observations are for fitness coaching context only and do not constitute a clinical diagnosis. You can request deletion of your data at any time.
        </p>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
            onChange={(e) => { if (e.target.checked) onConsentGiven(); }}
          />
          <span className="text-sm text-foreground">
            I understand and consent to my photos being used for this fitness assessment.
          </span>
        </label>
      </div>
    );
  }

  // Photo capture
  return (
    <PublicRemotePostureFields
      token={token}
      value={posturePaths}
      onChange={onPosturePathsChange}
    />
  );
}
