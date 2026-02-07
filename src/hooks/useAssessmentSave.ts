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
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { UI_TOASTS } from '@/constants/ui';
import { generateCadenceRecommendations } from '@/lib/recommendations/cadenceEngine';
import { updateRetestSchedule, type StoredRetestSchedule } from '@/services/clientProfiles';

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
  const [isEditMode, setIsEditMode] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCache, setShareCache] = useState<Record<'client' | 'coach', ShareArtifacts | null>>({
    client: null,
    coach: null,
  });
  const [highlightCategory, setHighlightCategory] = useState<string | undefined>(undefined);
  const shareCacheRef = useRef<Record<'client' | 'coach', ShareArtifacts | null>>({
    client: null,
    coach: null,
  });
  // Guard against double-save race condition (React batching edge case)
  const saveInitiatedRef = useRef(false);

  const handleSaveToDashboard = useCallback(async () => {
    if (!user || saving || savingId || saveInitiatedRef.current) return;
    saveInitiatedRef.current = true;
    
    const clientName = (formData.fullName || 'Unnamed client').trim();
    
    try {
      setSaving(true);
      // Starting sync for client
      
      let assessmentId: string;
      let category: string | null = null;
      
      try {
        // Check for edit mode first
        const editData = sessionStorage.getItem(STORAGE_KEYS.EDIT_ASSESSMENT);
        if (editData) {
          const parsed = JSON.parse(editData);
          if (parsed.assessmentId) {
            // Update existing assessment
            await updateCoachAssessment(
              user.uid,
              parsed.assessmentId,
              formData,
              scores.overall,
              profile?.organizationId,
              profile
            );
            assessmentId = parsed.assessmentId;
            sessionStorage.removeItem(STORAGE_KEYS.EDIT_ASSESSMENT);
            // Set edit mode flag (used by AssessmentResults for navigation)
            setIsEditMode(true);
            toast({
              title: UI_TOASTS.SUCCESS.ASSESSMENT_UPDATED,
              description: `Assessment for ${clientName} has been updated without changing the original date.`
            });
            setSavingId(assessmentId);
            setSaving(false);
            return; // Early return after update
          }
        }
        
        const partialData = sessionStorage.getItem(STORAGE_KEYS.PARTIAL_ASSESSMENT);
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
            await createOrUpdateClientProfile(user.uid, storedName || clientName, updateData, profile?.organizationId, profile);
          }
          
          setHighlightCategory(category);
          sessionStorage.removeItem(STORAGE_KEYS.PARTIAL_ASSESSMENT);
        } else {
          // Full assessment - save and generate cadence recommendations
          assessmentId = await saveCoachAssessment(user.uid, user.email, formData, scores.overall, profile?.organizationId, profile);
          
          // Generate and save retest cadence recommendations
          if (profile?.organizationId) {
            try {
              const { schedule } = generateCadenceRecommendations(formData, scores);
              const retestSchedule: StoredRetestSchedule = {
                recommended: schedule,
                generatedAt: Timestamp.now(),
                sourceAssessmentId: assessmentId,
              };
              await updateRetestSchedule(clientName, profile.organizationId, retestSchedule);
              logger.info('[Assessment] Cadence recommendations saved for client', { clientName });
            } catch (cadenceErr) {
              // Non-fatal: log but don't fail the assessment save
              logger.warn('[Assessment] Failed to save cadence recommendations:', cadenceErr);
            }
          }
        }
      } catch (parseErr) {
        // If parse error occurs, still try to save but with profile for validation
        try {
          assessmentId = await saveCoachAssessment(user.uid, user.email, formData, scores.overall, profile?.organizationId, profile);
        } catch (saveErr) {
          logger.error('Failed to save assessment:', saveErr);
          toast({
            title: UI_TOASTS.ERROR.FAILED_TO_SAVE,
            description: UI_TOASTS.ERROR.FAILED_TO_SAVE_DESC,
            variant: 'destructive'
          });
          setSaving(false);
          return; // Exit early on save failure
        }
      }
      
      setSavingId(assessmentId);
      toast({ 
        title: category ? UI_TOASTS.SUCCESS.PARTIAL_ASSESSMENT_SAVED : UI_TOASTS.SUCCESS.ASSESSMENT_SAVED, 
        description: category ? `${category.charAt(0).toUpperCase() + category.slice(1)} data updated and merged.` : `Progress for ${clientName} has been saved.` 
      });
    } catch (e) {
      // Use logger for consistency with project rules
      logger.error('[SYNC] Save failed:', e instanceof Error ? e.message : String(e));
      
      // Check if it's an organizationId validation error
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (errorMessage.includes('Organization ID is required')) {
        toast({ 
          title: UI_TOASTS.ERROR.UNABLE_TO_SAVE, 
          description: UI_TOASTS.ERROR.UNABLE_TO_SAVE_DESC, 
          variant: 'destructive' 
        });
      } else {
        toast({ 
          title: UI_TOASTS.ERROR.SYNC_ERROR, 
          description: UI_TOASTS.ERROR.SYNC_ERROR_DESC, 
          variant: 'destructive' 
        });
      }
    } finally {
      setSaving(false);
      // Only reset the ref on failure - successful saves keep it true (savingId guards future calls)
      if (!savingId) {
        saveInitiatedRef.current = false;
      }
    }
  }, [user, saving, savingId, formData, scores.overall, profile, toast]);

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
      organizationId: profile.organizationId,
      profile
    });
    shareCacheRef.current[view] = artifacts;
    setShareCache(prev => ({ ...prev, [view]: artifacts }));
    return artifacts;
  }, [savingId, user, formData, profile]);

  return {
    saving,
    savingId,
    isEditMode,
    setIsEditMode,
    shareLoading,
    setShareLoading,
    shareCache,
    handleSaveToDashboard,
    ensureShareArtifacts,
    highlightCategory,
  };
}
