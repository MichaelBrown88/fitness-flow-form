/**
 * Hook for camera capture, image upload, and OCR processing
 * Extracted from Companion.tsx to improve maintainability
 */

import { useState, useRef, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
      const webcam = webcamRef.current;

      if (!webcam || !webcam.video) {
        onAudioFeedback?.('Camera error.');
        return;
      }

      const viewData = views[viewIdx];
      if (!viewData) {
        console.error('[CAPTURE] Invalid index:', viewIdx);
        return;
      }

      // Initiating sync for view

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
        onAudioFeedback?.('Capture failed.');
        return;
      }

      // Sync to App
      if (sessionId) {
        setIsUploading((prev) => prev + 1);

        if (mode === 'inbody') {
          onAudioFeedback?.('Analyzing InBody report...');

          updateInBodyImage(sessionId, imageSrc)
            .then(() => {
              setIsProcessingOcr(true);
              toast({ title: 'Scanning...', description: 'AI is analyzing the InBody report' });

              const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Scan taking too long. Try again or enter manually.')), 15000)
              );

              return Promise.race([processInBodyScan(imageSrc), timeoutPromise]);
            })
            .then((result) => {
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
              console.error('[OCR] Error:', err);
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
          const capturedLandmarks = landmarks || undefined;
          // Sending image with landmarks

          updatePostureImage(sessionId, viewData.id, imageSrc, capturedLandmarks, 'iphone')
            .then(() => {
              toast({ title: `${viewData.label} Sent` });
            })
            .catch((err: unknown) => {
              console.error('[CAPTURE] Upload error:', err);
              toast({ title: 'Sync Error', variant: 'destructive' });
            })
            .finally(() => setIsUploading((prev) => Math.max(0, prev - 1)));

          if (viewIdx < views.length - 1) {
            const next = viewIdx + 1;
            // Scheduling next view
            onNextView?.(next);
          } else {
            onSequenceComplete?.();
          }
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

