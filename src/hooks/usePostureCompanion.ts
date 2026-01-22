/**
 * usePostureCompanion Hook
 * 
 * Extracted from PostureCompanionModal.tsx to separate logic from UI.
 * Handles session management, connection monitoring, file uploads,
 * and image preview for the mobile companion posture capture.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  createLiveSession, 
  subscribeToLiveSession, 
  updatePostureImage,
  type LiveSession 
} from '@/services/liveSessions';
import { loadImagesFromFiles } from '@/lib/test/postureTestImages';
import { generatePlaceholderWithGreenLines } from '@/lib/utils/postureOverlay';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type { PostureCompanionData } from '@/lib/types/companion';
import { logger } from '@/lib/utils/logger';
import { UI_TOASTS } from '@/constants/ui';
import { CONFIG } from '@/config';

// Connection state for 3-tier heartbeat monitoring
export type ConnectionState = 'offline' | 'online' | 'unstable' | 'disconnected';

const VIEWS = ['front', 'back', 'side-left', 'side-right'] as const;
export type ViewType = typeof VIEWS[number];

export interface PreviewImage {
  url: string;
  view: string;
}

export interface UsePostureCompanionOptions {
  isOpen: boolean;
  onComplete: (data: PostureCompanionData) => void;
  onClose: () => void;
  onStartDirectScan?: () => void;
}

export interface UsePostureCompanionResult {
  // Session
  session: LiveSession | null;
  companionUrl: string;
  
  // Connection
  isOnline: boolean;
  connectionState: ConnectionState;
  error: string | null;
  
  // Loading
  isLoadingTestImages: boolean;
  
  // Preview
  previewImage: PreviewImage | null;
  setPreviewImage: React.Dispatch<React.SetStateAction<PreviewImage | null>>;
  
  // File input ref
  fileInputRef: React.RefObject<HTMLInputElement>;
  
  // Computed
  placeholderImages: Record<string, string>;
  hasAllImages: boolean;
  isComplete: boolean;
  views: readonly ViewType[];
  
  // Handlers
  handleLoadTestImages: () => void;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleApply: () => void;
  handleDirectScan: () => void;
}

export function usePostureCompanion({
  isOpen,
  onComplete,
  onClose,
  onStartDirectScan
}: UsePostureCompanionOptions): UsePostureCompanionResult {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  // Session state
  const [session, setSession] = useState<LiveSession | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('offline');
  const [error, setError] = useState<string | null>(null);
  
  // Loading state
  const [isLoadingTestImages, setIsLoadingTestImages] = useState(false);
  
  // Preview state
  const [previewImage, setPreviewImage] = useState<PreviewImage | null>(null);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const heartbeatCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Create Session when modal opens
  useEffect(() => {
    if (isOpen && !session) {
      const init = async () => {
        try {
          const newSession = await createLiveSession('current-client', profile?.organizationId, profile);
          setSession(newSession);
          setError(null);
        } catch (err) {
          setError("Connection failed. Please check your internet.");
        }
      };
      init();
    }
  }, [isOpen, session, profile?.organizationId]);

  // Pre-warm MediaPipe when modal opens (while user scans QR code)
  // This loads WASM/model files into browser cache, reducing latency when capture starts
  useEffect(() => {
    if (!isOpen) return;

    const prewarmMediaPipe = async () => {
      try {
        logger.debug('[PREWARM] Starting MediaPipe pre-warm...');
        
        // Dynamic import - follows "Lazy Load Large Assets" rule
        const { Pose } = await import('@mediapipe/pose');
        
        const pose = new Pose({
          locateFile: (file: string) => `${CONFIG.AI.MEDIAPIPE.POSE_CDN}/${file}`,
        });
        
        pose.setOptions({
          modelComplexity: CONFIG.AI.MEDIAPIPE.MODEL_COMPLEXITY,
          smoothLandmarks: true,
          minDetectionConfidence: CONFIG.AI.MEDIAPIPE.MIN_DETECTION_CONFIDENCE,
          minTrackingConfidence: CONFIG.AI.MEDIAPIPE.MIN_TRACKING_CONFIDENCE,
        });
        
        // Initialize loads WASM and model files - browser caches them
        await pose.initialize();
        
        // Close immediately - we just wanted to cache the files
        pose.close();
        
        logger.debug('[PREWARM] MediaPipe pre-warm complete - files cached');
      } catch (err) {
        // Silent fail - pre-warming is non-critical optimization
        // Capture will still work, just with slightly longer initial load
        logger.debug('[PREWARM] MediaPipe pre-warm failed (non-critical):', err);
      }
    };

    // Run pre-warming in background (don't block session creation)
    prewarmMediaPipe();
  }, [isOpen]);

  // Subscribe to session updates
  useEffect(() => {
    if (!session?.id) return;

    const unsubscribe = subscribeToLiveSession(session.id, (updatedSession) => {
      setSession(updatedSession);
      if (updatedSession.companionJoined) {
        setIsOnline(true);
      }

      // Display companion logs in console for debugging
      if (updatedSession.companionLogs && Array.isArray(updatedSession.companionLogs)) {
        const newLogs = updatedSession.companionLogs.slice(-5);
        newLogs.forEach((log: { timestamp: any; message: string; level: 'info' | 'warn' | 'error' }) => {
          const logMethod = log.level === 'error' ? console.error : log.level === 'warn' ? console.warn : console.log;
          logMethod(`[MOBILE ${session.id}] ${log.message}`);
        });
      }
    });

    return () => unsubscribe();
  }, [session?.id]);

  // Monitor heartbeat for connection state
  useEffect(() => {
    if (!session?.id || !isOnline) {
      setConnectionState('offline');
      return;
    }

    const checkHeartbeat = () => {
      const lastHeartbeat = session?.lastHeartbeat as { toMillis?: () => number } | undefined;
      if (!lastHeartbeat?.toMillis) {
        if (session?.companionJoined) {
          setConnectionState('online');
        }
        return;
      }

      const now = Date.now();
      const heartbeatTime = lastHeartbeat.toMillis();
      const staleness = now - heartbeatTime;

      // 3-tier state machine
      if (staleness < 10000) {
        setConnectionState('online');
      } else if (staleness < 20000) {
        setConnectionState('unstable');
      } else {
        setConnectionState('disconnected');
        if (isOnline) {
          logger.debug('[HEARTBEAT] Connection lost - mobile companion disconnected');
          toast({
            title: UI_TOASTS.ERROR.CONNECTION_LOST,
            description: UI_TOASTS.ERROR.CONNECTION_LOST_DESC,
            variant: "destructive"
          });
        }
        setIsOnline(false);
      }
    };

    checkHeartbeat();
    heartbeatCheckIntervalRef.current = setInterval(checkHeartbeat, 2000);

    return () => {
      if (heartbeatCheckIntervalRef.current) {
        clearInterval(heartbeatCheckIntervalRef.current);
        heartbeatCheckIntervalRef.current = null;
      }
    };
  }, [session?.id, session?.lastHeartbeat, session?.companionJoined, isOnline, toast]);

  // Generate companion URL
  const companionUrl = session 
    ? `${window.location.origin}/companion/${session.id}?token=${session.companionToken}` 
    : '';

  // Generate placeholder images
  const placeholderImages = useMemo(() => {
    const placeholders: Record<string, string> = {};
    VIEWS.forEach(view => {
      placeholders[view] = generatePlaceholderWithGreenLines(view);
    });
    return placeholders;
  }, []);
  
  const hasAllImages = VIEWS.every(v => !!session?.postureImages[v]);
  const isComplete = VIEWS.every(v => !!session?.analysis[v]);

  // Handler: Trigger file input
  const handleLoadTestImages = useCallback(() => {
    if (!session?.id) {
      toast({ 
        title: UI_TOASTS.ERROR.SESSION_NOT_READY, 
        description: UI_TOASTS.ERROR.SESSION_NOT_READY_DESC, 
        variant: "destructive" 
      });
      return;
    }

    if (isLoadingTestImages) {
      toast({ 
        title: UI_TOASTS.ERROR.UPLOAD_IN_PROGRESS, 
        description: UI_TOASTS.ERROR.UPLOAD_IN_PROGRESS_DESC, 
        variant: "destructive" 
      });
      return;
    }

    try {
      fileInputRef.current?.click();
    } catch (err) {
      logger.error('[UPLOAD] Failed to trigger file input:', err);
      toast({ 
        title: UI_TOASTS.ERROR.UPLOAD_FAILED, 
        description: UI_TOASTS.ERROR.UPLOAD_FAILED_DESC, 
        variant: "destructive" 
      });
    }
  }, [session?.id, isLoadingTestImages, toast]);

  // Handler: Process uploaded files
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!session?.id) {
      toast({
        title: UI_TOASTS.ERROR.NO_ACTIVE_SESSION,
        description: UI_TOASTS.ERROR.NO_ACTIVE_SESSION_DESC,
        variant: "destructive"
      });
      return;
    }
    
    const files = event.target.files;
    if (!files || files.length === 0) {
      toast({
        title: UI_TOASTS.ERROR.NO_FILES_SELECTED,
        description: UI_TOASTS.ERROR.NO_FILES_SELECTED_DESC,
        variant: "destructive"
      });
      return;
    }

    setIsLoadingTestImages(true);
    try {
      toast({ title: UI_TOASTS.SUCCESS.LOADING_IMAGES, description: `Processing ${files.length} uploaded file(s)` });
      
      const fileArray = Array.from(files);
      const fileMap: Record<string, File> = {};
      
      fileArray.forEach((file, index) => {
        const fileName = file.name.toLowerCase();
        let matchedView: string | null = null;
        
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
        } else if (index < VIEWS.length) {
          matchedView = VIEWS[index];
        }
        
        if (matchedView) {
          fileMap[matchedView] = file;
        }
      });
      
      if (Object.keys(fileMap).length === 0) {
        throw new Error('Could not match uploaded files to views. Please name files with "front", "back", "side-left", or "side-right" in the filename, or upload them in order: Front, Back, Side-Left, Side-Right.');
      }
      
      const testImages = await loadImagesFromFiles(fileMap);
      
      if (Object.keys(testImages).length === 0) {
        throw new Error('No images could be loaded from the uploaded files. Please check that the files are valid images (JPEG, PNG, HEIC, etc.).');
      }
      
      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];
      
      for (const view of VIEWS) {
        if (testImages[view]) {
          try {
            if (!testImages[view] || !testImages[view].startsWith('data:image')) {
              const errorMsg = `Invalid image data format for ${view}. Expected data URL.`;
              errors.push(`${view}: ${errorMsg}`);
              failCount++;
              continue;
            }
            
            const processingPromise = updatePostureImage(session.id, view, testImages[view], undefined, 'manual', profile?.organizationId, profile);
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Processing timeout after 60 seconds')), 60000)
            );
            
            await Promise.race([processingPromise, timeoutPromise]);
            successCount++;
            
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            errors.push(`${view}: ${errorMsg}`);
            failCount++;
          }
        }
      }
      
      if (successCount > 0) {
        toast({ 
          title: UI_TOASTS.SUCCESS.IMAGES_UPLOADED, 
          description: `${successCount} image(s) processed. AI analysis will start automatically.${failCount > 0 ? ` ${failCount} image(s) failed.` : ''}` 
        });
      } else {
        const errorDetails = errors.length > 0 ? ` Errors: ${errors.join('; ')}` : '';
        throw new Error(`All ${failCount} image(s) failed to process.${errorDetails} Check browser console for details.`);
      }
    } catch (error) {
      logger.error('[UPLOAD] Failed to upload images:', error);
      toast({ 
        title: UI_TOASTS.ERROR.UPLOAD_FAILED, 
        description: error instanceof Error ? error.message : "Could not upload images. Check console for details.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoadingTestImages(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [session?.id, toast]);

  // Handler: Apply analysis results
  const handleApply = useCallback(() => {
    if (!session) return;
    
    const storageUrls: Record<string, string> = {};
    
    VIEWS.forEach((view) => {
      const storageUrl = session[`postureImagesStorage_${view}`] || 
                        session[`postureImagesFull_${view}`];
      if (typeof storageUrl === 'string') {
        storageUrls[view] = storageUrl;
      } else {
        logger.warn(`[APPLY] No Storage URL found for ${view} - image may not be stored yet`);
      }
    });
    
    const findings = {
      postureAiResults: session.analysis,
      postureImages: session.postureImages,
      postureImagesStorage: storageUrls,
      postureHeadOverall: session.analysis['side-right']?.forward_head?.status === 'Neutral' ? ['neutral'] : ['forward-head'],
      postureShouldersOverall: session.analysis.front?.shoulder_alignment?.status === 'Neutral' ? ['neutral'] : ['rounded'],
      postureBackOverall: session.analysis['side-right']?.kyphosis?.status !== 'Normal' ? ['increased-kyphosis'] : ['neutral'],
    };
    
    onComplete(findings);
    onClose();
  }, [session, onComplete, onClose]);

  // Handler: Switch to direct scan
  const handleDirectScan = useCallback(() => {
    onClose();
    onStartDirectScan?.();
  }, [onClose, onStartDirectScan]);

  return {
    // Session
    session,
    companionUrl,
    
    // Connection
    isOnline,
    connectionState,
    error,
    
    // Loading
    isLoadingTestImages,
    
    // Preview
    previewImage,
    setPreviewImage,
    
    // File input ref
    fileInputRef,
    
    // Computed
    placeholderImages,
    hasAllImages,
    isComplete,
    views: VIEWS,
    
    // Handlers
    handleLoadTestImages,
    handleFileUpload,
    handleApply,
    handleDirectScan,
  };
}
