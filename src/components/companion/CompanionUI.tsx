/**
 * Companion UI Component - Simplified
 * Clean interface with color-coded guide box
 */

import React, { useRef } from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Loader2, RefreshCcw, Scan, X, ImagePlus } from 'lucide-react';
import { CONFIG } from '@/config';

const VIEWS = CONFIG.POSTURE_VIEWS;

interface PoseValidation {
  isReady: boolean;
  message: string;
  shortMessage: string;
  details: {
    tooClose: boolean;
    tooFar: boolean;
    notCentered: boolean;
    missingParts: string[];
    outOfFrame?: boolean;
  };
}

interface CompanionUIProps {
  mode: 'posture' | 'bodycomp';
  viewIdx: number;
  facingMode: 'user' | 'environment';
  setFacingMode: (mode: 'user' | 'environment') => void;
  isVertical: boolean;
  hasPermission: boolean;
  requestPermission: () => Promise<void>;
  poseValidation: PoseValidation;
  isPoseLoading: boolean;
  isSequenceActive: boolean;
  isUploading: number;
  countdown: number | null;
  webcamRef: React.RefObject<Webcam>;
  onCapture: () => void;
  onStartSequence: () => void;
  onCancelSequence?: () => void; // Cancel button handler
  onFileUpload?: (file: File) => void; // Camera roll upload handler
  ocrReviewData: Record<string, string> | null;
  setOcrReviewData: React.Dispatch<React.SetStateAction<Record<string, string> | null>>;
  onApplyOcr: () => Promise<void>;
  isProcessingOcr: boolean;
  flowState?: 'permissions' | 'waiting_level' | 'waiting_pose' | 'ready' | 'capturing' | 'complete';
  guideBoxState?: { color: 'red' | 'amber' | 'green'; message: string };
  /** Posture + Gemini Live: show status when connecting or after errors. */
  geminiConnectionStatus?: 'idle' | 'connecting' | 'open' | 'error';
  geminiConnectionError?: string | null;
  onGeminiRetry?: () => void;
}

export function CompanionUI({
  mode,
  viewIdx,
  facingMode,
  setFacingMode,
  isVertical,
  hasPermission,
  requestPermission,
  poseValidation,
  isPoseLoading,
  isSequenceActive,
  isUploading,
  countdown,
  webcamRef,
  onCapture,
  onStartSequence,
  onCancelSequence,
  onFileUpload,
  ocrReviewData,
  setOcrReviewData,
  onApplyOcr,
  isProcessingOcr,
  flowState = 'permissions',
  guideBoxState,
  geminiConnectionStatus,
  geminiConnectionError,
  onGeminiRetry,
}: CompanionUIProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  const fieldLabels: Record<string, string> = {
    inbodyScore: 'Body Comp Score',
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
    segmentalLegRightKg: 'Right Leg (kg)',
  };

  // Determine guide box color from flow state
  const getGuideBoxColor = () => {
    if (guideBoxState) {
      if (guideBoxState.color === 'green') return 'border-emerald-500 shadow-[0_0_30px_#10b98166]';
      if (guideBoxState.color === 'red') return 'border-red-500 shadow-[0_0_30px_#ef444466]';
      return 'border-amber-500 shadow-[0_0_30px_#f59e0b66]';
    }
    // Fallback
    if (!isVertical) return 'border-red-500 shadow-[0_0_30px_#ef444466]';
    if (poseValidation.details?.outOfFrame) return 'border-red-500 shadow-[0_0_30px_#ef444466]';
    if (poseValidation.isReady) return 'border-emerald-500 shadow-[0_0_30px_#10b98166]';
    return 'border-amber-500 shadow-[0_0_30px_#f59e0b66]';
  };

  if (isProcessingOcr) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-white text-center">
        <div className="relative h-32 w-32 mb-8">
          <div className="absolute inset-0 rounded-full border-4 border-white/5" />
          <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
          <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-primary to-brand-dark animate-pulse flex items-center justify-center">
            <Loader2 className="h-10 w-10 text-white animate-spin" />
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-2">Reading your report...</h1>
        <p className="text-white/60 text-sm">Finding the numbers in your report</p>
      </div>
    );
  }

  if (ocrReviewData) {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Scan className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Check the Numbers</h1>
          </div>
          <button
            onClick={() => setOcrReviewData(null)}
            className="h-8 w-8 rounded-full bg-background/10 flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 mb-6">
          {Object.entries(ocrReviewData).map(([key, value]) => (
            <div key={key} className="bg-background/5 rounded-xl p-4 border border-white/10">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-primary mb-2 block">
                {fieldLabels[key] || key}
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={value || ''}
                  onChange={(e) =>
                    setOcrReviewData((prev) => (prev ? { ...prev, [key]: e.target.value } : null))
                  }
                  className="bg-background/10 border-white/20 text-white text-lg font-bold h-10 flex-1"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 pt-4 border-t border-white/10">
          <Button
            variant="outline"
            onClick={() => setOcrReviewData(null)}
            className="flex-1 bg-background/10 text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={onApplyOcr}
            disabled={isUploading > 0}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Apply
          </Button>
        </div>
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
          height: CONFIG.COMPANION.CAPTURE.VIDEO_CONSTRAINTS.height,
        }}
        className="h-full w-full object-contain z-0"
      />

      {/* Minimal Header - view name + cancel button during sequence */}
      <div className="absolute top-3 left-0 right-0 flex justify-between items-center z-20 px-4">
        {/* Cancel button - only visible during capture sequence */}
        {isSequenceActive && onCancelSequence ? (
          <button
            onClick={onCancelSequence}
            className="h-10 w-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        ) : (
          <div className="w-10" /> // Spacer for centering
        )}
        
        {/* View label */}
        <div className="px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
          <span className="text-[10px] font-black text-white uppercase tracking-[0.15em]">
            {mode === 'bodycomp' ? 'BODY COMP REPORT' : VIEWS[viewIdx]?.label || 'Ready'}
          </span>
        </div>
        
        {/* Right spacer for centering */}
        <div className="w-10" />
      </div>

      {mode === 'posture' &&
        geminiConnectionStatus &&
        (geminiConnectionStatus === 'connecting' || geminiConnectionStatus === 'error') && (
          <div className="absolute top-14 left-0 right-0 z-20 flex justify-center px-4 pointer-events-auto">
            <div className="flex flex-col sm:flex-row items-center gap-2 max-w-md rounded-xl bg-black/75 backdrop-blur-sm border border-white/15 px-4 py-2 text-center">
              {geminiConnectionStatus === 'connecting' && (
                <span className="text-[11px] font-semibold text-white/90 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                  Connecting voice guide…
                </span>
              )}
              {geminiConnectionStatus === 'error' && (
                <>
                  <span className="text-[11px] text-red-200/95">
                    {geminiConnectionError || 'Voice guide unavailable'}
                  </span>
                  {onGeminiRetry ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8 text-xs shrink-0 bg-background/20 text-foreground border-white/20 hover:bg-background/30"
                      onClick={onGeminiRetry}
                    >
                      <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />
                      Retry
                    </Button>
                  ) : null}
                </>
              )}
            </div>
          </div>
        )}

      {/* Guide Box - Almost full height for maximum client visibility */}
      {mode !== 'bodycomp' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 pt-12">
          {/* Guide box - wide and tall, almost full screen height */}
          <div
            className={`w-[85%] max-w-md border-[4px] rounded-3xl transition-all duration-300 ${getGuideBoxColor()}`}
            style={{ height: 'calc(100vh - 60px)' }}
          />
        </div>
      )}

      {/* Countdown Overlay */}
      {countdown !== null && mode !== 'bodycomp' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-30 pointer-events-none">
          <span className="text-[200px] font-bold text-white drop-shadow-2xl">{countdown}</span>
        </div>
      )}

      {/* Loading indicator */}
      {isPoseLoading && (
        <div className="absolute top-16 left-0 right-0 flex justify-center z-20 pointer-events-none">
          <div className="px-3 py-1 rounded-full bg-black/60 flex items-center gap-2">
            <Loader2 className="h-3 w-3 text-white/60 animate-spin" />
            <span className="text-[10px] text-white/60">Loading...</span>
          </div>
        </div>
      )}

      {/* Hidden file input for camera roll upload */}
      {mode === 'posture' && onFileUpload && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.heic,.heif"
          onChange={handleFileChange}
          className="hidden"
        />
      )}

      {/* Footer Controls - Only 2 buttons: Permission and Start Sequence */}
      {/* Hide all buttons during sequence - only guide box colors and audio cues guide the client */}
      {!isSequenceActive && (
        <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-3 z-40 px-6">
          {mode === 'bodycomp' ? (
            <button
              onClick={onCapture}
              className="h-16 w-16 rounded-full border-4 border-white bg-background/20 flex items-center justify-center"
            >
              <Camera className="h-6 w-6 text-white" />
            </button>
          ) : !hasPermission ? (
            // Permission buttons + upload option
            <div className="flex flex-col items-center gap-3 w-full max-w-xs">
              <Button
                onClick={requestPermission}
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-8 rounded-xl text-sm font-semibold shadow-lg w-full"
              >
                Enable Camera & Motion
              </Button>
              {onFileUpload && (
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-12 px-6 rounded-xl text-xs font-bold bg-background/10 border-white/30 text-white hover:bg-background/20 w-full flex items-center justify-center gap-2"
                >
                  <ImagePlus className="h-4 w-4" />
                  Upload from Photos
                </Button>
              )}
            </div>
          ) : flowState === 'ready' ? (
            // Ready state: Start Sequence button + upload option
            <div className="flex flex-col items-center gap-3 w-full max-w-xs">
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (flowState === 'ready' && !isSequenceActive) {
                    onStartSequence();
                  }
                }}
                className="bg-emerald-500 hover:bg-emerald-600 h-16 px-10 rounded-xl text-base font-semibold shadow-lg text-white w-full"
              >
                Start Capture
              </Button>
              {onFileUpload && (
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-10 px-4 rounded-xl text-xs font-bold bg-background/10 border-white/30 text-white hover:bg-background/20 flex items-center justify-center gap-2"
                >
                  <ImagePlus className="h-3 w-3" />
                  Upload from Photos
                </Button>
              )}
            </div>
          ) : onFileUpload ? (
            // Other states: just show upload option
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="h-12 px-6 rounded-xl text-xs font-bold bg-background/10 border-white/30 text-white hover:bg-background/20 flex items-center justify-center gap-2"
            >
              <ImagePlus className="h-4 w-4" />
              Upload from Photos
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
