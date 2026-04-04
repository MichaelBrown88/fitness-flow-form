import React, { useState, useEffect, useRef } from 'react';
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
  LIVE_SESSION_PLACEHOLDER_CLIENT_ID,
  subscribeToLiveSession,
  type LiveSession,
} from '@/services/liveSessions';
import { 
  Smartphone, 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import type { BodyCompCompanionData } from '@/lib/types/companion';
import { CONFIG } from '@/config';
import { logger } from '@/lib/utils/logger';

interface BodyCompCompanionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: BodyCompCompanionData) => void;
  onStartDirectScan?: () => void;
}

export const BodyCompCompanionModal: React.FC<BodyCompCompanionModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  onStartDirectScan
}) => {
  const { user, profile } = useAuth();
  const [session, setSession] = useState<LiveSession | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const processedRef = useRef<string | null>(null);

  // 1. Create Session (same pattern as PostureCompanionModal)
  useEffect(() => {
    if (!isOpen || session) return;
    let cancelled = false;
    const init = async () => {
      try {
        const newSession = await createLiveSession(
          LIVE_SESSION_PLACEHOLDER_CLIENT_ID,
          profile?.organizationId,
          profile,
        );
        if (!cancelled) {
          setSession(newSession);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Connection failed. Please check your internet.");
      }
    };
    void init();
    return () => {
      cancelled = true;
    };
  }, [isOpen, session, profile]);

  // 1.5 Pre-warm Firebase AI when modal opens (while user scans QR code)
  // This initializes the Gemini model so OCR starts faster when image arrives
  useEffect(() => {
    if (!isOpen) return;

    const prewarmFirebaseAI = async () => {
      try {
        logger.debug('[PREWARM] Starting Firebase AI pre-warm...');
        
        // Dynamic imports - follows "Lazy Load Large Assets" rule
        const [{ getAI, VertexAIBackend, getGenerativeModel }, { getApp }] = await Promise.all([
          import('firebase/ai'),
          import('firebase/app')
        ]);
        
        const firebaseApp = getApp();
        const ai = getAI(firebaseApp, { 
          backend: new VertexAIBackend() 
        });
        
        // Initialize the model - this establishes the connection
        getGenerativeModel(ai, { 
          model: CONFIG.AI.GEMINI.MODEL_NAME,
          generationConfig: {
            responseMimeType: "application/json",
          }
        });
        
        logger.debug('[PREWARM] Firebase AI pre-warm complete - model ready');
      } catch (err) {
        // Silent fail - pre-warming is non-critical optimization
        logger.debug('[PREWARM] Firebase AI pre-warm failed (non-critical):', err);
      }
    };

    // Run pre-warming in background (don't block session creation)
    prewarmFirebaseAI();
  }, [isOpen]);

  // 2. Listen for body comp image - with optimistic UI
  useEffect(() => {
    if (!session?.id) return;

    const unsubscribe = subscribeToLiveSession(session.id, async (updatedSession) => {
      // Snapshot update received
      setSession(updatedSession);
      
      if (updatedSession.companionJoined) {
        setIsOnline(true);
      }

      // Optimistic UI: Show "Processing..." as soon as body comp image is detected
      // Don't wait for ocrDataReady - this gives immediate feedback
      const hasBodyCompImage = !!(
        updatedSession.bodyCompScanImage ||
        updatedSession.bodyCompScanImageStorage ||
        updatedSession.bodyCompScanImageFull
      );
      
      if (hasBodyCompImage && !isProcessing && processedRef.current !== 'processing') {
        logger.debug('[BODYCOMP] Image detected - showing processing state');
        setIsProcessing(true);
        processedRef.current = 'processing';
        toast({
          title: "Reading your report...",
          description: "Finding the numbers in your report"
        });
      }

      // Check for OCR review data from companion app
      const ocrData = updatedSession.ocrReviewData;
      const isOcrReady = updatedSession.ocrDataReady;
      
      if (isOcrReady && ocrData && processedRef.current !== 'completed') {
        // OCR Review data received from companion
        processedRef.current = 'completed'; // Mark as completed to avoid duplicate triggers
        setIsProcessing(false);
        
        // Pass the data directly (onComplete expects the OCR data structure)
        const formattedData = {
          ...(typeof ocrData === 'object' ? ocrData : {}),
          bodyCompReportImageUrl:
            (updatedSession.bodyCompScanImageStorage as string) ||
            (updatedSession.bodyCompScanImageFull as string) ||
            updatedSession.bodyCompScanImage,
        };
        
        // Calling onComplete with formatted data
        onComplete(formattedData);
        onClose();
      }
    });

    return () => unsubscribe();
  }, [session?.id, isProcessing, onComplete, onClose, toast]);

  const companionUrl = session 
    ? `${window.location.origin}/companion/${session.id}?token=${session.companionToken}&mode=bodycomp`
    : '';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl p-0 border-none bg-background text-left">
        <VisuallyHidden>
          <DialogTitle>Phone Camera</DialogTitle>
          <DialogDescription>Use your phone to photograph the body comp report.</DialogDescription>
        </VisuallyHidden>
        <div className="flex flex-col lg:flex-row h-full">
          
          {/* LEFT: CONNECTION STATUS & QR */}
          <div className="w-full lg:w-1/2 bg-muted/50 p-8 border-r border-border flex flex-col items-center">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="bg-background p-4 rounded-3xl shadow-sm mb-4">
                <Smartphone className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Use Your Phone</h3>
              <p className="text-muted-foreground text-xs mt-2">Connect your phone to take a photo</p>
            </div>

            <div className="p-4 bg-background rounded-3xl shadow-xl border-4 border-white mb-6 flex items-center justify-center min-h-[212px]">
              {companionUrl && (
                <div className="animate-in zoom-in duration-500">
                  <QRCodeSVG value={companionUrl} size={180} />
                </div>
              )}
              {!companionUrl && (
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
                <div className="flex items-center gap-2 text-muted-foreground bg-muted px-4 py-3 rounded-xl">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs font-bold">Waiting for connection...</span>
                </div>
              )}

              {isProcessing && (
                <div className="flex items-center gap-2 text-primary bg-brand-light px-4 py-3 rounded-xl">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs font-bold">Reading your report...</span>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs font-bold">{error}</span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: INSTRUCTIONS */}
          <div className="w-full lg:w-1/2 p-8 flex flex-col justify-center">
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-bold text-foreground mb-2">How to Use</h4>
                <ol className="space-y-3 text-sm text-foreground-secondary">
                  <li className="flex gap-3">
                    <span className="font-bold text-primary">1.</span>
                    <span>Open the camera app on your phone</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-primary">2.</span>
                    <span>Scan the QR code on the left</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-primary">3.</span>
                    <span>Point your camera at the body comp report</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-primary">4.</span>
                    <span>The photo will be taken automatically</span>
                  </li>
                </ol>
              </div>

              {onStartDirectScan && (
                <div className="pt-4 border-t border-border">
                  <Button
                    onClick={onStartDirectScan}
                    variant="outline"
                    className="w-full"
                  >
                    Use This Device Instead
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-border">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

