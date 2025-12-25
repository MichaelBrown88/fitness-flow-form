import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { validateCompanionToken, updatePostureImage, updateInBodyImage, joinLiveSession } from '@/services/liveSessions';
import { processInBodyScan } from '@/lib/ai/ocrEngine';
import { Camera, AlertCircle, Loader2, RefreshCcw, CheckCircle2, Scan, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const VIEWS = [
  { id: 'front', label: 'FRONT', instr: 'Face the camera' },
  { id: 'back', label: 'BACK', instr: 'Face away from camera' },
  { id: 'side-left', label: 'LEFT SIDE', instr: 'Face to your left' },
  { id: 'side-right', label: 'RIGHT SIDE', instr: 'Face to your right' }
] as const;

const Companion = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const mode = searchParams.get('mode') || 'posture'; // 'posture' or 'inbody'
  const { toast } = useToast();
  
  console.log('[COMPANION] Component mounting', { sessionId, hasToken: !!token, mode });

  const [isValidating, setIsValidating] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [viewIdx, setViewIdx] = useState(0);
  const [isVertical, setIsVertical] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean>(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return typeof (DeviceOrientationEvent as any).requestPermission !== 'function';
  });
  const [countdown, setCountdown] = useState<number | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>((searchParams.get('mode') || 'posture') === 'inbody' ? 'environment' : 'user');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSequenceActive, setIsSequenceActive] = useState(false);
  const [isUploadingBackground, setIsUploadingBackground] = useState(0);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [ocrReviewData, setOcrReviewData] = useState<Record<string, string> | null>(null);

  const isVerticalRef = useRef(false);
  const isSequenceActiveRef = useRef(false);
  const viewIdxRef = useRef(0);
  const webcamRef = useRef<Webcam>(null);
  const shutterAudio = useRef<HTMLAudioElement | null>(null);
  
  // Initialize audio safely
  useEffect(() => {
    try {
      shutterAudio.current = new Audio('https://www.soundjay.com/mechanical/camera-shutter-click-08.mp3');
    } catch (e) {
      console.warn('[COMPANION] Audio initialization failed:', e);
    }
  }, []);

  useEffect(() => { viewIdxRef.current = viewIdx; }, [viewIdx]);

  const speak = (text: string) => {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
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
      // Optimize: Join session immediately (parallel with validation)
      const [valid] = await Promise.all([
        validateCompanionToken(sessionId, token),
        joinLiveSession(sessionId).catch(err => console.warn('[COMPANION] Join failed (non-critical):', err))
      ]);
      
      console.log('[COMPANION] Token validation result:', valid);
      
      setIsAuthorized(valid);
      if (valid) {
        console.log('[COMPANION] Successfully joined session');
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
  }, [sessionId, token]);

  useEffect(() => { runValidation(); }, [runValidation]);

  const performCapture = useCallback(async () => {
    const webcam = webcamRef.current;

    if (!webcam || !webcam.video) {
      speak("Camera error.");
      return;
    }

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

    // 3. Sync to App (Direct Data Pipe)
    if (sessionId) {
      setIsUploadingBackground(prev => prev + 1);
      
      if (mode === 'inbody') {
        console.log(`[SYNC] Capturing InBody scan...`);
        // First upload the image
        updateInBodyImage(sessionId, imageSrc)
          .then(() => {
            console.log(`[SYNC] Image uploaded, starting OCR...`);
            // Then process OCR locally
            setIsProcessingOcr(true);
            return processInBodyScan(imageSrc);
          })
          .then((result) => {
            if (result.fields && Object.keys(result.fields).length > 0) {
              console.log(`[OCR] Success:`, result.fields);
              setOcrReviewData(result.fields as Record<string, string>);
              speak("Data extracted. Review and confirm.");
            } else {
              toast({ 
                title: "Scan failed", 
                description: "AI couldn't find data. Please try again.",
                variant: "destructive" 
              });
              speak("Scan failed. Please try again.");
            }
          })
          .catch(err => {
            console.error(`[SYNC/OCR] FAIL:`, err);
            toast({ title: "Error", description: "Failed to process scan.", variant: "destructive" });
            speak("Error processing scan.");
          })
          .finally(() => {
            setIsProcessingOcr(false);
            setIsUploadingBackground(prev => Math.max(0, prev - 1));
          });
      } else {
        // Posture mode
        const idx = viewIdxRef.current;
        const viewData = VIEWS[idx];
        console.log(`[SYNC] Capturing ${viewData.id}...`);
        console.log(`[SYNC] Pumping ${viewData.label} to App...`);
        
        updatePostureImage(sessionId, viewData.id, imageSrc)
          .then(() => {
            console.log(`[SYNC] SUCCESS: ${viewData.label}`);
            toast({ title: "Photo Sent" });
          })
          .catch(err => {
            console.error(`[SYNC] FAIL: ${viewData.label}`, err);
            toast({ title: "Sync Error", variant: "destructive" });
          })
          .finally(() => setIsUploadingBackground(prev => Math.max(0, prev - 1)));

        // 4. Next (posture only)
        if (idx < VIEWS.length - 1) {
          const next = idx + 1;
          setViewIdx(next);
          setTimeout(() => startSequence(next), 2500);
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
      // InBody mode: simple tap-to-capture, no countdown or auto-start
      // User manually taps to capture
      return;
    } else {
      // Posture mode: requires level phone
    if (!isVerticalRef.current) {
      speak("Level the phone first.");
      setIsSequenceActive(false);
      return;
    }

    setIsSequenceActive(true);
    isSequenceActiveRef.current = true;
    speak(VIEWS[idx].instr);
    
    setTimeout(() => {
      let count = 5;
      setCountdown(count);
      const interval = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setCountdown(count);
          if (count <= 3) speak(count.toString());
        } else {
          clearInterval(interval);
          setCountdown(null);
          void performCapture();
        }
      }, 1000);
    }, 2000);
    }
  }, [performCapture, mode]);

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    if (mode === 'inbody') {
      // InBody mode doesn't need orientation check
      return;
    }

    const deviation = Math.abs((event.beta || 0) - 90);
    const vertical = deviation < 4;
    
    if (vertical && !isVerticalRef.current && !isSequenceActiveRef.current && viewIdxRef.current === 0 && isAuthorized) {
      setTimeout(() => { if (isVerticalRef.current && !isSequenceActiveRef.current) startSequence(0); }, 1500);
    }

    isVerticalRef.current = vertical;
    setIsVertical(vertical);
  }, [isAuthorized, startSequence, mode]);

  const requestPermission = async () => {
    // Unlock Audio Context & Speech Synthesis on iOS
    try {
      if (shutterAudio.current) {
      shutterAudio.current.play().then(() => {
          if (shutterAudio.current) {
        shutterAudio.current.pause();
        shutterAudio.current.currentTime = 0;
          }
      }).catch(() => {});
      }
      speak(""); // Priming speech
    } catch (e) {}

    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      const state = await (DeviceOrientationEvent as any).requestPermission();
      if (state === 'granted') setHasPermission(true);
    } else setHasPermission(true);
  };

  useEffect(() => {
    if (!isAuthorized || !hasPermission || mode === 'inbody') return;
    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [isAuthorized, hasPermission, handleOrientation, mode]);

  // InBody mode: no auto-start, user taps to capture

  // Always show something, even if there's an error
  if (isValidating) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white font-black uppercase">
        <div>Connecting...</div>
        <div className="text-xs text-white/40 mt-4 font-normal normal-case">
          {sessionId ? `Session: ${sessionId}` : 'No session ID'}
        </div>
      </div>
    );
  }
  
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-white text-center font-black">
        <h1 className="text-2xl mb-2">Session Invalid</h1>
        <p className="mt-2 text-xs text-white/40">{errorMsg || 'Unable to connect'}</p>
        <Button 
          onClick={() => runValidation()} 
          className="mt-6 bg-indigo-600 hover:bg-indigo-700"
        >
          Retry
        </Button>
      </div>
    );
  }

  // Completion screen (after data sent)
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

  // OCR Processing Screen
  if (mode === 'inbody' && isProcessingOcr) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-white text-center">
        <div className="relative h-32 w-32 mb-8">
          <div className="absolute inset-0 rounded-full border-4 border-white/5" />
          <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin" />
          <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 animate-pulse flex items-center justify-center">
            <Loader2 className="h-10 w-10 text-white animate-spin" />
          </div>
        </div>
        <h1 className="text-2xl font-black uppercase tracking-tight mb-2">Scanning...</h1>
        <p className="text-white/60 text-sm">Extracting data from your InBody report</p>
      </div>
    );
  }

  // OCR Review Screen
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
        // Store OCR data in Firestore for the main app to pick up
        const sessionRef = doc(db, 'live_sessions', sessionId);
        await setDoc(sessionRef, {
          ocrReviewData: ocrReviewData,
          ocrDataReady: true,
          ocrDataSentAt: Timestamp.now()
        }, { merge: true });
        
        console.log('[OCR] Data sent to Firestore:', ocrReviewData);
        
        // Show success message and close after a moment
        speak("Data has been added to the app.");
        setOcrReviewData(null);
        
        // Set a flag to show completion screen
        setTimeout(() => {
          setViewIdx(999); // Use a high number to trigger completion screen
        }, 500);
      } catch (err) {
        console.error('[OCR] Failed to send data:', err);
        toast({ title: "Error", description: "Failed to send data.", variant: "destructive" });
      } finally {
        setIsUploadingBackground(prev => Math.max(0, prev - 1));
      }
    };

    return (
      <div className="min-h-screen bg-black text-white p-6 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Scan className="h-5 w-5 text-indigo-400" />
            <h1 className="text-xl font-black uppercase tracking-tight">Review Data</h1>
          </div>
          <button 
            onClick={() => setOcrReviewData(null)}
            className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-white/60 text-sm mb-6">
          Verify the extracted values. Tap any field to edit.
        </p>

        <div className="flex-1 overflow-y-auto space-y-3 mb-6">
          {Object.entries(ocrReviewData).map(([key, value]) => (
            <div key={key} className="bg-white/5 rounded-xl p-4 border border-white/10">
              <label className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2 block">
                {fieldLabels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={value || ''}
                  onChange={(e) => {
                    setOcrReviewData(prev => prev ? { ...prev, [key]: e.target.value } : null);
                  }}
                  className="bg-white/10 border-white/20 text-white text-lg font-bold h-10 flex-1"
                  placeholder="--"
                />
                <span className="text-xs text-white/40 font-bold min-w-[30px]">
                  {key.toLowerCase().includes('kg') ? 'kg' : 
                   key.toLowerCase().includes('pct') || key.toLowerCase().includes('fat') && key.toLowerCase().includes('pct') ? '%' : 
                   key.toLowerCase().includes('water') || key.toLowerCase().includes('l') ? 'L' : 
                   key.toLowerCase().includes('kcal') ? 'kcal' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-4 border-t border-white/10">
          <Button
            variant="outline"
            onClick={() => setOcrReviewData(null)}
            className="flex-1 bg-white/10 border-white/20 text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={isUploadingBackground > 0}
            className="flex-1 bg-indigo-600 text-white"
          >
            {isUploadingBackground > 0 ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Send to App
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Posture mode completion
  if (mode === 'posture' && viewIdx >= VIEWS.length) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-white text-center">
        <div className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tight mb-2">Sync Complete</h1>
        <p className="text-white/60 text-sm uppercase tracking-widest">Photos are on your main app screen.</p>
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
            width: { ideal: 1280 }, 
            height: { ideal: 720 } 
          }}
          className="h-full w-full object-contain z-0"
        />

      {/* Header - Small text in top left like InBody */}
      <div className="absolute top-0 left-0 right-0 h-16 flex items-center z-20 pointer-events-none">
        {mode === 'inbody' ? (
          <h2 className="text-sm font-black text-white/80 uppercase tracking-widest ml-6 drop-shadow-lg">INBODY SCAN</h2>
        ) : (
          <h2 className="text-sm font-black text-white/80 uppercase tracking-widest ml-6 drop-shadow-lg">{VIEWS[viewIdx].label}</h2>
        )}
          </div>
          
      {/* Guide Box - Only for posture mode, sized to fit person */}
      {mode !== 'inbody' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className={`w-[70%] max-w-md aspect-[1/1.6] border-[4px] rounded-[50px] transition-colors duration-500 ${isVertical ? 'border-emerald-500 shadow-[0_0_30px_#10b98166]' : 'border-red-500 shadow-[0_0_30px_#ef444466]'}`} 
               style={{ height: 'calc(100vh - 200px)' }} />
          </div>
      )}

      {/* Countdown - Only for posture mode */}
      {countdown !== null && mode !== 'inbody' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-30 pointer-events-none">
          <span className="text-[180px] font-black text-white animate-pulse">{countdown}</span>
        </div>
      )}

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 h-32 flex items-center justify-center z-40 px-6 pb-4">
        {mode === 'inbody' ? (
          // InBody mode: Simple interface - just capture button
          <div className="flex items-center justify-center w-full">
            <button onClick={() => performCapture()} className="h-16 w-16 rounded-full border-4 border-white bg-white/20 flex items-center justify-center transition-all hover:scale-105 active:scale-95">
              <Camera className="h-6 w-6 text-white" />
            </button>
          </div>
        ) : !hasPermission ? (
          <Button onClick={requestPermission} className="bg-indigo-600 h-12 px-6 rounded-xl text-xs font-black uppercase">Enable Sensors</Button>
        ) : (
          <div className="flex items-center gap-4 w-full max-w-md justify-center">
            {/* Flip camera button - left side */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')} 
              className="text-white/30 h-10 w-10 rounded-full bg-white/5"
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>

            {/* Level phone status - left of button */}
            {!isVertical && (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Level Phone</span>
              </div>
            )}

            {/* Capture button */}
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
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        Capturing...
                      </>
                    )}
            </div>
          </div>
        )}
            </div>

            {/* Ready status - right of button */}
            {isVertical && !isSequenceActive && (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Ready</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Companion;
