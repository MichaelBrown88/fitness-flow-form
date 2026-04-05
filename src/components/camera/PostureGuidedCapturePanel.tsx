/**
 * Coach-device guided posture capture: same Gemini Live + batch MediaPipe processing as QR companion.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { CONFIG } from '@/config';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { useOrientationDetection } from '@/hooks/useOrientationDetection';
import { usePoseDetection } from '@/hooks/usePoseDetection';
import { useGeminiFramingGuide } from '@/hooks/useGeminiFramingGuide';
import { updatePostureImage, updateHeartbeat, logCompanionMessage } from '@/services/liveSessions';
import { evaluateCompanionStillCaptureLandmarks } from '@/services/postureProcessing';
import { CompanionUI } from '@/components/companion/CompanionUI';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { logger } from '@/lib/utils/logger';
import { playCompanionLevelStableChime } from '@/lib/utils/companionLevelStableChime';
import { playCompanionShutterClick } from '@/lib/utils/companionShutterClick';
import type { UserProfile } from '@/types/auth';

const VIEWS = CONFIG.POSTURE_VIEWS;

type FlowState =
  | 'permissions'
  | 'waiting_level'
  | 'waiting_pose'
  | 'ready'
  | 'capturing'
  | 'processing'
  | 'complete';

export interface PostureGuidedCapturePanelProps {
  sessionId: string;
  organizationId: string;
  profile: UserProfile;
  onClose: () => void;
}

export const PostureGuidedCapturePanel: React.FC<PostureGuidedCapturePanelProps> = ({
  sessionId,
  organizationId,
  profile,
  onClose,
}) => {
  const facingMode = 'user' as const;
  const webcamRef = useRef<Webcam>(null);
  const [webcamVideo, setWebcamVideo] = useState<HTMLVideoElement | null>(null);
  const [flowState, setFlowState] = useState<FlowState>('permissions');
  const [currentView, setCurrentView] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [voiceGuideStarted, setVoiceGuideStarted] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const lastAudioTimeRef = useRef<number>(0);
  const AUDIO_THROTTLE_MS = 3000;

  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const turnDelayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSequenceCancelledRef = useRef(false);
  const shotHandlerRef = useRef<(viewIdx: number) => void | Promise<void>>(() => {});
  const beginViewCaptureRef = useRef<(viewIdx: number) => void>(() => {});
  const pendingCapturesRef = useRef<{ viewId: string; imageSrc: string }[]>([]);
  const postureWarmupPendingAutoStartRef = useRef(false);
  const countdownRetryCountRef = useRef(0);
  const MAX_COUNTDOWN_RETRIES = 2;
  const isPoseReadyRef = useRef(false);
  const positionStableSinceRef = useRef<number | null>(null);
  const positionCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const STABLE_HOLD_MS = 1500;
  const CAPTURE_COUNTDOWN_SECS = 3;

  useEffect(() => {
    const checkWebcam = () => {
      const video = webcamRef.current?.video;
      if (video) {
        setWebcamVideo(video);
        clearInterval(interval);
      }
    };
    const interval = setInterval(checkWebcam, 200);
    checkWebcam();
    return () => clearInterval(interval);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || flowState === 'complete') return;
    void updateHeartbeat(sessionId);
    const heartbeatInterval = setInterval(() => {
      void updateHeartbeat(sessionId).catch((err) => {
        logger.warn('[HEARTBEAT] Failed to update:', err);
      });
    }, 5000);
    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [sessionId, flowState]);

  const { speak, requestPermission: requestAudioPermission, hasPermission: hasAudioPermission } =
    useAudioFeedback();

  const throttledSpeak = useCallback(
    (text: string, force: boolean = false) => {
      const now = Date.now();
      if (force || now - lastAudioTimeRef.current >= AUDIO_THROTTLE_MS) {
        lastAudioTimeRef.current = now;
        speak(text);
      } else {
        logger.debug('[AUDIO] Throttled:', text);
      }
    },
    [speak]
  );

  const {
    isVertical,
    hasPermission: hasOrientationPermission,
    requestPermission: requestOrientationPermission,
  } = useOrientationDetection(true, 'posture');

  const hasPermission = hasAudioPermission && hasOrientationPermission;

  const relaxPostureUpright = CONFIG.COMPANION.ORIENTATION.POSTURE_RELAX_UPRIGHT;
  const gateVertical = relaxPostureUpright || isVertical;

  /** Gemini Live disabled — using browser TTS + MediaPipe position-gated countdown. */
  const geminiEnabled = false;

  const {
    startLiveSessionFromUserGesture,
    primeAudioOutput,
    armShot,
    shutdown,
    retry: retryGeminiLive,
    nudgeLevelPhone,
    connectionStatus: geminiConnectionStatus,
    connectionError: geminiConnectionError,
  } = useGeminiFramingGuide({
    mayUseLiveSession: geminiEnabled,
    flowState,
    views: VIEWS,
    getVideoElement: () => webcamRef.current?.video ?? null,
    mirrored: facingMode === 'user',
    onWarmupComplete: () => {
      void logCompanionMessage(sessionId, 'Flow: waiting_pose -> ready (Gemini warmup)', 'info');
      postureWarmupPendingAutoStartRef.current = true;
      setFlowState('ready');
    },
    onShotTrigger: (i) => {
      void shotHandlerRef.current(i);
    },
    onVoiceGuideAudioStarted: () => setVoiceGuideStarted(true),
  });

  const requestPermission = useCallback(async () => {
    try {
      const orientationDone = requestOrientationPermission();
      await requestAudioPermission();
      await orientationDone;
      setFlowState('waiting_level');
    } catch (e) {
      logger.error('[POSTURE_GUIDED] requestPermission failed', e);
    }
  }, [requestAudioPermission, requestOrientationPermission]);

  const poseDetectionResult = usePoseDetection({
    mode: 'posture',
    isAuthorized: true,
    viewIdx: currentView,
    isWaitingForPosition: flowState === 'waiting_pose' || flowState === 'capturing',
    onAudioFeedback: throttledSpeak,
    views: VIEWS,
    webcamVideo,
    suppressAudioFeedback: false,
    disablePosePipeline: false,
  });

  useEffect(() => {
    isPoseReadyRef.current = poseDetectionResult.isPoseReady;
  }, [poseDetectionResult.isPoseReady]);

  const wasVerticalRef = useRef(isVertical);

  useEffect(() => {
    if (relaxPostureUpright) {
      wasVerticalRef.current = isVertical;
      return;
    }
    const was = wasVerticalRef.current;
    wasVerticalRef.current = isVertical;
    if (was && !isVertical && (flowState === 'waiting_pose' || flowState === 'ready')) {
      nudgeLevelPhone();
    }
  }, [relaxPostureUpright, isVertical, flowState, nudgeLevelPhone]);

  const prevStableVerticalRef = useRef(false);
  useEffect(() => {
    if (!hasPermission) {
      prevStableVerticalRef.current = isVertical;
      return;
    }
    if (!prevStableVerticalRef.current && isVertical) {
      playCompanionLevelStableChime();
    }
    prevStableVerticalRef.current = isVertical;
  }, [hasPermission, isVertical]);

  useEffect(() => {
    if (relaxPostureUpright || flowState !== 'waiting_pose' || isVertical) return;
    const id = window.setTimeout(() => {
      setFlowState((s) => (s === 'waiting_pose' ? 'waiting_level' : s));
    }, 1000);
    return () => window.clearTimeout(id);
  }, [relaxPostureUpright, flowState, isVertical]);

  useEffect(() => {
    if (!hasPermission || flowState === 'capturing' || flowState === 'complete' || flowState === 'processing')
      return;

    if (flowState === 'waiting_level') {
      if (gateVertical) {
        void logCompanionMessage(
          sessionId,
          relaxPostureUpright
            ? 'Flow: waiting_level -> waiting_pose (upright gate relaxed)'
            : 'Flow: waiting_level -> waiting_pose (phone is vertical)',
          'info'
        );
        setFlowState('waiting_pose');
      }
      return;
    }

    if (flowState === 'waiting_pose') {
      const { isReady } = poseDetectionResult.poseValidation;
      if (isReady) {
        void logCompanionMessage(sessionId, 'Flow: waiting_pose -> ready (client in position)', 'info');
        postureWarmupPendingAutoStartRef.current = true;
        setFlowState('ready');
      }
    }
  }, [flowState, gateVertical, relaxPostureUpright, hasPermission, sessionId, poseDetectionResult.poseValidation]);

  const captureImage = useCallback(
    async (viewIdx: number): Promise<boolean> => {
      const webcam = webcamRef.current;
      if (!webcam?.video) return false;
      const viewData = VIEWS[viewIdx];
      if (!viewData) return false;

      const imageSrc = webcam.getScreenshot();
      if (!imageSrc) return false;

      try {
        const gate = await evaluateCompanionStillCaptureLandmarks(imageSrc, viewData.id);
        if (!gate.ok) {
          logger.warn(
            `[COUNTDOWN] Capture rejected for ${viewData.label} — low landmark confidence (${gate.avgVisibility.toFixed(2)})`
          );
          return false;
        }
      } catch (e) {
        logger.warn('[COUNTDOWN] Landmark gate failed', e);
        return false;
      }

      try {
        playCompanionShutterClick();
      } catch {
        /* ignore */
      }
      setIsUploading(true);
      try {
        await logCompanionMessage(sessionId, 'Capturing ' + viewData.label, 'info');
        await updatePostureImage(sessionId, viewData.id, imageSrc, undefined, 'this-device', organizationId, profile);
        await logCompanionMessage(sessionId, viewData.label + ' captured successfully', 'info');
      } catch (err) {
        await logCompanionMessage(
          sessionId,
          'Error capturing ' + viewData.label + ': ' + (err instanceof Error ? err.message : String(err)),
          'error'
        );
        logger.error('[POSTURE_GUIDED] Capture error:', err);
      } finally {
        setIsUploading(false);
      }
      return true;
    },
    [sessionId, organizationId, profile]
  );

  const runCountdownAndCapture = useCallback(
    (viewIdx: number) => {
      if (isSequenceCancelledRef.current) return;
      let count = CAPTURE_COUNTDOWN_SECS;
      setCountdown(count);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = setInterval(() => {
        if (isSequenceCancelledRef.current) {
          if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
          return;
        }
        count--;
        if (count > 0) {
          setCountdown(count);
          speak(count.toString());
        } else {
          if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
          setCountdown(null);
          captureImage(viewIdx).then((accepted) => {
            if (isSequenceCancelledRef.current) return;
            if (!accepted && countdownRetryCountRef.current < MAX_COUNTDOWN_RETRIES) {
              countdownRetryCountRef.current += 1;
              throttledSpeak(CONFIG.COMPANION.VOICE_GUIDE.LANDMARK_REJECT_SPEAK, true);
              turnDelayTimeoutRef.current = setTimeout(() => {
                if (isSequenceCancelledRef.current) return;
                beginViewCaptureRef.current(viewIdx);
              }, 2000);
              return;
            }
            countdownRetryCountRef.current = 0;
            if (viewIdx < VIEWS.length - 1) {
              throttledSpeak('Nice one. Now slowly turn to your right.', true);
              turnDelayTimeoutRef.current = setTimeout(() => {
                if (isSequenceCancelledRef.current) return;
                beginViewCaptureRef.current(viewIdx + 1);
              }, 3500);
            } else {
              setFlowState('complete');
              throttledSpeak("That's all the photos done. Great job!", true);
            }
          });
        }
      }, 1000);
    },
    [captureImage, speak, throttledSpeak]
  );

  const beginViewCapture = useCallback(
    (viewIdx: number) => {
      if (isSequenceCancelledRef.current) return;
      if (viewIdx >= VIEWS.length) {
        setFlowState('complete');
        throttledSpeak("That's all the photos done. Great job!", true);
        return;
      }
      setCurrentView(viewIdx);
      positionStableSinceRef.current = null;
      countdownRetryCountRef.current = 0;

      const viewData = VIEWS[viewIdx];
      const directionCue = viewIdx === 0
        ? `Alright, let's start with your ${viewData.label.toLowerCase()} view. Step back until your full body is inside the green guide box.`
        : `Now your ${viewData.label.toLowerCase()} view. Make sure your full body is in the green box.`;
      throttledSpeak(directionCue, true);

      if (positionCheckIntervalRef.current) clearInterval(positionCheckIntervalRef.current);
      positionCheckIntervalRef.current = setInterval(() => {
        if (isSequenceCancelledRef.current) {
          if (positionCheckIntervalRef.current) { clearInterval(positionCheckIntervalRef.current); positionCheckIntervalRef.current = null; }
          return;
        }
        const ready = isPoseReadyRef.current;
        if (ready) {
          if (positionStableSinceRef.current === null) {
            positionStableSinceRef.current = Date.now();
          }
          if (Date.now() - positionStableSinceRef.current >= STABLE_HOLD_MS) {
            if (positionCheckIntervalRef.current) { clearInterval(positionCheckIntervalRef.current); positionCheckIntervalRef.current = null; }
            const relaxCue = viewIdx === 0
              ? "Perfect. Face forward, relax your arms by your sides, and hold still."
              : "Good position. Stand relaxed and hold still.";
            throttledSpeak(relaxCue, true);
            turnDelayTimeoutRef.current = setTimeout(() => {
              if (isSequenceCancelledRef.current) return;
              runCountdownAndCapture(viewIdx);
            }, 2500);
          }
        } else {
          positionStableSinceRef.current = null;
        }
      }, 300);
    },
    [throttledSpeak, runCountdownAndCapture]
  );

  useEffect(() => {
    beginViewCaptureRef.current = beginViewCapture;
  }, [beginViewCapture]);

  /** shotHandlerRef kept for future Gemini re-integration — currently unused. */
  useEffect(() => {
    shotHandlerRef.current = () => {};
  }, []);

  const cancelSequence = useCallback(() => {
    postureWarmupPendingAutoStartRef.current = false;
    isSequenceCancelledRef.current = true;
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (positionCheckIntervalRef.current) {
      clearInterval(positionCheckIntervalRef.current);
      positionCheckIntervalRef.current = null;
    }
    if (turnDelayTimeoutRef.current) {
      clearTimeout(turnDelayTimeoutRef.current);
      turnDelayTimeoutRef.current = null;
    }
    positionStableSinceRef.current = null;
    setCountdown(null);
    pendingCapturesRef.current = [];
    setFlowState('ready');
    setCurrentView(0);
    void logCompanionMessage(sessionId, 'Sequence cancelled by user', 'warn');
    throttledSpeak("No worries, we can try again whenever you're ready.", true);
  }, [sessionId, throttledSpeak]);

  const startSequence = useCallback(() => {
    if (flowState !== 'ready' || currentView >= VIEWS.length) return;
    postureWarmupPendingAutoStartRef.current = false;
    isSequenceCancelledRef.current = false;
    countdownRetryCountRef.current = 0;
    setFlowState('capturing');
    setCurrentView(0);
    beginViewCapture(0);
  }, [flowState, currentView, beginViewCapture]);

  useEffect(() => {
    if (flowState !== 'ready' || !postureWarmupPendingAutoStartRef.current) return;
    if (!gateVertical) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      startSequence();
    });
    return () => {
      cancelled = true;
    };
  }, [flowState, gateVertical, startSequence]);

  const openedLogRef = useRef(false);
  useEffect(() => {
    if (!sessionId) return;
    if (!hasPermission) {
      openedLogRef.current = false;
      return;
    }
    if (openedLogRef.current) return;
    openedLogRef.current = true;
    void logCompanionMessage(sessionId, 'Posture guided capture opened (coach device)', 'info');
  }, [sessionId, hasPermission]);

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (positionCheckIntervalRef.current) clearInterval(positionCheckIntervalRef.current);
      if (turnDelayTimeoutRef.current) clearTimeout(turnDelayTimeoutRef.current);
    };
  }, []);

  if (flowState === 'processing') {
    return (
      <div className="fixed inset-0 z-50 flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white">
        <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
        <p className="text-sm font-medium text-white/90">Processing your results…</p>
      </div>
    );
  }

  if (flowState === 'complete') {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-black p-8 text-center text-white">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        </div>
        <h1 className="mb-2 text-2xl font-bold">All views captured</h1>
        <p className="mb-8 max-w-sm text-sm text-white/60">
          Images and analysis sync to this session. Close to return to the posture modal.
        </p>
        <Button
          type="button"
          onClick={onClose}
          className="rounded-2xl bg-emerald-600 px-8 py-6 text-white hover:bg-emerald-500"
        >
          Done
        </Button>
      </div>
    );
  }

  const getGuideBoxState = (): { color: 'red' | 'amber' | 'green'; message: string } => {
    if (!gateVertical) return { color: 'red', message: 'Hold upright — keep steady' };
    if (flowState === 'capturing') {
      const pv = poseDetectionResult.poseValidation;
      if (countdown !== null) return { color: 'green', message: 'Hold still' };
      if (!pv.isReady) {
        const serious = pv.details.outOfFrame || pv.shortMessage === 'OUT OF FRAME' || pv.shortMessage === 'INCOMPLETE' || pv.shortMessage === 'MISSING';
        return { color: serious ? 'red' : 'amber', message: pv.message };
      }
      return { color: 'green', message: 'Perfect, hold still' };
    }
    if (flowState === 'ready') {
      return { color: 'green', message: 'Ready' };
    }
    if (flowState === 'waiting_pose') {
      const pv = poseDetectionResult.poseValidation;
      if (!pv.isReady) {
        const serious =
          pv.details.outOfFrame ||
          pv.shortMessage === 'OUT OF FRAME' ||
          pv.shortMessage === 'INCOMPLETE' ||
          pv.shortMessage === 'MISSING';
        return { color: serious ? 'red' : 'amber', message: pv.message };
      }
    }
    return { color: 'amber', message: 'Getting ready' };
  };

  const guideBoxState = getGuideBoxState();

  return (
    <div className="min-h-[100dvh] bg-black">
      <CompanionUI
        mode="posture"
        viewIdx={currentView}
        facingMode={facingMode}
        setFacingMode={() => {}}
        isVertical={gateVertical}
        hasPermission={hasPermission}
        requestPermission={requestPermission}
        poseValidation={poseDetectionResult.poseValidation}
        isPoseLoading={poseDetectionResult.isPoseLoading}
        isSequenceActive={flowState === 'capturing'}
        isUploading={isUploading ? 1 : 0}
        countdown={countdown}
        webcamRef={webcamRef}
        onCapture={() => {}}
        onStartSequence={startSequence}
        onCancelSequence={cancelSequence}
        ocrReviewData={null}
        setOcrReviewData={() => {}}
        onApplyOcr={async () => {}}
        isProcessingOcr={false}
        flowState={flowState}
        guideBoxState={guideBoxState}
        blockStartCaptureUntilVertical={!relaxPostureUpright}
        geminiConnectionStatus={undefined}
        geminiConnectionError={null}
        onRetryGemini={undefined}
        voiceGuideStarted={false}
      />
    </div>
  );
};
