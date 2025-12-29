import React, { useState, useEffect, useRef, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  createLiveSession, 
  subscribeToLiveSession, 
  updatePostureAnalysis,
  type LiveSession 
} from '@/services/liveSessions';
import { analyzePostureImage } from '@/lib/ai/postureAnalysis';
import { loadTestPostureImages, loadImagesFromFiles } from '@/lib/test/postureTestImages';
import { updatePostureImage } from '@/services/liveSessions';
import { addDeviationOverlay, generatePlaceholderWithGreenLines } from '@/lib/utils/postureOverlay';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
  TestTube,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface PostureCompanionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: any) => void;
  onStartDirectScan?: () => void;
}

export const PostureCompanionModal: React.FC<PostureCompanionModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  onStartDirectScan
}) => {
  const { user, profile } = useAuth();
  const [session, setSession] = useState<LiveSession | null>(null);
  const [analyzingViews, setAnalyzingViews] = useState<Record<string, boolean>>({});
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

  // 2. Listen for Photos
  useEffect(() => {
    if (!session?.id) return;

    const unsubscribe = subscribeToLiveSession(session.id, (updatedSession) => {
      console.log('[MODAL] Snapshot update:', updatedSession.postureImages);
      setSession(updatedSession);
      // ONLY set online if companion has joined
      if (updatedSession.companionJoined) {
        setIsOnline(true);
      }

      // 3. AUTO-START AI ANALYSIS
      views.forEach((view) => {
        const imageUrl = updatedSession.postureImages[view];
        const hasAnalysis = updatedSession.analysis[view];
        
        if (imageUrl && !hasAnalysis && !processedRef.current.has(`${view}-${imageUrl}`)) {
          processedRef.current.add(`${view}-${imageUrl}`);
          
          // Use full-size image for AI analysis if available, otherwise use compressed
          const fullSizeUrl = updatedSession[`postureImagesFull_${view}`];
          const imageForAI = (typeof fullSizeUrl === 'string' ? fullSizeUrl : null) || imageUrl;
          
          // Get landmarks if available in session
          const landmarks = updatedSession[`landmarks_${view}`];
          
          if (fullSizeUrl) {
            console.log(`[AI] Using full-size image from Storage for ${view}`);
          } else {
            console.warn(`[AI] Full-size image not available for ${view}, using compressed version`);
          }
          
          handleAnalyze(view, imageForAI, landmarks);
        }
      });
    });

    return () => unsubscribe();
  }, [session?.id]);

  const companionUrl = session 
    ? `${window.location.origin}/companion/${session.id}?token=${session.companionToken}` 
    : '';

  const views = ['front', 'back', 'side-left', 'side-right'] as const;

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

  const handleAnalyze = async (view: 'front' | 'side-right' | 'side-left' | 'back', url: string, landmarks?: any) => {
    setAnalyzingViews(prev => ({ ...prev, [view]: true }));
    try {
      console.log(`[AI] Starting analysis for ${view}...`);
      // Pass MediaPipe landmarks to AI to inform its analysis
      const result = await analyzePostureImage(url, view, landmarks);
      console.log(`[AI] Analysis result for ${view}:`, result);
      
      if (session?.id) {
        await updatePostureAnalysis(session.id, view, result);
        
        // Update image with red deviation lines
        // The image already has green reference lines (added before AI analysis)
        // Now we add red deviation lines showing how the body deviates from the green lines
        const sessionRef = doc(db, 'live_sessions', session.id);
        const { getDoc } = await import('firebase/firestore');
        const snap = await getDoc(sessionRef);
        const latestSession = snap.exists() ? snap.data() as LiveSession : session;
        
        // Get image WITH green lines (should already have them from updatePostureImage)
        // Prefer base64 from Firestore to avoid CORS issues with Storage URLs
        let currentImage = latestSession.postureImages?.[view] || 
                          session.postureImages?.[view] ||
                          (latestSession[`postureImagesFull_${view}`] as string) || 
                          (latestSession[`postureImagesStorage_${view}`] as string);
        
        // If still no image, use the URL we used for AI (should have green lines)
        if (!currentImage && url) {
          currentImage = url;
        }
        
        console.log(`[OVERLAY] Image source check for ${view}:`, {
          hasFirestoreBase64: !!latestSession.postureImages?.[view],
          hasStorageUrl: !!latestSession[`postureImagesFull_${view}`],
          hasLatestImage: !!latestSession.postureImages?.[view],
          hasSessionImage: !!session.postureImages?.[view],
          hasUrl: !!url,
          currentImageType: currentImage ? (currentImage.startsWith('data:') ? 'base64' : currentImage.startsWith('http') ? 'url' : 'unknown') : 'none'
        });
        
        if (currentImage) {
          try {
            console.log(`[OVERLAY] ✓ Adding red deviation lines to ${view} (green lines already present)`);
            // Prefer base64 from Firestore to avoid CORS issues
            let imageData = currentImage;
            if (currentImage.startsWith('http')) {
              // Only fetch from Storage if we don't have base64 from Firestore
              console.log(`[OVERLAY] Fetching image with green lines from URL (no Firestore base64 available): ${currentImage}`);
              try {
                const response = await fetch(currentImage, { mode: 'cors' });
                if (!response.ok) {
                  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                const blob = await response.blob();
                imageData = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                });
              } catch (fetchError) {
                console.error(`[OVERLAY] Failed to fetch from Storage URL (CORS or network error):`, fetchError);
                // If fetch fails, try to use the base64 from Firestore if available
                const fallbackBase64 = latestSession.postureImages?.[view] || session.postureImages?.[view];
                if (fallbackBase64 && fallbackBase64.startsWith('data:')) {
                  console.log(`[OVERLAY] Using fallback base64 from Firestore`);
                  imageData = fallbackBase64;
                } else {
                  throw new Error(`Cannot fetch image from Storage and no base64 fallback available: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
                }
              }
            }
            
            // Add red deviation lines to image that already has green reference lines
            // The red lines show deviations FROM the green reference lines
            const imageWithOverlay = await addDeviationOverlay(imageData, view, result);
            console.log(`[OVERLAY] ✓ Red deviation lines added to ${view}`);
            
            // Update both Firestore (compressed) and Storage (full-size) with complete overlay
            // Compress for Firestore
            const { compressImageForDisplay } = await import('@/lib/utils/imageCompression');
            const compressed = await compressImageForDisplay(imageWithOverlay, 800, 0.8);
            
            // Update Firestore with compressed version (WITH complete overlay: green + red lines)
            // Use updateDoc with dot notation to avoid nested entity issues
            const { updateDoc } = await import('firebase/firestore');
            await updateDoc(sessionRef, {
              [`postureImages.${view}`]: compressed.compressed
            });
            
            // Upload full-size to Storage (overwrite original with overlay version)
            // New structure: clients/{clientId}/sessions/{sessionId}/{view}_full.jpg
            const { ref, uploadString, getDownloadURL } = await import('firebase/storage');
            const { storage } = await import('@/lib/firebase');
            const clientId = session.clientId || 'unknown';
            const storagePath = `clients/${clientId}/sessions/${session.id}/${view}_full.jpg`;
            const storageRef = ref(storage, storagePath);
            const fullSizeBase64 = compressed.fullSize.split(',')[1] || compressed.fullSize;
            const snapshot = await uploadString(storageRef, fullSizeBase64, 'base64', { contentType: 'image/jpeg' });
            const downloadUrl = await getDownloadURL(snapshot.ref);
            
            // Store Storage URL (now points to image WITH overlay)
            await setDoc(sessionRef, {
              [`postureImagesStorage_${view}`]: downloadUrl,
              [`postureImagesFull_${view}`]: downloadUrl
            }, { merge: true });
            
            // Immediately refresh session state to show updated image with deviation lines
            const { getDoc } = await import('firebase/firestore');
            const snap = await getDoc(sessionRef);
            if (snap.exists()) {
              const updatedData = snap.data() as LiveSession;
              setSession(updatedData);
              console.log(`[OVERLAY] Session state updated with new image (with deviation lines) for ${view}`);
            }
            
            console.log(`[OVERLAY] Added deviation lines to ${view} and updated Storage`);
          } catch (overlayErr) {
            console.warn(`[OVERLAY] Failed to add deviation lines:`, overlayErr);
          }
        }
        
        console.log(`[AI] Success for ${view}`);
      }
    } catch (err) {
      console.error(`[AI] Failed for ${view}:`, err);
      toast({ title: "AI Analysis Failed", description: "Could not process " + view, variant: "destructive" });
    } finally {
      setAnalyzingViews(prev => ({ ...prev, [view]: false }));
    }
  };

  const handleLoadTestImages = async () => {
    if (!session?.id) {
      toast({ title: "No session", description: "Please wait for session to initialize", variant: "destructive" });
      return;
    }

    // Prompt for file upload
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!session?.id) return;
    
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsLoadingTestImages(true);
    try {
      toast({ title: "Loading test images...", description: "Processing uploaded images" });
      
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
      
      // Load images from files
      const testImages = await loadImagesFromFiles(fileMap);
      
      // Validate that we have at least one image
      if (Object.keys(testImages).length === 0) {
        throw new Error('No images could be loaded from the uploaded files. Please check that the files are valid images.');
      }
      
      console.log(`[TEST] Successfully loaded ${Object.keys(testImages).length} images, injecting into session...`);
      
      // Inject test images into session (this will trigger AI analysis automatically)
      for (const view of views) {
        if (testImages[view]) {
          try {
            console.log(`[TEST] Injecting test image for ${view}...`);
            // Validate image data before sending
            if (!testImages[view] || !testImages[view].startsWith('data:image')) {
              throw new Error(`Invalid image data for ${view}`);
            }
            await updatePostureImage(session.id, view, testImages[view]);
            console.log(`[TEST] Successfully injected ${view} image`);
            // Small delay to avoid overwhelming Firestore
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (err) {
            console.error(`[TEST] Failed to inject ${view} image:`, err);
            // Continue with other images even if one fails
            toast({
              title: `Failed to process ${view} image`,
              description: err instanceof Error ? err.message : 'Unknown error',
              variant: 'destructive'
            });
          }
        }
      }
      
      toast({ title: "Test images loaded", description: "AI analysis will start automatically" });
    } catch (error) {
      console.error('[TEST] Failed to load test images:', error);
      toast({ 
        title: "Test failed", 
        description: error instanceof Error ? error.message : "Could not load test images. Check console for details.", 
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
        console.log(`[APPLY] Found Storage URL for ${view}:`, storageUrl);
      } else {
        console.warn(`[APPLY] No Storage URL found for ${view} - image may not be stored yet`);
      }
    });
    
    // Map comprehensive AI results for the report
    const findings = {
      postureAiResults: session.analysis,
      postureImages: session.postureImages, // Compressed images with overlay for display
      postureImagesStorage: storageUrls, // Full-size Storage URLs for reports/comparisons
      // Legacy fields for backward compatibility
      postureHeadOverall: session.analysis['side-right']?.forward_head?.status === 'Neutral' ? 'neutral' : 'forward-head',
      postureShouldersOverall: session.analysis.front?.shoulder_alignment?.status === 'Neutral' ? 'neutral' : 'rounded',
      postureBackOverall: session.analysis['side-right']?.kyphosis?.status !== 'Normal' ? 'increased-kyphosis' : 'neutral',
    };
    
    console.log('[POSTURE] Applying Full AI Findings:', findings);
    console.log('[POSTURE] Storage URLs available:', Object.keys(storageUrls).length, 'of', views.length);
    
    onComplete(findings);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl p-0 border-none bg-white">
        <DialogHeader className="sr-only">
          <DialogTitle>Posture Capture</DialogTitle>
          <div className="text-xs text-slate-500">Connect your phone to capture posture images and view real-time AI results.</div>
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
              
              {/* Manual Upload Button for Testing */}
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
                    <TestTube className="h-4 w-4 mr-2" />
                    Upload Test Images
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
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs text-amber-800">
                  <strong className="font-black">Testing Mode:</strong> You can also upload images manually using the "Upload Test Images" button. 
                  Images will be automatically aligned with the green control lines for testing.
                </p>
              </div>
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
                          {analyzingViews[view] && (
                            <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center">
                              <Loader2 className="h-8 w-8 animate-spin text-white mb-2" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-white">AI Analysis...</span>
                            </div>
                          )}
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

                    {/* AI FINDINGS CARD */}
                    {session?.analysis[view] && (
                      <div className="mt-2 bg-slate-50 p-3 rounded-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-2 mb-2">
                          <ShieldAlert className="h-3 w-3 text-primary" />
                          <span className="text-[8px] font-black uppercase text-primary">AI Findings</span>
                        </div>
                        <div className="space-y-1.5">
                          {/* Side view findings */}
                          {session.analysis[view].head_alignment && (
                            <div>
                              <span className="text-[9px] font-bold text-slate-600">Head: </span>
                              <span className="text-[9px] font-black text-slate-900">
                                {session.analysis[view].head_alignment.status} ({session.analysis[view].head_alignment.tilt_degrees.toFixed(1)}°)
                              </span>
                            </div>
                          )}
                          {session.analysis[view].forward_head && (
                            <div>
                              <span className="text-[9px] font-bold text-slate-600">Neck: </span>
                              <span className="text-[9px] font-black text-slate-900">
                                {session.analysis[view].forward_head.status} ({session.analysis[view].forward_head.deviation_degrees.toFixed(1)}°)
                              </span>
                            </div>
                          )}
                          {session.analysis[view].shoulder_alignment && (
                            <div>
                              <span className="text-[9px] font-bold text-slate-600">Shoulders: </span>
                              <span className="text-[9px] font-black text-slate-900">
                                {session.analysis[view].shoulder_alignment.status}
                                {session.analysis[view].shoulder_alignment.height_difference_cm !== undefined && 
                                  ` (${Math.abs(session.analysis[view].shoulder_alignment.height_difference_cm).toFixed(1)}cm diff)`
                                }
                                {session.analysis[view].shoulder_alignment.forward_position_cm !== undefined && 
                                  ` (${Math.abs(session.analysis[view].shoulder_alignment.forward_position_cm).toFixed(1)}cm forward)`
                                }
                              </span>
                            </div>
                          )}
                          {session.analysis[view].kyphosis && (
                            <div>
                              <span className="text-[9px] font-bold text-slate-600">Kyphosis: </span>
                              <span className="text-[9px] font-black text-slate-900">
                                {session.analysis[view].kyphosis.status} ({session.analysis[view].kyphosis.curve_degrees}°)
                              </span>
                            </div>
                          )}
                          {session.analysis[view].lordosis && (
                            <div>
                              <span className="text-[9px] font-bold text-slate-600">Lordosis: </span>
                              <span className="text-[9px] font-black text-slate-900">
                                {session.analysis[view].lordosis.status} ({session.analysis[view].lordosis.curve_degrees}°)
                              </span>
                            </div>
                          )}
                          {/* Front/Back view findings */}
                          {session.analysis[view].hip_alignment && (
                            <div>
                              <span className="text-[9px] font-bold text-slate-600">Hips: </span>
                              <span className="text-[9px] font-black text-slate-900">
                                {session.analysis[view].hip_alignment.status}
                                {session.analysis[view].hip_alignment.height_difference_cm !== undefined && 
                                  ` (${Math.abs(session.analysis[view].hip_alignment.height_difference_cm).toFixed(1)}cm diff)`
                                }
                              </span>
                            </div>
                          )}
                          {session.analysis[view].pelvic_tilt && (
                            <div>
                              <span className="text-[9px] font-bold text-slate-600">Pelvis: </span>
                              <span className="text-[9px] font-black text-slate-900">
                                {session.analysis[view].pelvic_tilt.status}
                                {session.analysis[view].pelvic_tilt.lateral_tilt_degrees !== undefined && 
                                  ` (${Math.abs(session.analysis[view].pelvic_tilt.lateral_tilt_degrees).toFixed(1)}° tilt)`
                                }
                                {session.analysis[view].pelvic_tilt.anterior_tilt_degrees !== undefined && 
                                  ` (${Math.abs(session.analysis[view].pelvic_tilt.anterior_tilt_degrees).toFixed(1)}° tilt)`
                                }
                                {session.analysis[view].pelvic_tilt.hip_shift_cm !== undefined && session.analysis[view].pelvic_tilt.hip_shift_cm > 0 && 
                                  ` (${Math.abs(session.analysis[view].pelvic_tilt.hip_shift_cm).toFixed(1)}cm ${session.analysis[view].pelvic_tilt.hip_shift_direction || ''} shift)`
                                }
                              </span>
                            </div>
                          )}
                          {session.analysis[view].spinal_curvature && (
                            <div>
                              <span className="text-[9px] font-bold text-slate-600">Spine: </span>
                              <span className="text-[9px] font-black text-slate-900">
                                {session.analysis[view].spinal_curvature.status} ({session.analysis[view].spinal_curvature.curve_degrees.toFixed(1)}°)
                              </span>
                            </div>
                          )}
                          {session.analysis[view].knee_alignment && (
                            <div>
                              <span className="text-[9px] font-bold text-slate-600">Knees: </span>
                              <span className="text-[9px] font-black text-slate-900">
                                {session.analysis[view].knee_alignment.status}
                                {session.analysis[view].knee_alignment.deviation_degrees !== undefined && 
                                  ` (${Math.abs(session.analysis[view].knee_alignment.deviation_degrees).toFixed(1)}°)`
                                }
                              </span>
                            </div>
                          )}
                          {session.analysis[view].knee_position && (
                            <div>
                              <span className="text-[9px] font-bold text-slate-600">Knees: </span>
                              <span className="text-[9px] font-black text-slate-900">
                                {session.analysis[view].knee_position.status}
                                {session.analysis[view].knee_position.deviation_degrees !== undefined && 
                                  ` (${Math.abs(session.analysis[view].knee_position.deviation_degrees).toFixed(1)}°)`
                                }
                              </span>
                            </div>
                          )}
                          {session.analysis[view].spinal_curvature && (
                            <div>
                              <span className="text-[9px] font-bold text-slate-600">Spine: </span>
                              <span className="text-[9px] font-black text-slate-900">
                                {session.analysis[view].spinal_curvature.status}
                                {session.analysis[view].spinal_curvature.curve_degrees !== undefined && 
                                  ` (${Math.abs(session.analysis[view].spinal_curvature.curve_degrees).toFixed(1)}°)`
                                }
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
                  Apply AI Findings
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

