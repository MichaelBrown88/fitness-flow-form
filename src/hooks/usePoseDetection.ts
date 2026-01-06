/**
 * Hook for MediaPipe pose detection and validation
 * Extracted from Companion.tsx to improve maintainability
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { CONFIG } from '@/config';
import { LandmarkResult } from '@/lib/ai/postureLandmarks';

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

interface PoseResults {
  poseLandmarks: Array<{
    x: number;
    y: number;
    z: number;
    visibility?: number;
  }>;
}

interface UsePoseDetectionResult {
  poseValidation: PoseValidation;
  isPoseLoading: boolean;
  currentLandmarks: LandmarkResult | null;
  isPoseReady: boolean;
}

interface UsePoseDetectionOptions {
  mode: 'posture' | 'inbody';
  isAuthorized: boolean;
  viewIdx: number;
  isWaitingForPosition: boolean;
  onAudioFeedback?: (message: string) => void;
  views: ReadonlyArray<{ readonly id: string; readonly label: string }>;
  webcamVideo: HTMLVideoElement | null;
}

export function usePoseDetection({
  mode,
  isAuthorized,
  viewIdx,
  isWaitingForPosition,
  onAudioFeedback,
  views,
  webcamVideo,
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
  const poseRef = useRef<import('@mediapipe/pose').Pose | null>(null);
  const viewIdxRef = useRef(0);
  const lastAudioFeedbackRef = useRef(0);

  useEffect(() => {
    viewIdxRef.current = viewIdx;
  }, [viewIdx]);

  const onPoseResults = useCallback(
    (results: PoseResults) => {
      if (!results.poseLandmarks || results.poseLandmarks.length === 0) {
        setPoseValidation({
          isReady: false,
          message: 'Step into the frame',
          shortMessage: 'MISSING',
          details: { tooClose: false, tooFar: false, notCentered: false, missingParts: ['Body'] },
        });
        setIsPoseReady(false);
        setCurrentLandmarks(null);
        currentLandmarksRef.current = null;
        return;
      }

      const landmarks = results.poseLandmarks;
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
        raw: results.poseLandmarks,
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
      let isReady = missingParts.length === 0 && !tooClose && !tooFar && !notCentered && !outOfFrame;

      if (outOfFrame) {
        message = 'Please stay inside the box';
        shortMessage = 'OUT OF FRAME';
        isReady = false;
      } else if (missingParts.length > 0) {
        message = `Full body must be visible (Missing: ${missingParts.join(', ')})`;
        shortMessage = 'INCOMPLETE';
        isReady = false;
      } else if (tooClose) {
        message = "You're too close, step back";
        shortMessage = 'TOO CLOSE';
        isReady = false;
      } else if (tooFar) {
        message = "You're too far, step forward";
        shortMessage = 'TOO FAR';
        isReady = false;
      } else if (notCentered) {
        message = bodyCenter < 0.5 ? 'Move to your right' : 'Move to your left';
        shortMessage = 'CENTER BODY';
        isReady = false;
      }

      setPoseValidation({
        isReady,
        message,
        shortMessage,
        details: { tooClose, tooFar, notCentered, missingParts, outOfFrame: outOfFrame || false },
      });
      setIsPoseReady(isReady);

      if (
        isWaitingForPosition &&
        !isReady &&
        Date.now() - lastAudioFeedbackRef.current > CONFIG.COMPANION.AUDIO.FEEDBACK_INTERVAL_MS &&
        onAudioFeedback
      ) {
        onAudioFeedback(message);
        lastAudioFeedbackRef.current = Date.now();
      }
    },
    [isWaitingForPosition, onAudioFeedback, views]
  );

  // Use ref for callback to avoid re-initializing MediaPipe when callback changes
  const onPoseResultsRef = useRef(onPoseResults);
  useEffect(() => {
    onPoseResultsRef.current = onPoseResults;
  }, [onPoseResults]);

  const initPoseDetection = useCallback(async () => {
    if (poseRef.current) return; // Already initialized
    
    try {
      setIsPoseLoading(true);
      const { Pose } = await import('@mediapipe/pose');

      const pose = new Pose({
        locateFile: (file) => `${CONFIG.AI.MEDIAPIPE.POSE_CDN}/${file}`,
      });

      pose.setOptions({
        modelComplexity: CONFIG.AI.MEDIAPIPE.MODEL_COMPLEXITY,
        smoothLandmarks: true,
        minDetectionConfidence: CONFIG.AI.MEDIAPIPE.MIN_DETECTION_CONFIDENCE,
        minTrackingConfidence: CONFIG.AI.MEDIAPIPE.MIN_TRACKING_CONFIDENCE,
      });

      // Use wrapper function that always calls latest callback via ref
      pose.onResults((results) => onPoseResultsRef.current(results));
      poseRef.current = pose;
    } catch (e) {
      console.error('[POSE] Initialization failed:', e);
    } finally {
      setIsPoseLoading(false);
    }
  }, []); // No dependencies - only initialize once

  useEffect(() => {
    if (mode === 'posture') {
      initPoseDetection();
    }

    return () => {
      if (poseRef.current) {
        poseRef.current.close();
        poseRef.current = null;
      }
    };
  }, [mode, initPoseDetection]);

  useEffect(() => {
    let requestRef: number;
    const update = async () => {
      if (poseRef.current && webcamVideo) {
        try {
          await poseRef.current.send({ image: webcamVideo });
        } catch (e) {
          // Ignore errors
        }
      }
      requestRef = requestAnimationFrame(update);
    };

    if (mode === 'posture' && isAuthorized) {
      requestRef = requestAnimationFrame(update);
    }

    return () => cancelAnimationFrame(requestRef);
  }, [mode, isAuthorized, webcamVideo]);

  return {
    poseValidation,
    isPoseLoading,
    currentLandmarks,
    isPoseReady,
  };
}

