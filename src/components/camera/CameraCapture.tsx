import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Button } from '../ui/button';
import { X, AlertCircle, Smartphone, Camera, RefreshCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(mode === 'posture' ? 'user' : 'environment');
  const [error, setError] = useState<string | null>(null);
  const [tilt, setTilt] = useState<number>(0);
  const [isVertical, setIsVertical] = useState(mode === 'ocr'); // Always vertical for OCR
  const { toast } = useToast();

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
          }
        })
        .catch(console.error);
    } else {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [mode]);

  const performCapture = useCallback(() => {
    if (mode === 'posture' && !isVertical) {
      toast({ title: "Phone not level", variant: "destructive" });
      return;
    }

    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) {
      toast({ title: "CAMERA ERROR", description: "Could not grab image.", variant: "destructive" });
      return;
    }

    onCapture(imageSrc);
  }, [onCapture, toast, mode, isVertical]);

  const handleUserMediaError = (err: string | DOMException) => {
    console.error('Webcam error:', err);
    setError('Could not access camera.');
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col overflow-hidden font-sans">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-6 bg-gradient-to-b from-black/90 to-transparent">
        <div className="flex flex-col">
          <h3 className="text-sm font-semibold text-white/90">
            {mode === 'ocr' ? 'Report Scanner' : 'Posture Analysis'}
          </h3>
          {overlayText && (
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary/60 mt-1">{overlayText}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {mode === 'posture' && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')} 
              className="text-white hover:bg-white/20 h-12 w-12 rounded-full backdrop-blur-md border border-white/10"
            >
              <RefreshCcw className="h-5 w-5" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose} 
            className="text-white hover:bg-white/20 h-12 w-12 rounded-full backdrop-blur-md border border-white/10"
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
                <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.15em] rotate-90 whitespace-nowrap">
                  Align Body Comp Report Here
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Posture Overlays */}
        {isCameraReady && !error && mode === 'posture' && (
          <div className="absolute inset-0 z-20 pointer-events-none flex flex-col items-center">
            {/* Head Box */}
            <div className="w-full h-[15%] border-b border-white/20 bg-white/5 flex items-center justify-center">
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30">Head Area</span>
            </div>
            
            {/* Center Line */}
            <div className="flex-1 w-px border-l border-dashed border-white/40 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 border-2 border-white/20 rounded-full flex items-center justify-center">
                <div className="w-1 h-1 bg-white/40 rounded-full" />
              </div>
            </div>

            {/* Feet Box */}
            <div className="w-full h-[15%] border-t border-white/20 bg-white/5 flex items-center justify-center">
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30">Feet Area</span>
            </div>

            {/* Tilt Warning */}
            {!isVertical && (
              <div className="absolute inset-0 z-40 flex items-center justify-center p-12 bg-black/40 backdrop-blur-[2px]">
                <div className="bg-red-600/90 text-white px-6 py-4 rounded-2xl flex flex-col items-center gap-2 animate-in zoom-in-95">
                  <Smartphone className={`h-8 w-8 ${tilt > 90 ? 'rotate-180' : ''}`} />
                  <p className="font-black uppercase tracking-[0.15em] text-[10px] text-center">
                    {tilt > 90 ? 'Tilt Forward' : 'Tilt Back'}
                  </p>
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
              isVertical ? 'bg-emerald-500/20 scale-110' : 'bg-white/10'
            }`} />
            <div className={`absolute inset-0 rounded-full border-4 transition-colors ${
              isVertical ? 'border-emerald-500' : 'border-white/40'
            }`} />
            <div className={`h-16 w-16 rounded-full shadow-xl transition-colors ${
              isVertical ? 'bg-emerald-500' : 'bg-white/40'
            }`} />
            <Camera className={`h-8 w-8 absolute transition-colors ${
              isVertical ? 'text-white' : 'text-slate-900'
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
