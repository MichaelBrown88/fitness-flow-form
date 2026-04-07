/**
 * Companion UI Component - Simplified
 * Clean interface with color-coded guide box
 */

import React, { useRef } from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Loader2, Scan, X, ImagePlus } from 'lucide-react';
import { CONFIG } from '@/config';
import { cn } from '@/lib/utils';

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
  onCancelSequence?: () => void;
  onFileUpload?: (file: File) => void;
  ocrReviewData: Record<string, string> | null;
  setOcrReviewData: React.Dispatch<React.SetStateAction<Record<string, string> | null>>;
  onApplyOcr: () => Promise<void>;
  isProcessingOcr: boolean;
  flowState?:
    | 'permissions'
    | 'waiting_level'
    | 'waiting_pose'
    | 'ready'
    | 'capturing'
    | 'processing'
    | 'complete';
  /** Posture: require phone vertical before Start Capture. */
  blockStartCaptureUntilVertical?: boolean;
  guideBoxState?: { color: 'red' | 'amber' | 'green'; message: string };
  geminiConnectionStatus?: 'idle' | 'connecting' | 'open' | 'error';
  geminiConnectionError?: string | null;
  /** Call from a button tap; hook runs unlock + reconnect. */
  onRetryGemini?: () => void;
  /** After first Gemini audio chunk — hides pre-voice instruction line. */
  voiceGuideStarted?: boolean;
}

export function CompanionUI({
  mode,
  viewIdx,
  facingMode,
  setFacingMode: _setFacingMode,
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
  blockStartCaptureUntilVertical = false,
  guideBoxState,
  geminiConnectionStatus,
  geminiConnectionError = null,
  onRetryGemini,
  voiceGuideStarted = false,
}: CompanionUIProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
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

  const getGuideBoxColor = () => {
    if (guideBoxState) {
      if (guideBoxState.color === 'green') return 'border-emerald-500 shadow-[0_0_30px_#10b98166]';
      if (guideBoxState.color === 'red') return 'border-red-500 shadow-[0_0_30px_#ef444466]';
      return 'border-amber-500 shadow-[0_0_30px_#f59e0b66]';
    }
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
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-black pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] min-h-[100dvh]">
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

      <div className="absolute left-0 right-0 top-[max(0.75rem,env(safe-area-inset-top,0px))] flex items-center justify-between z-20 px-4">
        {isSequenceActive && onCancelSequence ? (
          <button
            onClick={onCancelSequence}
            className="h-10 w-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        ) : (
          <div className="w-10" aria-hidden />
        )}

        <div className="px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
          <span className="text-[10px] font-black text-white uppercase tracking-[0.15em]">
            {mode === 'bodycomp' ? 'BODY COMP REPORT' : VIEWS[viewIdx]?.label || 'Ready'}
          </span>
        </div>

        <div className="w-10" />
      </div>

      {mode === 'posture' &&
        hasPermission &&
        !isSequenceActive &&
        geminiConnectionStatus &&
        geminiConnectionStatus !== 'open' &&
        geminiConnectionStatus !== 'error' &&
        flowState !== 'permissions' &&
        (geminiConnectionStatus === 'connecting' || geminiConnectionStatus === 'idle') && (
          <div className="absolute left-0 right-0 top-[calc(max(0.75rem,env(safe-area-inset-top,0px))+2.75rem)] z-20 flex justify-center px-4 pointer-events-none">
            <div className="flex items-center gap-2 rounded-xl bg-black/75 backdrop-blur-sm border border-white/15 px-4 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-white" />
              <span className="text-[11px] font-semibold text-white/90">
                {CONFIG.COMPANION.VOICE_GUIDE.CONNECTING_VOICE_GUIDE}
              </span>
            </div>
          </div>
        )}

      {mode === 'posture' &&
        hasPermission &&
        !isSequenceActive &&
        geminiConnectionStatus === 'error' &&
        onRetryGemini && (
          <div className="absolute left-4 right-4 z-[45] flex justify-center px-2" style={{ top: 'calc(max(0.75rem, env(safe-area-inset-top, 0px)) + 2.75rem)' }}>
            <div className="w-full max-w-sm rounded-xl border border-red-500/40 bg-black/85 backdrop-blur-sm px-4 py-3 shadow-lg">
              <p className="text-center text-[12px] font-medium leading-snug text-white/95">
                Voice guide could not connect
                {geminiConnectionError ? (
                  <span className="mt-1 block text-[11px] font-normal text-white/70">{geminiConnectionError}</span>
                ) : null}
              </p>
              <Button
                type="button"
                onClick={onRetryGemini}
                className="mt-3 h-11 w-full rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
              >
                Try again
              </Button>
            </div>
          </div>
        )}

      {mode !== 'bodycomp' && (
        <div
          className="pointer-events-none absolute left-0 right-0 z-10 flex justify-center"
          style={{
            top: 'calc(16px + env(safe-area-inset-top, 0px))',
            bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <div
            className={cn(
              'h-full w-[58%] max-w-[min(58vw,320px)] rounded-3xl border-[4px] transition-all duration-300',
              getGuideBoxColor()
            )}
          />
        </div>
      )}

      {mode === 'posture' &&
        hasPermission &&
        (flowState === 'waiting_level' || flowState === 'waiting_pose') && (
          <div
            className={cn(
              'absolute left-4 right-4 z-[35] rounded-xl bg-black/60 px-3 py-2 text-center backdrop-blur-sm pointer-events-none transition-opacity duration-700',
              voiceGuideStarted ? 'opacity-0' : 'opacity-100'
            )}
            style={{
              bottom: 'calc(max(5.5rem, env(safe-area-inset-bottom, 0px) + 4.25rem))',
            }}
          >
            <p className="text-[13px] font-medium leading-snug text-white/95">
              Follow the voice guide — framing hints show in the border around the video.
            </p>
            <p className="mt-2 text-[11px] font-medium leading-snug text-white/75">
              {CONFIG.COMPANION.VOICE_GUIDE.POSTURE_CAMERA_HEIGHT_SOP}
            </p>
          </div>
        )}

      {countdown !== null && mode !== 'bodycomp' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-30 pointer-events-none">
          <span className="text-[200px] font-bold text-white drop-shadow-2xl">{countdown}</span>
        </div>
      )}

      {isPoseLoading && (
        <div className="absolute top-16 left-0 right-0 flex justify-center z-20 pointer-events-none">
          <div className="px-3 py-1 rounded-full bg-black/60 flex items-center gap-2">
            <Loader2 className="h-3 w-3 text-white/60 animate-spin" />
            <span className="text-[10px] text-white/60">Loading...</span>
          </div>
        </div>
      )}

      {mode === 'posture' && onFileUpload && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.heic,.heif"
          onChange={handleFileChange}
          className="hidden"
        />
      )}

      {!isSequenceActive && (
        <div
          className="absolute left-0 right-0 z-40 flex flex-col items-center gap-3 px-6"
          style={{ bottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))' }}
        >
          {mode === 'bodycomp' ? (
            <button
              onClick={onCapture}
              className="h-16 w-16 rounded-full border-4 border-white bg-background/20 flex items-center justify-center"
            >
              <Camera className="h-6 w-6 text-white" />
            </button>
          ) : !hasPermission ? (
            <div className="flex flex-col items-center gap-3 w-full max-w-xs">
              {mode === 'posture' ? (
                <p className="text-center text-[12px] font-medium leading-snug text-white/85 px-1">
                  {CONFIG.COMPANION.VOICE_GUIDE.PERMISSION_WAIST_HEIGHT_HINT}
                </p>
              ) : null}
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
            <div className="flex flex-col items-center gap-3 w-full max-w-xs">
              {mode === 'posture' && geminiConnectionStatus && geminiConnectionStatus === 'error' && onRetryGemini ? (
                <button
                  type="button"
                  onClick={onRetryGemini}
                  className="text-[11px] font-medium text-primary underline underline-offset-2"
                >
                  Retry voice guide
                </button>
              ) : mode === 'posture' && geminiConnectionStatus && geminiConnectionStatus !== 'open' ? (
                <div className="flex items-center gap-1.5 text-white/70">
                  <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden />
                  <span className="text-[11px] font-medium">Voice guide connecting…</span>
                </div>
              ) : mode === 'posture' && geminiConnectionStatus === 'open' ? (
                <span className="text-[11px] font-medium text-emerald-400">Voice guide connected</span>
              ) : null}
              {blockStartCaptureUntilVertical && !isVertical ? (
                <p className="text-center text-[12px] font-medium text-amber-200/95 px-2">
                  Level the phone to enable Start Capture.
                </p>
              ) : null}
              {mode === 'posture' &&
              geminiConnectionStatus !== undefined &&
              geminiConnectionStatus !== 'open' ? (
                <p className="text-center text-[12px] font-medium text-white/75 px-2">
                  Wait until the voice guide is connected before starting capture.
                </p>
              ) : null}
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (flowState === 'ready' && !isSequenceActive) {
                    onStartSequence();
                  }
                }}
                disabled={
                  (blockStartCaptureUntilVertical && !isVertical) ||
                  (mode === 'posture' &&
                    geminiConnectionStatus !== undefined &&
                    geminiConnectionStatus !== 'open')
                }
                className="bg-emerald-500 hover:bg-emerald-600 h-16 px-10 rounded-xl text-base font-semibold shadow-lg text-white w-full disabled:opacity-40 disabled:pointer-events-none"
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
          ) : (mode === 'posture' && flowState === 'waiting_pose') || onFileUpload ? (
            <div className="flex w-full max-w-xs flex-col items-center gap-3">
              {mode === 'posture' && flowState === 'waiting_pose' ? (
                <p className="px-2 text-center text-[11px] font-medium leading-snug text-white/85">
                  Listen for framing tips. The scan usually starts on its own once the voice guide finishes; if
                  not, tap Start Capture when it appears.
                </p>
              ) : null}
              {onFileUpload ? (
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-background/10 px-6 text-xs font-bold text-white hover:bg-background/20 border-white/30"
                >
                  <ImagePlus className="h-4 w-4" />
                  Upload from Photos
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
