/**
 * Hook for managing assessment save and share functionality
 * Extracted from MultiStepForm to improve performance and separation of concerns
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useToast } from '@/components/ui/use-toast';
import { saveCoachAssessment, updateCoachAssessment } from '@/services/coachAssessments';
import { requestShareArtifacts, type ShareArtifacts } from '@/services/share';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring';
import { logger } from '@/lib/utils/logger';

import type { UserProfile } from '@/types/auth';

interface UseAssessmentSaveProps {
  user: { uid: string; email: string | null | undefined } | null;
  profile?: UserProfile | null;
  formData: FormData;
  scores: ScoreSummary;
  isResultsPhase: boolean;
  isDemoAssessment: boolean;
}

export function useAssessmentSave({
  user,
  profile,
  formData,
  scores,
  isResultsPhase,
  isDemoAssessment,
}: UseAssessmentSaveProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCache, setShareCache] = useState<Record<'client' | 'coach', ShareArtifacts | null>>({
    client: null,
    coach: null,
  });
  const shareCacheRef = useRef<Record<'client' | 'coach', ShareArtifacts | null>>({
    client: null,
    coach: null,
  });

  const handleSaveToDashboard = useCallback(async () => {
    if (!user || saving || savingId) return;
    
    const clientName = (formData.fullName || 'Unnamed client').trim();
    
    try {
      setSaving(true);
      // Starting sync for client
      
      let assessmentId: string;
      let category: string | null = null;
      
      try {
        // Check for edit mode first
        const editData = sessionStorage.getItem('editAssessmentData');
        if (editData) {
          const parsed = JSON.parse(editData);
          if (parsed.assessmentId) {
            // Update existing assessment
            await updateCoachAssessment(
              user.uid,
              parsed.assessmentId,
              formData,
              scores.overall,
              profile?.organizationId
            );
            assessmentId = parsed.assessmentId;
            sessionStorage.removeItem('editAssessmentData');
            // Store the assessment ID for potential navigation
            sessionStorage.setItem('lastUpdatedAssessmentId', assessmentId);
            toast({ 
              title: 'Assessment Updated', 
              description: `Assessment for ${clientName} has been updated without changing the original date.` 
            });
            setSavingId(assessmentId);
            setSaving(false);
            return; // Early return after update
          }
        }
        
        const partialData = sessionStorage.getItem('partialAssessment');
        if (partialData) {
          const { category: cat, clientName: storedName } = JSON.parse(partialData);
          category = cat;
          
          const { savePartialAssessment } = await import('@/services/coachAssessments');
          assessmentId = await savePartialAssessment(
            user.uid, 
            user.email, 
            formData, 
            scores.overall, 
            storedName || clientName,
            category as 'inbody' | 'posture' | 'fitness' | 'strength' | 'lifestyle',
            profile?.organizationId,
            profile
          );
          
          const { createOrUpdateClientProfile } = await import('@/services/clientProfiles');
          const updateData: Record<string, Timestamp> = {};
          const now = Timestamp.now();
          
          if (category === 'inbody') updateData.lastInBodyDate = now;
          else if (category === 'posture') updateData.lastPostureDate = now;
          else if (category === 'fitness') updateData.lastFitnessDate = now;
          else if (category === 'strength') updateData.lastStrengthDate = now;
          else if (category === 'lifestyle') updateData.lastLifestyleDate = now;
          
          if (Object.keys(updateData).length > 0) {
            await createOrUpdateClientProfile(user.uid, storedName || clientName, updateData, profile?.organizationId);
          }
          
          sessionStorage.setItem('highlightCategory', category);
          sessionStorage.removeItem('partialAssessment');
        } else {
          assessmentId = await saveCoachAssessment(user.uid, user.email, formData, scores.overall, profile?.organizationId, profile);
        }
      } catch (parseErr) {
        // If parse error occurs, still try to save but with profile for validation
        assessmentId = await saveCoachAssessment(user.uid, user.email, formData, scores.overall, profile?.organizationId, profile);
      }
      
      setSavingId(assessmentId);
      toast({ 
        title: category ? 'Partial Assessment Saved' : 'Assessment Saved', 
        description: category ? `${category.charAt(0).toUpperCase() + category.slice(1)} data updated and merged.` : `Progress for ${clientName} has been saved.` 
      });
    } catch (e) {
      // Use logger for consistency with project rules
      logger.error('[SYNC] Save failed:', e instanceof Error ? e.message : String(e));
      
      // Check if it's an organizationId validation error
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (errorMessage.includes('Organization ID is required')) {
        toast({ 
          title: 'Unable to Save Assessment', 
          description: 'Organization ID is missing. Please refresh the page and try again. If the problem persists, contact support.', 
          variant: 'destructive' 
        });
      } else {
        toast({ 
          title: 'Sync Error', 
          description: 'Unable to sync with dashboard. Please check your connection and try again.', 
          variant: 'destructive' 
        });
      }
    } finally {
      setSaving(false);
    }
  }, [user, saving, savingId, formData, scores.overall, profile?.organizationId, toast]);

  // Auto-save when results phase is reached
  useEffect(() => {
    if (isResultsPhase && user && !savingId && !saving && !isDemoAssessment) {
      void handleSaveToDashboard();
    }
  }, [isResultsPhase, user, savingId, saving, isDemoAssessment, handleSaveToDashboard]);

  // Clear share cache when savingId changes
  useEffect(() => {
    shareCacheRef.current = { client: null, coach: null };
    setShareCache({ client: null, coach: null });
  }, [savingId]);

  const ensureShareArtifacts = useCallback(async (view: 'client' | 'coach'): Promise<ShareArtifacts> => {
    if (shareCacheRef.current[view]) {
      return shareCacheRef.current[view]!;
    }

    if (!user || !savingId) {
      throw new Error('User or savingId not available');
    }

    if (!profile) {
      throw new Error('Profile not available for sharing');
    }

    const artifacts = await requestShareArtifacts({ 
      assessmentId: savingId, 
      view,
      coachUid: user.uid,
      formData,
      organizationId: profile.organizationId
    });
    shareCacheRef.current[view] = artifacts;
    setShareCache(prev => ({ ...prev, [view]: artifacts }));
    return artifacts;
  }, [savingId, user]);

  const fetchReportPdfBlob = useCallback(async (view: 'client' | 'coach') => {
    try {
      if (user && savingId) {
        const artifacts = await ensureShareArtifacts(view);
        const response = await fetch(artifacts.pdfUrl);
        if (response.ok) {
          const blob = await response.blob();
          return { artifacts, blob };
        }
      }
    } catch (error) {
      console.warn('Cloud Functions PDF error, fallback to client-side', error);
    }
    
    const reportEl = document.querySelector('[data-pdf-target]') as HTMLElement;
    if (!reportEl) throw new Error('Report element not found');
    
    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).default;
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const canvasEl = await html2canvas(reportEl, {
      scale: 3,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      windowWidth: reportEl.scrollWidth,
      windowHeight: reportEl.scrollHeight,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.querySelector(`[data-pdf-target]`) as HTMLElement;
        if (clonedElement) {
          clonedElement.style.backgroundColor = '#ffffff';
          clonedElement.style.width = `${reportEl.scrollWidth}px`;
          clonedElement.style.height = 'auto';
          clonedElement.style.overflow = 'visible';
          clonedDoc.querySelectorAll('button, .dropdown-menu').forEach((el) => {
            (el as HTMLElement).style.display = 'none';
          });
        }
      },
    });
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);
    const imgHeight = (canvasEl.height * contentWidth) / canvasEl.width;
    const contentHeight = pageHeight - (margin * 2);
    const totalPages = Math.ceil(imgHeight / contentHeight);
    
    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage();
      const sourceY = (page * contentHeight / imgHeight) * canvasEl.height;
      const remainingHeight = imgHeight - (page * contentHeight);
      const pageImageHeight = Math.min(contentHeight, remainingHeight);
      const sourceHeight = (pageImageHeight / imgHeight) * canvasEl.height;
      
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvasEl.width;
      pageCanvas.height = Math.ceil(sourceHeight);
      const ctx = pageCanvas.getContext('2d');
      if (ctx && sourceHeight > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(canvasEl, 0, sourceY, canvasEl.width, sourceHeight, 0, 0, canvasEl.width, sourceHeight);
        const pageImgData = pageCanvas.toDataURL('image/png', 1.0);
        pdf.addImage(pageImgData, 'PNG', margin, margin, contentWidth, pageImageHeight);
      }
    }
    
    return { artifacts: null, blob: pdf.output('blob') };
  }, [ensureShareArtifacts, user, savingId]);

  return {
    saving,
    savingId,
    shareLoading,
    setShareLoading,
    shareCache,
    handleSaveToDashboard,
    ensureShareArtifacts,
    fetchReportPdfBlob,
  };
}

