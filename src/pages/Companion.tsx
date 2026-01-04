/**
 * Companion Page - Refactored to use custom hooks
 * Extracted logic into reusable hooks for better maintainability
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import Webcam from 'react-webcam';
import { CONFIG } from '@/config';
import { useCompanionAuth } from '@/hooks/useCompanionAuth';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { useOrientationDetection } from '@/hooks/useOrientationDetection';
import { usePoseDetection } from '@/hooks/usePoseDetection';
import { useCameraCapture } from '@/hooks/useCameraCapture';
import { useSequenceManager } from '@/hooks/useSequenceManager';
import { CompanionUI } from '@/components/companion/CompanionUI';
import { CompanionLoadingStates } from '@/components/companion/CompanionLoadingStates';

const VIEWS = CONFIG.POSTURE_VIEWS;

const Companion = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const mode = (searchParams.get('mode') || 'posture') as 'posture' | 'inbody';
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(
    mode === 'inbody' ? 'environment' : 'user'
  );

  const webcamRef = useRef<Webcam>(null);
  const shutterAudio = useRef<HTMLAudioElement | null>(null);
  const startSequenceRef = useRef<((idx: number) => void) | null>(null);

  // Initialize audio
  useEffect(() => {
    try {
      shutterAudio.current = new Audio(CONFIG.COMPANION.AUDIO.SHUTTER_URL);
    } catch (e) {
      console.warn('[COMPANION] Audio initialization failed:', e);
    }
  }, []);

  // Authentication
  const { isValidating, isAuthorized, errorMsg, runValidation } = useCompanionAuth(
    sessionId,
    token,
    mode
  );

  // Audio feedback
  const { speak, requestPermission: requestAudioPermission, hasPermission: hasAudioPermission } =
    useAudioFeedback();

  // Orientation detection
  const {
    isVertical,
    hasPermission: hasOrientationPermission,
    requestPermission: requestOrientationPermission,
  } = useOrientationDetection(isAuthorized, mode);

  // Combined permission request
  const requestPermission = useCallback(async () => {
    await requestAudioPermission();
    await requestOrientationPermission();
  }, [requestAudioPermission, requestOrientationPermission]);

  const hasPermission = hasAudioPermission && hasOrientationPermission;

  // Sequence management - needs to be first to get viewIdx
  const [viewIdx, setViewIdx] = useState(0);
  const [isWaitingForPosition, setIsWaitingForPosition] = useState(false);

  // Pose detection
  const poseDetectionResult = usePoseDetection({
    mode,
    isAuthorized,
    viewIdx,
    isWaitingForPosition,
    onAudioFeedback: speak,
    views: VIEWS,
    webcamVideo: webcamRef.current?.video || null,
  });

  // Camera capture
  const handleCaptureComplete = useCallback(() => {
    setViewIdx(VIEWS.length);
  }, []);

  const handleNextView = useCallback(
    (nextIdx: number) => {
      setTimeout(() => {
        if (startSequenceRef.current) {
          startSequenceRef.current(nextIdx);
        }
      }, 4000);
    },
    []
  );

  const {
    isUploading,
    isProcessingOcr,
    ocrReviewData,
    setOcrReviewData,
    performCapture: performCameraCapture,
    handleApplyOcr,
  } = useCameraCapture({
    sessionId,
    mode,
    views: VIEWS,
    onAudioFeedback: speak,
    onSequenceComplete: handleCaptureComplete,
    onNextView: handleNextView,
    shutterAudio,
  });

  // Sequence management
  const handleCapture = useCallback(
    async (viewIdx: number) => {
      await performCameraCapture(webcamRef, viewIdx, poseDetectionResult.currentLandmarks);
    },
    [performCameraCapture, poseDetectionResult.currentLandmarks]
  );

  const sequenceResult = useSequenceManager({
    mode,
    views: VIEWS,
    onAudioFeedback: speak,
    onCapture: handleCapture,
    isVertical,
    isPoseReady: poseDetectionResult.isPoseReady,
  });

  const { countdown, isSequenceActive, startSequence } = sequenceResult;

  useEffect(() => {
    startSequenceRef.current = startSequence;
  }, [startSequence]);

  // Initial audio feedback on authorization
  useEffect(() => {
    if (isAuthorized && !isValidating) {
      if (mode === 'inbody') {
        speak('Ready. Tap to capture the InBody report.');
      } else {
        speak('Ready. Level phone to start.');
      }
    }
  }, [isAuthorized, isValidating, mode, speak]);

  // Loading and error states
  const loadingState = (
    <CompanionLoadingStates
      isValidating={isValidating}
      isAuthorized={isAuthorized}
      errorMsg={errorMsg}
      onRetry={runValidation}
      mode={mode}
      viewIdx={viewIdx}
      totalViews={VIEWS.length}
    />
  );

  if (
    isValidating ||
    !isAuthorized ||
    (mode === 'inbody' && viewIdx === 999) ||
    (mode === 'posture' && viewIdx >= VIEWS.length)
  ) {
    return loadingState;
  }

  // Main UI
    return (
    <>
      {isProcessingOcr && (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-white text-center">
        <div className="relative h-32 w-32 mb-8">
          <div className="absolute inset-0 rounded-full border-4 border-white/5" />
          <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
          <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-primary to-brand-dark animate-pulse flex items-center justify-center">
              <div className="h-10 w-10 text-white animate-spin" />
            </div>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight mb-2">Scanning...</h1>
          <p className="text-white/60 text-sm">Extracting data from your InBody report</p>
        </div>
      )}
      {!isProcessingOcr && (
        <CompanionUI
          mode={mode}
          viewIdx={viewIdx}
          facingMode={facingMode}
          setFacingMode={setFacingMode}
          isVertical={isVertical}
          hasPermission={hasPermission}
          requestPermission={requestPermission}
          poseValidation={poseDetectionResult.poseValidation}
          isPoseLoading={poseDetectionResult.isPoseLoading}
          isSequenceActive={isSequenceActive}
          isWaitingForPosition={isWaitingForPosition}
          isUploading={isUploading}
          countdown={countdown}
          webcamRef={webcamRef}
          onCapture={() => handleCapture(viewIdx)}
          onStartSequence={() => startSequence(viewIdx)}
          ocrReviewData={ocrReviewData}
          setOcrReviewData={setOcrReviewData}
          onApplyOcr={handleApplyOcr}
          isProcessingOcr={isProcessingOcr}
        />
      )}
    </>
  );
};

export default Companion;
