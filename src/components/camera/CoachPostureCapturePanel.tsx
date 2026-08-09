/**
 * Minimal coach-held posture capture: silent, no pose detection or voice.
 * The coach frames the client against static guide lines, shoots, reviews
 * (Use photo / Retake), and moves through the four views. Confirmed shots
 * feed the existing updatePostureImage → processPostureImage pipeline.
 */

import React, { useCallback, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Camera, Check, RotateCcw, X, Loader2 } from 'lucide-react';
import { updatePostureImage } from '@/services/liveSessions';
import { VIEWS } from '@/hooks/postureCompanion/types';
import { PostureGuideOverlay } from './PostureGuideOverlay';
import { COACH_POSTURE_CAPTURE_COPY as COPY } from '@/constants/coachPostureCapture';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/utils/logger';
import type { UserProfile } from '@/types/auth';

interface CoachPostureCapturePanelProps {
  sessionId: string;
  organizationId: string;
  profile: UserProfile;
  onClose: () => void;
}

export const CoachPostureCapturePanel: React.FC<CoachPostureCapturePanelProps> = ({
  sessionId,
  organizationId,
  profile,
  onClose,
}) => {
  const webcamRef = useRef<Webcam>(null);
  const [viewIdx, setViewIdx] = useState(0);
  const [captured, setCaptured] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  const view = VIEWS[viewIdx];
  const viewLabel = COPY.VIEW_LABELS[view] ?? view;

  const handleShutter = useCallback(() => {
    const video = webcamRef.current?.video;
    if (!video || video.readyState < 2) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCaptured(canvas.toDataURL('image/jpeg', 0.9));
  }, []);

  const handleUsePhoto = useCallback(() => {
    if (!captured) return;
    // Fire-and-forget: processing takes seconds per view and the posture
    // screen's grid already tracks per-view status — don't block the shoot.
    updatePostureImage(sessionId, view, captured, undefined, 'this-device', organizationId, profile).catch(
      (err) => {
        logger.error('[COACH_POSTURE] Upload failed', 'PostureCapture', err);
        toast({
          title: COPY.UPLOAD_FAILED_TITLE,
          description: COPY.UPLOAD_FAILED_BODY,
          variant: 'destructive',
        });
      },
    );
    setCaptured(null);
    if (viewIdx >= VIEWS.length - 1) {
      setDone(true);
    } else {
      setViewIdx((i) => i + 1);
    }
  }, [captured, sessionId, view, organizationId, profile, viewIdx, toast]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <div>
          <p className="text-sm font-semibold">
            {done
              ? COPY.ALL_DONE_TITLE
              : COPY.VIEW_HEADER(viewIdx + 1, VIEWS.length, viewLabel)}
          </p>
          {!done && !captured && (
            <p className="mt-0.5 max-w-md text-xs text-white/70">{COPY.VIEW_HINTS[view]}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 hover:text-white"
          onClick={onClose}
          aria-label={COPY.CLOSE_ARIA}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {done ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-white">
            <Check className="h-10 w-10 text-emerald-400" />
            <p className="text-sm text-white/80">{COPY.ALL_DONE_BODY}</p>
          </div>
        ) : captured ? (
          <img src={captured} alt={viewLabel} className="h-full w-full object-contain" />
        ) : (
          <>
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: 'environment', width: 1280, height: 720 }}
              onUserMedia={() => setCameraReady(true)}
              className="h-full w-full object-contain"
            />
            {cameraReady ? (
              <PostureGuideOverlay />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center gap-2 text-white/70">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">{COPY.CAMERA_STARTING}</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 px-4 py-5">
        {done ? (
          <Button onClick={onClose} className="rounded-full px-8">
            {COPY.DONE_CLOSE}
          </Button>
        ) : captured ? (
          <>
            <Button
              variant="outline"
              onClick={() => setCaptured(null)}
              className="rounded-full border-white/30 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {COPY.RETAKE}
            </Button>
            <Button onClick={handleUsePhoto} className="rounded-full px-8">
              <Check className="mr-2 h-4 w-4" />
              {COPY.USE_PHOTO}
            </Button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleShutter}
            disabled={!cameraReady}
            aria-label={COPY.SHUTTER_ARIA}
            className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/80 bg-white/20 transition-colors hover:bg-white/30 disabled:opacity-40"
          >
            <Camera className="h-7 w-7 text-white" />
          </button>
        )}
      </div>
    </div>
  );
};
