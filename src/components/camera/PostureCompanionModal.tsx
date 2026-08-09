/**
 * PostureCompanionModal
 *
 * Studio posture capture: coach-held live capture (primary) or manual photo
 * upload, with a live four-view grid showing processing status and analysis.
 * The phone-QR handoff is intentionally off this surface (code retained in
 * the live-session layer for a future companion pass).
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePostureCompanion } from '@/hooks/usePostureCompanion';
import { useAuth } from '@/hooks/useAuth';
import { CoachPostureCapturePanel } from '@/components/camera/CoachPostureCapturePanel';
import { POSTURE_STUDIO_MODAL_COPY as COPY } from '@/constants/coachPostureCapture';
import type { PostureCompanionData } from '@/lib/types/companion';
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  Camera,
  ArrowRight,
  ImagePlus,
  X
} from 'lucide-react';

interface PostureCompanionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: PostureCompanionData) => void;
}

export const PostureCompanionModal: React.FC<PostureCompanionModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const { profile } = useAuth();
  const [deviceCaptureOpen, setDeviceCaptureOpen] = useState(false);

  const {
    session,
    isLoadingTestImages,
    processingStatus,
    previewImage,
    setPreviewImage,
    fileInputRef,
    placeholderImages,
    hasAllImages,
    views,
    handleLoadTestImages,
    handleFileUpload,
    handleApply,
    handleDirectScan,
  } = usePostureCompanion({
    isOpen,
    onComplete,
    onClose,
    onRequestDeviceCapture: () => setDeviceCaptureOpen(true),
  });

  // Helper to get processing status label with user-friendly copy
  const getStatusLabel = (stage: string): string => {
    switch (stage) {
      case 'converting': return 'Converting image...';
      case 'detecting': return 'Detecting pose...';
      case 'wireframe': return 'Analyzing posture...';
      case 'aligning': return 'Processing...';
      case 'analyzing': return 'Generating insights...';
      case 'complete': return 'Complete';
      case 'error': return 'Error';
      default: return '';
    }
  };

  // Check if wireframe is shown but AI still processing (show lighter overlay)
  const isWireframeButAnalyzing = (view: string): boolean => {
    const status = processingStatus[view as keyof typeof processingStatus];
    // 'detecting' = wireframe being drawn, 'analyzing' = AI analyzing, 'aligning' = processing
    return status === 'detecting' || status === 'analyzing' || status === 'aligning';
  };

  const sessionReady = Boolean(session?.id && profile?.organizationId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl p-0 border-none bg-background">
        <DialogHeader className="sr-only">
          <DialogTitle>{COPY.TITLE}</DialogTitle>
          <DialogDescription>{COPY.SUBTITLE}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col lg:flex-row h-full">

          {/* LEFT: CAPTURE OPTIONS */}
          <div className="w-full lg:w-1/3 bg-muted/50 p-8 border-r border-border flex flex-col">
            <div className="mb-8">
              <div className="bg-background p-4 rounded-3xl shadow-sm mb-4 inline-flex">
                <Camera className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground">{COPY.TITLE}</h3>
              <p className="text-muted-foreground text-xs mt-2">{COPY.SUBTITLE}</p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleDirectScan}
                disabled={!sessionReady}
                className="w-full h-12"
              >
                {sessionReady ? (
                  <Camera className="h-4 w-4 mr-2" />
                ) : (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {COPY.OPTION_CAPTURE}
              </Button>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {COPY.OPTION_CAPTURE_HINT}
              </p>

              {/* Hidden file input for manual upload */}
              <input
                ref={fileInputRef as React.RefObject<HTMLInputElement | null>}
                type="file"
                accept="image/*,.heic,.heif"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                onClick={handleLoadTestImages}
                disabled={isLoadingTestImages || !session?.id}
                variant="outline"
                className="w-full"
              >
                {isLoadingTestImages ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-4 w-4 mr-2" />
                    {COPY.OPTION_UPLOAD}
                  </>
                )}
              </Button>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {COPY.UPLOAD_HEIC_NOTE}
              </p>
            </div>
          </div>

          {/* RIGHT: LIVE SYNC GRID */}
          <div className="flex-1 p-8 overflow-y-auto bg-background max-h-[90vh]">
            <p className="mb-4 text-xs text-muted-foreground">{COPY.GRID_HINT}</p>

            <div className="grid grid-cols-2 gap-4 pb-20">
              {views.map((view) => {
                const imageUrl = session?.postureImages[view];
                const status = processingStatus[view];
                const isProcessing = status !== 'idle' && status !== 'complete' && status !== 'error';
                const statusLabel = getStatusLabel(status);

                return (
                  <div key={view} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">{view}</span>
                      {status === 'complete' && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                      {status === 'error' && <AlertCircle className="h-3 w-3 text-red-500" />}
                    </div>
                    <div className="aspect-[3/4] rounded-2xl bg-muted/50 border-2 border-dashed border-border overflow-hidden relative flex items-center justify-center">
                      {imageUrl ? (
                          <img
                            src={imageUrl}
                            className="w-full h-full object-cover animate-in fade-in zoom-in duration-500 cursor-pointer hover:opacity-90 transition-opacity"
                            alt={view}
                            title="Click to view full image"
                            onClick={() => setPreviewImage({ url: imageUrl, view })}
                          />
                      ) : (
                        <>
                          <img
                            src={placeholderImages[view]}
                            className="w-full h-full object-cover"
                            alt={`${view} placeholder`}
                          />
                          <Camera className="absolute h-6 w-6 text-muted-foreground" />
                        </>
                      )}

                      {/* Processing Status Overlay - Only show full overlay before wireframe is ready */}
                      {isProcessing && !isWireframeButAnalyzing(view) && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 animate-in fade-in duration-300 bg-black/60">
                          <Loader2 className="h-8 w-8 text-white animate-spin" />
                          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white">
                            {statusLabel}
                          </span>
                        </div>
                      )}

                      {/* Subtle pill indicator when wireframe is visible but AI still working */}
                      {isWireframeButAnalyzing(view) && (
                        <div className="absolute bottom-2 left-2 right-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                          <div className="flex items-center justify-center gap-1.5 bg-black/60 backdrop-blur-sm text-white/90 text-[10px] font-medium py-1.5 px-3 rounded-full">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>{statusLabel}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* POSTURE SUMMARY - Simple per-view text (max 150 chars) */}
                    {session?.analysis[view]?.overall_assessment && (
                      <div className="mt-2 bg-muted/50 p-2 rounded-lg border border-border animate-in fade-in slide-in-from-bottom-2">
                        <p className="text-[10px] text-foreground-secondary leading-snug whitespace-normal break-words">
                          {session.analysis[view].overall_assessment}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {hasAllImages && (
              <div className="absolute bottom-0 left-0 right-0 p-8 bg-background/80 backdrop-blur-md border-t border-border z-50 animate-in slide-in-from-bottom-4 duration-500">
                <Button
                  onClick={handleApply}
                  className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs gap-3 shadow-lg shadow-emerald-500/20"
                >
                  {COPY.APPLY}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

        </div>
      </DialogContent>
      {deviceCaptureOpen && session?.id && profile?.organizationId && (
        <CoachPostureCapturePanel
          sessionId={session.id}
          organizationId={profile.organizationId}
          profile={profile}
          onClose={() => setDeviceCaptureOpen(false)}
        />
      )}
      {previewImage && (
        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0 border-none bg-black/95">
            <DialogHeader className="sr-only">
              <DialogTitle>Posture Image Preview</DialogTitle>
            </DialogHeader>
            <div className="relative w-full h-full flex items-center justify-center p-8">
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 z-50 text-white hover:text-gray-300 p-2"
              >
                <X className="h-6 w-6" />
              </button>
              <img
                src={previewImage.url}
                alt={previewImage.view}
                className="max-w-full max-h-[85vh] object-contain"
              />
              <div className="absolute bottom-4 left-4 right-4 text-center">
                <p className="text-white text-sm font-bold">{previewImage.view.replace('-', ' ')} View</p>
                <p className="text-white/60 text-xs mt-1">Green = aligned | Orange = mild | Red = significant deviation | Cyan dashed = reference lines</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};
