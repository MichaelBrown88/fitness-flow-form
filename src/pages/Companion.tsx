/**
 * Companion Page — posture flow uses Gemini Live framing + MediaPipe Tasks pose preview.
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import Webcam from 'react-webcam';
import { CONFIG } from '@/config';
import { useCompanionAuth } from '@/hooks/useCompanionAuth';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { useOrientationDetection } from '@/hooks/useOrientationDetection';
import { usePoseDetection } from '@/hooks/usePoseDetection';
import { useGeminiFramingGuide } from '@/hooks/useGeminiFramingGuide';
import { detectPostureLandmarks, type LandmarkResult } from '@/lib/ai/postureLandmarks';
import { prewarmMediaPipe } from '@/lib/ai/mediapipeSingleton';
import { averageStructuralLandmarkVisibility } from '@/services/postureProcessing';
import {
  computePostureFramingMetadata,
  type PostureFramingMetadata,
} from '@/lib/utils/postureFramingMetadata';
import { updatePostureImage, updateHeartbeat, logCompanionMessage } from '@/services/liveSessions';
import { CompanionUI } from '@/components/companion/CompanionUI';
import { CompanionLoadingStates } from '@/components/companion/CompanionLoadingStates';
import { logger } from '@/lib/utils/logger';

const VIEWS = CONFIG.POSTURE_VIEWS;

type FlowState = 'permissions' | 'waiting_level' | 'waiting_pose' | 'ready' | 'capturing' | 'complete';

type PostureViewId = 'front' | 'side-right' | 'side-left' | 'back';

const Companion = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const rawMode = searchParams.get('mode') || 'posture';
  const mode = (rawMode === 'inbody' ? 'bodycomp' : rawMode) as 'posture' | 'bodycomp';
  const [facingMode] = useState<'user' | 'environment'>(mode === 'bodycomp' ? 'environment' : 'user');

  const webcamRef = useRef<Webcam>(null);
  const shutterAudio = useRef<HTMLAudioElement | null>(null);
  const [webcamVideo, setWebcamVideo] = useState<HTMLVideoElement | null>(null);
  const [flowState, setFlowState] = useState<FlowState>('permissions');
  const [currentView, setCurrentView] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const lastAudioTimeRef = useRef<number>(0);
  const AUDIO_THROTTLE_MS = 3000;

  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const turnDelayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSequenceCancelledRef = useRef(false);
  const shotHandlerRef = useRef<(viewIdx: number) => void | Promise<void>>(() => {});

  useEffect(() => {
    const checkWebcam = () => {
      const video = webcamRef.current?.video;
      if (video) {
        logCompanionMessage(sessionId || '', 'Webcam video element found: ' + String(video.videoWidth) + 'x' + String(video.videoHeight), 'info');
        setWebcamVideo(video);
        clearInterval(interval);
      }
    };
    const interval = setInterval(checkWebcam, 200);
    checkWebcam();
    return () => clearInterval(interval);
  }, [sessionId]);

  useEffect(() => {
    try {
      shutterAudio.current = new Audio(CONFIG.COMPANION.AUDIO.SHUTTER_URL);
    } catch (e) {
      logger.warn('[COMPANION] Audio initialization failed:', e);
    }
  }, []);

  useEffect(() => {
    if (mode !== 'posture') return;
    void prewarmMediaPipe();
  }, [mode]);

  useEffect(() => {
    if (!sessionId || flowState === 'complete') return;
    updateHeartbeat(sessionId).catch(() => {});
    const heartbeatInterval = setInterval(() => {
      updateHeartbeat(sessionId).catch((err) => {
        logger.warn('[HEARTBEAT] Failed to update:', err);
      });
    }, 5000);
    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [sessionId, flowState]);

  const { isValidating, isAuthorized, errorMsg, runValidation } = useCompanionAuth(sessionId, token, mode);

  const { speak, requestPermission: requestAudioPermission, hasPermission: hasAudioPermission } = useAudioFeedback();

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
  } = useOrientationDetection(isAuthorized, mode);

  const hasPermission = hasAudioPermission && hasOrientationPermission;

  const geminiEnabled =
    mode === 'posture' &&
    isAuthorized &&
    hasPermission &&
    (flowState === 'waiting_pose' || flowState === 'ready' || flowState === 'capturing');

  const {
    primeAudioOutput,
    armShot,
    retry,
    shutdown,
    connectionStatus: geminiConnectionStatus,
    connectionError: geminiConnectionError,
  } = useGeminiFramingGuide({
    enabled: geminiEnabled,
    flowState,
    views: VIEWS,
    getVideoElement: () => webcamRef.current?.video ?? null,
    mirrored: facingMode === 'user',
    onWarmupComplete: () => {
      logCompanionMessage(sessionId || '', 'Flow: waiting_pose -> ready (Gemini warmup)', 'info');
      setFlowState('ready');
    },
    onShotTrigger: (i) => {
      void shotHandlerRef.current(i);
    },
  });

  const requestPermission = useCallback(async () => {
    await requestAudioPermission();
    await primeAudioOutput();
    await requestOrientationPermission();
    setFlowState('waiting_level');
    if (mode === 'posture') {
      throttledSpeak('Level your phone to continue.', true);
    }
  }, [requestAudioPermission, requestOrientationPermission, mode, throttledSpeak, primeAudioOutput]);

  const poseDetectionResult = usePoseDetection({
    mode,
    isAuthorized,
    viewIdx: currentView,
    isWaitingForPosition: flowState === 'waiting_pose',
    onAudioFeedback: throttledSpeak,
    views: VIEWS,
    webcamVideo,
    suppressAudioFeedback: mode === 'posture',
  });

  useEffect(() => {
    if (!hasPermission || !isAuthorized || flowState === 'capturing' || flowState === 'complete') return;

    if (flowState === 'waiting_level') {
      if (isVertical) {
        logCompanionMessage(sessionId || '', 'Flow: waiting_level -> waiting_pose (phone is vertical)', 'info');
        setFlowState('waiting_pose');
        if (mode === 'bodycomp') {
          setTimeout(() => throttledSpeak('Good. Now get in position.', true), 500);
        }
      } else {
        logger.debug('[COMPANION] Flow: waiting_level (phone not vertical yet)');
      }
      return;
    }

    if (flowState === 'waiting_pose' && mode === 'bodycomp') {
      const { isReady, message, details } = poseDetectionResult.poseValidation;
      logger.debug('[COMPANION] Flow: waiting_pose (bodycomp)', isReady, message, details);
      if (isReady) {
        logCompanionMessage(sessionId || '', 'Flow: waiting_pose -> ready (client in position)', 'info');
        setFlowState('ready');
        setTimeout(() => throttledSpeak('Perfect. Stand relaxed, look straight ahead, and hold still.', true), 500);
      }
    }
  }, [
    flowState,
    isVertical,
    hasPermission,
    isAuthorized,
    mode,
    poseDetectionResult.poseValidation,
    sessionId,
    throttledSpeak,
  ]);

  const captureWithRetries = useCallback(
    async (viewIdx: number): Promise<boolean> => {
      const webcam = webcamRef.current;
      const viewData = VIEWS[viewIdx];
      if (!webcam?.video || !sessionId || !viewData) return false;

      const minV = CONFIG.COMPANION.POSE_THRESHOLDS.minConfidence;
      const viewId = viewData.id as PostureViewId;

      let best: {
        vis: number;
        imageSrc: string;
        lr: LandmarkResult;
        framing: PostureFramingMetadata | null | undefined;
      } | null = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, 500));
        }

        try {
          if (shutterAudio.current) {
            void shutterAudio.current.play().catch(() => {});
          }
        } catch {
          /* ignore */
        }

        const imageSrc = webcam.getScreenshot();
        if (!imageSrc) continue;

        setIsUploading(true);
        try {
          await logCompanionMessage(sessionId, 'Capturing ' + viewData.label, 'info');
          const lr = await detectPostureLandmarks(imageSrc, viewId);
          const vis = averageStructuralLandmarkVisibility(lr.raw);
          const videoH = webcam.video?.videoHeight ?? 720;
          const framing = computePostureFramingMetadata(lr.raw, videoH);

          if (!best || vis > best.vis) {
            best = { vis, imageSrc, lr, framing };
          }

          if (vis >= minV) {
            await updatePostureImage(
              sessionId,
              viewData.id,
              imageSrc,
              lr,
              'iphone',
              undefined,
              undefined,
              framing ?? undefined
            );
            await logCompanionMessage(sessionId, viewData.label + ' captured successfully', 'info');
            return true;
          }
        } catch (err) {
          await logCompanionMessage(
            sessionId,
            'Error capturing ' + viewData.label + ': ' + (err instanceof Error ? err.message : String(err)),
            'error'
          );
          logger.error('[CAPTURE] Error:', err);
          if (attempt === 2) throw err;
        } finally {
          setIsUploading(false);
        }
      }

      if (best?.imageSrc) {
        setIsUploading(true);
        try {
          await updatePostureImage(
            sessionId,
            viewData.id,
            best.imageSrc,
            best.lr,
            'iphone',
            undefined,
            undefined,
            best.framing ?? undefined
          );
          await logCompanionMessage(sessionId, viewData.label + ' captured successfully', 'info');
          return true;
        } finally {
          setIsUploading(false);
        }
      }
      logger.warn('[COMPANION] No usable frame after retries', { view: viewData.id });
      return false;
    },
    [sessionId]
  );

  useEffect(() => {
    shotHandlerRef.current = async (viewIdx: number) => {
      if (mode !== 'posture') return;
      if (isSequenceCancelledRef.current) return;
      const saved = await captureWithRetries(viewIdx);
      if (!saved || isSequenceCancelledRef.current) return;
      if (viewIdx < VIEWS.length - 1) {
        if (turnDelayTimeoutRef.current) {
          clearTimeout(turnDelayTimeoutRef.current);
        }
        turnDelayTimeoutRef.current = setTimeout(() => {
          if (isSequenceCancelledRef.current) return;
          setCurrentView(viewIdx + 1);
          void armShot(viewIdx + 1);
        }, CONFIG.COMPANION.CAPTURE.POSTURE_GEMINI_NEXT_VIEW_MS);
      } else {
        void shutdown();
        setFlowState('complete');
        throttledSpeak('All images captured. Returning to app.', true);
      }
    };
  }, [mode, captureWithRetries, armShot, throttledSpeak, shutdown]);

  const captureImage = useCallback(
    async (viewIdx: number) => {
      const webcam = webcamRef.current;
      if (!webcam || !webcam.video) return;
      const viewData = VIEWS[viewIdx];
      if (!viewData) return;
      try {
        if (shutterAudio.current) {
          void shutterAudio.current.play().catch(() => {});
        }
      } catch {
        /* ignore */
      }
      const imageSrc = webcam.getScreenshot();
      if (!imageSrc || !sessionId) return;
      setIsUploading(true);
      try {
        await logCompanionMessage(sessionId, 'Capturing ' + viewData.label, 'info');
        await updatePostureImage(sessionId, viewData.id, imageSrc, poseDetectionResult.currentLandmarks, 'iphone');
        await logCompanionMessage(sessionId, viewData.label + ' captured successfully', 'info');
      } catch (err) {
        await logCompanionMessage(
          sessionId,
          'Error capturing ' + viewData.label + ': ' + (err instanceof Error ? err.message : String(err)),
          'error'
        );
        logger.error('[CAPTURE] Error:', err);
      } finally {
        setIsUploading(false);
      }
    },
    [sessionId, poseDetectionResult.currentLandmarks]
  );

  const cancelSequence = useCallback(() => {
    logger.debug('[SEQUENCE] User cancelled sequence');
    isSequenceCancelledRef.current = true;
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (turnDelayTimeoutRef.current) {
      clearTimeout(turnDelayTimeoutRef.current);
      turnDelayTimeoutRef.current = null;
    }
    setCountdown(null);
    setFlowState('ready');
    setCurrentView(0);
    if (sessionId) {
      logCompanionMessage(sessionId, 'Sequence cancelled by user', 'warn');
    }
    throttledSpeak('Sequence cancelled.', true);
    if (mode === 'posture') {
      void (async () => {
        await shutdown();
        retry();
      })();
    }
  }, [sessionId, throttledSpeak, mode, retry, shutdown]);

  const startCountdown = useCallback(
    (viewIdx: number) => {
      if (isSequenceCancelledRef.current) {
        logger.debug('[SEQUENCE] Cancelled - stopping countdown');
        return;
      }
      if (viewIdx >= VIEWS.length) {
        setFlowState('complete');
        throttledSpeak('All images captured. Returning to app.', true);
        return;
      }
      setCurrentView(viewIdx);
      const viewData = VIEWS[viewIdx];
      throttledSpeak('Capturing ' + viewData.label + ' in 5 seconds.', true);
      let count = 5;
      setCountdown(count);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      countdownIntervalRef.current = setInterval(() => {
        if (isSequenceCancelledRef.current) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          return;
        }
        count--;
        if (count > 0) {
          setCountdown(count);
          if (count <= 3) {
            speak(count.toString());
          }
        } else {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          setCountdown(null);
          captureImage(viewIdx).then(() => {
            if (isSequenceCancelledRef.current) return;
            if (viewIdx < VIEWS.length - 1) {
              throttledSpeak('Turn to your right.', true);
              if (turnDelayTimeoutRef.current) {
                clearTimeout(turnDelayTimeoutRef.current);
              }
              turnDelayTimeoutRef.current = setTimeout(() => {
                if (isSequenceCancelledRef.current) return;
                startCountdown(viewIdx + 1);
              }, 3000);
            } else {
              setFlowState('complete');
              throttledSpeak('All images captured. Returning to app.', true);
            }
          });
        }
      }, 1000);
    },
    [captureImage, speak, throttledSpeak]
  );

  const startSequence = useCallback(() => {
    if (flowState !== 'ready' || currentView >= VIEWS.length) return;
    isSequenceCancelledRef.current = false;
    setFlowState('capturing');
    setCurrentView(0);
    if (mode === 'posture') {
      setCountdown(null);
      void armShot(0);
      return;
    }
    startCountdown(0);
  }, [flowState, currentView, startCountdown, mode, armShot]);

  useEffect(() => {
    if (isAuthorized && !isValidating && sessionId) {
      logCompanionMessage(sessionId, 'Companion authorized - mode: ' + mode, 'info');
      if (hasPermission) {
        setFlowState('waiting_level');
        throttledSpeak('Level your phone to continue.', true);
      } else {
        setFlowState('permissions');
      }
    }
  }, [isAuthorized, isValidating, sessionId, mode, hasPermission, throttledSpeak]);

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (turnDelayTimeoutRef.current) {
        clearTimeout(turnDelayTimeoutRef.current);
      }
    };
  }, []);

  if (isValidating || !isAuthorized || flowState === 'complete') {
    return (
      <CompanionLoadingStates
        isValidating={isValidating}
        isAuthorized={isAuthorized}
        errorMsg={errorMsg}
        onRetry={runValidation}
        mode={mode}
        viewIdx={currentView}
        totalViews={VIEWS.length}
      />
    );
  }

  const getGuideBoxState = (): { color: 'red' | 'amber' | 'green'; message: string } => {
    if (!isVertical) return { color: 'red', message: 'Level your phone' };
    if (flowState === 'waiting_pose' || flowState === 'ready') {
      if (poseDetectionResult.poseValidation.isReady) {
        return { color: 'green', message: 'Perfect position' };
      }
      return { color: 'amber', message: 'Get in position' };
    }
    return { color: 'amber', message: 'Level your phone' };
  };

  const guideBoxState = getGuideBoxState();

  return (
    <CompanionUI
      mode={mode}
      viewIdx={currentView}
      facingMode={facingMode}
      setFacingMode={() => {}}
      isVertical={isVertical}
      hasPermission={hasPermission}
      requestPermission={requestPermission}
      poseValidation={poseDetectionResult.poseValidation}
      isPoseLoading={poseDetectionResult.isPoseLoading}
      isSequenceActive={flowState === 'capturing'}
      isUploading={isUploading ? 1 : 0}
      countdown={mode === 'posture' ? null : countdown}
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
      geminiConnectionStatus={mode === 'posture' ? geminiConnectionStatus : undefined}
      geminiConnectionError={mode === 'posture' ? geminiConnectionError : undefined}
      onGeminiRetry={mode === 'posture' ? retry : undefined}
    />
  );
};

export default Companion;
