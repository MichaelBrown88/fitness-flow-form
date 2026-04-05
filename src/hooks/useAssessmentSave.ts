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
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { UI_TOASTS } from '@/constants/ui';
import { clearDraft } from '@/hooks/useAssessmentDraft';
import { generateCadenceRecommendations } from '@/lib/recommendations/cadenceEngine';
import { updateRetestSchedule } from '@/services/clientProfiles';
import type { UserProfile } from '@/types/auth';
import type { OrgSettings } from '@/services/organizations';
import { CLIENT_PROFILE_LAST_BODY_COMP_AT } from '@/lib/utils/clientProfileBodyCompDate';
import { decrementSandboxTrialAfterSuccessfulSave } from '@/lib/utils/sandboxTrialDecrement';

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
    
    // Offline path — persist to IndexedDB and return early.
    // Sandbox trial is decremented only after a successful Firestore save (here or via useOfflineSync drain).
    if (!navigator.onLine && !isDemoAssessment) {
      try {
        await enqueueAssessment({
          id: `${user.uid}_${Date.now()}`,
          queuedAt: Date.now(),
          coachUid: user.uid,
          organizationId: profile?.organizationId ?? '',
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
      let publicReportSynced = true;
      
        // Check for edit mode first
        const editData = sessionStorage.getItem(STORAGE_KEYS.EDIT_ASSESSMENT);
        let parsedEdit: {
          assessmentId?: string;
          formData?: FormData;
          snapshotId?: string;
          editType?: string;
        } | null = null;
        if (editData) {
          try {
            parsedEdit = JSON.parse(editData) as {
              assessmentId?: string;
              formData?: FormData;
              snapshotId?: string;
              editType?: string;
            };
          } catch {
            // Non-fatal: malformed sessionStorage, fall through to full save
          }
        }
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
                sessionStorage.removeItem(STORAGE_KEYS.EDIT_ASSESSMENT);
                sessionStorage.removeItem(STORAGE_KEYS.PARTIAL_ASSESSMENT);
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
            sessionStorage.removeItem(STORAGE_KEYS.EDIT_ASSESSMENT);
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

        const partialData = sessionStorage.getItem(STORAGE_KEYS.PARTIAL_ASSESSMENT);
        let parsedPartial: { category?: string; clientName?: string } | null = null;
        if (partialData) {
          try {
            parsedPartial = JSON.parse(partialData) as { category?: string; clientName?: string };
          } catch {
            // Non-fatal: malformed sessionStorage, fall through to full save
          }
        }
        if (parsedPartial?.category) {
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
          publicReportSynced = result.publicReportSynced;

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
          publicReportSynced = result.publicReportSynced;
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
      toast({ 
        title: category ? UI_TOASTS.SUCCESS.PARTIAL_ASSESSMENT_SAVED : UI_TOASTS.SUCCESS.ASSESSMENT_SAVED, 
        description: category ? `${category.charAt(0).toUpperCase() + category.slice(1)} data updated and merged.` : `Progress for ${clientName} has been saved.` 
      });

      if (!publicReportSynced) {
        toast({
          title: 'Assessment saved',
          description: "Client report link may be outdated — reshare to refresh.",
          variant: 'destructive',
        });
      }

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
            type: 'health_data_processing',
            version: 1,
            grantedByCoachUid: user.uid,
            grantedAt: fsSvr(),
            firstAssessmentId: assessmentId,
            note: 'Implicit consent: coach collected health data on behalf of client during first assessment.',
          }, { merge: true });
          logger.debug('[Assessment] Health data consent record written');
        } catch (consentErr) {
          logger.warn('[Assessment] Failed to write consent record (non-fatal):', consentErr);
        }
      }

      // Evaluate achievements, refresh roadmap drift, and send notifications (non-blocking)
      if (profile?.organizationId && assessmentId && shareToken) {
        // Resolve stable clientId once — used by both achievements and drift refresh
        let resolvedClientId: string = assessmentId;
        try {
          const { resolveClientId } = await import('@/services/clientProfiles');
          resolvedClientId = (await resolveClientId(profile.organizationId, clientName)) ?? assessmentId;
        } catch (resolveErr) {
          logger.warn('[Assessment] Could not resolve clientId (non-fatal):', resolveErr);
        }

        // Step 1: Evaluate achievements using org-scoped storage
        try {
          const { getDoc: getDocSnap } = await import('firebase/firestore');
          const { getOrgAssessmentDoc } = await import('@/lib/database/collections');
          const summarySnap = await getDocSnap(
            getOrgAssessmentDoc(profile.organizationId, assessmentId)
          );
          const summaryRaw = summarySnap.data() as
            | { assessmentCount?: unknown; previousScore?: unknown }
            | undefined;
          const actualCount =
            typeof summaryRaw?.assessmentCount === 'number' ? summaryRaw.assessmentCount : 1;
          const previousOverallScore =
            typeof summaryRaw?.previousScore === 'number' ? summaryRaw.previousScore : undefined;

          let previousCategoryScores: Array<{ id: string; score: number; assessed: boolean }> | undefined;
          let previousFullProfileScore: number | null | undefined;
          try {
            const { getSnapshots } = await import('@/services/assessmentHistory');
            const snapshots = await getSnapshots(user.uid, clientName, 2, profile.organizationId);
            if (snapshots.length >= 2 && snapshots[1].formData) {
              const { computeScores } = await import('@/lib/scoring');
              const prevScores = computeScores(snapshots[1].formData);
              previousFullProfileScore = prevScores.fullProfileScore;
              previousCategoryScores = prevScores.categories.map((c) => ({
                id: c.id,
                score: c.score,
                assessed: c.assessed,
              }));
            }
          } catch (prevErr) {
            logger.debug('[Assessment] Could not fetch previous category scores (non-fatal):', prevErr);
          }

          const { evaluateAchievements } = await import('@/services/achievements');
          const categoryScores = scores.categories.map((c) => ({
            id: c.id,
            score: c.score,
            assessed: c.assessed,
          }));

          const unlocked = await evaluateAchievements({
            organizationId: profile.organizationId,
            clientId: resolvedClientId,
            shareToken,
            overallScore: scores.overall,
            fullProfileScore: scores.fullProfileScore,
            categoryScores,
            previousOverallScore,
            previousFullProfileScore,
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

        // Step 2: Refresh roadmap drift scores + check phase completion (non-blocking)
        try {
          const { refreshRoadmapScores, getRoadmapForClient } = await import('@/services/roadmaps');
          const driftScores: Record<string, number> = {};
          scores.categories.forEach((c) => { driftScores[c.id] = c.score; });
          await refreshRoadmapScores(
            profile.organizationId,
            clientName,
            driftScores,
            resolvedClientId,
            scores,
          );
          logger.debug('[Assessment] Roadmap scores refreshed for drift detection');

          // Check if all phase targets are now met → notify client + coach
          const roadmap = await getRoadmapForClient(
            profile.organizationId,
            clientName,
            resolvedClientId,
          );
          if (roadmap?.phaseTargets && roadmap.activePhase) {
            const targets = roadmap.phaseTargets[roadmap.activePhase] ?? [];
            const allMet =
              targets.length > 0 &&
              targets.every((t) => (driftScores[t.category] ?? 0) >= t.targetScore);
            if (allMet) {
              const { writeNotification } = await import('@/services/notificationWriter');
              const phaseName =
                roadmap.activePhase.charAt(0).toUpperCase() + roadmap.activePhase.slice(1);
              await Promise.all([
                writeNotification({
                  shareToken,
                  type: 'phase_complete',
                  title: `${phaseName} phase complete!`,
                  body: `You've hit every target in the ${phaseName} phase. Your coach will review and advance your plan.`,
                  priority: 'high',
                }),
                writeNotification({
                  recipientUid: user.uid,
                  type: 'phase_complete',
                  title: `${formData.fullName || clientName} completed the ${phaseName} phase`,
                  body: `All ${phaseName} phase targets have been reached — consider advancing their plan.`,
                  priority: 'high',
                  actionUrl: `/client/${encodeURIComponent(clientName)}/roadmap`,
                }),
              ]);
              logger.debug(`[Assessment] Phase complete notifications sent (${roadmap.activePhase})`);
            }
          }
        } catch (driftErr) {
          logger.warn('[Assessment] Failed to refresh roadmap scores (non-fatal):', driftErr);
        }

        // Step 2b: Score drop alert — notify coach if overall score fell by 5+ points
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
              body: `Overall score fell from ${Math.round(previousScore)} to ${Math.round(scores.overall)}. A review may be warranted.`,
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
