/**
 * Companion UI Component
 * Extracted from Companion.tsx to separate UI from logic
 */

import React from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, AlertCircle, Loader2, RefreshCcw, CheckCircle2, Scan, X } from 'lucide-react';
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
  isWaitingForPosition: boolean;
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
  isWaitingForPosition,
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

      {/* Real-time Feedback Overlays */}
      {mode === 'posture' && !isSequenceActive && (
        <div className="absolute top-20 left-0 right-0 flex flex-col items-center gap-2 z-50 pointer-events-none px-6">
          <div
            className={`px-4 py-2 rounded-full border flex items-center gap-2 transition-all ${
              poseValidation.details?.outOfFrame
                ? 'bg-red-500/20 border-red-500/50 text-red-400'
                : poseValidation.isReady
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                : 'bg-amber-500/20 border-amber-500/50 text-amber-400'
            }`}
          >
            {poseValidation.details?.outOfFrame ? (
              <AlertCircle className="h-4 w-4" />
            ) : poseValidation.isReady ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <span className="text-xs font-black uppercase tracking-widest">{poseValidation.message}</span>
          </div>
          <div className="px-3 py-1 rounded-full bg-black/40 border border-white/10 text-[10px] font-black text-white/80 tracking-[0.2em] uppercase shadow-lg">
            VIEW: {VIEWS[viewIdx]?.label || 'Unknown'}
          </div>
        </div>
      )}

      {/* Tripod Setup Instructions */}
      {mode === 'posture' && viewIdx === 0 && !isSequenceActive && (
        <div className="absolute top-32 left-4 right-4 z-40 pointer-events-none">
          <div className="bg-black/80 backdrop-blur-sm rounded-xl p-4 border border-white/20 max-w-sm mx-auto">
            <h3 className="text-xs font-black uppercase tracking-widest text-white mb-2">Tripod Setup</h3>
            <ul className="text-[10px] text-white/80 space-y-1">
              <li>• Set tripod height to client's hip level</li>
              <li>• Position 6-8 feet from client</li>
              <li>• Ensure client fills the frame</li>
              <li>• Keep phone vertical and level</li>
            </ul>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-16 flex items-center z-20 pointer-events-none">
        <div className="flex flex-col ml-6">
          <h2 className="text-sm font-black text-white/80 uppercase tracking-widest drop-shadow-lg">
            {mode === 'inbody' ? 'INBODY SCAN' : VIEWS[viewIdx]?.label || 'Unknown'}
          </h2>
          {isPoseLoading && <span className="text-[10px] text-white/40">Initializing AI...</span>}
        </div>
      </div>

      {/* Guide Box */}
      {mode !== 'inbody' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div
            className={`w-[85%] max-w-lg border-[4px] rounded-[50px] transition-all duration-500 ${
              isVertical
                ? poseValidation.details?.outOfFrame
                  ? 'border-red-500 shadow-[0_0_30px_#ef444466]'
                  : poseValidation.isReady
                  ? 'border-emerald-500 shadow-[0_0_30px_#10b98166]'
                  : 'border-amber-500 shadow-[0_0_30px_#f59e0b66]'
                : 'border-red-500 shadow-[0_0_30px_#ef444466]'
            }`}
            style={{ height: 'calc(100vh - 100px)' }}
          >
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
            <button
              onClick={onCapture}
              className="h-16 w-16 rounded-full border-4 border-white bg-white/20 flex items-center justify-center transition-all"
            >
              <Camera className="h-6 w-6 text-white" />
            </button>
          </div>
        ) : !hasPermission ? (
          <Button onClick={requestPermission} className="bg-primary h-12 px-6 rounded-xl text-xs font-black uppercase">
            Enable Sensors & Audio
          </Button>
        ) : (
          <div className="flex items-center gap-4 w-full max-w-md justify-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFacingMode(facingMode === 'user' ? 'environment' : 'user')}
              className="text-white/30 h-10 w-10 rounded-full bg-white/5"
            >
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
                  onClick={onStartSequence}
                  disabled={!isVertical}
                  className={`h-16 w-16 rounded-full border-4 flex items-center justify-center transition-all ${
                    isVertical ? 'border-white bg-white/20' : 'border-white/10 bg-white/5 opacity-40'
                  }`}
                >
                  <Camera className={`h-6 w-6 ${isVertical ? 'text-white' : 'text-white/40'}`} />
                </button>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2 text-emerald-500 font-black text-[10px] uppercase tracking-widest">
                    {isUploading > 0 ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" /> Syncing...
                      </>
                    ) : isWaitingForPosition ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin text-amber-500" />{' '}
                        <span className="text-amber-500">Align Body...</span>
                      </>
                    ) : (
                      <>
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Capturing...
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {isVertical && !isSequenceActive && (
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    poseValidation.isReady
                      ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
                      : 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'
                  }`}
                />
                <span
                  className={`text-[10px] font-black uppercase tracking-widest ${
                    poseValidation.isReady ? 'text-emerald-500' : 'text-amber-500'
                  }`}
                >
                  {poseValidation.shortMessage}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

