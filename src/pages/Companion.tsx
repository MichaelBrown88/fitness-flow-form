/**
 * Companion Page - SIMPLIFIED
 * Simple linear flow: permissions -> level phone -> client in frame -> capture 4 images
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import Webcam from 'react-webcam';
import { CONFIG } from '@/config';
import { useCompanionAuth } from '@/hooks/useCompanionAuth';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { useOrientationDetection } from '@/hooks/useOrientationDetection';
import { usePoseDetection } from '@/hooks/usePoseDetection';
import { updatePostureImage } from '@/services/liveSessions';
import { logCompanionMessage } from '@/services/liveSessions';
import { CompanionUI } from '@/components/companion/CompanionUI';
import { CompanionLoadingStates } from '@/components/companion/CompanionLoadingStates';

const VIEWS = CONFIG.POSTURE_VIEWS;

type FlowState = 'permissions' | 'waiting_level' | 'waiting_pose' | 'ready' | 'capturing' | 'complete';

const Companion = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const mode = (searchParams.get('mode') || 'posture') as 'posture' | 'inbody';
  const [facingMode] = useState<'user' | 'environment'>(mode === 'inbody' ? 'environment' : 'user');

  const webcamRef = useRef<Webcam>(null);
  const shutterAudio = useRef<HTMLAudioElement | null>(null);
  const [webcamVideo, setWebcamVideo] = useState<HTMLVideoElement | null>(null);
  const [flowState, setFlowState] = useState<FlowState>('permissions');
  const [currentView, setCurrentView] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Get video element
  useEffect(() => {
    const checkWebcam = () => {
      const video = webcamRef.current?.video;
      if (video) {
        logCompanionMessage(sessionId || '', `Webcam video element found: ${video.videoWidth}x${video.videoHeight}`, 'info');
        setWebcamVideo(video);
        clearInterval(interval);
      }
    };
    const interval = setInterval(checkWebcam, 200);
    checkWebcam();
    return () => clearInterval(interval);
  }, [sessionId]);

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
    setFlowState('waiting_level');
    if (mode === 'posture') {
      speak('Level your phone to continue.');
    }
  }, [requestAudioPermission, requestOrientationPermission, mode, speak]);

  const hasPermission = hasAudioPermission && hasOrientationPermission;

  // Pose detection
  const poseDetectionResult = usePoseDetection({
    mode,
    isAuthorized,
    viewIdx: currentView,
    isWaitingForPosition: flowState === 'waiting_pose',
    onAudioFeedback: speak,
    views: VIEWS,
    webcamVideo,
  });

  // Flow state management - simple linear progression
  useEffect(() => {
    if (!hasPermission || !isAuthorized || flowState === 'capturing' || flowState === 'complete') return;

    // Step 1: Check if phone is level (waiting_level -> waiting_pose)
    if (flowState === 'waiting_level') {
      if (isVertical) {
        logCompanionMessage(sessionId || '', `Flow: waiting_level -> waiting_pose (phone is vertical)`, 'info');
        setFlowState('waiting_pose');
        setTimeout(() => speak('Good. Now get in position.'), 500);
      } else {
        // Phone not vertical yet - using console.log instead of Firestore log for frequent debug messages
        console.log('[COMPANION] Flow: waiting_level (phone not vertical yet)');
      }
      return;
    }

    // Step 2: Check if client is in frame (waiting_pose -> ready)
    if (flowState === 'waiting_pose') {
      const { isReady, message, details } = poseDetectionResult.poseValidation;
      // Using console.log instead of Firestore log for frequent debug messages
      console.log('[COMPANION] Flow: waiting_pose - isReady:', isReady, 'message:', message, 'webcamVideo:', !!webcamVideo, 'details:', details);
      
      if (isReady) {
        logCompanionMessage(sessionId || '', `Flow: waiting_pose -> ready (client in position)`, 'info');
        setFlowState('ready');
        setTimeout(() => speak('Perfect. Hold still.'), 500);
      }
      return;
    }
  }, [flowState, isVertical, hasPermission, isAuthorized, poseDetectionResult.poseValidation, webcamVideo, sessionId, speak]);

  // Capture function
  const captureImage = useCallback(async (viewIdx: number) => {
    const webcam = webcamRef.current;
    if (!webcam || !webcam.video) return;

    const viewData = VIEWS[viewIdx];
    if (!viewData) return;

    // Shutter sound
    try {
      if (shutterAudio.current) {
        void shutterAudio.current.play().catch(() => {});
      }
    } catch (e) {}

    // Take screenshot
    const imageSrc = webcam.getScreenshot();
    if (!imageSrc || !sessionId) return;

    setIsUploading(true);
    try {
      await logCompanionMessage(sessionId, `Capturing ${viewData.label}`, 'info');
      await updatePostureImage(
        sessionId,
        viewData.id,
        imageSrc,
        poseDetectionResult.currentLandmarks,
        'iphone'
      );
      await logCompanionMessage(sessionId, `${viewData.label} captured successfully`, 'info');
    } catch (err) {
      await logCompanionMessage(
        sessionId,
        `Error capturing ${viewData.label}: ${err instanceof Error ? err.message : String(err)}`,
        'error'
      );
      console.error('[CAPTURE] Error:', err);
    } finally {
      setIsUploading(false);
    }
  }, [sessionId, poseDetectionResult.currentLandmarks]);

  // Start capture sequence
  const startSequence = useCallback(() => {
    if (flowState !== 'ready' || currentView >= VIEWS.length) return;

    setFlowState('capturing');
    setCurrentView(0);
    startCountdown(0);
  }, [flowState, currentView]);

  // Countdown and capture
  const startCountdown = useCallback((viewIdx: number) => {
    if (viewIdx >= VIEWS.length) {
      setFlowState('complete');
      speak('All images captured. Returning to app.');
      return;
    }

    const viewData = VIEWS[viewIdx];
    speak(`Capturing ${viewData.label} in 5 seconds.`);

    let count = 5;
    setCountdown(count);

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
        if (count <= 3) {
          speak(count.toString());
        }
      } else {
        clearInterval(interval);
        setCountdown(null);
        captureImage(viewIdx).then(() => {
          if (viewIdx < VIEWS.length - 1) {
            speak('Turn to your right.');
            setTimeout(() => {
              startCountdown(viewIdx + 1);
            }, 3000);
          } else {
            setFlowState('complete');
            speak('All images captured. Returning to app.');
          }
        });
      }
    }, 1000);
  }, [captureImage, speak]);

  // Initial setup
  useEffect(() => {
    if (isAuthorized && !isValidating && sessionId) {
      logCompanionMessage(sessionId, `Companion authorized - mode: ${mode}`, 'info');
      if (hasPermission) {
        setFlowState('waiting_level');
        speak('Level your phone to continue.');
      } else {
        setFlowState('permissions');
      }
    }
  }, [isAuthorized, isValidating, sessionId, mode, hasPermission, speak]);

  // Loading states
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

  // Determine guide box state
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
      countdown={countdown}
      webcamRef={webcamRef}
      onCapture={() => {}}
      onStartSequence={startSequence}
      ocrReviewData={null}
      setOcrReviewData={() => {}}
      onApplyOcr={async () => {}}
      isProcessingOcr={false}
      flowState={flowState}
      guideBoxState={guideBoxState}
    />
  );
};

export default Companion;
