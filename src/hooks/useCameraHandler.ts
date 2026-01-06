/**
 * Hook for managing camera and companion modal state
 * Extracted from MultiStepForm to improve performance and separation of concerns
 */

import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { processInBodyScan } from '@/lib/ai/ocrEngine';
import { compressImageForDisplay } from '@/lib/utils/imageCompression';
import type { FormData } from '@/contexts/FormContext';
import type { PostureCompanionData } from '@/lib/types/companion';

interface UseCameraHandlerProps {
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
  activePhaseId: string;
  activePhaseIdx: number;
  visiblePhases: Array<{ id: string }>;
  isPartialAssessment: boolean;
  onPhaseChange?: (idx: number) => void;
}

export function useCameraHandler({
  formData,
  updateFormData,
  activePhaseId,
  activePhaseIdx,
  visiblePhases,
  isPartialAssessment,
  onPhaseChange,
}: UseCameraHandlerProps) {
  const { toast } = useToast();

  // Camera state
  const [showCamera, setShowCamera] = useState<false | 'ocr' | 'posture'>(false);
  const [showPostureCompanion, setShowPostureCompanion] = useState(false);
  const [showInBodyCompanion, setShowInBodyCompanion] = useState(false);
  const [ocrReviewData, setOcrReviewData] = useState<Partial<FormData> | null>(null);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [postureStep, setPostureStep] = useState<number>(0);

  const handleCapture = useCallback(async (imageSrc: string) => {
    if (showCamera === 'ocr') {
      setShowCamera(false);
      setIsProcessingOcr(true);
      
      toast({ 
        title: "Image Captured", 
        description: "Gemini AI is analyzing your InBody scan...",
      });

      try {
        const result = await processInBodyScan(imageSrc);
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
        console.error('OCR error:', err);
        toast({ title: "Scan failed", description: "An error occurred during AI analysis.", variant: "destructive" });
      } finally {
        setIsProcessingOcr(false);
      }
    } else if (showCamera === 'posture') {
      const views: ('front' | 'side-right' | 'side-left' | 'back')[] = ['front', 'side-right', 'side-left', 'back'];
      const currentView = views[postureStep] || 'front';
      
      toast({ title: `${currentView.toUpperCase()} captured`, description: "Processing image alignment..." });
      
      try {
        setIsProcessingOcr(true);
        
        toast({ title: "Processing posture...", description: "Aligning, calculating, and analyzing..." });
        const { processPostureImage } = await import('@/services/postureProcessing');
        const processed = await processPostureImage(imageSrc, currentView, undefined, 'this-device');
        
        const compressed = await compressImageForDisplay(processed.imageWithDeviations, 800, 0.8);
        const analysis = processed.analysis;
        
        const suggestions: Partial<FormData> = {};
        
        const imageField = `postureImage${currentView.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')}` as keyof FormData;
        (suggestions as Record<string, unknown>)[imageField] = compressed.compressed;

        if (currentView === 'side-right' || currentView === 'side-left') {
          suggestions.postureHeadOverall = [analysis.forward_head.status.toLowerCase().includes('neutral') ? 'neutral' : 'forward-head'];
          suggestions.postureBackOverall = [analysis.kyphosis.status.toLowerCase().includes('severe') ? 'increased-kyphosis' : 'neutral'];
        } else if (currentView === 'front') {
          suggestions.postureShouldersOverall = [analysis.shoulder_alignment.status.toLowerCase().includes('neutral') ? 'neutral' : 'rounded'];
        }

        updateFormData(suggestions);

        if (postureStep < views.length - 1) {
          setPostureStep(prev => prev + 1);
        } else {
          setShowCamera(false);
          toast({ title: "Posture analysis complete", description: "Aligned images and findings have been applied." });
        }
      } catch (err) {
        console.error('Local posture analysis error:', err);
        toast({ title: "Analysis failed", description: "Could not analyze posture image.", variant: "destructive" });
        setShowCamera(false);
      } finally {
        setIsProcessingOcr(false);
      }
    }
  }, [showCamera, postureStep, toast, updateFormData]);

  const applyOcrData = useCallback(() => {
    if (ocrReviewData) {
      updateFormData(ocrReviewData);
      setOcrReviewData(null);
      toast({ title: "InBody data applied", description: "All fields have been populated." });
      
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

  const handleInBodyCompanionComplete = useCallback((data: Partial<FormData>) => {
    setOcrReviewData(data);
    toast({ title: "InBody data applied", description: "All fields have been populated." });
  }, [toast]);

  return {
    // State
    showCamera,
    setShowCamera,
    showPostureCompanion,
    setShowPostureCompanion,
    showInBodyCompanion,
    setShowInBodyCompanion,
    ocrReviewData,
    setOcrReviewData,
    isProcessingOcr,
    postureStep,
    setPostureStep,
    // Handlers
    handleCapture,
    applyOcrData,
    handlePostureCompanionComplete,
    handleInBodyCompanionComplete,
  };
}

