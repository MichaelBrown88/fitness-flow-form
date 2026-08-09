/**
 * Hook for managing assessment save and share functionality
 * Extracted from MultiStepForm to improve performance and separation of concerns
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { saveCoachAssessment, updateCoachAssessment, saveDraftAssessment, clearDraftAssessment } from '@/services/coachAssessments';
import { enqueueAssessment } from '@/lib/offline/pendingAssessments';
import { isAssessmentComplete, type PartialCategory } from '@/lib/assessmentCompleteness';
import { requestShareArtifacts, type ShareArtifacts } from '@/services/share';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring';
import { logger } from '@/lib/utils/logger';
import {
  readPartialAssessmentRecord,
  readPartialAssessmentCategories,
  parseEditAssessmentPayload,
  removeEditAssessment,
  removePartialAssessment,
  writeSessionDraftAssessmentBundle,
} from '@/lib/assessment/assessmentSessionStorage';
import { UI_TOASTS } from '@/constants/ui';
import { clearDraft } from '@/hooks/useAssessmentDraft';
import { generateCadenceRecommendations } from '@/lib/recommendations/cadenceEngine';
import { updateRetestSchedule } from '@/services/clientProfiles';
import type { UserProfile } from '@/types/auth';
import type { OrgSettings } from '@/services/organizations';
import { CLIENT_PROFILE_LAST_BODY_COMP_AT } from '@/lib/utils/clientProfileBodyCompDate';
import { decrementSandboxTrialAfterSuccessfulSave } from '@/lib/utils/sandboxTrialDecrement';
import { isRetryableFirestoreOrNetworkError } from '@/lib/firebase/isRetryableFirestoreOrNetworkError';
import { ASSESSMENT_SAVE_RETRY_QUEUE_COPY } from '@/constants/assessmentSaveRetryCopy';

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
  const hasFiredAutoSaveRef = useRef(false);

  const handleSaveToDashboard = useCallback(async () => {
    if (!user || saving || savingId || saveInitiatedRef.current) return;
    saveInitiatedRef.current = true;
    let saveSucceeded = false;

    // Sandbox trial gate — block save when trial limit is exhausted
    if (orgSettings?.subscription?.plan === 'sandbox') {
      const remaining =
        typeof orgSettings.trialAssessmentsRemaining === 'number'
          ? orgSettings.trialAssessmentsRemaining
          : 0;
      if (remaining <= 0) {
        saveInitiatedRef.current = false;
        toast({
          title: 'Trial limit reached',
          description: 'Create your free account to unlock unlimited assessments.',
          variant: 'destructive',
        });
        window.location.href = '/onboarding';
        return;
      }
    }
    
    let clientName = (formData.fullName || 'Unnamed client').trim();

    // Phase C4: Name-change guard -- prevent slug drift during assessment save
    // If the form name differs from the stored client name (from partial/edit context),
    // use the stored name to avoid accidentally creating a new client identity.
    const partialRec = readPartialAssessmentRecord();
    if (partialRec?.clientName) {
      try {
        const storedName = partialRec.clientName;
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
    
    // Offline path — persist to IndexedDB and return early.
    // Sandbox trial is decremented only after a successful Firestore save (here or via useOfflineSync drain).
    if (!navigator.onLine && !isDemoAssessment) {
      const offlineOrgId = profile?.organizationId ?? '';
      if (!offlineOrgId) {
        // Without an organizationId the queued entry would fail on every drain attempt.
        // Surface an explicit error rather than creating an undrainable queue entry.
        toast({
          title: 'Cannot save offline',
          description: 'Organisation not loaded — please reload the page and try again.',
          variant: 'destructive',
        });
        saveInitiatedRef.current = false;
        return;
      }
      try {
        await enqueueAssessment({
          id: `${user.uid}_${Date.now()}`,
          queuedAt: Date.now(),
          coachUid: user.uid,
          organizationId: offlineOrgId,
          formData,
          scores,
          isDemoAssessment,
        });
        toast({
          title: 'Saved offline',
          description: 'Your assessment will sync automatically when you reconnect.',
        });
      } catch (err) {
        logger.error('[Assessment] Failed to queue offline save:', err);
        toast({
          title: 'Could not save offline',
          description: 'Please reconnect before saving.',
          variant: 'destructive',
        });
      }
      saveInitiatedRef.current = false;
      return;
    }

    try {
      setSaving(true);
      // Starting sync for client
      
      let assessmentId: string;
      let shareToken: string | null = null;
      let category: string | null = null;
      let multiPillarToastShown = false;
      
        // Check for edit mode first
        const parsedRaw = parseEditAssessmentPayload();
        const parsedEdit: {
          assessmentId?: string;
          formData?: FormData;
          snapshotId?: string;
          editType?: string;
        } | null = parsedRaw
          ? {
              assessmentId: parsedRaw.assessmentId,
              /* Parsed from sessionStorage JSON — caller merges with live form before save */
              formData: parsedRaw.formData as unknown as FormData | undefined,
              snapshotId: parsedRaw.snapshotId,
              editType: parsedRaw.editType,
            }
          : null;
        if (parsedEdit?.assessmentId && profile?.organizationId) {
            if (parsedEdit.snapshotId) {
              // Edit existing snapshot in place with cascade; for partial, merge with current so we don't wipe other pillars
              const { getCurrentAssessment, updateSnapshotWithCascade } = await import('@/services/assessmentHistory');
              const isPartialEdit = parsedEdit.editType?.startsWith('partial-');
              let dataToSave = formData;
              if (isPartialEdit) {
                const current = await getCurrentAssessment(user.uid, clientName, profile.organizationId);
                dataToSave = current?.formData && Object.keys(current.formData).length > 0
                  ? { ...current.formData, ...formData }
                  : formData;
              }
              const result = await updateSnapshotWithCascade(
                user.uid,
                clientName,
                parsedEdit.snapshotId,
                dataToSave,
                profile.organizationId
              );
              if (result.success) {
                removeEditAssessment();
                removePartialAssessment();
                clearDraft();
                setIsEditMode(true);
                try {
                  const { publishPublicReport } = await import('@/services/publicReports');
                  await publishPublicReport({
                    coachUid: user.uid,
                    assessmentId: parsedEdit.assessmentId,
                    formData: dataToSave,
                    organizationId: profile.organizationId,
                  });
                } catch (pubErr) {
                  logger.warn('[Assessment] Failed to update public report after snapshot edit', pubErr);
                }
                toast({
                  title: UI_TOASTS.SUCCESS.ASSESSMENT_UPDATED,
                  description: result.message,
                });
                saveSucceeded = true;
                await decrementSandboxTrialAfterSuccessfulSave({
                  organizationId: profile.organizationId,
                  isDemoAssessment,
                  subscriptionPlan: orgSettings?.subscription?.plan ?? null,
                });
                setSavingId(parsedEdit.assessmentId);
                setSaving(false);
                return;
              }
            }
            // No snapshotId or update failed: fall back to full doc update (creates new snapshot)
            await updateCoachAssessment(
              user.uid,
              parsedEdit.assessmentId,
              formData,
              scores.overall,
              profile?.organizationId,
              profile
            );
            assessmentId = parsedEdit.assessmentId;
            removeEditAssessment();
            clearDraft();
            setIsEditMode(true);
            toast({
              title: UI_TOASTS.SUCCESS.ASSESSMENT_UPDATED,
              description: `Assessment for ${clientName} has been updated without changing the original date.`
            });
            saveSucceeded = true;
            await decrementSandboxTrialAfterSuccessfulSave({
              organizationId: profile?.organizationId,
              isDemoAssessment,
              subscriptionPlan: orgSettings?.subscription?.plan ?? null,
            });
            setSavingId(assessmentId);
            setSaving(false);
            return;
        }

        const parsedPartial = readPartialAssessmentRecord();
        const sessionCategories = readPartialAssessmentCategories();
        const isMultiPillar = sessionCategories.length > 1;

        if (isMultiPillar) {
          const storedName = parsedPartial?.clientName;
          const completeCategories = sessionCategories.filter((c) =>
            isAssessmentComplete(formData, 'partial', c),
          );

          if (completeCategories.length === 0) {
            const orgId = profile?.organizationId;
            if (orgId) {
              await saveDraftAssessment(clientName, formData, orgId);
            }
            writeSessionDraftAssessmentBundle(formData, storedName || clientName);
            toast({
              title: 'Draft saved',
              description: 'Finish at least one pillar to update the live report.',
            });
            setSaving(false);
            saveInitiatedRef.current = false;
            return;
          }

          const { saveMultiPillarAssessment } = await import('@/services/coachAssessments');
          const result = await saveMultiPillarAssessment(
            user.uid,
            user.email,
            formData,
            scores.overall,
            storedName || clientName,
            completeCategories,
            profile?.organizationId,
            profile,
          );

          const savedCategories = result.results.filter((r) => r.saved).map((r) => r.category);
          if (savedCategories.length === 0) {
            // No-op (Firestore detected no changes for any pillar) — bail out cleanly
            return;
          }

          // Pick a representative pillar/assessmentId for the downstream pipeline
          // (achievements eval, ARC drift, notifications) which is keyed off a single id.
          const repAssessment = result.results.find((r) => r.saved)!;
          assessmentId = repAssessment.assessmentId;
          shareToken = result.shareToken;
          category = repAssessment.category as PartialCategory;

          // Stamp profile dates for every pillar that actually saved.
          const { createOrUpdateClientProfile } = await import('@/services/clientProfiles');
          const now = Timestamp.now();
          const updateData: Record<string, unknown> = { lastAssessmentDate: now };
          for (const c of savedCategories) {
            if (c === 'bodycomp') updateData[CLIENT_PROFILE_LAST_BODY_COMP_AT] = now;
            else if (c === 'posture') updateData.lastPostureDate = now;
            else if (c === 'fitness') updateData.lastFitnessDate = now;
            else if (c === 'strength') updateData.lastStrengthDate = now;
            else if (c === 'lifestyle') updateData.lastLifestyleDate = now;
          }
          if (shareToken) updateData.shareToken = shareToken;
          await createOrUpdateClientProfile(
            user.uid,
            storedName || clientName,
            updateData,
            profile?.organizationId,
            profile,
          );

          // Custom toast — names every pillar that saved
          const skipped = completeCategories.filter((c) => !savedCategories.includes(c));
          const formatList = (arr: string[]) =>
            arr.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(', ');
          toast({
            title: `${savedCategories.length} pillar${savedCategories.length === 1 ? '' : 's'} saved`,
            description: skipped.length > 0
              ? `${formatList(savedCategories)} updated. Skipped (no changes): ${formatList(skipped)}.`
              : `${formatList(savedCategories)} updated and merged.`,
          });
          multiPillarToastShown = true;

          setHighlightCategory(savedCategories[0] as PartialCategory);
          removePartialAssessment();
          if (profile?.organizationId) {
            await clearDraftAssessment(storedName || clientName, profile.organizationId);
          }
        } else if (parsedPartial?.category) {
          const cat = parsedPartial.category;
          const storedName = parsedPartial.clientName;
          category = cat;

          const mode = 'partial';
          const partialCategory = cat as PartialCategory | undefined;
          if (!isAssessmentComplete(formData, mode, partialCategory)) {
            const orgId = profile?.organizationId;
            if (orgId) {
              await saveDraftAssessment(clientName, formData, orgId);
            }
            writeSessionDraftAssessmentBundle(formData, storedName || clientName);
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

          // No-op: persistence detected no changes — skip the success pipeline entirely.
          // finally{} still fires to reset saving state.
          if (!assessmentId) return;

          const { createOrUpdateClientProfile } = await import('@/services/clientProfiles');
          const now = Timestamp.now();
          const updateData: Record<string, unknown> = {
            lastAssessmentDate: now,
          };

          if (category === 'bodycomp') updateData[CLIENT_PROFILE_LAST_BODY_COMP_AT] = now;
          else if (category === 'posture') updateData.lastPostureDate = now;
          else if (category === 'fitness') updateData.lastFitnessDate = now;
          else if (category === 'strength') updateData.lastStrengthDate = now;
          else if (category === 'lifestyle') updateData.lastLifestyleDate = now;

          // Store shareToken on client profile for coach-side lookups
          if (shareToken) updateData.shareToken = shareToken;

          await createOrUpdateClientProfile(user.uid, storedName || clientName, updateData, profile?.organizationId, profile);

          setHighlightCategory(category);
          removePartialAssessment();
          if (profile?.organizationId) await clearDraftAssessment(storedName || clientName, profile.organizationId);
        } else {
          // Full assessment
          if (!isAssessmentComplete(formData, 'full')) {
            const orgId = profile?.organizationId;
            if (orgId) {
              await saveDraftAssessment(clientName, formData, orgId);
            }
            writeSessionDraftAssessmentBundle(formData, clientName);
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

          // No-op: persistence detected no changes — skip the success pipeline entirely.
          // finally{} still fires to reset saving state.
          if (!assessmentId) return;

          if (profile?.organizationId) await clearDraftAssessment(clientName, profile.organizationId);

          // Update client profile: lastAssessmentDate, all pillar dates, and shareToken
          if (profile?.organizationId) {
            try {
              const { createOrUpdateClientProfile } = await import('@/services/clientProfiles');
              const now = Timestamp.now();
              const profileUpdate: Record<string, unknown> = {
                lastAssessmentDate: now,
                [CLIENT_PROFILE_LAST_BODY_COMP_AT]: now,
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

      saveSucceeded = true;
      await decrementSandboxTrialAfterSuccessfulSave({
        organizationId: profile?.organizationId,
        isDemoAssessment,
        subscriptionPlan: orgSettings?.subscription?.plan ?? null,
      });
      setSavingId(assessmentId);
      clearDraft();
      if (!multiPillarToastShown) {
        toast({
          title: category ? UI_TOASTS.SUCCESS.PARTIAL_ASSESSMENT_SAVED : UI_TOASTS.SUCCESS.ASSESSMENT_SAVED,
          description: category ? `${category.charAt(0).toUpperCase() + category.slice(1)} data updated and merged.` : `Progress for ${clientName} has been saved.`
        });
      }

      // Public report sync is handled server-side by the
      // syncPublicReportOnStateChange Cloud Function on every current/state
      // write — no client-side warning needed.

      // Set firstAssessmentCompleted flag (one-time, non-blocking)
      if (!profile?.firstAssessmentCompleted) {
        try {
          const { doc, updateDoc } = await import('firebase/firestore');
          const { getDb } = await import('@/services/firebase');
          await updateDoc(doc(getDb(), 'user-profiles', user.uid), {
            firstAssessmentCompleted: true,
          });
          logger.info('[Assessment] firstAssessmentCompleted flag set');
        } catch (flagErr) {
          logger.warn('[Assessment] Failed to set firstAssessmentCompleted flag (non-fatal):', flagErr);
        }
      }

      // Write health data consent record on first assessment for this client (non-blocking, idempotent)
      // This creates an auditable record that the coach collected health data on the client's behalf.
      if (profile?.organizationId && assessmentId && clientName) {
        try {
          const { doc: fsDoc, setDoc: fsSetDoc, serverTimestamp: fsSvr } = await import('firebase/firestore');
          const { getDb: fsDb } = await import('@/services/firebase');
          const { resolveClientId: rcId } = await import('@/services/clientProfiles');
          const cId = (await rcId(profile.organizationId, clientName)) ?? assessmentId;
          // Use a deterministic doc ID so this write is idempotent on retry
          const consentDocId = `health_data_v1`;
          const consentPath = `organizations/${profile.organizationId}/clients/${cId}/consents/${consentDocId}`;
          const consentRef = fsDoc(fsDb(), consentPath);
          await fsSetDoc(consentRef, {
            type: 'health_data_processing_explicit',
            version: 2,
            grantedByCoachUid: user.uid,
            grantedAt: fsSvr(),
            firstAssessmentId: assessmentId,
            note: 'Coach attests explicit consent was obtained from client at point of assessment. Client was informed their posture photos and health data are stored securely for fitness coaching purposes only and are not used for medical assessment.',
          }, { merge: true });
          logger.debug('[Assessment] Health data consent record written');
        } catch (consentErr) {
          logger.warn('[Assessment] Failed to write consent record (non-fatal):', consentErr);
        }
      }

      // Post-save notifications (non-blocking)
      if (profile?.organizationId && assessmentId && shareToken) {
        // Score drop alert — notify coach if overall score fell by 5+ points
        try {
          const { getDoc: getDocForScore } = await import('firebase/firestore');
          const { getOrgAssessmentDoc: getOrgAssessmentDocRef } = await import(
            '@/lib/database/collections'
          );
          const prevSnap = await getDocForScore(
            getOrgAssessmentDocRef(profile.organizationId, assessmentId),
          );
          const prevRaw = prevSnap.data() as { previousScore?: unknown } | undefined;
          const previousScore =
            typeof prevRaw?.previousScore === 'number' ? prevRaw.previousScore : undefined;

          if (previousScore !== undefined && scores.overall < previousScore - 5) {
            const { writeNotification } = await import('@/services/notificationWriter');
            await writeNotification({
              recipientUid: user.uid,
              type: 'score_drop',
              title: `Score drop: ${formData.fullName || clientName}`,
              body: `AXIS Score™ fell from ${Math.round(previousScore)} to ${Math.round(scores.overall)}. A review may be warranted.`,
              priority: 'high',
              actionUrl: `/client/${encodeURIComponent(clientName)}`,
              meta: {
                previousScore,
                currentScore: scores.overall,
                delta: Math.round(scores.overall - previousScore),
              },
            });
            logger.debug('[Assessment] Score drop notification sent to coach');
          }
        } catch (dropErr) {
          logger.warn('[Assessment] Failed to evaluate score drop (non-fatal):', dropErr);
        }

        // Step 3: Send "assessment_complete" notification via token-scoped path
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

      const errorMessage = e instanceof Error ? e.message : String(e);
      const orgIdForQueue = profile?.organizationId?.trim() ?? '';

      if (errorMessage.includes('Organization ID is required')) {
        toast({
          title: UI_TOASTS.ERROR.UNABLE_TO_SAVE,
          description: UI_TOASTS.ERROR.UNABLE_TO_SAVE_DESC,
          variant: 'destructive',
        });
      } else if (
        !isDemoAssessment &&
        orgIdForQueue &&
        user &&
        isRetryableFirestoreOrNetworkError(e)
      ) {
        try {
          await enqueueAssessment({
            id: `${user.uid}_${Date.now()}`,
            queuedAt: Date.now(),
            coachUid: user.uid,
            organizationId: orgIdForQueue,
            formData,
            scores,
            isDemoAssessment,
          });
          toast({
            title: ASSESSMENT_SAVE_RETRY_QUEUE_COPY.title,
            description: ASSESSMENT_SAVE_RETRY_QUEUE_COPY.description,
          });
        } catch (queueErr) {
          logger.error('[Assessment] Failed to queue assessment after transient error:', queueErr);
          toast({
            title: ASSESSMENT_SAVE_RETRY_QUEUE_COPY.queueFailedTitle,
            description: ASSESSMENT_SAVE_RETRY_QUEUE_COPY.queueFailedDescription,
            variant: 'destructive',
          });
        }
      } else if (isRetryableFirestoreOrNetworkError(e)) {
        toast({
          title: UI_TOASTS.ERROR.SAVE_CONNECTION_ISSUE,
          description: UI_TOASTS.ERROR.SAVE_CONNECTION_ISSUE_DESC,
          variant: 'destructive',
        });
      } else {
        toast({
          title: UI_TOASTS.ERROR.SYNC_ERROR,
          description: UI_TOASTS.ERROR.SYNC_ERROR_DESC,
          variant: 'destructive',
        });
      }
    } finally {
      setSaving(false);
      if (!saveSucceeded) {
        saveInitiatedRef.current = false;
      }
    }
  }, [user, saving, savingId, formData, scores, profile, orgSettings, toast, isDemoAssessment]);

  // Allow auto-save again when leaving results (e.g. coach navigates back then completes again)
  useEffect(() => {
    if (!isResultsPhase) {
      hasFiredAutoSaveRef.current = false;
    }
  }, [isResultsPhase]);

  // Auto-save when results phase is reached
  useEffect(() => {
    if (
      isResultsPhase &&
      user &&
      !savingId &&
      !saving &&
      !isDemoAssessment &&
      !hasFiredAutoSaveRef.current
    ) {
      hasFiredAutoSaveRef.current = true;
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
