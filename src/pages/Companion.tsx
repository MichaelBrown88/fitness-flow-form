import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { validateCompanionToken, updatePostureImage, joinLiveSession } from '@/services/liveSessions';
import { Camera, AlertCircle, Loader2, RefreshCcw, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const VIEWS = [
  { id: 'front', label: 'FRONT', instr: 'Face the camera' },
  { id: 'side-right', label: 'RIGHT SIDE', instr: 'Face to your right' },
  { id: 'side-left', label: 'LEFT SIDE', instr: 'Face to your left' },
  { id: 'back', label: 'BACK', instr: 'Face away from camera' }
] as const;

const Companion = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { toast } = useToast();

  const [isValidating, setIsValidating] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [viewIdx, setViewIdx] = useState(0);
  const [isVertical, setIsVertical] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean>(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return typeof (DeviceOrientationEvent as any).requestPermission !== 'function';
  });
  const [countdown, setCountdown] = useState<number | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSequenceActive, setIsSequenceActive] = useState(false);
  const [isUploadingBackground, setIsUploadingBackground] = useState(0);

  const isVerticalRef = useRef(false);
  const isSequenceActiveRef = useRef(false);
  const viewIdxRef = useRef(0);
  const webcamRef = useRef<Webcam>(null);
  const shutterAudio = useRef(new Audio('https://www.soundjay.com/mechanical/camera-shutter-click-08.mp3'));

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
    setIsValidating(true);
      if (!sessionId || !token) {
      setErrorMsg("Missing Session Info");
        setIsValidating(false);
        return;
      }
    try {
      const valid = await validateCompanionToken(sessionId, token);
      setIsAuthorized(valid);
      if (valid) {
        // HANDSHAKE: Tell the app we are here
        await joinLiveSession(sessionId);
        speak("Ready. Level phone to start.");
      }
    } catch (e) {
      console.error('[SYNC] Handshake Error:', e);
      setErrorMsg("Connection Error");
    } finally {
      setIsValidating(false);
    }
  }, [sessionId, token]);

  useEffect(() => { runValidation(); }, [runValidation]);

  const startSequence = useCallback((idx: number) => {
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
  }, [performCapture]);

  const performCapture = useCallback(async () => {
    const idx = viewIdxRef.current;
    const viewData = VIEWS[idx];
    const webcam = webcamRef.current;

    if (!webcam || !webcam.video) {
      speak("Camera error.");
      return;
    }

    // 1. Shutter
    try { 
      void shutterAudio.current.play().catch(e => console.warn('[AUDIO] Shutter failed:', e)); 
    } catch (e) {
      console.warn('[AUDIO] Shutter error:', e);
    }
    
    // 2. Screenshot
    const imageSrc = webcam.getScreenshot();
    if (!imageSrc) {
      speak("Capture failed.");
      return;
    }

    console.log(`[SYNC] Capturing ${viewData.id}...`);

    // 3. Sync to App (Direct Data Pipe)
    if (sessionId) {
      setIsUploadingBackground(prev => prev + 1);
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
    }

    // 4. Next
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
  }, [sessionId, toast, startSequence]);

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    const deviation = Math.abs((event.beta || 0) - 90);
    const vertical = deviation < 4;
    
    if (vertical && !isVerticalRef.current && !isSequenceActiveRef.current && viewIdxRef.current === 0 && isAuthorized) {
      setTimeout(() => { if (isVerticalRef.current && !isSequenceActiveRef.current) startSequence(0); }, 1500);
    }

    isVerticalRef.current = vertical;
    setIsVertical(vertical);
  }, [isAuthorized, startSequence]);

  const requestPermission = async () => {
    // Unlock Audio Context & Speech Synthesis on iOS
    try {
      shutterAudio.current.play().then(() => {
        shutterAudio.current.pause();
        shutterAudio.current.currentTime = 0;
      }).catch(() => {});
      speak(""); // Priming speech
    } catch (e) {}

    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      const state = await (DeviceOrientationEvent as any).requestPermission();
      if (state === 'granted') setHasPermission(true);
    } else setHasPermission(true);
  };

  useEffect(() => {
    if (!isAuthorized || !hasPermission) return;
    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [isAuthorized, hasPermission, handleOrientation]);

  if (isValidating) return <div className="min-h-screen bg-black flex items-center justify-center text-white font-black uppercase">Connecting...</div>;
  if (!isAuthorized) return <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-white text-center font-black"><h1>Session Invalid</h1><p className="mt-2 text-xs text-white/40">{errorMsg}</p></div>;

  if (viewIdx >= VIEWS.length) {
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

      {/* Guide Box */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className={`h-[calc(100vh-140px)] aspect-[1/1.6] border-[4px] rounded-[50px] transition-colors duration-500 ${isVertical ? 'border-emerald-500 shadow-[0_0_30px_#10b98166]' : 'border-red-500 shadow-[0_0_30px_#ef444466]'}`} />
          </div>
          
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-24 flex items-center justify-center z-20 pointer-events-none">
        <h2 className="text-4xl font-black text-white uppercase drop-shadow-xl">{VIEWS[viewIdx].label}</h2>
          </div>

      {/* Countdown */}
      {countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-30 pointer-events-none">
          <span className="text-[180px] font-black text-white animate-pulse">{countdown}</span>
        </div>
      )}

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 h-44 flex flex-col items-center justify-center z-40 px-10">
        {!hasPermission ? (
          <Button onClick={requestPermission} className="bg-indigo-600 h-16 px-10 rounded-2xl font-black uppercase">Enable Sensors</Button>
        ) : (
          <div className="flex flex-col items-center w-full max-w-sm">
            <div className="h-12 flex items-center justify-center mb-4">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')} className="text-white/30 h-10 w-10 rounded-full bg-white/5"><RefreshCcw className="h-4 w-4" /></Button>
                <div className={`h-3 w-3 rounded-full ${isVertical ? 'bg-emerald-500 shadow-[0_0_15px_#10b981]' : 'bg-red-500 animate-pulse'}`} />
                <span className={`text-[10px] font-black uppercase tracking-widest ${isVertical ? 'text-emerald-500' : 'text-red-500'}`}>{isVertical ? 'Ready' : 'Level Phone'}</span>
              </div>
            </div>
            <div className="flex items-center justify-center w-full h-20">
              {!isSequenceActive ? (
                <button onClick={() => startSequence(viewIdx)} disabled={!isVertical} className={`h-20 w-20 rounded-full border-[6px] flex items-center justify-center transition-all ${isVertical ? 'border-white bg-white/20' : 'border-white/10 bg-white/5 opacity-40'}`}><Camera className="h-8 w-8 text-white" /></button>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2 text-emerald-500 font-black text-[10px] uppercase tracking-widest mb-1">
                    {isUploadingBackground > 0 ? <><Loader2 className="h-3 w-3 animate-spin" /> Syncing...</> : <><div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Capturing...</>}
            </div>
          </div>
        )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Companion;
