/**
 * Hook for managing assessment save and share functionality
 * Extracted from MultiStepForm to improve performance and separation of concerns
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { saveCoachAssessment, updateCoachAssessment, saveDraftAssessment, clearDraftAssessment } from '@/services/coachAssessments';
import { isAssessmentComplete, type PartialCategory } from '@/lib/assessmentCompleteness';
import { requestShareArtifacts, type ShareArtifacts } from '@/services/share';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring';
import { logger } from '@/lib/utils/logger';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { UI_TOASTS } from '@/constants/ui';
import { clearDraft } from '@/hooks/useAssessmentDraft';
import { generateCadenceRecommendations } from '@/lib/recommendations/cadenceEngine';
import { updateRetestSchedule } from '@/services/clientProfiles';
import type { UserProfile } from '@/types/auth';
import type { OrgSettings } from '@/services/organizations';

interface UseAssessmentSaveProps {
  user: { uid: string; email: string | null | undefined } | null;
  profile?: UserProfile | null;
  formData: FormData;
  scores: ScoreSummary;
  isResultsPhase: boolean;
  isDemoAssessment: boolean;
  orgSettings?: OrgSettings | null;
}

export function useAssessmentSave({
  user,
  profile,
  formData,
  scores,
  isResultsPhase,
  isDemoAssessment,
  orgSettings,
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
    
    let clientName = (formData.fullName || 'Unnamed client').trim();

    // Phase C4: Name-change guard -- prevent slug drift during assessment save
    // If the form name differs from the stored client name (from partial/edit context),
    // use the stored name to avoid accidentally creating a new client identity.
    const partialCtx = sessionStorage.getItem(STORAGE_KEYS.PARTIAL_ASSESSMENT);
    if (partialCtx) {
      try {
        const { clientName: storedName } = JSON.parse(partialCtx);
        if (storedName) {
          const { generateClientSlug } = await import('@/services/clientProfiles');
          const formSlug = generateClientSlug(clientName);
          const storedSlug = generateClientSlug(storedName);
          if (formSlug !== storedSlug) {
            logger.warn(`[Assessment] Name slug drift detected: form="${formSlug}" vs stored="${storedSlug}". Using stored name.`);
            clientName = storedName;
          }
        }
      } catch {
        // Non-fatal: if parsing fails, continue with form name
      }
    }
    
    try {
      setSaving(true);
      // Starting sync for client
      
      let assessmentId: string;
      let shareToken: string | null = null;
      let category: string | null = null;
      
      try {
        // Check for edit mode first
        const editData = sessionStorage.getItem(STORAGE_KEYS.EDIT_ASSESSMENT);
        if (editData) {
          const parsed = JSON.parse(editData) as { assessmentId?: string; formData?: FormData; snapshotId?: string; editType?: string };
          if (parsed.assessmentId && profile?.organizationId) {
            if (parsed.snapshotId) {
              // Edit existing snapshot in place (no new row); for partial, merge with current so we don't wipe other pillars
              const { getCurrentAssessment, updateSnapshotInPlace } = await import('@/services/assessmentHistory');
              const isPartialEdit = parsed.editType?.startsWith('partial-');
              let dataToSave = formData;
              if (isPartialEdit) {
                const current = await getCurrentAssessment(user.uid, clientName, profile.organizationId);
                dataToSave = current?.formData && Object.keys(current.formData).length > 0
                  ? { ...current.formData, ...formData }
                  : formData;
              }
              const { computeScores } = await import('@/lib/scoring');
              const mergedScores = computeScores(dataToSave);
              const result = await updateSnapshotInPlace(
                user.uid,
                clientName,
                parsed.snapshotId,
                dataToSave,
                mergedScores.overall,
                profile.organizationId
              );
              if (result.success) {
                sessionStorage.removeItem(STORAGE_KEYS.EDIT_ASSESSMENT);
                sessionStorage.removeItem(STORAGE_KEYS.PARTIAL_ASSESSMENT);
                clearDraft();
                setIsEditMode(true);
                try {
                  const { publishPublicReport } = await import('@/services/publicReports');
                  await publishPublicReport({
                    coachUid: user.uid,
                    assessmentId: parsed.assessmentId,
                    formData: dataToSave,
                    organizationId: profile.organizationId,
                  });
                } catch (pubErr) {
                  logger.warn('[Assessment] Failed to update public report after snapshot edit', pubErr);
                }
                toast({
                  title: UI_TOASTS.SUCCESS.ASSESSMENT_UPDATED,
                  description: 'Assessment updated without adding a new entry.',
                });
                setSavingId(parsed.assessmentId);
                setSaving(false);
                return;
              }
            }
            // No snapshotId or update failed: fall back to full doc update (creates new snapshot)
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
            clearDraft();
            setIsEditMode(true);
            toast({
              title: UI_TOASTS.SUCCESS.ASSESSMENT_UPDATED,
              description: `Assessment for ${clientName} has been updated without changing the original date.`
            });
            setSavingId(assessmentId);
            setSaving(false);
            return;
          }
        }
        
        const partialData = sessionStorage.getItem(STORAGE_KEYS.PARTIAL_ASSESSMENT);
        if (partialData) {
          const { category: cat, clientName: storedName } = JSON.parse(partialData);
          category = cat;

          const mode = 'partial';
          const partialCategory = cat as PartialCategory | undefined;
          if (!isAssessmentComplete(formData, mode, partialCategory)) {
            const orgId = profile?.organizationId;
            if (orgId) {
              await saveDraftAssessment(clientName, formData, orgId);
            }
            try {
              sessionStorage.setItem(
                STORAGE_KEYS.DRAFT_ASSESSMENT,
                JSON.stringify({ formData, timestamp: Date.now(), clientName: storedName || clientName })
              );
            } catch {
              // non-fatal
            }
            toast({
              title: 'Draft saved',
              description: 'Finish the assessment to update the live report.',
            });
            setSaving(false);
            saveInitiatedRef.current = false;
            return;
          }
          
          const { savePartialAssessment } = await import('@/services/coachAssessments');
          const result = await savePartialAssessment(
            user.uid, 
            user.email, 
            formData, 
            scores.overall, 
            storedName || clientName,
            category as 'bodycomp' | 'posture' | 'fitness' | 'strength' | 'lifestyle',
            profile?.organizationId,
            profile
          );
          assessmentId = result.assessmentId;
          shareToken = result.shareToken;
          
          const { createOrUpdateClientProfile } = await import('@/services/clientProfiles');
          const now = Timestamp.now();
          const updateData: Record<string, unknown> = {
            lastAssessmentDate: now,
          };
          
          if (category === 'bodycomp') updateData.lastInBodyDate = now;
          else if (category === 'posture') updateData.lastPostureDate = now;
          else if (category === 'fitness') updateData.lastFitnessDate = now;
          else if (category === 'strength') updateData.lastStrengthDate = now;
          else if (category === 'lifestyle') updateData.lastLifestyleDate = now;
          
          // Store shareToken on client profile for coach-side lookups
          if (shareToken) updateData.shareToken = shareToken;
          
          await createOrUpdateClientProfile(user.uid, storedName || clientName, updateData, profile?.organizationId, profile);
          
          setHighlightCategory(category);
          sessionStorage.removeItem(STORAGE_KEYS.PARTIAL_ASSESSMENT);
          if (profile?.organizationId) await clearDraftAssessment(storedName || clientName, profile.organizationId);
        } else {
          // Full assessment
          if (!isAssessmentComplete(formData, 'full')) {
            const orgId = profile?.organizationId;
            if (orgId) {
              await saveDraftAssessment(clientName, formData, orgId);
            }
            try {
              sessionStorage.setItem(
                STORAGE_KEYS.DRAFT_ASSESSMENT,
                JSON.stringify({ formData, timestamp: Date.now(), clientName })
              );
            } catch {
              // non-fatal
            }
            toast({
              title: 'Draft saved',
              description: 'Finish the assessment to update the live report.',
            });
            setSaving(false);
            saveInitiatedRef.current = false;
            return;
          }
          const result = await saveCoachAssessment(user.uid, user.email, formData, scores.overall, profile?.organizationId, profile);
          assessmentId = result.assessmentId;
          shareToken = result.shareToken;
          if (profile?.organizationId) await clearDraftAssessment(clientName, profile.organizationId);

          // Update client profile: lastAssessmentDate, all pillar dates, and shareToken
          if (profile?.organizationId) {
            try {
              const { createOrUpdateClientProfile } = await import('@/services/clientProfiles');
              const now = Timestamp.now();
              const profileUpdate: Record<string, unknown> = {
                lastAssessmentDate: now,
                lastInBodyDate: now,
                lastPostureDate: now,
                lastFitnessDate: now,
                lastStrengthDate: now,
                lastLifestyleDate: now,
              };
              if (shareToken) profileUpdate.shareToken = shareToken;
              await createOrUpdateClientProfile(user.uid, clientName, profileUpdate, profile.organizationId, profile);
            } catch (profileErr) {
              logger.warn('[Assessment] Failed to update client profile dates (non-fatal):', profileErr);
            }
          }

          // Silent Save: auto-generate and save retest schedule without dialog
          if (profile?.organizationId) {
            try {
              const { schedule } = generateCadenceRecommendations({
                formData,
                scores,
                orgDefaults: orgSettings?.defaultCadence,
              });
              await updateRetestSchedule(clientName, profile.organizationId, {
                recommended: schedule,
                generatedAt: Timestamp.now(),
                sourceAssessmentId: assessmentId,
              });
              logger.info('[Assessment] Retest schedule silently saved', { clientName });

              // Notify coach to review the client's schedule (non-blocking)
              try {
                const { writeNotification } = await import('@/services/notificationWriter');
                await writeNotification({
                  recipientUid: user.uid,
                  type: 'schedule_review',
                  title: `Review ${clientName}'s schedule`,
                  body: 'Follow-up assessments are set to your defaults. Tap to review or adjust.',
                  actionUrl: `/client/${encodeURIComponent(clientName)}`,
                  priority: 'low',
                });
              } catch (notifErr) {
                logger.warn('[Assessment] Failed to send schedule_review notification (non-fatal):', notifErr);
              }
            } catch (cadenceErr) {
              logger.warn('[Assessment] Failed to auto-save retest schedule:', cadenceErr);
            }
          }
        }
      } catch (parseErr) {
        try {
          const result = await saveCoachAssessment(user.uid, user.email, formData, scores.overall, profile?.organizationId, profile);
          assessmentId = result.assessmentId;
          shareToken = result.shareToken;
        } catch (saveErr) {
          logger.error('Failed to save assessment:', saveErr);
          toast({
            title: UI_TOASTS.ERROR.FAILED_TO_SAVE,
            description: UI_TOASTS.ERROR.FAILED_TO_SAVE_DESC,
            variant: 'destructive'
          });
          setSaving(false);
          return;
        }
      }
      
      setSavingId(assessmentId);
      clearDraft();
      toast({ 
        title: category ? UI_TOASTS.SUCCESS.PARTIAL_ASSESSMENT_SAVED : UI_TOASTS.SUCCESS.ASSESSMENT_SAVED, 
        description: category ? `${category.charAt(0).toUpperCase() + category.slice(1)} data updated and merged.` : `Progress for ${clientName} has been saved.` 
      });

      // Set firstAssessmentCompleted flag (one-time, non-blocking)
      if (!profile?.firstAssessmentCompleted) {
        try {
          const { doc, updateDoc } = await import('firebase/firestore');
          const { getDb } = await import('@/services/firebase');
          await updateDoc(doc(getDb(), 'userProfiles', user.uid), {
            firstAssessmentCompleted: true,
          });
          logger.info('[Assessment] firstAssessmentCompleted flag set');
        } catch (flagErr) {
          logger.warn('[Assessment] Failed to set firstAssessmentCompleted flag (non-fatal):', flagErr);
        }
      }

      // Evaluate achievements and send notifications via shareToken (non-blocking)
      if (profile?.organizationId && assessmentId && shareToken) {
        // Step 1: Evaluate achievements using token-scoped storage
        try {
          const { getDoc: getDocSnap } = await import('firebase/firestore');
          const { getOrgAssessmentDoc } = await import('@/lib/database/collections');
          const summarySnap = await getDocSnap(
            getOrgAssessmentDoc(profile.organizationId, assessmentId)
          );
          const actualCount = (summarySnap.data()?.assessmentCount as number) ?? 1;
          const previousOverallScore = (summarySnap.data()?.previousScore as number) ?? undefined;

          let previousCategoryScores: Array<{ id: string; score: number }> | undefined;
          try {
            const { getSnapshots } = await import('@/services/assessmentHistory');
            const snapshots = await getSnapshots(user.uid, clientName, 2, profile.organizationId);
            if (snapshots.length >= 2 && snapshots[1].formData) {
              const { computeScores } = await import('@/lib/scoring');
              const prevScores = computeScores(snapshots[1].formData);
              previousCategoryScores = prevScores.categories.map((c) => ({ id: c.id, score: c.score }));
            }
          } catch (prevErr) {
            logger.debug('[Assessment] Could not fetch previous category scores (non-fatal):', prevErr);
          }

          const { evaluateAchievements } = await import('@/services/achievements');
          const categoryScores = scores.categories.map((c) => ({ id: c.id, score: c.score }));

          const unlocked = await evaluateAchievements({
            shareToken,
            organizationId: profile.organizationId,
            overallScore: scores.overall,
            categoryScores,
            previousOverallScore,
            previousCategoryScores,
            assessmentCount: actualCount,
          });

          // Send achievement unlock notifications via token-scoped path
          if (unlocked.length > 0) {
            try {
              const { writeNotification } = await import('@/services/notificationWriter');
              for (const ach of unlocked) {
                await writeNotification({
                  shareToken,
                  type: 'system',
                  title: `Achievement Unlocked: ${ach.title}`,
                  body: ach.description,
                  priority: 'low',
                });
              }
            } catch (notifErr) {
              logger.warn('[Assessment] Failed to send achievement notifications (non-fatal):', notifErr);
            }
          }

          logger.debug(`[Assessment] Achievements evaluated via token ${shareToken} (${unlocked.length} unlocked)`);
        } catch (achErr) {
          logger.warn('[Assessment] Failed to evaluate achievements (non-fatal):', achErr);
        }

        // Step 2: Send "assessment_complete" notification via token-scoped path
        try {
          const { writeNotification } = await import('@/services/notificationWriter');
          await writeNotification({
            shareToken,
            type: 'assessment_complete',
            title: 'Your assessment results are ready',
            body: 'Your coach has completed your latest assessment. View your updated scores.',
            priority: 'medium',
          });
          logger.debug('[Assessment] assessment_complete notification sent via token');
        } catch (notifErr) {
          logger.warn('[Assessment] Failed to send assessment_complete notification (non-fatal):', notifErr);
        }
      }
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
  }, [user, saving, savingId, formData, scores, profile, orgSettings, toast]);

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
