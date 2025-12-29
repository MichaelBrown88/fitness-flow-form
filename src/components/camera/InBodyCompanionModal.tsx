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
  subscribeToLiveSession, 
  type LiveSession 
} from '@/services/liveSessions';
import { 
  Smartphone, 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  X
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface InBodyCompanionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: any) => void;
  onStartDirectScan?: () => void;
}

export const InBodyCompanionModal: React.FC<InBodyCompanionModalProps> = ({
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

  // 2. Listen for InBody Image
  useEffect(() => {
    if (!session?.id) return;

    const unsubscribe = subscribeToLiveSession(session.id, async (updatedSession) => {
      console.log('[INBODY MODAL] Snapshot update:', {
        inbodyImage: !!updatedSession.inbodyImage,
        inbodyImageFull: !!updatedSession.inbodyImageFull,
        inbodyImageStorage: !!updatedSession.inbodyImageStorage
      });
      setSession(updatedSession);
      
      if (updatedSession.companionJoined) {
        setIsOnline(true);
      }

      // Check for OCR review data from companion app
      const ocrData = updatedSession.ocrReviewData;
      const isOcrReady = updatedSession.ocrDataReady;
      
      if (isOcrReady && ocrData && !processedRef.current) {
        console.log('[INBODY MODAL] OCR Review data received from companion:', ocrData);
        processedRef.current = 'processed'; // Mark as processed to avoid duplicate triggers
        
        // Pass the data directly (onComplete expects the OCR data structure)
        const formattedData = {
          ...(typeof ocrData === 'object' ? ocrData : {}),
          inbodyImage: (updatedSession.inbodyImageStorage as string) || (updatedSession.inbodyImageFull as string) || updatedSession.inbodyImage
        };
        
        console.log('[INBODY MODAL] Calling onComplete with:', formattedData);
        onComplete(formattedData);
        onClose();
      }
    });

    return () => unsubscribe();
  }, [session?.id, isProcessing, onComplete, onClose, toast]);

  const companionUrl = session 
    ? `${window.location.origin}/companion/${session.id}?token=${session.companionToken}&mode=inbody`
    : '';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl p-0 border-none bg-white text-left">
        <VisuallyHidden>
          <DialogTitle>InBody Scan Remote Camera</DialogTitle>
          <DialogDescription>Use your iPhone to scan the InBody report for automated assessment data entry.</DialogDescription>
        </VisuallyHidden>
        <div className="flex flex-col lg:flex-row h-full">
          
          {/* LEFT: CONNECTION STATUS & QR */}
          <div className="w-full lg:w-1/2 bg-slate-50 p-8 border-r border-slate-100 flex flex-col items-center">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="bg-white p-4 rounded-3xl shadow-sm mb-4">
                <Smartphone className="h-10 w-10 text-indigo-600" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Remote Camera</h3>
              <p className="text-slate-500 text-xs mt-2">Scan to connect your iPhone.</p>
            </div>

            <div className="p-4 bg-white rounded-3xl shadow-xl border-4 border-white mb-6 flex items-center justify-center min-h-[212px]">
              {companionUrl && (
                <div className="animate-in zoom-in duration-500">
                  <QRCodeSVG value={companionUrl} size={180} />
                </div>
              )}
              {!companionUrl && (
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
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

              {isProcessing && (
                <div className="flex items-center gap-2 text-primary bg-brand-light px-4 py-3 rounded-xl">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs font-bold">Processing InBody scan...</span>
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
                <h4 className="text-lg font-black text-slate-900 mb-2">How to Use</h4>
                <ol className="space-y-3 text-sm text-slate-600">
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
                    <span>Position the InBody report in the frame</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-black text-primary">4.</span>
                    <span>The scan will be captured automatically</span>
                  </li>
                </ol>
              </div>

              {onStartDirectScan && (
                <div className="pt-4 border-t border-slate-200">
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

        <DialogFooter className="p-4 border-t border-slate-100">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

