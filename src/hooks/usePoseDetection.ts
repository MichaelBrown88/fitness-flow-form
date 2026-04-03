/**
 * Hook for MediaPipe pose detection and validation (Tasks Vision PoseLandmarker).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { CONFIG } from '@/config';
import { LandmarkResult } from '@/lib/ai/postureLandmarks';
import { detectPoseFromImageSource, getPoseInstance } from '@/lib/ai/mediapipeSingleton';
import { logger } from '@/lib/utils/logger';

interface PoseValidation {
  isReady: boolean;
  message: string;
  shortMessage: string;
  details: {
    tooClose: boolean;
    tooFar: boolean;
    notCentered: boolean;
    missingParts: string[];
    outOfFrame?: boolean;
  };
}

interface UsePoseDetectionResult {
  poseValidation: PoseValidation;
  isPoseLoading: boolean;
  currentLandmarks: LandmarkResult | null;
  isPoseReady: boolean;
}

interface UsePoseDetectionOptions {
  mode: 'posture' | 'bodycomp';
  isAuthorized: boolean;
  viewIdx: number;
  isWaitingForPosition: boolean;
  onAudioFeedback?: (message: string) => void;
  views: ReadonlyArray<{ readonly id: string; readonly label: string }>;
  webcamVideo: HTMLVideoElement | null;
  /** When true, skip TTS pose hints (e.g. Companion posture — Gemini speaks). */
  suppressAudioFeedback?: boolean;
  /** Skip pose pipeline entirely (static empty validation). */
  disablePosePipeline?: boolean;
}

export function usePoseDetection({
  mode,
  isAuthorized,
  viewIdx,
  isWaitingForPosition,
  onAudioFeedback,
  views,
  webcamVideo,
  suppressAudioFeedback = false,
  disablePosePipeline = false,
}: UsePoseDetectionOptions): UsePoseDetectionResult {
  const [poseValidation, setPoseValidation] = useState<PoseValidation>({
    isReady: false,
    message: 'Ready to scan',
    shortMessage: 'READY',
    details: { tooClose: false, tooFar: false, notCentered: false, missingParts: [], outOfFrame: false },
  });
  const [isPoseLoading, setIsPoseLoading] = useState(false);
  const [isPoseReady, setIsPoseReady] = useState(false);
  const [currentLandmarks, setCurrentLandmarks] = useState<LandmarkResult | null>(null);
  const currentLandmarksRef = useRef<LandmarkResult | null>(null);
  const viewIdxRef = useRef(0);
  const lastAudioFeedbackRef = useRef(0);
  const lastInferMsRef = useRef(0);
  const lastBrightnessCheckRef = useRef(0);
  const lastBrightnessWarningRef = useRef(0);
  const brightnessCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const BRIGHTNESS_CHECK_INTERVAL_MS = 3000;
  const BRIGHTNESS_WARNING_COOLDOWN_MS = 15000;
  const MIN_BRIGHTNESS = 50;
  const MAX_BRIGHTNESS = 220;

  useEffect(() => {
    viewIdxRef.current = viewIdx;
  }, [viewIdx]);

  const onPoseResults = useCallback(
    (poseLandmarks: Array<{ x: number; y: number; z: number; visibility?: number }>) => {
      if (!poseLandmarks || poseLandmarks.length === 0) {
        setPoseValidation({
          isReady: false,
          message: 'Step into the frame',
          shortMessage: 'MISSING',
          details: { tooClose: false, tooFar: false, notCentered: false, missingParts: ['Body'] },
        });
        setIsPoseReady(false);
        setCurrentLandmarks(null);
        currentLandmarksRef.current = null;
        if (Math.random() < 0.05) {
          logger.debug('[POSE] No landmarks detected');
        }
        return;
      }

      if (Math.random() < 0.01) {
        logger.debug('[POSE] Landmarks detected:', poseLandmarks.length, 'points');
      }

      const landmarks = poseLandmarks;
      const shoulderL = landmarks[11];
      const shoulderR = landmarks[12];
      const hipL = landmarks[23];
      const hipR = landmarks[24];
      const ankleL = landmarks[27];
      const ankleR = landmarks[28];
      const nose = landmarks[0];

      const missingParts: string[] = [];
      if ((shoulderL.visibility || 0) < 0.5 || (shoulderR.visibility || 0) < 0.5) missingParts.push('Shoulders');
      if ((ankleL.visibility || 0) < 0.5 || (ankleR.visibility || 0) < 0.5) missingParts.push('Feet');
      if ((nose.visibility || 0) < 0.5) missingParts.push('Head');

      const bodyHeight = Math.max(ankleL.y, ankleR.y) - nose.y;
      const bodyCenter = (shoulderL.x + shoulderR.x + hipL.x + hipR.x) / 4;

      const view = views[viewIdxRef.current]?.id || 'front';
      const shoulderCenterY = (shoulderL.y + shoulderR.y) / 2;
      const hipCenterY = (hipL.y + hipR.y) / 2;
      const headY = nose.y;

      const landmarkResult: LandmarkResult = {
        shoulder_y_percent: shoulderCenterY * 100,
        hip_y_percent: hipCenterY * 100,
        head_y_percent: headY * 100,
        raw: poseLandmarks as LandmarkResult['raw'],
      };

      if (view === 'front' || view === 'back') {
        landmarkResult.center_x_percent = bodyCenter * 100;
      } else {
        const ankleX = (ankleL.x + ankleR.x) / 2;
        landmarkResult.midfoot_x_percent = ankleX * 100;
      }

      currentLandmarksRef.current = landmarkResult;
      setCurrentLandmarks(landmarkResult);

      const frameLeft = 0.075;
      const frameRight = 0.925;
      const frameTop = 0.05;
      const frameBottom = 0.95;

      const headOut = nose.x < frameLeft || nose.x > frameRight || nose.y < frameTop;
      const leftShoulderOut = shoulderL.x < frameLeft || shoulderL.y < frameTop;
      const rightShoulderOut = shoulderR.x > frameRight || shoulderR.y < frameTop;
      const leftHipOut = hipL.x < frameLeft || hipL.y > frameBottom;
      const rightHipOut = hipR.x > frameRight || hipR.y > frameBottom;
      const leftAnkleOut = ankleL.x < frameLeft || ankleL.y > frameBottom;
      const rightAnkleOut = ankleR.x > frameRight || ankleR.y > frameBottom;

      const outOfFrame =
        headOut || leftShoulderOut || rightShoulderOut || leftHipOut || rightHipOut || leftAnkleOut || rightAnkleOut;

      const tooClose = bodyHeight > CONFIG.COMPANION.POSE_THRESHOLDS.TOO_CLOSE;
      const tooFar = bodyHeight < CONFIG.COMPANION.POSE_THRESHOLDS.TOO_FAR;
      const notCentered = Math.abs(bodyCenter - 0.5) > CONFIG.COMPANION.POSE_THRESHOLDS.NOT_CENTERED;

      let message = 'Perfect, hold still';
      let shortMessage = 'READY';
      let audioMessage = 'Looking good. Hold still for me.';
      let isReady = missingParts.length === 0 && !tooClose && !tooFar && !notCentered && !outOfFrame;

      if (outOfFrame) {
        message = 'Please stay inside the box';
        shortMessage = 'OUT OF FRAME';
        audioMessage = 'I need you inside the green frame. Just shuffle back into the box for me.';
        isReady = false;
      } else if (missingParts.length > 0) {
        message = `Full body must be visible (Missing: ${missingParts.join(', ')})`;
        shortMessage = 'INCOMPLETE';
        audioMessage = missingParts.length === 1
          ? `I can't quite see your ${missingParts[0]}. Can you step back a little so I can see your whole body?`
          : "I can't see your full body just yet. Take a small step back so everything's in frame.";
        isReady = false;
      } else if (tooClose) {
        message = "You're too close, step back";
        shortMessage = 'TOO CLOSE';
        audioMessage = "You're a bit close. Take a step back for me.";
        isReady = false;
      } else if (tooFar) {
        message = "You're too far, step forward";
        shortMessage = 'TOO FAR';
        audioMessage = "You're a little far away. Step forward just a touch.";
        isReady = false;
      } else if (notCentered) {
        const direction = bodyCenter < 0.5 ? 'right' : 'left';
        message = `Move to your ${direction}`;
        shortMessage = 'CENTER BODY';
        audioMessage = `Almost there. Just shuffle a little to your ${direction}.`;
        isReady = false;
      }

      setPoseValidation({
        isReady,
        message,
        shortMessage,
        details: { tooClose, tooFar, notCentered, missingParts, outOfFrame: outOfFrame || false },
      });
      setIsPoseReady(isReady);

      if (Math.random() < 0.02) {
        logger.debug('[POSE] Validation:', {
          isReady,
          message,
          tooClose,
          tooFar,
          notCentered,
          missingParts: missingParts.length,
          outOfFrame,
          isWaitingForPosition,
        });
      }

      if (
        !suppressAudioFeedback &&
        isWaitingForPosition &&
        !isReady &&
        Date.now() - lastAudioFeedbackRef.current > CONFIG.COMPANION.AUDIO.FEEDBACK_INTERVAL_MS &&
        onAudioFeedback
      ) {
        onAudioFeedback(audioMessage);
        lastAudioFeedbackRef.current = Date.now();
      }
    },
    [isWaitingForPosition, onAudioFeedback, suppressAudioFeedback, views]
  );

  const onPoseResultsRef = useRef(onPoseResults);
  useEffect(() => {
    onPoseResultsRef.current = onPoseResults;
  }, [onPoseResults]);

  const onAudioFeedbackRef = useRef(onAudioFeedback);
  const suppressAudioFeedbackRef = useRef(suppressAudioFeedback);
  const isWaitingForPositionRef = useRef(isWaitingForPosition);
  useEffect(() => { onAudioFeedbackRef.current = onAudioFeedback; }, [onAudioFeedback]);
  useEffect(() => { suppressAudioFeedbackRef.current = suppressAudioFeedback; }, [suppressAudioFeedback]);
  useEffect(() => { isWaitingForPositionRef.current = isWaitingForPosition; }, [isWaitingForPosition]);

  const minIntervalMs = 1000 / CONFIG.AI.MEDIAPIPE.LIVE_POSE_TARGET_FPS;

  useEffect(() => {
    const skipPose =
      !isAuthorized || !webcamVideo || (mode === 'posture' && disablePosePipeline);
    if (skipPose) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        setIsPoseLoading(true);
        await getPoseInstance();
        if (cancelled) return;
        logger.debug('[POSE] PoseLandmarker ready — starting preview loop');
      } catch (e) {
        logger.error('[POSE] Initialization failed:', e);
        return;
      } finally {
        if (!cancelled) setIsPoseLoading(false);
      }

      const tick = () => {
        if (cancelled) return;
        const now = performance.now();
        if (now - lastInferMsRef.current >= minIntervalMs) {
          lastInferMsRef.current = now;
          try {
            const raw = detectPoseFromImageSource(webcamVideo, now);
            if (raw?.length) {
              onPoseResultsRef.current(raw);
            } else {
              onPoseResultsRef.current([]);
            }
          } catch (e) {
            logger.error('[POSE] detectForVideo error:', e);
          }
        }

        const wallNow = Date.now();
        if (
          wallNow - lastBrightnessCheckRef.current >= BRIGHTNESS_CHECK_INTERVAL_MS &&
          webcamVideo.readyState >= 2
        ) {
          lastBrightnessCheckRef.current = wallNow;
          try {
            if (!brightnessCanvasRef.current) {
              brightnessCanvasRef.current = document.createElement('canvas');
            }
            const c = brightnessCanvasRef.current;
            const sampleW = 64;
            const sampleH = 48;
            c.width = sampleW;
            c.height = sampleH;
            const ctx = c.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(webcamVideo, 0, 0, sampleW, sampleH);
              const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
              const px = imgData.data;
              let totalLum = 0;
              const pixelCount = sampleW * sampleH;
              for (let i = 0; i < px.length; i += 4) {
                totalLum += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
              }
              const avgBrightness = totalLum / pixelCount;

              if (
                wallNow - lastBrightnessWarningRef.current >= BRIGHTNESS_WARNING_COOLDOWN_MS &&
                onAudioFeedbackRef.current &&
                !suppressAudioFeedbackRef.current &&
                isWaitingForPositionRef.current
              ) {
                if (avgBrightness < MIN_BRIGHTNESS) {
                  lastBrightnessWarningRef.current = wallNow;
                  onAudioFeedbackRef.current("It's a bit dark in here. Can you turn on a light or move somewhere brighter?");
                } else if (avgBrightness > MAX_BRIGHTNESS) {
                  lastBrightnessWarningRef.current = wallNow;
                  onAudioFeedbackRef.current("The lighting is very bright. Try to avoid direct sunlight or move to a spot with even lighting.");
                }
              }
            }
          } catch {
            /* brightness check is best-effort */
          }
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    };

    void run();

    return () => {
      cancelled = true;
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [mode, isAuthorized, webcamVideo, disablePosePipeline, minIntervalMs]);

  return {
    poseValidation,
    isPoseLoading,
    currentLandmarks,
    isPoseReady,
  };
}
