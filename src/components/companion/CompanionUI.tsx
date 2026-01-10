/**
 * Companion UI Component - Simplified
 * Clean interface with color-coded guide box
 */

import React from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Loader2, RefreshCcw, Scan, X } from 'lucide-react';
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
  mode: 'posture' | 'inbody';
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
  ocrReviewData: Record<string, string> | null;
  setOcrReviewData: React.Dispatch<React.SetStateAction<Record<string, string> | null>>;
  onApplyOcr: () => Promise<void>;
  isProcessingOcr: boolean;
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
  ocrReviewData,
  setOcrReviewData,
  onApplyOcr,
  isProcessingOcr,
}: CompanionUIProps) {
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
    segmentalLegRightKg: 'Right Leg (kg)',
  };

  // Determine guide box color: green = ready, amber = adjusting, red = out of frame or phone not level
  const getGuideBoxColor = () => {
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
        <h1 className="text-2xl font-black uppercase tracking-tight mb-2">Scanning...</h1>
        <p className="text-white/60 text-sm">Extracting data from your InBody report</p>
      </div>
    );
  }

  if (ocrReviewData) {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Scan className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-black uppercase tracking-tight">Review Data</h1>
          </div>
          <button
            onClick={() => setOcrReviewData(null)}
            className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 mb-6">
          {Object.entries(ocrReviewData).map(([key, value]) => (
            <div key={key} className="bg-white/5 rounded-xl p-4 border border-white/10">
              <label className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 block">
                {fieldLabels[key] || key}
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={value || ''}
                  onChange={(e) =>
                    setOcrReviewData((prev) => (prev ? { ...prev, [key]: e.target.value } : null))
                  }
                  className="bg-white/10 border-white/20 text-white text-lg font-bold h-10 flex-1"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 pt-4 border-t border-white/10">
          <Button
            variant="outline"
            onClick={() => setOcrReviewData(null)}
            className="flex-1 bg-white/10 text-white"
          >
            Cancel
          </Button>
          <Button onClick={onApplyOcr} disabled={isUploading > 0} className="flex-1 bg-primary">
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

      {/* Minimal Header - just the view name */}
      <div className="absolute top-4 left-0 right-0 flex justify-center z-20 pointer-events-none">
        <div className="px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm">
          <span className="text-xs font-black text-white uppercase tracking-widest">
            {mode === 'inbody' ? 'INBODY SCAN' : VIEWS[viewIdx]?.label || 'Ready'}
          </span>
        </div>
      </div>

      {/* Guide Box - Narrower and color-coded */}
      {mode !== 'inbody' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div
            className={`w-[60%] max-w-xs border-[4px] rounded-[40px] transition-all duration-300 ${getGuideBoxColor()}`}
            style={{ height: 'calc(100vh - 140px)' }}
          />
        </div>
      )}

      {/* Countdown Overlay */}
      {countdown !== null && mode !== 'inbody' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-30 pointer-events-none">
          <span className="text-[200px] font-black text-white drop-shadow-2xl">{countdown}</span>
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

      {/* Footer Controls */}
      <div className="absolute bottom-0 left-0 right-0 h-28 flex items-center justify-center z-40 px-6 pb-6">
        {mode === 'inbody' ? (
            <button
              onClick={onCapture}
            className="h-16 w-16 rounded-full border-4 border-white bg-white/20 flex items-center justify-center"
            >
              <Camera className="h-6 w-6 text-white" />
            </button>
        ) : !hasPermission ? (
          <Button onClick={requestPermission} className="bg-primary h-12 px-6 rounded-xl text-xs font-black uppercase">
            Enable Camera
          </Button>
        ) : (
          <div className="flex items-center gap-6">
            {/* Flip camera button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFacingMode(facingMode === 'user' ? 'environment' : 'user')}
              className="text-white/40 h-10 w-10 rounded-full bg-white/10"
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>

            {/* Main capture button */}
                <button
                  onClick={onStartSequence}
              disabled={!isVertical || isSequenceActive}
              className={`h-20 w-20 rounded-full border-4 flex items-center justify-center transition-all ${
                isSequenceActive
                  ? 'border-emerald-500 bg-emerald-500/20'
                  : isVertical
                  ? 'border-white bg-white/20 active:scale-95'
                  : 'border-white/20 bg-white/5 opacity-50'
                  }`}
                >
              {isSequenceActive ? (
                <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
              ) : (
                <Camera className={`h-8 w-8 ${isVertical ? 'text-white' : 'text-white/30'}`} />
              )}
            </button>

            {/* Status indicator */}
            <div className="w-10 flex justify-center">
              {!isVertical && (
                <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
              )}
              {isVertical && isUploading > 0 && (
                <Loader2 className="h-4 w-4 text-white/60 animate-spin" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
