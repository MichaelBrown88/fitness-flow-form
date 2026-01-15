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
import { logger } from '@/lib/utils/logger';

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
      logger.debug('performCapture called', 'useCameraCapture', { viewIdx, mode, sessionId, hasWebcam: !!webcamRef.current });
      
      const webcam = webcamRef.current;

      if (!webcam || !webcam.video) {
        logger.error('Webcam not available', 'useCameraCapture', { webcam: !!webcam, video: !!webcam?.video });
        onAudioFeedback?.('Camera error.');
        return;
      }

      const viewData = views[viewIdx];
      if (!viewData) {
        logger.error('Invalid index', 'useCameraCapture', { viewIdx, viewsLength: views.length });
        return;
      }

      logger.debug('Initiating sync for view', 'useCameraCapture', { viewId: viewData.id });

      // Shutter sound
      try {
        if (shutterAudio.current) {
          void shutterAudio.current.play().catch((e) => logger.warn('Shutter audio failed', 'useCameraCapture:audio', e));
        }
      } catch (e) {
        logger.warn('Shutter audio error', 'useCameraCapture:audio', e);
      }

      // Screenshot
      const imageSrc = webcam.getScreenshot();
      if (!imageSrc) {
        logger.error('Screenshot failed', 'useCameraCapture');
        onAudioFeedback?.('Capture failed.');
        return;
      }

      logger.debug('Screenshot captured', 'useCameraCapture', { imageLength: imageSrc.length });

      // Sync to App
      if (!sessionId) {
        logger.error('No sessionId provided', 'useCameraCapture');
        return;
      }

      setIsUploading((prev) => prev + 1);

      if (mode === 'inbody') {
        logger.debug('InBody mode - processing OCR', 'useCameraCapture');
        onAudioFeedback?.('Analyzing InBody report...');

        updateInBodyImage(sessionId, imageSrc)
          .then(() => {
            logger.debug('InBody image uploaded, starting OCR', 'useCameraCapture');
            setIsProcessingOcr(true);
            toast({ title: 'Scanning...', description: 'AI is analyzing the InBody report' });

            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Scan taking too long. Try again or enter manually.')), 15000)
            );

            return Promise.race([processInBodyScan(imageSrc), timeoutPromise]);
          })
          .then((result) => {
            logger.debug('OCR result received', 'useCameraCapture', result);
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
            logger.error('OCR Error', 'useCameraCapture', err);
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
        logger.debug('Posture mode - uploading image', 'useCameraCapture', { view: viewData.id, hasLandmarks: !!landmarks });
        const capturedLandmarks = landmarks || undefined;
        
        updatePostureImage(sessionId, viewData.id, imageSrc, capturedLandmarks, 'iphone')
          .then(() => {
            logger.debug('Posture image uploaded successfully', 'useCameraCapture');
            toast({ title: `${viewData.label} Sent` });
          })
          .catch((err: unknown) => {
            logger.error('Upload error', 'useCameraCapture', err);
            toast({ title: 'Sync Error', variant: 'destructive' });
          })
          .finally(() => {
            setIsUploading((prev) => Math.max(0, prev - 1));
            logger.debug('Upload complete, checking next view', 'useCameraCapture', { viewIdx, totalViews: views.length });
          });

        if (viewIdx < views.length - 1) {
          const next = viewIdx + 1;
          logger.debug('Scheduling next view', 'useCameraCapture', { next });
          // Scheduling next view
          onNextView?.(next);
        } else {
          logger.debug('Sequence complete', 'useCameraCapture');
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
      logger.error('OCR Apply error', 'useCameraCapture', err);
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

