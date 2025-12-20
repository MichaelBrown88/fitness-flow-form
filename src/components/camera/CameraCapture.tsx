import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Button } from '../ui/button';
import { Camera, X, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { Card } from '../ui/card';

interface CameraCaptureProps {
  onCapture: (imageSrc: string) => void;
  onClose: () => void;
  mode: 'ocr' | 'posture';
  title?: string;
  overlayText?: string;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  onClose,
  mode,
  title,
  overlayText
}) => {
  const webcamRef = useRef<Webcam>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      onCapture(imageSrc);
    }
  }, [webcamRef, onCapture]);

  const toggleFacingMode = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleUserMediaError = (err: string | DOMException) => {
    console.error('Webcam error:', err);
    setError('Could not access camera. Please ensure you have granted permission.');
  };

  return (
    <Card className="relative w-full max-w-2xl mx-auto overflow-hidden bg-black text-white rounded-xl shadow-2xl">
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <h3 className="text-lg font-bold">{title || (mode === 'ocr' ? 'Scan InBody Report' : 'Posture Analysis')}</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
          <X className="h-6 w-6" />
        </Button>
      </div>

      <div className="relative aspect-[3/4] sm:aspect-video bg-slate-900 flex items-center justify-center">
        {!error ? (
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              facingMode,
              width: { ideal: 1280 },
              height: { ideal: 720 },
            }}
            onUserMedia={() => setIsCameraReady(true)}
            onUserMediaError={handleUserMediaError}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <p className="text-red-400">{error}</p>
            <Button variant="outline" onClick={onClose} className="mt-4 border-white text-white hover:bg-white/20">
              Close
            </Button>
          </div>
        )}

        {/* Overlays */}
        {isCameraReady && !error && (
          <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center">
            {mode === 'ocr' && (
              <div className="w-[80%] h-[70%] border-2 border-dashed border-indigo-400 rounded-lg flex items-center justify-center">
                <div className="bg-black/40 px-3 py-1 rounded text-xs text-indigo-200">
                  Align InBody report within this frame
                </div>
              </div>
            )}
            {mode === 'posture' && (
              <div className="w-[60%] h-[85%] border-2 border-indigo-400/30 rounded-[100px] flex flex-col items-center justify-start pt-10 relative">
                <div className="w-16 h-16 border-2 border-indigo-400/50 rounded-full mb-4" /> {/* Head */}
                <div className="w-1 bg-indigo-400/30 h-full" /> {/* Center line */}
                {/* Horizontal guides */}
                <div className="absolute top-[25%] left-0 right-0 h-px bg-indigo-400/20" /> {/* Shoulders */}
                <div className="absolute top-[50%] left-0 right-0 h-px bg-indigo-400/20" /> {/* Hips */}
                <div className="absolute top-[75%] left-0 right-0 h-px bg-indigo-400/20" /> {/* Knees */}
              </div>
            )}
            {overlayText && (
              <div className="mt-4 bg-black/60 px-4 py-2 rounded-full text-sm font-medium border border-white/20">
                {overlayText}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-6 bg-slate-900 border-t border-white/10 flex items-center justify-around">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={toggleFacingMode} 
          className="rounded-full h-12 w-12 border-white/20 bg-white/5 hover:bg-white/20"
          title="Switch Camera"
        >
          <RefreshCw className="h-5 w-5" />
        </Button>

        <Button 
          onClick={capture} 
          disabled={!isCameraReady || !!error}
          className="h-16 w-16 rounded-full bg-white hover:bg-slate-200 text-black flex items-center justify-center shadow-lg transform active:scale-95 transition-transform"
          title="Capture"
        >
          <div className="h-12 w-12 rounded-full border-4 border-black/10 flex items-center justify-center">
            <div className="h-8 w-8 rounded-full bg-indigo-600" />
          </div>
        </Button>

        <div className="w-12" /> {/* Spacer for balance */}
      </div>
    </Card>
  );
};
