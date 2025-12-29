import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { validateCompanionToken, updatePostureImage, updateInBodyImage, joinLiveSession } from '@/services/liveSessions';
import { LandmarkResult } from '@/lib/ai/postureLandmarks';
import { processInBodyScan } from '@/lib/ai/ocrEngine';
import { Camera, AlertCircle, Loader2, RefreshCcw, CheckCircle2, Scan, X, Volume2, Info } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CONFIG } from '@/config';

const VIEWS = CONFIG.POSTURE_VIEWS;

// Body position validation result
interface PoseValidation {
  isReady: boolean;
  message: string;
  shortMessage: string;
  details: {
    tooClose: boolean;
    tooFar: boolean;
    notCentered: boolean;
    missingParts: string[];
  };
}

interface PoseResults {
  poseLandmarks: Array<{
    x: number;
    y: number;
    z: number;
    visibility?: number;
  }>;
  [key: string]: any;
}

const Companion = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const mode = searchParams.get('mode') || 'posture'; // 'posture' or 'inbody'
  const { toast } = useToast();
  
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [viewIdx, setViewIdx] = useState(0);
  const [isVertical, setIsVertical] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean>(() => {
    const DeviceOrientationEventAny = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<'granted' | 'denied'> };
    return typeof DeviceOrientationEventAny.requestPermission !== 'function';
  });
  const [countdown, setCountdown] = useState<number | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>((searchParams.get('mode') || 'posture') === 'inbody' ? 'environment' : 'user');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSequenceActive, setIsSequenceActive] = useState(false);
  const [isUploadingBackground, setIsUploadingBackground] = useState(0);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [ocrReviewData, setOcrReviewData] = useState<Record<string, string> | null>(null);
  
  // Real-time Pose State
  const [poseValidation, setPoseValidation] = useState<PoseValidation>({
    isReady: false,
    message: "Ready to scan",
    shortMessage: "READY",
    details: { tooClose: false, tooFar: false, notCentered: false, missingParts: [] }
  });
  const [isPoseLoading, setIsPoseLoading] = useState(false);
  const [isWaitingForPosition, setIsWaitingForPosition] = useState(false);

  const currentLandmarksRef = useRef<LandmarkResult | null>(null);
  const isVerticalRef = useRef(false);
  const isSequenceActiveRef = useRef(false);
  const viewIdxRef = useRef(0);
  const webcamRef = useRef<Webcam>(null);
  const shutterAudio = useRef<HTMLAudioElement | null>(null);
  const poseRef = useRef<import('@mediapipe/pose').Pose | null>(null);
  const lastAudioFeedbackRef = useRef<number>(0);
  const isPoseReadyRef = useRef(false);
  const checkPositionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const nextSequenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize audio and pose detector
  useEffect(() => {
    try {
      shutterAudio.current = new Audio(CONFIG.COMPANION.AUDIO.SHUTTER_URL);
    } catch (e) {
      console.warn('[COMPANION] Audio initialization failed:', e);
    }

    if (mode === 'posture') {
      initPoseDetection();
    }

    return () => {
      if (poseRef.current) {
        poseRef.current.close();
      }
    };
  }, [mode]);

  const initPoseDetection = async () => {
    try {
      setIsPoseLoading(true);
      // Dynamic import to avoid heavy bundle if not needed
      const { Pose } = await import('@mediapipe/pose');
      
      const pose = new Pose({
        locateFile: (file) => `${CONFIG.AI.MEDIAPIPE.POSE_CDN}/${file}`
      });

      pose.setOptions({
        modelComplexity: CONFIG.AI.MEDIAPIPE.MODEL_COMPLEXITY,
        smoothLandmarks: true,
        minDetectionConfidence: CONFIG.AI.MEDIAPIPE.MIN_DETECTION_CONFIDENCE,
        minTrackingConfidence: CONFIG.AI.MEDIAPIPE.MIN_TRACKING_CONFIDENCE
      });

      pose.onResults(onPoseResults);
      poseRef.current = pose;
      console.log('[POSE] Real-time pose detector initialized');
    } catch (e) {
      console.error('[POSE] Initialization failed:', e);
    } finally {
      setIsPoseLoading(false);
    }
  };

  const onPoseResults = (results: PoseResults) => {
    if (!results.poseLandmarks || results.poseLandmarks.length === 0) {
      setPoseValidation({
        isReady: false,
        message: "Step into the frame",
        shortMessage: "MISSING",
        details: { tooClose: false, tooFar: false, notCentered: false, missingParts: ['Body'] }
      });
      isPoseReadyRef.current = false;
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

    // Basic Validation Logic
    const missingParts = [];
    if ((shoulderL.visibility || 0) < 0.5 || (shoulderR.visibility || 0) < 0.5) missingParts.push('Shoulders');
    if ((ankleL.visibility || 0) < 0.5 || (ankleR.visibility || 0) < 0.5) missingParts.push('Feet');
    if ((nose.visibility || 0) < 0.5) missingParts.push('Head');

    const bodyHeight = Math.max(ankleL.y, ankleR.y) - nose.y;
    const bodyCenter = (shoulderL.x + shoulderR.x + hipL.x + hipR.x) / 4;
    
    // Store current landmarks as percentages for alignment
    const view = VIEWS[viewIdxRef.current].id;
    const shoulderCenterY = (shoulderL.y + shoulderR.y) / 2;
    const hipCenterY = (hipL.y + hipR.y) / 2;
    const headY = nose.y;
    
    const landmarkResult: LandmarkResult = {
      shoulder_y_percent: shoulderCenterY * 100,
      hip_y_percent: hipCenterY * 100,
      head_y_percent: headY * 100,
      raw: results.poseLandmarks // Pass raw points for calculation
    };

    if (view === 'front' || view === 'back') {
      landmarkResult.center_x_percent = bodyCenter * 100;
    } else {
      // For side views, use the ankle as the midfoot anchor
      const ankleX = (ankleL.x + ankleR.x) / 2;
      landmarkResult.midfoot_x_percent = ankleX * 100;
    }
    
    currentLandmarksRef.current = landmarkResult;

    const tooClose = bodyHeight > CONFIG.COMPANION.POSE_THRESHOLDS.TOO_CLOSE;
    const tooFar = bodyHeight < CONFIG.COMPANION.POSE_THRESHOLDS.TOO_FAR;
    const notCentered = Math.abs(bodyCenter - 0.5) > CONFIG.COMPANION.POSE_THRESHOLDS.NOT_CENTERED;

    let message = "Perfect, hold still";
    let shortMessage = "READY";
    let isReady = missingParts.length === 0 && !tooClose && !tooFar && !notCentered;

    if (missingParts.length > 0) {
      message = `Full body must be visible (Missing: ${missingParts.join(', ')})`;
      shortMessage = "INCOMPLETE";
      isReady = false;
    } else if (tooClose) {
      message = "You're too close, step back";
      shortMessage = "TOO CLOSE";
      isReady = false;
    } else if (tooFar) {
      message = "You're too far, step forward";
      shortMessage = "TOO FAR";
      isReady = false;
    } else if (notCentered) {
      message = bodyCenter < 0.5 ? "Move to your right" : "Move to your left";
      shortMessage = "CENTER BODY";
      isReady = false;
    }

    setPoseValidation({
      isReady,
      message,
      shortMessage,
      details: { tooClose, tooFar, notCentered, missingParts }
    });
    isPoseReadyRef.current = isReady;

    // Trigger audio feedback every 3 seconds if sequence is waiting
    if (isWaitingForPosition && !isReady && Date.now() - lastAudioFeedbackRef.current > CONFIG.COMPANION.AUDIO.FEEDBACK_INTERVAL_MS) {
      speak(message);
      lastAudioFeedbackRef.current = Date.now();
    }
  };

  // Run pose detection loop
  useEffect(() => {
    let requestRef: number;
    const update = async () => {
      if (poseRef.current && webcamRef.current?.video) {
        try {
          await poseRef.current.send({ image: webcamRef.current.video });
        } catch (e) {}
      }
      requestRef = requestAnimationFrame(update);
    };
    
    if (mode === 'posture' && isAuthorized) {
      requestRef = requestAnimationFrame(update);
    }
    
    return () => cancelAnimationFrame(requestRef);
  }, [mode, isAuthorized]);

  useEffect(() => { viewIdxRef.current = viewIdx; }, [viewIdx]);

  const speak = (text: string) => {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = CONFIG.COMPANION.AUDIO.SPEECH_RATE; 
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('[AUDIO] Speech failed:', e);
    }
  };

  const runValidation = useCallback(async () => {
    console.log('[COMPANION] Starting validation...', { sessionId, token: token ? '***' : null });
    setIsValidating(true);
    
      if (!sessionId || !token) {
      console.error('[COMPANION] Missing session info');
      setErrorMsg("Missing Session Info");
        setIsValidating(false);
        return;
      }
    
    try {
      const [valid] = await Promise.all([
        validateCompanionToken(sessionId, token),
        joinLiveSession(sessionId).catch(err => console.warn('[COMPANION] Join failed (non-critical):', err))
      ]);
      
      setIsAuthorized(valid);
      if (valid) {
        if (mode === 'inbody') {
          speak("Ready. Tap to capture the InBody report.");
        } else {
          speak("Ready. Level phone to start.");
        }
      } else {
        setErrorMsg("Invalid token. Please scan QR code again.");
      }
    } catch (e) {
      console.error('[COMPANION] Handshake Error:', e);
      setErrorMsg(`Connection Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setIsValidating(false);
    }
  }, [sessionId, token, mode]);

  useEffect(() => { runValidation(); }, [runValidation]);

  const performCapture = useCallback(async (forcedIdx?: number) => {
    const webcam = webcamRef.current;

    if (!webcam || !webcam.video) {
      speak("Camera error.");
      return;
    }

    // Explicitly use the index passed to ensure we never capture to the wrong slot
    const idx = forcedIdx !== undefined ? forcedIdx : viewIdxRef.current;
    const viewData = VIEWS[idx];

    if (!viewData) {
      console.error('[CAPTURE] Invalid index:', idx);
      return;
    }

    console.log(`[CAPTURE] Initiating sync for view ${idx}: ${viewData.id}`);

    // 1. Shutter
    try { 
      if (shutterAudio.current) {
        void shutterAudio.current.play().catch(e => console.warn('[AUDIO] Shutter failed:', e)); 
      }
    } catch (e) {
      console.warn('[AUDIO] Shutter error:', e);
    }
    
    // 2. Screenshot
    const imageSrc = webcam.getScreenshot();
    if (!imageSrc) {
      speak("Capture failed.");
      return;
    }

    // 3. Sync to App
    if (sessionId) {
      setIsUploadingBackground(prev => prev + 1);
      
      if (mode === 'inbody') {
        speak("Analyzing InBody report...");
        
        updateInBodyImage(sessionId, imageSrc)
          .then(() => {
            setIsProcessingOcr(true);
            toast({ title: "Scanning...", description: "AI is analyzing the InBody report" });
            
            // 15 second timeout - fast enough to retry quickly
            const timeoutPromise = new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Scan taking too long. Try again or enter manually.')), 15000)
            );
            
            return Promise.race([processInBodyScan(imageSrc), timeoutPromise]);
          })
          .then((result) => {
            if (result.fields && Object.keys(result.fields).length > 0) {
              setOcrReviewData(result.fields as Record<string, string>);
              speak("Data extracted. Review and confirm.");
              toast({ title: "Scan Complete!", description: "Review the extracted data below" });
            } else {
              toast({ title: "No data found", description: "Try a clearer photo with better lighting.", variant: "destructive" });
              speak("Could not read data. Try again.");
            }
          })
          .catch(err => {
            console.error('[OCR] Error:', err);
            toast({ title: "Scan Issue", description: err?.message || "Please retake or enter values manually.", variant: "destructive" });
            speak("Scan issue. Please try again.");
          })
          .finally(() => {
            setIsProcessingOcr(false);
            setIsUploadingBackground(prev => Math.max(0, prev - 1));
          });
      } else {
        // Send image with explicit view ID and captured landmarks for precise alignment
        const capturedLandmarks = currentLandmarksRef.current || undefined;
        console.log(`[CAPTURE] Sending image with landmarks for view ${viewData.id}:`, capturedLandmarks);
        
        updatePostureImage(sessionId, viewData.id, imageSrc, capturedLandmarks)
          .then(() => {
            toast({ title: `${viewData.label} Sent` });
          })
          .catch(err => {
            toast({ title: "Sync Error", variant: "destructive" });
          })
          .finally(() => setIsUploadingBackground(prev => Math.max(0, prev - 1)));

        if (idx < VIEWS.length - 1) {
          const next = idx + 1;
          console.log(`[CAPTURE] Scheduling next view: ${VIEWS[next].id}`);
          
          // Clear any pending sequence timeout
          if (nextSequenceTimeoutRef.current) {
            clearTimeout(nextSequenceTimeoutRef.current);
          }
          
          nextSequenceTimeoutRef.current = setTimeout(() => {
            startSequence(next);
          }, 4000);
        } else {
          setIsSequenceActive(false);
          isSequenceActiveRef.current = false;
          speak("Session complete. Return to the app.");
          setTimeout(() => setViewIdx(VIEWS.length), 2000);
        }
      }
    }
  }, [sessionId, toast, mode]);

  const startSequence = useCallback((idx: number) => {
    if (mode === 'inbody') {
      performCapture();
      return;
    }

    // defensive cleanup: clear ALL existing timers to prevent overlapping sequences
    if (checkPositionIntervalRef.current) {
      clearInterval(checkPositionIntervalRef.current);
      checkPositionIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (nextSequenceTimeoutRef.current) {
      clearTimeout(nextSequenceTimeoutRef.current);
      nextSequenceTimeoutRef.current = null;
    }

    // Ensure state is updated to the current index immediately
    setViewIdx(idx);

    // Allow capture even if phone isn't perfectly vertical - just warn
    if (!isVerticalRef.current) {
      speak("Try to keep phone level.");
    }

    setIsWaitingForPosition(true);
    setIsSequenceActive(true);
    isSequenceActiveRef.current = true;
    
    // New capture order: Front → Right → Back → Left (quarter turn each)
    const captureInstructions = [
      "Face the camera",
      "Turn a quarter turn to your right",
      "Turn a quarter turn more to your right", 
      "Turn a quarter turn more to your right"
    ];
    speak(`Prepare for ${VIEWS[idx].label}. ${captureInstructions[idx]}.`);

    // Helper to start the countdown and capture
    const startCountdownAndCapture = () => {
      if (checkPositionIntervalRef.current) {
        clearInterval(checkPositionIntervalRef.current);
        checkPositionIntervalRef.current = null;
      }
      setIsWaitingForPosition(false);
      
      let count = CONFIG.COMPANION.CAPTURE.COUNTDOWN_SEC;
      setCountdown(count);
      
      countdownIntervalRef.current = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setCountdown(count);
          if (count <= 3) speak(count.toString());
        } else {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          setCountdown(null);
          console.log(`[CAPTURE] Executing capture for slot ${idx}: ${VIEWS[idx].id}`);
          void performCapture(idx);
        }
      }, 1000);
    };

    // Poll for readiness - but with a fast fallback if pose detection isn't working
    let checkCount = 0;
    const maxChecks = 10; // 5 seconds max (500ms * 10)
    
    checkPositionIntervalRef.current = setInterval(() => {
      checkCount++;
      
      // If pose is ready, proceed immediately
      if (isPoseReadyRef.current) {
        speak("Position confirmed. Hold still.");
        setTimeout(startCountdownAndCapture, 500);
        return;
      }
      
      // FALLBACK: After 5 seconds, if pose detection isn't responding, just capture anyway
      if (checkCount >= maxChecks) {
        console.log('[CAPTURE] Pose detection not responding, using fallback capture');
        speak("Hold still, capturing now.");
        startCountdownAndCapture();
      }
    }, 500);

  }, [performCapture, mode]);

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    if (mode === 'inbody') return;

    const deviation = Math.abs((event.beta || 0) - 90);
    const vertical = deviation < CONFIG.COMPANION.ORIENTATION.MAX_DEVIATION_DEG;
    
    // Auto-start first view only when level AND positioning is ready
    if (vertical && !isVerticalRef.current && !isSequenceActiveRef.current && viewIdxRef.current === 0 && isAuthorized) {
      // Don't auto-start anymore, let user tap the button to initiate the "Intelligent Sequence"
    }

    isVerticalRef.current = vertical;
    setIsVertical(vertical);
  }, [isAuthorized, mode]);

  const requestPermission = async () => {
    try {
      if (shutterAudio.current) {
        shutterAudio.current.play().then(() => {
          if (shutterAudio.current) {
            shutterAudio.current.pause();
            shutterAudio.current.currentTime = 0;
          }
        }).catch(() => {});
      }
      speak("Audio enabled.");
    } catch (e) {}

    const DeviceOrientationEventAny = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<'granted' | 'denied'> };
    if (typeof DeviceOrientationEventAny.requestPermission === 'function') {
      const state = await DeviceOrientationEventAny.requestPermission();
      if (state === 'granted') setHasPermission(true);
    } else setHasPermission(true);
  };

  useEffect(() => {
    if (!isAuthorized || !hasPermission || mode === 'inbody') return;
    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [isAuthorized, hasPermission, handleOrientation, mode]);

  if (isValidating) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white font-black uppercase">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
        <div>Connecting...</div>
      </div>
    );
  }
  
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-white text-center font-black">
        <h1 className="text-2xl mb-2">Session Invalid</h1>
        <p className="mt-2 text-xs text-white/40">{errorMsg || 'Unable to connect'}</p>
        <Button onClick={() => runValidation()} className="mt-6 bg-primary hover:brightness-110">Retry</Button>
      </div>
    );
  }

  // Completion screens...
  if (mode === 'inbody' && viewIdx === 999) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-white text-center">
        <div className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tight mb-2">Data Added</h1>
        <p className="text-white/60 text-sm uppercase tracking-widest mb-4">InBody data has been added to the app.</p>
        <p className="text-white/40 text-xs">You can close this window.</p>
      </div>
    );
  }

  if (mode === 'inbody' && isProcessingOcr) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-white text-center">
        <div className="relative h-32 w-32 mb-8">
          <div className="absolute inset-0 rounded-full border-4 border-white/5" />
          <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
          <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-primary to-brand-dark animate-pulse flex items-center justify-center">
            <Loader2 className="h-10 w-10 text-white animate-spin" />
          </div>
        </div>
        <h1 className="text-2xl font-black uppercase tracking-tight mb-2">Scanning...</h1>
        <p className="text-white/60 text-sm">Extracting data from your InBody report</p>
      </div>
    );
  }

  if (mode === 'inbody' && ocrReviewData) {
    const fieldLabels: Record<string, string> = {
      inbodyScore: 'InBody Score',
      inbodyWeightKg: 'Weight (kg)',
      skeletalMuscleMassKg: 'SMM (kg)',
      bodyFatMassKg: 'BFM (kg)',
      inbodyBodyFatPct: 'Body Fat %',
      inbodyBmi: 'BMI',
      totalBodyWaterL: 'Total Body Water (L)',
      waistHipRatio: 'Waist-Hip Ratio',
      visceralFatLevel: 'Visceral Fat Level',
      bmrKcal: 'BMR (kcal)',
      segmentalTrunkKg: 'Trunk (kg)',
      segmentalArmLeftKg: 'Left Arm (kg)',
      segmentalArmRightKg: 'Right Arm (kg)',
      segmentalLegLeftKg: 'Left Leg (kg)',
      segmentalLegRightKg: 'Right Leg (kg)'
    };

    const handleApply = async () => {
      if (!sessionId) return;
      try {
        setIsUploadingBackground(prev => prev + 1);
        const sessionRef = doc(db, 'live_sessions', sessionId);
        await setDoc(sessionRef, {
          ocrReviewData: ocrReviewData,
          ocrDataReady: true,
          ocrDataSentAt: Timestamp.now()
        }, { merge: true });
        speak("Data has been added to the app.");
        setOcrReviewData(null);
        setTimeout(() => { setViewIdx(999); }, 500);
      } catch (err) {
        toast({ title: "Error", variant: "destructive" });
      } finally {
        setIsUploadingBackground(prev => Math.max(0, prev - 1));
      }
    };

    return (
      <div className="min-h-screen bg-black text-white p-6 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Scan className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-black uppercase tracking-tight">Review Data</h1>
          </div>
          <button onClick={() => setOcrReviewData(null)} className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 mb-6">
          {Object.entries(ocrReviewData).map(([key, value]) => (
            <div key={key} className="bg-white/5 rounded-xl p-4 border border-white/10">
              <label className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 block">{fieldLabels[key] || key}</label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={value || ''}
                  onChange={(e) => setOcrReviewData(prev => prev ? { ...prev, [key]: e.target.value } : null)}
                  className="bg-white/10 border-white/20 text-white text-lg font-bold h-10 flex-1"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 pt-4 border-t border-white/10">
          <Button variant="outline" onClick={() => setOcrReviewData(null)} className="flex-1 bg-white/10 text-white">Cancel</Button>
          <Button onClick={handleApply} disabled={isUploadingBackground > 0} className="flex-1 bg-primary">Apply</Button>
        </div>
      </div>
    );
  }

  if (mode === 'posture' && viewIdx >= VIEWS.length) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-white text-center">
        <div className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tight mb-2">Sync Complete</h1>
        <p className="text-white/60 text-sm uppercase tracking-widest">Return to the app.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center overflow-hidden">
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        mirrored={facingMode === 'user'}
        videoConstraints={{ 
          facingMode, 
          width: CONFIG.COMPANION.CAPTURE.VIDEO_CONSTRAINTS.width, 
          height: CONFIG.COMPANION.CAPTURE.VIDEO_CONSTRAINTS.height 
        }}
        className="h-full w-full object-contain z-0"
      />

      {/* Real-time Feedback Overlays */}
      {mode === 'posture' && !isSequenceActive && (
        <div className="absolute top-20 left-0 right-0 flex flex-col items-center gap-2 z-50 pointer-events-none px-6">
          <div className={`px-4 py-2 rounded-full border flex items-center gap-2 transition-all ${
            poseValidation.isReady ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-red-500/20 border-red-500/50 text-red-400'
          }`}>
            {poseValidation.isReady ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span className="text-xs font-black uppercase tracking-widest">{poseValidation.message}</span>
          </div>
          <div className="px-3 py-1 rounded-full bg-black/40 border border-white/10 text-[10px] font-black text-white/80 tracking-[0.2em] uppercase shadow-lg">
            VIEW: {VIEWS[viewIdx].label}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-16 flex items-center z-20 pointer-events-none">
        <div className="flex flex-col ml-6">
          <h2 className="text-sm font-black text-white/80 uppercase tracking-widest drop-shadow-lg">
            {mode === 'inbody' ? 'INBODY SCAN' : VIEWS[viewIdx].label}
          </h2>
          {isPoseLoading && <span className="text-[10px] text-white/40">Initializing AI...</span>}
        </div>
      </div>
          
      {/* Guide Box */}
      {mode !== 'inbody' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className={`w-[85%] max-w-lg aspect-[1/1.8] border-[4px] rounded-[50px] transition-all duration-500 ${
            isVertical ? (poseValidation.isReady ? 'border-emerald-500 shadow-[0_0_30px_#10b98166]' : 'border-amber-500 shadow-[0_0_30px_#f59e0b66]') : 'border-red-500 shadow-[0_0_30px_#ef444466]'
          }`} style={{ height: 'calc(100vh - 180px)' }}>
            {/* Visual Indicators for Center/Missing */}
            {!poseValidation.isReady && !isWaitingForPosition && (
              <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40">
                {poseValidation.details.notCentered && <div className="h-full w-1 bg-amber-500/50" />}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Countdown */}
      {countdown !== null && mode !== 'inbody' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-30 pointer-events-none">
          <span className="text-[180px] font-black text-white animate-pulse">{countdown}</span>
        </div>
      )}

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 h-32 flex items-center justify-center z-40 px-6 pb-4">
        {mode === 'inbody' ? (
          <div className="flex items-center justify-center w-full">
            <button onClick={() => performCapture()} className="h-16 w-16 rounded-full border-4 border-white bg-white/20 flex items-center justify-center transition-all">
              <Camera className="h-6 w-6 text-white" />
            </button>
          </div>
        ) : !hasPermission ? (
          <Button onClick={requestPermission} className="bg-primary h-12 px-6 rounded-xl text-xs font-black uppercase">Enable Sensors & Audio</Button>
        ) : (
          <div className="flex items-center gap-4 w-full max-w-md justify-center">
            <Button variant="ghost" size="icon" onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')} className="text-white/30 h-10 w-10 rounded-full bg-white/5">
              <RefreshCcw className="h-4 w-4" />
            </Button>

            {!isVertical && (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Level Phone</span>
              </div>
            )}

          <div className="flex items-center justify-center">
            {!isSequenceActive ? (
              <button 
                onClick={() => startSequence(viewIdx)} 
                disabled={!isVertical} 
                className={`h-16 w-16 rounded-full border-4 flex items-center justify-center transition-all ${isVertical ? 'border-white bg-white/20' : 'border-white/10 bg-white/5 opacity-40'}`}
              >
                <Camera className={`h-6 w-6 ${isVertical ? 'text-white' : 'text-white/40'}`} />
              </button>
            ) : (
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2 text-emerald-500 font-black text-[10px] uppercase tracking-widest">
                    {isUploadingBackground > 0 ? (
                      <><Loader2 className="h-3 w-3 animate-spin" /> Syncing...</>
                    ) : isWaitingForPosition ? (
                      <><Loader2 className="h-3 w-3 animate-spin text-amber-500" /> <span className="text-amber-500">Align Body...</span></>
                    ) : (
                      <><div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Capturing...</>
                    )}
                  </div>
                </div>
              )}
            </div>

            {isVertical && !isSequenceActive && (
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${poseValidation.isReady ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'}`} />
                <span className={`text-[10px] font-black uppercase tracking-widest ${poseValidation.isReady ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {poseValidation.shortMessage}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Companion;
