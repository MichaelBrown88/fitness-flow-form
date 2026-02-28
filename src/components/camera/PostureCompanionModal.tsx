/**
 * PostureCompanionModal
 * 
 * Modal for mobile companion posture capture with QR code connection,
 * real-time image sync, and AI analysis display.
 */

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePostureCompanion } from '@/hooks/usePostureCompanion';
import type { PostureCompanionData } from '@/lib/types/companion';
import { 
  Smartphone, 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  Camera, 
  ArrowRight,
  ShieldAlert,
  ImagePlus,
  X
} from 'lucide-react';

interface PostureCompanionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: PostureCompanionData) => void;
  onStartDirectScan?: () => void;
}

export const PostureCompanionModal: React.FC<PostureCompanionModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  onStartDirectScan
}) => {
  const {
    session,
    companionUrl,
    connectionState,
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
    onStartDirectScan
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl p-0 border-none bg-white">
        <DialogHeader className="sr-only">
          <DialogTitle>Posture Capture</DialogTitle>
          <DialogDescription>
            Connect your phone to capture posture images and view real-time AI results.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col lg:flex-row h-full">
          
          {/* LEFT: CONNECTION STATUS & QR */}
          <div className="w-full lg:w-1/3 bg-slate-50 p-8 border-r border-slate-100 flex flex-col items-center">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="bg-white p-4 rounded-3xl shadow-sm mb-4">
                <Smartphone className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Use Your Phone</h3>
              <p className="text-slate-500 text-xs mt-2">Connect your phone to take photos</p>
            </div>

            <div className="p-4 bg-white rounded-3xl shadow-xl border-4 border-white mb-6 flex items-center justify-center min-h-[212px]">
              {companionUrl ? (
                <div className="animate-in zoom-in duration-500">
                  <QRCodeSVG value={companionUrl} size={180} />
                </div>
              ) : (
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              )}
            </div>

            <div className="w-full space-y-3">
              {/* 3-tier connection state indicator */}
              {connectionState === 'online' ? (
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-3 rounded-xl">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-xs font-bold">Phone Connected</span>
                </div>
              ) : connectionState === 'unstable' ? (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-3 rounded-xl">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs font-bold">Attempting to Reconnect...</span>
                </div>
              ) : connectionState === 'disconnected' ? (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs font-bold">Connection Lost - Scan to Reconnect</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-500 bg-slate-100 px-4 py-3 rounded-xl">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs font-bold">Waiting for connection...</span>
                </div>
              )}
            </div>

            <div className="mt-auto w-full pt-8 border-t border-slate-200 space-y-3">
              {/* Hidden file input for manual upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.heic,.heif"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              
              {/* Client Photo Upload Button */}
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
                    Upload Client Photos
                  </>
                )}
              </Button>
              
              {onStartDirectScan && (
                <Button
                  onClick={handleDirectScan}
                  variant="outline"
                  className="w-full"
                >
                  Use This Device Instead
                </Button>
              )}
            </div>
          </div>

          {/* RIGHT: INSTRUCTIONS & LIVE SYNC GRID */}
          <div className="flex-1 p-8 overflow-y-auto bg-white max-h-[90vh]">
            <div className="mb-6">
              <h4 className="text-lg font-bold text-slate-900 mb-2">How to Use</h4>
              <ol className="space-y-3 text-sm text-slate-600 mb-4">
                <li className="flex gap-3">
                  <span className="font-bold text-primary">1.</span>
                  <span>Open your iPhone camera app</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-primary">2.</span>
                  <span>Scan the QR code on the left</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-primary">3.</span>
                  <span>Follow the on-screen instructions to capture all 4 views</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-primary">4.</span>
                  <span>Photos will appear here as they're captured</span>
                </li>
              </ol>
            </div>

            <div className="grid grid-cols-2 gap-4 pb-20">
              {views.map((view) => {
                const imageUrl = session?.postureImages[view];
                const status = processingStatus[view];
                const isProcessing = status !== 'idle' && status !== 'complete' && status !== 'error';
                const statusLabel = getStatusLabel(status);
                
                return (
                  <div key={view} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">{view}</span>
                      {status === 'complete' && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                      {status === 'error' && <AlertCircle className="h-3 w-3 text-red-500" />}
                    </div>
                    <div className="aspect-[3/4] rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 overflow-hidden relative flex items-center justify-center">
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
                          <Camera className="absolute h-6 w-6 text-slate-300" />
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
                      <div className="mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100 animate-in fade-in slide-in-from-bottom-2">
                        <p className="text-[10px] text-slate-600 leading-snug whitespace-normal break-words">
                          {session.analysis[view].overall_assessment}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {hasAllImages && (
              <div className="absolute bottom-0 left-0 right-0 p-8 bg-white/80 backdrop-blur-md border-t border-slate-100 z-50 animate-in slide-in-from-bottom-4 duration-500">
                <Button 
                  onClick={handleApply}
                  className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs gap-3 shadow-lg shadow-emerald-500/20"
                >
                  Apply Analysis
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

        </div>
      </DialogContent>
      
      {/* Image Preview Modal */}
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
