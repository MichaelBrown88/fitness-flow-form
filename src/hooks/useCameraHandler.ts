/**
 * Hook for managing camera and companion modal state
 * Extracted from MultiStepForm to improve performance and separation of concerns
 */

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { processBodyCompScan } from '@/lib/ai/ocrEngine';
import type { FormData } from '@/contexts/FormContext';
import type { PostureCompanionData } from '@/lib/types/companion';
import { logger } from '@/lib/utils/logger';

interface UseCameraHandlerProps {
  updateFormData: (updates: Partial<FormData>) => void;
  organizationId?: string;
}

export function useCameraHandler({
  updateFormData,
  organizationId,
}: UseCameraHandlerProps) {
  const { toast } = useToast();
  // Camera state
  const [showCamera, setShowCamera] = useState<false | 'ocr'>(false);
  const [showPostureCompanion, setShowPostureCompanion] = useState(false);
  const [ocrReviewData, setOcrReviewData] = useState<Partial<FormData> | null>(null);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [processingMode, setProcessingMode] = useState<'ocr' | 'posture' | null>(null);
  const [postureRetakeWarning, setPostureRetakeWarning] = useState<string | null>(null);
  const clearPostureRetakeWarning = useCallback(() => setPostureRetakeWarning(null), []);

  const handleCapture = useCallback(async (imageSrc: string) => {
    if (showCamera === 'ocr') {
      setShowCamera(false);
      setProcessingMode('ocr');
      setIsProcessingOcr(true);

      toast({
        title: "Image Captured",
        description: "Reading the numbers from your report...",
      });

      try {
        const result = await processBodyCompScan(imageSrc, organizationId);
        if (result.fields && Object.keys(result.fields).length > 0) {
          setOcrReviewData(result.fields);
        } else {
          toast({
            title: "Couldn't read the report",
            description: "Retake the photo with the numbers sharp and glare-free, or type the values into the fields below.",
            variant: "destructive"
          });
        }
      } catch (err) {
        logger.error('OCR error:', err);
        // Config gates get their own copy so a platform flag or empty credit
        // balance never masquerades as a broken scanner.
        const isCredit = err instanceof Error && err.name === 'AICreditExhaustedError';
        const isDisabled = err instanceof Error && err.name === 'FeatureDisabledError';
        toast({
          title: isCredit
            ? "No AI credits remaining"
            : isDisabled
              ? "Photo import is switched off"
              : "Couldn't read the report",
          description: isCredit || isDisabled
            ? err.message
            : "Retake the photo, or type the values into the fields below.",
          variant: "destructive",
        });
      } finally {
        setIsProcessingOcr(false);
        setProcessingMode(null);
      }
    }
  }, [showCamera, organizationId, toast]);

  // Apply reviewed values and stay on the current step — the coach confirms
  // any remaining fields and advances manually (no auto phase jump).
  const applyOcrData = useCallback(() => {
    if (ocrReviewData) {
      // Set flag to show analyzer fields after OCR data is applied
      updateFormData({ ...ocrReviewData, showAnalyzerFields: 'yes' });
      setOcrReviewData(null);
      toast({ title: "Body composition data applied", description: "Check the remaining fields, then continue when ready." });
    }
  }, [ocrReviewData, updateFormData, toast]);

  const handlePostureCompanionComplete = useCallback((data: PostureCompanionData) => {
    updateFormData(data);
    toast({ title: "Posture data applied", description: "Analysis has been populated." });
  }, [updateFormData, toast]);

  return {
    // State
    showCamera,
    setShowCamera,
    showPostureCompanion,
    setShowPostureCompanion,
    ocrReviewData,
    setOcrReviewData,
    isProcessingOcr,
    processingMode,
    postureRetakeWarning,
    clearPostureRetakeWarning,
    // Handlers
    handleCapture,
    applyOcrData,
    handlePostureCompanionComplete,
  };
}
