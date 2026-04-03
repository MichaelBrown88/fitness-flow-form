import React, { useState, useEffect } from 'react';
import { CameraCapture } from '@/components/camera/CameraCapture';
import { CameraCaptureErrorBoundary } from '@/components/camera/CameraCaptureErrorBoundary';
import { PostureCompanionModal } from '@/components/camera/PostureCompanionModal';
import { BodyCompCompanionModal } from '@/components/camera/BodyCompCompanionModal';
import { OcrReviewDialog } from './OcrReviewDialog';
import { Loader2, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FormData } from '@/contexts/FormContext';
import type { PostureCompanionData } from '@/lib/types/companion';

const OCR_TIPS = [
  'Extracting skeletal muscle mass…',
  'Reading body fat percentage…',
  'Parsing visceral fat score…',
  'Calculating BMR and hydration…',
  'Verifying segmental lean mass…',
  'Cross-checking InBody score…',
];

const POSTURE_TIPS = [
  'Analysing shoulder alignment…',
  'Checking forward head position…',
  'Calculating pelvic tilt…',
  'Measuring spinal curvature…',
  'Evaluating hip symmetry…',
  'Detecting knee alignment…',
];

interface AssessmentModalsProps {
  showCamera: false | 'ocr';
  setShowCamera: (mode: false | 'ocr') => void;
  handleCapture: (imageSrc: string) => Promise<void>;
  
  showPostureCompanion: boolean;
  setShowPostureCompanion: (show: boolean) => void;
  handlePostureCompanionComplete: (data: PostureCompanionData) => void;
  
  showBodyCompCompanion: boolean;
  setShowBodyCompCompanion: (show: boolean) => void;
  handleBodyCompCompanionComplete: (data: Partial<FormData>) => void;
  
  isProcessingOcr: boolean;
  processingMode: 'ocr' | 'posture' | null;
  postureRetakeWarning: string | null;
  clearPostureRetakeWarning: () => void;
  
  ocrReviewData: Partial<FormData> | null;
  setOcrReviewData: React.Dispatch<React.SetStateAction<Partial<FormData> | null>>;
  applyOcrData: () => void;
}

export const AssessmentModals = ({
  showCamera,
  setShowCamera,
  handleCapture,
  showPostureCompanion,
  setShowPostureCompanion,
  handlePostureCompanionComplete,
  showBodyCompCompanion,
  setShowBodyCompCompanion,
  handleBodyCompCompanionComplete,
  isProcessingOcr,
  processingMode,
  postureRetakeWarning,
  clearPostureRetakeWarning,
  ocrReviewData,
  setOcrReviewData,
  applyOcrData
}: AssessmentModalsProps) => {
  const [tipIndex, setTipIndex] = useState(0);
  const tips = processingMode === 'posture' ? POSTURE_TIPS : OCR_TIPS;

  useEffect(() => {
    if (!isProcessingOcr) {
      setTipIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % tips.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [isProcessingOcr, tips.length]);

  return (
    <>
      {/* Camera Capture Modal */}
      {showCamera && (
        <CameraCaptureErrorBoundary onDismiss={() => setShowCamera(false)}>
          <CameraCapture
            mode={showCamera}
            onCapture={handleCapture}
            onClose={() => setShowCamera(false)}
          />
        </CameraCaptureErrorBoundary>
      )}

      {/* Posture Companion Modal */}
      <PostureCompanionModal 
        isOpen={showPostureCompanion}
        onClose={() => setShowPostureCompanion(false)}
        onComplete={handlePostureCompanionComplete}
      />

      {/* Body Comp Companion Modal */}
      <BodyCompCompanionModal 
        isOpen={showBodyCompCompanion}
        onClose={() => setShowBodyCompCompanion(false)}
        onStartDirectScan={() => {
          setShowCamera('ocr');
        }}
        onComplete={handleBodyCompCompanionComplete}
      />

      {/* AI Processing Overlay */}
      {isProcessingOcr && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-8 text-white">
          <div className="flex flex-col items-center gap-8 max-w-xs text-center">
            <div className="relative h-32 w-32">
              <div className="absolute inset-0 rounded-full border-4 border-white/5" />
              <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
              <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-primary to-primary/60 animate-pulse flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-white animate-spin" />
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-xl font-bold text-white">
                {processingMode === 'posture' ? 'Analysing Posture' : 'Reading Report'}
              </h4>
              <p
                key={tipIndex}
                className="text-white/60 text-sm font-medium leading-relaxed animate-in fade-in duration-500"
              >
                {tips[tipIndex]}
              </p>
              <div className="flex items-center justify-center gap-1 pt-1">
                {tips.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full transition-all duration-500 ${
                      i === tipIndex ? 'w-6 bg-primary' : 'w-1 bg-background/20'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Low-confidence retake warning */}
      {postureRetakeWarning && (
        <div className="fixed bottom-6 left-1/2 z-[160] -translate-x-1/2 w-full max-w-sm px-4 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 shadow-xl flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-bold text-amber-900">Retake Recommended</p>
              <p className="text-xs text-amber-700 leading-relaxed">{postureRetakeWarning}</p>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="h-7 rounded-lg border-amber-300 text-amber-700 text-xs font-bold hover:bg-amber-100 gap-1"
                onClick={() => {
                  clearPostureRetakeWarning();
                  setShowPostureCompanion(true);
                }}
              >
                <RefreshCw className="h-3 w-3" />
                Retake
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 rounded-lg text-amber-600 text-xs hover:bg-amber-100"
                onClick={clearPostureRetakeWarning}
              >
                <X className="h-3 w-3" />
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* OCR Review Dialog */}
      <OcrReviewDialog 
        ocrReviewData={ocrReviewData}
        setOcrReviewData={setOcrReviewData}
        applyOcrData={applyOcrData}
      />
    </>
  );
};
