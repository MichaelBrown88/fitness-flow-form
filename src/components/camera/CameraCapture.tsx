import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Button } from '../ui/button';
import { X, AlertCircle, Smartphone, Camera, RefreshCcw, Maximize2, Minimize2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/utils/logger';

/**
 * MANUAL SNAP VERSION
 * Version: 2.3.0 (Advanced Posture Overlays)
 */

interface CameraCaptureProps {
  onCapture: (imageSrc: string) => void;
  onClose: () => void;
  mode: 'ocr' | 'posture';
  overlayText?: string;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  onClose,
  mode,
  overlayText
}) => {
  const webcamRef = useRef<Webcam>(null);
  const [consentGiven, setConsentGiven] = useState(mode !== 'posture'); // posture requires explicit consent
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(mode === 'posture' ? 'user' : 'environment');
  const [error, setError] = useState<string | null>(null);
  const [tilt, setTilt] = useState<number>(0);
  const [isVertical, setIsVertical] = useState(mode === 'ocr'); // Always vertical for OCR
  const [orientationDenied, setOrientationDenied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const onFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFSChange);
    return () => document.removeEventListener('fullscreenchange', onFSChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Gyroscope logic for posture
  useEffect(() => {
    if (mode !== 'posture') return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const beta = event.beta || 0;
      const deviation = Math.abs(beta - 90);
      setTilt(deviation);
      setIsVertical(deviation < 5);
    };

    // Use a helper type or explicit check for the permission API
    const DeviceOrientationEventWithPermission = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    if (typeof DeviceOrientationEventWithPermission.requestPermission === 'function') {
      DeviceOrientationEventWithPermission.requestPermission()
        .then((state) => {
          if (state === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
          } else {
            setOrientationDenied(true);
          }
        })
        .catch((e: unknown) => logger.error('[CameraCapture] deviceorientation permission', e));
    } else {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [mode]);

  const performCapture = useCallback(() => {
    if (mode === 'posture' && !isVertical) {
      toast({ title: "Phone not level", description: "Hold the phone vertically and try again.", variant: "destructive" });
      return;
    }

    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) {
      toast({ title: "Couldn't capture image", description: "Try again or close and reopen the camera.", variant: "destructive" });
      return;
    }

    onCapture(imageSrc);
  }, [onCapture, toast, mode, isVertical]);

  const handleUserMediaError = (err: string | DOMException) => {
    logger.error('Webcam error:', err);
    const name = typeof err === 'string' ? err : err.name;
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      setError('Camera access denied. Check your browser permissions and try again.');
    } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      setError('No camera found on this device.');
    } else if (name === 'NotReadableError' || name === 'TrackStartError') {
      setError('Camera is in use by another app. Close it and try again.');
    } else {
      setError('Could not access camera.');
    }
  };

  // Posture consent gate — must be accepted before camera initialises
  if (!consentGiven) {
    return (
      <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col items-center justify-center p-8 font-sans">
        <div className="max-w-sm w-full bg-zinc-900 rounded-2xl p-6 space-y-5">
          <h3 className="text-base font-semibold text-white">Before we capture your posture photos</h3>
          <p className="text-sm text-white/70 leading-relaxed">
            These photos are used to generate a fitness posture observation for your coach. They are stored securely and used only for your assessment.
          </p>
          <p className="text-sm font-medium text-amber-400">
            This is not a medical assessment. Posture observations are for fitness coaching context only and do not constitute a clinical diagnosis.
          </p>
          <p className="text-xs text-white/50 leading-relaxed">
            You can request deletion of your data at any time from your report page.
          </p>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 border-white/20 text-white/70">
              Cancel
            </Button>
            <Button onClick={() => setConsentGiven(true)} className="flex-1 bg-primary text-primary-foreground">
              I understand, continue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col overflow-hidden font-sans">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-6 bg-gradient-to-b from-black/90 to-transparent">
        <div className="flex flex-col">
          <h3 className="text-sm font-semibold text-white/90">
            {mode === 'ocr' ? 'Report Scanner' : 'Posture Analysis'}
          </h3>
          {overlayText && (
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary mt-1">{overlayText}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {mode === 'posture' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
              aria-label="Flip camera"
              className="text-white hover:bg-background/20 h-12 w-12 rounded-full backdrop-blur-md border border-white/10"
            >
              <RefreshCcw className="h-5 w-5" />
            </Button>
          )}
          {typeof document !== 'undefined' && 'requestFullscreen' in document.documentElement && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              className="text-white hover:bg-background/20 h-12 w-12 rounded-full backdrop-blur-md border border-white/10"
            >
              {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-background/20 h-12 w-12 rounded-full backdrop-blur-md border border-white/10"
          >
            <X className="h-8 w-8" />
          </Button>
        </div>
      </div>

      {/* Camera View */}
      <div className="absolute inset-0 bg-black">
        {!error ? (
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              facingMode: facingMode,
              width: { ideal: 4096 },
              height: { ideal: 2160 },
            }}
            onUserMedia={() => setIsCameraReady(true)}
            onUserMediaError={handleUserMediaError}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center z-10">
            <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
            <p className="text-xl text-red-400 font-medium mb-6">{error}</p>
            <Button variant="outline" onClick={onClose} className="border-white text-white">Close</Button>
          </div>
        )}

        {/* Static Guide Frame */}
        {isCameraReady && !error && mode === 'ocr' && (
          <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center p-8">
            <div className="w-full max-w-sm aspect-[1/1.4] border-2 border-white/30 rounded-3xl relative">
              {/* Corner Accents */}
              <div className="absolute -top-1 -left-1 w-12 h-12 border-t-4 border-l-4 border-white rounded-tl-2xl" />
              <div className="absolute -top-1 -right-1 w-12 h-12 border-t-4 border-r-4 border-white rounded-tr-2xl" />
              <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-4 border-l-4 border-white rounded-bl-2xl" />
              <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-4 border-r-4 border-white rounded-br-2xl" />
              
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-white/70 text-xs font-semibold text-center px-4 leading-relaxed">
                  Align your body composition report within this frame
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Posture Overlays */}
        {isCameraReady && !error && mode === 'posture' && (
          <div className="absolute inset-0 z-20 pointer-events-none flex flex-col items-center">
            {/* Head Box */}
            <div className="w-full h-[15%] border-b border-white/20 bg-background/5 flex items-center justify-center">
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30">Head Area</span>
            </div>
            
            {/* Center Line */}
            <div className="flex-1 w-px border-l border-dashed border-white/40 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 border-2 border-white/20 rounded-full flex items-center justify-center">
                <div className="w-1 h-1 bg-background/40 rounded-full" />
              </div>
            </div>

            {/* Feet Box */}
            <div className="w-full h-[15%] border-t border-white/20 bg-background/5 flex items-center justify-center">
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30">Feet Area</span>
            </div>

            {/* Orientation denied warning */}
            {orientationDenied && (
              <div className="absolute inset-0 z-40 flex items-end justify-center p-8 pb-40">
                <div className="bg-orange-600/90 text-white px-5 py-4 rounded-2xl flex flex-col items-center gap-1.5 max-w-xs text-center animate-in zoom-in-95">
                  <Smartphone className="h-6 w-6" />
                  <p className="font-bold text-sm">Motion access denied</p>
                  <p className="text-xs text-white/85 leading-snug">
                    Settings → Safari → Motion & Orientation Access, then reload.
                  </p>
                </div>
              </div>
            )}
            {/* Tilt Warning */}
            {!orientationDenied && !isVertical && (
              <div className="absolute inset-0 z-40 flex items-center justify-center p-12 bg-black/40 backdrop-blur-[2px]">
                <div className="bg-red-600/90 text-white px-6 py-4 rounded-2xl flex flex-col items-center gap-2 animate-in zoom-in-95">
                  <Smartphone className="h-8 w-8" />
                  <p className="font-bold text-sm text-center">Hold phone upright</p>
                  <p className="text-xs text-white/80 text-center">Keep the phone vertical to capture</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual Capture Footer */}
      {isCameraReady && !error && (
        <div className="absolute bottom-0 left-0 right-0 z-50 p-12 flex flex-col items-center bg-gradient-to-t from-black/80 to-transparent">
          <button
            onClick={performCapture}
            disabled={mode === 'posture' && !isVertical}
            className={`group relative h-24 w-24 flex items-center justify-center active:scale-95 transition-all ${
              mode === 'posture' && !isVertical ? 'opacity-20 grayscale' : 'opacity-100'
            }`}
          >
            <div className={`absolute inset-0 rounded-full transition-all duration-300 ${
              isVertical ? 'bg-emerald-500/20 scale-110' : 'bg-background/10'
            }`} />
            <div className={`absolute inset-0 rounded-full border-4 transition-colors ${
              isVertical ? 'border-emerald-500' : 'border-white/40'
            }`} />
            <div className={`h-16 w-16 rounded-full shadow-xl transition-colors ${
              isVertical ? 'bg-emerald-500' : 'bg-background/40'
            }`} />
            <Camera className={`h-8 w-8 absolute transition-colors ${
              isVertical ? 'text-white' : 'text-foreground'
            }`} />
          </button>
          <p className="mt-6 text-white/60 text-[10px] font-black uppercase tracking-[0.15em]">
            {isVertical ? 'Tap to Capture' : 'Level Phone to Capture'}
          </p>
        </div>
      )}
    </div>
  );
};
