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
              <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Remote Camera</h3>
              <p className="text-slate-500 text-xs mt-2">Scan to connect your iPhone.</p>
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
              <h4 className="text-lg font-black text-slate-900 mb-2">How to Use</h4>
              <ol className="space-y-3 text-sm text-slate-600 mb-4">
                <li className="flex gap-3">
                  <span className="font-black text-primary">1.</span>
                  <span>Open your iPhone camera app</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-black text-primary">2.</span>
                  <span>Scan the QR code on the left</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-black text-primary">3.</span>
                  <span>Follow the on-screen instructions to capture all 4 views</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-black text-primary">4.</span>
                  <span>Photos will appear here as they're captured</span>
                </li>
              </ol>
            </div>

            <div className="grid grid-cols-2 gap-4 pb-20">
              {views.map((view) => {
                const imageUrl = session?.postureImages[view];
                return (
                  <div key={view} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{view}</span>
                      {imageUrl && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
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
                    </div>

                    {/* POSTURE ANALYSIS CARD */}
                    {session?.analysis[view] && (
                      <div className="mt-2 bg-slate-50 p-3 rounded-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-2 mb-2">
                          <ShieldAlert className="h-3 w-3 text-primary" />
                          <span className="text-[8px] font-black uppercase text-primary">Posture Analysis</span>
                        </div>
                        <div className="space-y-1.5">
                          {session.analysis[view].head_alignment && (
                            <div>
                              <span className="text-[9px] font-bold text-slate-600">Head: </span>
                              <span className="text-[9px] font-black text-slate-900">
                                {session.analysis[view].head_alignment.status}
                              </span>
                            </div>
                          )}
                          {session.analysis[view].forward_head && (
                            <div>
                              <span className="text-[9px] font-bold text-slate-600">Neck: </span>
                              <span className="text-[9px] font-black text-slate-900">
                                {session.analysis[view].forward_head.status}
                              </span>
                            </div>
                          )}
                          {session.analysis[view].shoulder_alignment && (
                            <div>
                              <span className="text-[9px] font-bold text-slate-600">Shoulders: </span>
                              <span className="text-[9px] font-black text-slate-900">
                                {session.analysis[view].shoulder_alignment.status}
                              </span>
                            </div>
                          )}
                          {session.analysis[view].kyphosis && (
                            <div>
                              <span className="text-[9px] font-bold text-slate-600">Kyphosis: </span>
                              <span className="text-[9px] font-black text-slate-900">
                                {session.analysis[view].kyphosis.status}
                              </span>
                            </div>
                          )}
                          {session.analysis[view].lordosis && (
                            <div>
                              <span className="text-[9px] font-bold text-slate-600">Lordosis: </span>
                              <span className="text-[9px] font-black text-slate-900">
                                {session.analysis[view].lordosis.status}
                              </span>
                            </div>
                          )}
                          {session.analysis[view].spinal_curvature && (
                            <div>
                              <span className="text-[9px] font-bold text-slate-600">Spine: </span>
                              <span className="text-[9px] font-black text-slate-900">
                                {session.analysis[view].spinal_curvature.status}
                              </span>
                            </div>
                          )}
                          {session.analysis[view].hip_alignment && (
                            <div>
                              <span className="text-[9px] font-bold text-slate-600">Hips: </span>
                              <span className="text-[9px] font-black text-slate-900">
                                {session.analysis[view].hip_alignment.status}
                              </span>
                            </div>
                          )}
                          {session.analysis[view].pelvic_tilt && (
                            <div>
                              <span className="text-[9px] font-bold text-slate-600">Pelvis: </span>
                              <span className="text-[9px] font-black text-slate-900">
                                {session.analysis[view].pelvic_tilt.status}
                              </span>
                            </div>
                          )}
                          {session.analysis[view].knee_alignment && (
                            <div>
                              <span className="text-[9px] font-bold text-slate-600">Knees: </span>
                              <span className="text-[9px] font-black text-slate-900">
                                {session.analysis[view].knee_alignment.status}
                              </span>
                            </div>
                          )}
                          {session.analysis[view].knee_position && (
                            <div>
                              <span className="text-[9px] font-bold text-slate-600">Knees: </span>
                              <span className="text-[9px] font-black text-slate-900">
                                {session.analysis[view].knee_position.status}
                              </span>
                            </div>
                          )}
                          
                          {session.analysis[view].deviations && session.analysis[view].deviations.length > 0 && (
                            <div className="pt-1 border-t border-slate-200">
                              <p className="text-[8px] text-slate-500 leading-tight">
                                {session.analysis[view].deviations.slice(0, 3).join(', ')}
                              </p>
                            </div>
                          )}
                        </div>
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
                  className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs gap-3 shadow-2xl shadow-emerald-500/20"
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
                <p className="text-white text-sm font-bold uppercase">{previewImage.view.replace('-', ' ')} View</p>
                <p className="text-white/60 text-xs mt-1">Reference lines: Red vertical (midline/plumb), Red horizontal (shoulders/hips)</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};
