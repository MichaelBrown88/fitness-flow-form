import React, { useState, useEffect, useRef, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  createLiveSession, 
  subscribeToLiveSession, 
  type LiveSession 
} from '@/services/liveSessions';
import { loadTestPostureImages, loadImagesFromFiles } from '@/lib/test/postureTestImages';
import { updatePostureImage } from '@/services/liveSessions';
import { generatePlaceholderWithGreenLines } from '@/lib/utils/postureOverlay';
import { CONFIG } from '@/config';
import { 
  Smartphone, 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  Camera, 
  ArrowRight,
  RefreshCcw,
  Monitor,
  ShieldAlert,
  ImagePlus,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type { PostureCompanionData } from '@/lib/types/companion';

interface PostureCompanionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: PostureCompanionData) => void;
  onStartDirectScan?: () => void;
}

const views = ['front', 'back', 'side-left', 'side-right'] as const;

export const PostureCompanionModal: React.FC<PostureCompanionModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  onStartDirectScan
}) => {
  const { user, profile } = useAuth();
  const [session, setSession] = useState<LiveSession | null>(null);
  // Analysis is handled automatically by updatePostureImage - no separate state needed
  const [isOnline, setIsOnline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingTestImages, setIsLoadingTestImages] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; view: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const processedRef = useRef<Set<string>>(new Set());

  // 1. Create Session
  useEffect(() => {
    if (isOpen && !session) {
      const init = async () => {
        try {
          const newSession = await createLiveSession('current-client', profile?.organizationId);
          setSession(newSession);
          setError(null);
        } catch (err) {
          setError("Connection failed. Please check your internet.");
        }
      };
      init();
    }
  }, [isOpen, session, profile?.organizationId]);

  // 2. Listen for Photos and Logs
  useEffect(() => {
    if (!session?.id) return;

    const unsubscribe = subscribeToLiveSession(session.id, (updatedSession) => {
      // Snapshot update received
      setSession(updatedSession);
      // ONLY set online if companion has joined
      if (updatedSession.companionJoined) {
        setIsOnline(true);
      }

      // Display companion logs in console for debugging
      if (updatedSession.companionLogs && Array.isArray(updatedSession.companionLogs)) {
        const newLogs = updatedSession.companionLogs.slice(-5); // Show last 5 logs
        newLogs.forEach((log: { timestamp: any; message: string; level: 'info' | 'warn' | 'error' }) => {
          const logMethod = log.level === 'error' ? console.error : log.level === 'warn' ? console.warn : console.log;
          logMethod(`[MOBILE ${session.id}] ${log.message}`);
        });
      }

      // Analysis is now handled automatically by updatePostureImage (unified processing system)
    });

    return () => unsubscribe();
  }, [session?.id]);

  const companionUrl = session 
    ? `${window.location.origin}/companion/${session.id}?token=${session.companionToken}` 
    : '';

  // Generate placeholder images with green lines for each view (memoized)
  const placeholderImages = useMemo(() => {
    const placeholders: Record<string, string> = {};
    views.forEach(view => {
      placeholders[view] = generatePlaceholderWithGreenLines(view);
    });
    return placeholders;
  }, []); // Only generate once on mount
  
  const hasAllImages = views.every(v => !!session?.postureImages[v]);
  const isComplete = views.every(v => !!session?.analysis[v]);

  // Analysis is now handled automatically by updatePostureImage (unified processing system)
  // No separate handleAnalyze needed - everything happens in one unified flow

  const handleLoadTestImages = async () => {
    if (!session?.id) {
      toast({ 
        title: "Session not ready", 
        description: "Please wait for the session to initialize before uploading images.", 
        variant: "destructive" 
      });
      return;
    }

    if (isLoadingTestImages) {
      toast({ 
        title: "Upload in progress", 
        description: "Please wait for the current upload to complete.", 
        variant: "destructive" 
      });
      return;
    }

    // Prompt for file upload
    try {
      fileInputRef.current?.click();
    } catch (err) {
      console.error('[UPLOAD] Failed to trigger file input:', err);
      toast({ 
        title: "Upload failed", 
        description: "Could not open file selector. Please try again.", 
        variant: "destructive" 
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!session?.id) {
      toast({
        title: "No active session",
        description: "Please wait for the session to initialize before uploading images.",
        variant: "destructive"
      });
      return;
    }
    
    const files = event.target.files;
    if (!files || files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select one or more image files to upload.",
        variant: "destructive"
      });
      return;
    }

    setIsLoadingTestImages(true);
    try {
      toast({ title: "Loading images...", description: `Processing ${files.length} uploaded file(s)` });
      
      // Map files to views (user should upload in order)
      const fileArray = Array.from(files);
      const fileMap: Record<string, File> = {};
      
      fileArray.forEach((file, index) => {
        const fileName = file.name.toLowerCase();
        let matchedView: string | null = null;
        
        // Try to match by filename - improved matching for variations
        if (fileName.includes('front')) {
          matchedView = 'front';
        } else if (fileName.includes('right side') || fileName.includes('side-right') || 
                   (fileName.includes('right') && !fileName.includes('left'))) {
          matchedView = 'side-right';
        } else if (fileName.includes('left side') || fileName.includes('side-left') || 
                   (fileName.includes('left') && !fileName.includes('right'))) {
          matchedView = 'side-left';
        } else if (fileName.includes('back') || fileName.includes('rear')) {
          matchedView = 'back';
        } else if (index < views.length) {
          matchedView = views[index]; // Fallback to order
        }
        
        if (matchedView) {
          fileMap[matchedView] = file;
        }
      });
      
      // Check if we matched any files
      if (Object.keys(fileMap).length === 0) {
        throw new Error('Could not match uploaded files to views. Please name files with "front", "back", "side-left", or "side-right" in the filename, or upload them in order: Front, Back, Side-Left, Side-Right.');
      }
      
      // Load images from files
      const testImages = await loadImagesFromFiles(fileMap);
      
      // Validate that we have at least one image
      if (Object.keys(testImages).length === 0) {
        throw new Error('No images could be loaded from the uploaded files. Please check that the files are valid images (JPEG, PNG, HEIC, etc.).');
      }
      
      // Inject test images into session (this will trigger AI analysis automatically)
      // IMPORTANT: This uses the EXACT SAME alignment code as iPhone capture
      // Both paths call updatePostureImage() which uses addPostureOverlay() with identical parameters
      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];
      
      // Process images sequentially to avoid overwhelming the system
      for (const view of views) {
        if (testImages[view]) {
          try {
            // Validate image data before sending
            if (!testImages[view] || !testImages[view].startsWith('data:image')) {
              const errorMsg = `Invalid image data format for ${view}. Expected data URL.`;
              errors.push(`${view}: ${errorMsg}`);
              failCount++;
              continue;
            }
            
            // Use unified processing system - handles alignment, calculation, AI, deviation lines
            // Add timeout to prevent hanging
            const processingPromise = updatePostureImage(session.id, view, testImages[view], undefined, 'manual');
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Processing timeout after 60 seconds')), 60000)
            );
            
            await Promise.race([processingPromise, timeoutPromise]);
            successCount++;
            
            // Small delay to avoid overwhelming Firestore
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            errors.push(`${view}: ${errorMsg}`);
            failCount++;
            // Continue with other images even if one fails
          }
        }
      }
      
      if (successCount > 0) {
        toast({ 
          title: "Images uploaded successfully", 
          description: `${successCount} image(s) processed. AI analysis will start automatically.${failCount > 0 ? ` ${failCount} image(s) failed.` : ''}` 
        });
      } else {
        const errorDetails = errors.length > 0 ? ` Errors: ${errors.join('; ')}` : '';
        throw new Error(`All ${failCount} image(s) failed to process.${errorDetails} Check browser console for details.`);
      }
    } catch (error) {
      console.error('[UPLOAD] Failed to upload images:', error);
      toast({ 
        title: "Upload failed", 
        description: error instanceof Error ? error.message : "Could not upload images. Check console for details.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoadingTestImages(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleApply = async () => {
    if (!session) return;
    
    // Get Storage URLs for all images (for reports and comparisons)
    const storageUrls: Record<string, string> = {};
    
    views.forEach((view) => {
      const storageUrl = session[`postureImagesStorage_${view}`] || 
                        session[`postureImagesFull_${view}`];
      if (typeof storageUrl === 'string') {
        storageUrls[view] = storageUrl;
        // Found Storage URL for view
      } else {
        console.warn(`[APPLY] No Storage URL found for ${view} - image may not be stored yet`);
      }
    });
    
    // Map comprehensive AI results for the report
    const findings = {
      postureAiResults: session.analysis,
      postureImages: session.postureImages, // Compressed images with overlay for display
      postureImagesStorage: storageUrls, // Full-size Storage URLs for reports/comparisons
      // Legacy fields for backward compatibility (must be arrays)
      postureHeadOverall: session.analysis['side-right']?.forward_head?.status === 'Neutral' ? ['neutral'] : ['forward-head'],
      postureShouldersOverall: session.analysis.front?.shoulder_alignment?.status === 'Neutral' ? ['neutral'] : ['rounded'],
      postureBackOverall: session.analysis['side-right']?.kyphosis?.status !== 'Normal' ? ['increased-kyphosis'] : ['neutral'],
    };
    
    // Applying Posture Analysis
    
    onComplete(findings);
    onClose();
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
              {isOnline ? (
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-3 rounded-xl">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-xs font-bold">Phone Connected</span>
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
                  onClick={() => { onClose(); onStartDirectScan(); }}
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
                        <>
                          {/* Image with overlay - overlay is added during storage, so it's already in the image */}
                          <img 
                            src={imageUrl} 
                            className="w-full h-full object-cover animate-in fade-in zoom-in duration-500 cursor-pointer hover:opacity-90 transition-opacity" 
                            alt={view}
                            title="Click to view full image"
                            onClick={() => setPreviewImage({ url: imageUrl, view })}
                          />
                          {/* Analysis status is handled by session state - check session.analysis[view] */}
                        </>
                      ) : (
                        <>
                          {/* Placeholder with green reference lines */}
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
                          {/* Top-to-Bottom Findings (Unified Order) */}
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

