import React from 'react';
import { CameraCapture } from '@/components/camera/CameraCapture';
import { PostureCompanionModal } from '@/components/camera/PostureCompanionModal';
import { BodyCompCompanionModal } from '@/components/camera/BodyCompCompanionModal';
import { OcrReviewDialog } from './OcrReviewDialog';
import { Loader2 } from 'lucide-react';
import type { FormData } from '@/contexts/FormContext';
import type { PostureCompanionData } from '@/lib/types/companion';

interface AssessmentModalsProps {
  showCamera: false | 'ocr' | 'posture';
  setShowCamera: (mode: false | 'ocr' | 'posture') => void;
  handleCapture: (imageSrc: string) => Promise<void>;
  
  showPostureCompanion: boolean;
  setShowPostureCompanion: (show: boolean) => void;
  handlePostureCompanionComplete: (data: PostureCompanionData) => void;
  
  showBodyCompCompanion: boolean;
  setShowBodyCompCompanion: (show: boolean) => void;
  handleBodyCompCompanionComplete: (data: Partial<FormData>) => void;
  
  postureStep: number;
  setPostureStep: React.Dispatch<React.SetStateAction<number>>;
  
  isProcessingOcr: boolean;
  
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
  postureStep,
  setPostureStep,
  isProcessingOcr,
  ocrReviewData,
  setOcrReviewData,
  applyOcrData
}: AssessmentModalsProps) => {
  return (
    <>
      {/* Camera Capture Modal */}
      {showCamera && (
        <CameraCapture 
          mode={showCamera} 
          onCapture={handleCapture}
          onClose={() => setShowCamera(false)}
          overlayText={showCamera === 'posture' ? `Capture ${['FRONT', 'RIGHT SIDE', 'LEFT SIDE', 'BACK'][postureStep]} View` : undefined}
        />
      )}

      {/* Posture Companion Modal */}
      <PostureCompanionModal 
        isOpen={showPostureCompanion}
        onClose={() => setShowPostureCompanion(false)}
        onStartDirectScan={() => {
          setShowCamera('posture');
          setPostureStep(0);
        }}
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

      {/* OCR Processing Overlay */}
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
            <div className="space-y-4">
              <h4 className="text-xl font-black uppercase tracking-widest text-white">Reading Report</h4>
              <p className="text-white/50 text-sm font-medium leading-relaxed">
                Reading your report...
              </p>
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
