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
import { updatePostureImage, updateHeartbeat } from '@/services/liveSessions';
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
  
  // Audio throttling - prevent overlapping speech (3 second minimum interval)
  const lastAudioTimeRef = useRef<number>(0);
  const AUDIO_THROTTLE_MS = 3000;
  
  // Sequence control refs for cancellation
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const turnDelayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSequenceCancelledRef = useRef(false);

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

  // Pre-warm MediaPipe - load WASM/models while user reads permission prompt
  // This reduces latency when the capture sequence actually starts
  // Note: We only call initialize(), not send() - send() requires a valid video frame
  useEffect(() => {
    if (mode !== 'posture') return;
    
    let pose: import('@mediapipe/pose').Pose | null = null;
    
    const prewarmMediaPipe = async () => {
      try {
        console.log('[MEDIAPIPE] Pre-warming: Loading WASM and model files...');
        const { Pose } = await import('@mediapipe/pose');
        
        pose = new Pose({
          locateFile: (file) => `${CONFIG.AI.MEDIAPIPE.POSE_CDN}/${file}`,
        });
        
        pose.setOptions({
          modelComplexity: CONFIG.AI.MEDIAPIPE.MODEL_COMPLEXITY,
          smoothLandmarks: true,
          minDetectionConfidence: CONFIG.AI.MEDIAPIPE.MIN_DETECTION_CONFIDENCE,
          minTrackingConfidence: CONFIG.AI.MEDIAPIPE.MIN_TRACKING_CONFIDENCE,
        });
        
        // Initialize loads the WASM and model files
        await pose.initialize();
        console.log('[MEDIAPIPE] Pre-warming complete: Models loaded');
        
        // Close the pre-warm instance - usePoseDetection will create its own
        // The browser will have cached the files
        pose.close();
        pose = null;
      } catch (e) {
        console.warn('[MEDIAPIPE] Pre-warming failed (non-critical):', e);
      }
    };
    
    prewarmMediaPipe();
    
    return () => {
      if (pose) {
        pose.close();
      }
    };
  }, [mode]);

  // Session heartbeat - update every 5 seconds while active
  // This allows desktop to detect connection drops
  useEffect(() => {
    if (!sessionId || flowState === 'complete') return;
    
    // Send initial heartbeat
    updateHeartbeat(sessionId).catch(() => {});
    
    // Update heartbeat every 5 seconds
    const heartbeatInterval = setInterval(() => {
      updateHeartbeat(sessionId).catch((err) => {
        console.warn('[HEARTBEAT] Failed to update:', err);
      });
    }, 5000);
    
    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [sessionId, flowState]);

  // Authentication
  const { isValidating, isAuthorized, errorMsg, runValidation } = useCompanionAuth(
    sessionId,
    token,
    mode
  );

  // Audio feedback
  const { speak, requestPermission: requestAudioPermission, hasPermission: hasAudioPermission } =
    useAudioFeedback();

  // Throttled speak wrapper - prevents audio stuttering/overlap
  const throttledSpeak = useCallback((text: string, force: boolean = false) => {
    const now = Date.now();
    if (force || now - lastAudioTimeRef.current >= AUDIO_THROTTLE_MS) {
      lastAudioTimeRef.current = now;
      speak(text);
    } else {
      console.log('[AUDIO] Throttled:', text);
    }
  }, [speak]);

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
      throttledSpeak('Level your phone to continue.', true);
    }
  }, [requestAudioPermission, requestOrientationPermission, mode, throttledSpeak]);

  const hasPermission = hasAudioPermission && hasOrientationPermission;

  // Pose detection - uses throttledSpeak for audio feedback
  const poseDetectionResult = usePoseDetection({
    mode,
    isAuthorized,
    viewIdx: currentView,
    isWaitingForPosition: flowState === 'waiting_pose',
    onAudioFeedback: throttledSpeak,
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
        setTimeout(() => throttledSpeak('Good. Now get in position.', true), 500);
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
        // Neutralization cue - clinical-grade positioning prompt
        setTimeout(() => throttledSpeak('Perfect. Stand relaxed, look straight ahead, and hold still.', true), 500);
      }
      return;
    }
  }, [flowState, isVertical, hasPermission, isAuthorized, poseDetectionResult.poseValidation, webcamVideo, sessionId, throttledSpeak]);

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

  // Cancel sequence handler
  const cancelSequence = useCallback(() => {
    console.log('[SEQUENCE] User cancelled sequence');
    isSequenceCancelledRef.current = true;
    
    // Clear any pending timers
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (turnDelayTimeoutRef.current) {
      clearTimeout(turnDelayTimeoutRef.current);
      turnDelayTimeoutRef.current = null;
    }
    
    // Reset state
    setCountdown(null);
    setFlowState('ready');
    setCurrentView(0);
    
    // Log and notify
    if (sessionId) {
      logCompanionMessage(sessionId, 'Sequence cancelled by user', 'warn');
    }
    throttledSpeak('Sequence cancelled.', true);
  }, [sessionId, throttledSpeak]);

  // Start capture sequence
  const startSequence = useCallback(() => {
    if (flowState !== 'ready' || currentView >= VIEWS.length) return;

    isSequenceCancelledRef.current = false;
    setFlowState('capturing');
    setCurrentView(0);
    startCountdown(0);
  }, [flowState, currentView]);

  // Countdown and capture with cancellation support
  const startCountdown = useCallback((viewIdx: number) => {
    // Check if cancelled
    if (isSequenceCancelledRef.current) {
      console.log('[SEQUENCE] Cancelled - stopping countdown');
      return;
    }
    
    if (viewIdx >= VIEWS.length) {
      setFlowState('complete');
      throttledSpeak('All images captured. Returning to app.', true);
      return;
    }

    setCurrentView(viewIdx);
    const viewData = VIEWS[viewIdx];
    throttledSpeak(`Capturing ${viewData.label} in 5 seconds.`, true);

    let count = 5;
    setCountdown(count);

    // Clear any existing interval
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    countdownIntervalRef.current = setInterval(() => {
      // Check if cancelled during countdown
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
          // Force countdown numbers through throttle
          speak(count.toString());
        }
      } else {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        setCountdown(null);
        
        captureImage(viewIdx).then(() => {
          // Check if cancelled after capture
          if (isSequenceCancelledRef.current) return;
          
          if (viewIdx < VIEWS.length - 1) {
            throttledSpeak('Turn to your right.', true);
            
            // Clear any existing timeout
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
  }, [captureImage, speak, throttledSpeak]);

  // Initial setup
  useEffect(() => {
    if (isAuthorized && !isValidating && sessionId) {
      logCompanionMessage(sessionId, `Companion authorized - mode: ${mode}`, 'info');
      if (hasPermission) {
        setFlowState('waiting_level');
        throttledSpeak('Level your phone to continue.', true);
      } else {
        setFlowState('permissions');
      }
    }
  }, [isAuthorized, isValidating, sessionId, mode, hasPermission, throttledSpeak]);

  // Cleanup timers on unmount
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
      onCancelSequence={cancelSequence}
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
