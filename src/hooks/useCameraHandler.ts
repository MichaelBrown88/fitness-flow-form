/**
 * Hook for managing camera and companion modal state
 * Extracted from MultiStepForm to improve performance and separation of concerns
 */

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { processBodyCompScan } from '@/lib/ai/ocrEngine';
import { compressImageForDisplay } from '@/lib/utils/imageCompression';
import type { FormData } from '@/contexts/FormContext';
import type { PostureCompanionData } from '@/lib/types/companion';
import { logger } from '@/lib/utils/logger';

interface UseCameraHandlerProps {
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
  activePhaseId: string;
  activePhaseIdx: number;
  visiblePhases: Array<{ id: string }>;
  isPartialAssessment: boolean;
  organizationId?: string;
  onPhaseChange?: (idx: number) => void;
}

export function useCameraHandler({
  formData,
  updateFormData,
  activePhaseId,
  activePhaseIdx,
  visiblePhases,
  isPartialAssessment,
  organizationId,
  onPhaseChange,
}: UseCameraHandlerProps) {
  const { toast } = useToast();
  // Camera state
  const [showCamera, setShowCamera] = useState<false | 'ocr'>(false);
  const [showPostureCompanion, setShowPostureCompanion] = useState(false);
  const [showBodyCompCompanion, setShowBodyCompCompanion] = useState(false);
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
            title: "Scan failed",
            description: "AI couldn't find data. Please try again with a clearer photo.",
            variant: "destructive"
          });
        }
      } catch (err) {
        logger.error('OCR error:', err);
        const isCredit = err instanceof Error && err.name === 'AICreditExhaustedError';
        toast({
          title: isCredit ? "No AI credits remaining" : "Scan failed",
          description: isCredit ? err.message : "An error occurred during AI analysis.",
          variant: "destructive",
        });
      } finally {
        setIsProcessingOcr(false);
        setProcessingMode(null);
      }
    }
  }, [showCamera, organizationId, toast]);

  const applyOcrData = useCallback(() => {
    if (ocrReviewData) {
      // Set flag to show analyzer fields after OCR data is applied
      updateFormData({ ...ocrReviewData, showAnalyzerFields: 'yes' });
      setOcrReviewData(null);
      toast({ title: "Body composition data applied", description: "All fields have been populated." });
      
      if (activePhaseId === 'P2') {
        setTimeout(() => {
          if (isPartialAssessment) {
            toast({ title: "Data applied", description: "You can now review the fields and click Update Report when ready." });
          } else {
            const nextVisibleIdx = visiblePhases.findIndex((p, i) => i > activePhaseIdx);
            if (nextVisibleIdx !== -1 && onPhaseChange) {
              onPhaseChange(nextVisibleIdx);
            }
          }
        }, 800);
      }
    }
  }, [ocrReviewData, updateFormData, activePhaseId, activePhaseIdx, visiblePhases, isPartialAssessment, onPhaseChange, toast]);

  const handlePostureCompanionComplete = useCallback((data: PostureCompanionData) => {
    updateFormData(data);
    toast({ title: "Posture data applied", description: "Analysis has been populated." });
  }, [updateFormData, toast]);

  const handleBodyCompCompanionComplete = useCallback((data: Partial<FormData>) => {
    // Store data for review - applyOcrData will set the flag when applied
    setOcrReviewData(data);
    toast({ title: "Body composition data received", description: "Review and apply the extracted data." });
  }, [toast]);

  return {
    // State
    showCamera,
    setShowCamera,
    showPostureCompanion,
    setShowPostureCompanion,
    showBodyCompCompanion,
    setShowBodyCompCompanion,
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
    handleBodyCompCompanionComplete,
  };
}

