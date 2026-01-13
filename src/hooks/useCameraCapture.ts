/**
 * Hook for camera capture, image upload, and OCR processing
 * Extracted from Companion.tsx to improve maintainability
 */

import { useState, useRef, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { getStorage, db } from '@/services/firebase';
import { updatePostureImage, updateInBodyImage } from '@/services/liveSessions';
import { processInBodyScan } from '@/lib/ai/ocrEngine';
import { LandmarkResult } from '@/lib/ai/postureLandmarks';
import type Webcam from 'react-webcam';

interface UseCameraCaptureOptions {
  sessionId: string | undefined;
  mode: 'posture' | 'inbody';
  views: ReadonlyArray<{ readonly id: string; readonly label: string }>;
  onAudioFeedback?: (text: string) => void;
  onSequenceComplete?: () => void;
  onNextView?: (nextIdx: number) => void;
  shutterAudio: React.RefObject<HTMLAudioElement | null>;
}

interface UseCameraCaptureResult {
  isUploading: number;
  isProcessingOcr: boolean;
  ocrReviewData: Record<string, string> | null;
  setOcrReviewData: React.Dispatch<React.SetStateAction<Record<string, string> | null>>;
  performCapture: (webcamRef: React.RefObject<Webcam>, viewIdx: number, landmarks?: LandmarkResult | null) => Promise<void>;
  handleApplyOcr: () => Promise<void>;
}

export function useCameraCapture({
  sessionId,
  mode,
  views,
  onAudioFeedback,
  onSequenceComplete,
  onNextView,
  shutterAudio,
}: UseCameraCaptureOptions): UseCameraCaptureResult {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(0);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [ocrReviewData, setOcrReviewData] = useState<Record<string, string> | null>(null);

  const performCapture = useCallback(
    async (webcamRef: React.RefObject<Webcam>, viewIdx: number, landmarks?: LandmarkResult | null) => {
      console.log('[CAPTURE] performCapture called', { viewIdx, mode, sessionId, hasWebcam: !!webcamRef.current });
      
      const webcam = webcamRef.current;

      if (!webcam || !webcam.video) {
        console.error('[CAPTURE] Webcam not available', { webcam: !!webcam, video: !!webcam?.video });
        onAudioFeedback?.('Camera error.');
        return;
      }

      const viewData = views[viewIdx];
      if (!viewData) {
        console.error('[CAPTURE] Invalid index:', viewIdx, 'views length:', views.length);
        return;
      }

      console.log('[CAPTURE] Initiating sync for view', viewData.id);

      // Shutter sound
      try {
        if (shutterAudio.current) {
          void shutterAudio.current.play().catch((e) => console.warn('[AUDIO] Shutter failed:', e));
        }
      } catch (e) {
        console.warn('[AUDIO] Shutter error:', e);
      }

      // Screenshot
      const imageSrc = webcam.getScreenshot();
      if (!imageSrc) {
        console.error('[CAPTURE] Screenshot failed');
        onAudioFeedback?.('Capture failed.');
        return;
      }

      console.log('[CAPTURE] Screenshot captured, length:', imageSrc.length);

      // Sync to App
      if (!sessionId) {
        console.error('[CAPTURE] No sessionId provided');
        return;
      }

      setIsUploading((prev) => prev + 1);

      if (mode === 'inbody') {
        console.log('[CAPTURE] InBody mode - processing OCR');
        onAudioFeedback?.('Analyzing InBody report...');

        updateInBodyImage(sessionId, imageSrc)
          .then(() => {
            console.log('[CAPTURE] InBody image uploaded, starting OCR');
            setIsProcessingOcr(true);
            toast({ title: 'Scanning...', description: 'AI is analyzing the InBody report' });

            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Scan taking too long. Try again or enter manually.')), 15000)
            );

            return Promise.race([processInBodyScan(imageSrc), timeoutPromise]);
          })
          .then((result) => {
            console.log('[CAPTURE] OCR result', result);
            if (result.fields && Object.keys(result.fields).length > 0) {
              setOcrReviewData(result.fields as Record<string, string>);
              onAudioFeedback?.('Data extracted. Review and confirm.');
              toast({ title: 'Scan Complete!', description: 'Review the extracted data below' });
            } else {
              toast({
                title: 'No data found',
                description: 'Try a clearer photo with better lighting.',
                variant: 'destructive',
              });
              onAudioFeedback?.('Could not read data. Try again.');
            }
          })
          .catch((err: unknown) => {
            console.error('[CAPTURE] OCR Error:', err);
            toast({
              title: 'Scan Issue',
              description: err instanceof Error ? err.message : 'Please retake or enter values manually.',
              variant: 'destructive',
            });
            onAudioFeedback?.('Scan issue. Please try again.');
          })
          .finally(() => {
            setIsProcessingOcr(false);
            setIsUploading((prev) => Math.max(0, prev - 1));
          });
      } else {
        // Posture mode
        console.log('[CAPTURE] Posture mode - uploading image', { view: viewData.id, hasLandmarks: !!landmarks });
        const capturedLandmarks = landmarks || undefined;
        
        updatePostureImage(sessionId, viewData.id, imageSrc, capturedLandmarks, 'iphone')
          .then(() => {
            console.log('[CAPTURE] Posture image uploaded successfully');
            toast({ title: `${viewData.label} Sent` });
          })
          .catch((err: unknown) => {
            console.error('[CAPTURE] Upload error:', err);
            toast({ title: 'Sync Error', variant: 'destructive' });
          })
          .finally(() => {
            setIsUploading((prev) => Math.max(0, prev - 1));
            console.log('[CAPTURE] Upload complete, checking next view', { viewIdx, totalViews: views.length });
          });

        if (viewIdx < views.length - 1) {
          const next = viewIdx + 1;
          console.log('[CAPTURE] Scheduling next view', next);
          // Scheduling next view
          onNextView?.(next);
        } else {
          console.log('[CAPTURE] Sequence complete');
          onSequenceComplete?.();
        }
      }
    },
    [sessionId, mode, views, onAudioFeedback, onSequenceComplete, onNextView, toast, shutterAudio]
  );

  const handleApplyOcr = useCallback(async () => {
    if (!sessionId || !ocrReviewData) return;
    try {
      setIsUploading((prev) => prev + 1);
      const sessionRef = doc(db, 'live_sessions', sessionId);
      await setDoc(
        sessionRef,
        {
          ocrReviewData: ocrReviewData,
          ocrDataReady: true,
          ocrDataSentAt: Timestamp.now(),
        },
        { merge: true }
      );
      onAudioFeedback?.('Data has been added to the app.');
      setOcrReviewData(null);
    } catch (err: unknown) {
      console.error('[OCR] Apply error:', err);
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setIsUploading((prev) => Math.max(0, prev - 1));
    }
  }, [sessionId, ocrReviewData, onAudioFeedback, toast]);

  return {
    isUploading,
    isProcessingOcr,
    ocrReviewData,
    setOcrReviewData,
    performCapture,
    handleApplyOcr,
  };
}

