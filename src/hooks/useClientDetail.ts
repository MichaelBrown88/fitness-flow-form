/**
 * useClientDetail Hook
 * 
 * Client detail data for `ClientDetailLayout` and tab routes.
 * Handles all state management, data fetching, and handlers for the
 * client detail page.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getClientAssessments, getDraftAssessment, type CoachAssessmentSummary } from '@/services/coachAssessments';
import { getClientProfile, createOrUpdateClientProfile, subscribeToClientProfile, generateClientSlug, type ClientProfile } from '@/services/clientProfiles';
import { getCoachAssessment } from '@/services/coachAssessments';
import { 
  getCurrentAssessment, 
  getSnapshots,
  deleteSnapshot,
  type AssessmentSnapshot
} from '@/services/assessmentHistory';
import { type FormData } from '@/contexts/FormContext';
import { computeScores } from '@/lib/scoring';
import { logger } from '@/lib/utils/logger';
import { formatClientDisplayName } from '@/lib/utils/clientDisplayName';
import { UI_TOASTS } from '@/constants/ui';
import {
  clearClientNavAssessmentBleedKeys,
  confirmAssessmentSetup,
  writeAssessmentPhaseIndex,
  writeEditAssessmentPayload,
  writePartialAssessment,
  removePartialAssessment,
  writePrefillClientPayload,
  writeSessionDraftAssessmentBundle,
} from '@/lib/assessment/assessmentSessionStorage';
import { ROUTES } from '@/constants/routes';
import type { Timestamp } from 'firebase/firestore';

// Types
export interface ClientStats {
  totalAssessments: number;
  averageScore: number;
  latestScore: number;
  scoreChange: number;
  trend: 'up' | 'down' | 'neutral';
  categoryScores: Record<string, number[]>;
}

export interface DeleteDialogState {
  id: string;
  date: string;
}

export interface CurrentAssessmentData {
  formData: FormData;
  overallScore: number;
}

export interface UseClientDetailResult {
  /** Canonical client key from the route (slug); use for Firestore paths and encodeURIComponent. */
  clientName: string;
  /** Human-readable label for breadcrumbs and headings (from profile when available). */
  displayClientName: string;
  user: ReturnType<typeof useAuth>['user'];
  
  loading: boolean;
  loadingSnapshots: boolean;
  
  assessments: CoachAssessmentSummary[];
  profile: ClientProfile | null;
  snapshots: AssessmentSnapshot[];
  currentAssessment: CurrentAssessmentData | null;
  categoryBreakdown: Record<string, number>;
  categoryChanges: Record<string, number>;
  stats: ClientStats;
  
  isEditing: boolean;
  editData: Partial<ClientProfile>;
  deleteDialog: DeleteDialogState | null;
  deleteSnapshotDialog: { snapshotId: string } | null;
  incompleteDraft: {
    formData: FormData;
    updatedAt: Timestamp | null;
    activePhaseIdx: number | null;
  } | null;
  
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  setEditData: React.Dispatch<React.SetStateAction<Partial<ClientProfile>>>;
  setDeleteDialog: React.Dispatch<React.SetStateAction<DeleteDialogState | null>>;
  setDeleteSnapshotDialog: React.Dispatch<React.SetStateAction<{ snapshotId: string } | null>>;
  
  handleSaveProfile: () => Promise<void>;
  handleNewAssessment: (category?: 'bodycomp' | 'posture' | 'fitness' | 'strength' | 'lifestyle') => Promise<void>;
  handleFinishAssessment: () => void;
  handleDeleteAssessment: (id: string) => Promise<void>;
  handleEditSnapshot: (snapshot: AssessmentSnapshot) => void;
  handleDeleteSnapshot: () => Promise<void>;
  handleTransferClient: (toCoachUid: string) => Promise<void>;
  handlePauseClient: (reason?: string) => Promise<void>;
  handleUnpauseClient: (mode: 'resume' | 'reset') => Promise<void>;
  handleArchiveClient: (reason?: string) => Promise<void>;
  handleReactivateClient: (mode: 'resume' | 'reset') => Promise<void>;
  handleDeleteClientPermanently: () => Promise<void>;
  navigateBack: () => void;
}

export function useClientDetail(): UseClientDetailResult {
  const { clientName: encodedClientName } = useParams<{ clientName: string }>();
  const navigate = useNavigate();
  const { user, profile: userProfile, effectiveOrgId } = useAuth();
  const { toast } = useToast();
  
  // Use effectiveOrgId for reads (impersonation support)
  const readOrgId = effectiveOrgId || userProfile?.organizationId;
  
  const clientName = encodedClientName ? decodeURIComponent(encodedClientName) : '';

  // Core data state
  const [assessments, setAssessments] = useState<CoachAssessmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [snapshots, setSnapshots] = useState<AssessmentSnapshot[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [currentAssessment, setCurrentAssessment] = useState<CurrentAssessmentData | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<Record<string, number>>({});
  const [categoryChanges, setCategoryChanges] = useState<Record<string, number>>({});
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<ClientProfile>>({});
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState | null>(null);
  const [deleteSnapshotDialog, setDeleteSnapshotDialog] = useState<{ snapshotId: string } | null>(null);
  const [incompleteDraft, setIncompleteDraft] = useState<{
    formData: FormData;
    updatedAt: Timestamp | null;
    activePhaseIdx: number | null;
  } | null>(null);

  const displayClientName = useMemo(() => {
    const fromProfile = profile?.clientName?.trim();
    if (fromProfile) return formatClientDisplayName(fromProfile);
    return formatClientDisplayName(clientName);
  }, [profile?.clientName, clientName]);

  // Calculate stats from snapshots (actual assessment history: full + partials). Fall back to assessments/summary when no snapshots yet.
  const stats = useMemo<ClientStats>(() => {
    const latestScore = currentAssessment?.overallScore ?? snapshots[0]?.overallScore ?? assessments[0]?.overallScore ?? 0;
    const previousScore = snapshots[1]?.overallScore ?? assessments[1]?.overallScore ?? 0;
    const scoreChange = latestScore - previousScore;

    if (snapshots.length > 0) {
      const total = snapshots.length;
      const sumScores = snapshots.reduce((sum, s) => sum + (s.overallScore ?? 0), 0);
      const avgScore = total > 0 ? Math.round(sumScores / total) : 0;
      return {
        totalAssessments: total,
        averageScore: avgScore,
        latestScore,
        scoreChange,
        trend: scoreChange > 0 ? 'up' : scoreChange < 0 ? 'down' : 'neutral',
        categoryScores: {},
      };
    }

    if (assessments.length > 0) {
      const latest = assessments[0];
      const avgScore = Math.round(
        assessments.reduce((sum, a) => sum + (a.overallScore || 0), 0) / assessments.length
      );
      return {
        totalAssessments: assessments.length,
        averageScore: avgScore,
        latestScore: latest.overallScore || 0,
        scoreChange,
        trend: scoreChange > 0 ? 'up' : scoreChange < 0 ? 'down' : 'neutral',
        categoryScores: {},
      };
    }

    return {
      totalAssessments: 0,
      averageScore: 0,
      latestScore: 0,
      scoreChange: 0,
      trend: 'neutral' as const,
      categoryScores: {},
    };
  }, [snapshots, currentAssessment, assessments]);

  // Save profile changes (with rename + DOB recalculation support)
  const handleSaveProfile = useCallback(async () => {
    if (!user || !clientName) return;
    try {
      // Check if name changed (Phase C rename)
      const newName = editData.clientName?.trim();
      if (newName && newName !== clientName) {
        const { renameClient } = await import('@/services/clientProfiles');
        const renameResult = await renameClient(clientName, newName, userProfile?.organizationId ?? '', userProfile);
        if (!renameResult.success) {
          toast({ title: 'Rename failed', description: renameResult.message, variant: 'destructive' });
          return;
        }
        toast({ title: 'Client renamed', description: renameResult.message });
        // Navigate to new URL after rename
        const navigate = window.location;
        navigate.href = `/client/${encodeURIComponent(newName)}`;
        return;
      }

      // Save profile fields
      await createOrUpdateClientProfile(user.uid, clientName, editData, userProfile?.organizationId, userProfile);

      // Check if DOB changed (Phase D retroactive recalculation)
      if (editData.dateOfBirth && profile?.dateOfBirth && editData.dateOfBirth !== profile.dateOfBirth && userProfile?.organizationId) {
        try {
          const { recalculateClientScores } = await import('@/services/clientRecalculation');
          const recalcResult = await recalculateClientScores(
            clientName,
            userProfile.organizationId,
            { dateOfBirth: editData.dateOfBirth },
          );
          if (recalcResult.success) {
            toast({
              title: 'Scores recalculated',
              description: `Updated ${recalcResult.summariesUpdated} reports with corrected DOB.`,
            });
          }
        } catch (recalcErr) {
          logger.warn('DOB recalculation failed (non-fatal)', 'CLIENT_DETAIL', recalcErr);
        }
      }

      // Check if gender changed (also affects scoring)
      if (editData.gender && profile?.gender && editData.gender !== profile.gender && userProfile?.organizationId) {
        try {
          const { recalculateClientScores } = await import('@/services/clientRecalculation');
          await recalculateClientScores(
            clientName,
            userProfile.organizationId,
            { gender: editData.gender },
          );
        } catch (recalcErr) {
          logger.warn('Gender recalculation failed (non-fatal)', 'CLIENT_DETAIL', recalcErr);
        }
      }

      setIsEditing(false);
      toast({
        title: UI_TOASTS.SUCCESS.PROFILE_UPDATED,
        description: UI_TOASTS.SUCCESS.PROFILE_SAVED,
      });
    } catch (err) {
      logger.error('Failed to update profile', 'CLIENT_DETAIL', err);
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      });
    }
  }, [user, clientName, editData, userProfile, profile?.dateOfBirth, profile?.gender, toast]);

  // Start new assessment
  const handleNewAssessment = useCallback(async (
    category?: 'bodycomp' | 'posture' | 'fitness' | 'strength' | 'lifestyle'
  ) => {
    if (!user) return;
    
    // Set partial assessment mode immediately if category specified
    if (category) {
      writePartialAssessment({ category, clientName });
    } else {
      removePartialAssessment();
    }

    clearClientNavAssessmentBleedKeys();

    // Always use the current canonical clientName — never use formData.fullName from history
    // as it may contain a stale pre-rename name that would recreate a duplicate client doc.
    const prefill: Record<string, unknown> = { fullName: clientName };
    if (assessments.length > 0) {
      try {
        const latest = await getCoachAssessment(user.uid, assessments[0].id, undefined, readOrgId, userProfile);
        if (latest?.formData) {
          // Intentionally skip latest.formData.fullName — clientName from URL is authoritative
          prefill.dateOfBirth = latest.formData.dateOfBirth;
          prefill.email = latest.formData.email;
          prefill.phone = latest.formData.phone;
        }
      } catch (e) {
        logger.warn('Failed to pre-fill data', 'CLIENT_DETAIL', e);
      }
    }
    writePrefillClientPayload(prefill);
    // Coach already chose this client + pillar — skip the confirmation step
    confirmAssessmentSetup();

    navigate('/assessment');
  }, [user, clientName, assessments, navigate, readOrgId, userProfile]);

  // Delete assessment
  const handleDeleteAssessment = useCallback(async (id: string) => {
    if (!user) return;
    try {
      const { deleteCoachAssessment } = await import('@/services/coachAssessments');
      await deleteCoachAssessment(user.uid, id, userProfile?.organizationId, userProfile);
      setAssessments(prev => prev.filter(a => a.id !== id));
      toast({
        title: UI_TOASTS.SUCCESS.ASSESSMENT_DELETED,
        description: UI_TOASTS.SUCCESS.ASSESSMENT_REMOVED,
      });
      setDeleteDialog(null);
    } catch (err) {
      logger.error('Failed to delete assessment', 'CLIENT_DETAIL', err);
      toast({
        title: UI_TOASTS.ERROR.GENERIC,
        description: UI_TOASTS.ERROR.FAILED_TO_DELETE,
        variant: "destructive",
      });
    }
  }, [user, toast, userProfile]);

  const handleEditSnapshot = useCallback((snapshot: AssessmentSnapshot) => {
    const summaryId = assessments[0]?.id;
    if (!summaryId) return;
    try {
      const rawType = snapshot.type;
      const editType =
        rawType?.startsWith('partial-')
          ? rawType
          : rawType === 'manual' || !rawType
            ? 'partial-strength'
            : rawType;
      const editPayload = {
        assessmentId: summaryId,
        formData: snapshot.formData,
        snapshotId: snapshot.id ?? undefined,
        editType,
      };
      writeEditAssessmentPayload(editPayload);
      if (editType.startsWith('partial-')) {
        const category = editType.replace('partial-', '');
        writePartialAssessment({
          category,
          clientName: snapshot.formData?.fullName || clientName,
        });
      }
    } catch (e) {
      logger.warn('Failed to set EDIT_ASSESSMENT', 'CLIENT_DETAIL', e);
    }
    navigate(ROUTES.ASSESSMENT);
  }, [assessments, clientName, navigate]);

  const handleDeleteSnapshot = useCallback(async () => {
    if (!user || !readOrgId || !deleteSnapshotDialog) return;
    try {
      const result = await deleteSnapshot(
        user.uid,
        clientName,
        deleteSnapshotDialog.snapshotId,
        readOrgId,
      );
      if (result.success) {
        toast({ title: 'Snapshot removed', description: result.message });
        setDeleteSnapshotDialog(null);
        const [nextSnapshots, assessmentData, current] = await Promise.all([
          getSnapshots(user.uid, clientName, 100, readOrgId),
          getClientAssessments(user.uid, clientName, readOrgId),
          getCurrentAssessment(user.uid, clientName, readOrgId),
        ]);
        setSnapshots(nextSnapshots);
        setAssessments(assessmentData);
        if (current) {
          setCurrentAssessment({ formData: current.formData, overallScore: current.overallScore });
        } else if (assessmentData.length > 0) {
          const latest = await getCoachAssessment(user.uid, assessmentData[0].id, clientName, readOrgId, userProfile);
          if (latest) {
            setCurrentAssessment({ formData: latest.formData, overallScore: latest.overallScore });
          }
        } else {
          setCurrentAssessment(null);
        }
      } else {
        toast({ title: UI_TOASTS.ERROR.GENERIC, description: result.message, variant: 'destructive' });
      }
    } catch (err) {
      toast({
        title: UI_TOASTS.ERROR.GENERIC,
        description: err instanceof Error ? err.message : 'Failed to delete snapshot',
        variant: 'destructive',
      });
    }
  }, [user, clientName, readOrgId, deleteSnapshotDialog, toast, userProfile]);

  // Navigate back
  const navigateBack = useCallback(() => {
    navigate(ROUTES.DASHBOARD_CLIENTS);
  }, [navigate]);

  // Load snapshots
  useEffect(() => {
    if (!user || !clientName || !userProfile?.organizationId) return;

    (async () => {
      try {
        setLoadingSnapshots(true);
        const data = await getSnapshots(user.uid, clientName, 100, userProfile?.organizationId);
        setSnapshots(data);
      } catch (err) {
        logger.error('Failed to load snapshots', 'CLIENT_DETAIL', err);
      } finally {
        setLoadingSnapshots(false);
      }
    })();
  }, [user, clientName, userProfile?.organizationId]);

  // Subscribe to profile and load assessments
  useEffect(() => {
    if (!user || !clientName || !userProfile?.organizationId) return;

    const unsubscribeProfile = subscribeToClientProfile(user.uid, clientName, (p) => {
      setProfile(p);
      if (p) {
        setEditData({
          email: p.email || '',
          phone: p.phone || '',
          dateOfBirth: p.dateOfBirth || '',
          gender: p.gender || '',
          notes: p.notes || '',
          tags: p.tags || [],
          status: p.status || 'active',
          trainingStartDate: p.trainingStartDate || '',
        });
      }
    }, userProfile?.organizationId);

    (async () => {
      try {
        setLoading(true);
        const [data, current, sessions] = await Promise.all([
          getClientAssessments(user.uid, clientName, userProfile?.organizationId),
          getCurrentAssessment(user.uid, clientName, userProfile?.organizationId),
          getSnapshots(user.uid, clientName, 1, userProfile?.organizationId),
        ]);
        setAssessments(data);

        // Priority: current/state doc → latest session formData → latest assessment doc
        if (current && Object.keys(current.formData ?? {}).length > 0) {
          setCurrentAssessment(current);
        } else if (sessions.length > 0 && Object.keys(sessions[0].formData ?? {}).length > 0) {
          // Fallback: derive current state from the latest session (handles missing current/state)
          const latest = sessions[0];
          setCurrentAssessment({ formData: latest.formData, overallScore: latest.overallScore });
        } else if (data.length > 0) {
          const latestAssessment = await getCoachAssessment(user.uid, data[0].id, clientName, userProfile?.organizationId, userProfile);
          if (latestAssessment) {
            setCurrentAssessment({
              formData: latestAssessment.formData,
              overallScore: latestAssessment.overallScore,
            });
          }
        }

        // Sync profile with latest assessment data
        if (data.length > 0) {
          const latestAssessment = await getCoachAssessment(user.uid, data[0].id, clientName, userProfile?.organizationId, userProfile);
          const formData = latestAssessment?.formData;

          // Build update object with data from assessment
          const profileUpdate: Partial<ClientProfile> = {
            lastAssessmentDate: data[0].createdAt,
          };

          // Sync contact info from assessment if available
          if (formData?.email) profileUpdate.email = formData.email;
          if (formData?.phone) profileUpdate.phone = formData.phone;
          if (formData?.dateOfBirth) profileUpdate.dateOfBirth = formData.dateOfBirth;
          if (formData?.gender) profileUpdate.gender = formData.gender;

          await createOrUpdateClientProfile(user.uid, clientName, profileUpdate, userProfile?.organizationId, userProfile);
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      unsubscribeProfile();
    };
  }, [user, clientName, userProfile]);

  // Check for incomplete draft (Save for Later) so we can show "Finish assessment" CTA
  useEffect(() => {
    if (!clientName || !readOrgId) return;
    let cancelled = false;
    getDraftAssessment(clientName, readOrgId)
      .then((draft) => {
        if (cancelled) return;
        if (draft?.formData && Object.keys(draft.formData).length > 0) {
          setIncompleteDraft(draft);
        } else {
          setIncompleteDraft(null);
        }
      })
      .catch(() => {
        if (!cancelled) setIncompleteDraft(null);
      });
    return () => {
      cancelled = true;
    };
  }, [clientName, readOrgId]);

  const handleFinishAssessment = useCallback(() => {
    if (!incompleteDraft) return;
    try {
      writeSessionDraftAssessmentBundle(incompleteDraft.formData, clientName);
      writePrefillClientPayload({ fullName: clientName });
      if (
        typeof incompleteDraft.activePhaseIdx === 'number' &&
        incompleteDraft.activePhaseIdx >= 0
      ) {
        writeAssessmentPhaseIndex(incompleteDraft.activePhaseIdx);
      }
    } catch {
      // non-fatal
    }
    navigate(ROUTES.ASSESSMENT);
  }, [incompleteDraft, clientName, navigate]);

  // Load category scores for current assessment
  useEffect(() => {
    if (!user || !clientName) return;

    let cancelled = false;

    (async () => {
      const currentBreakdown: Record<string, number> = {};

      if (currentAssessment) {
        const scores = computeScores(currentAssessment.formData);
        scores.categories.forEach(cat => {
          currentBreakdown[cat.id] = cat.score;
        });
        if (!cancelled) setCategoryBreakdown(currentBreakdown);
      } else if (assessments.length > 0 && assessments[0].scoresSummary) {
        assessments[0].scoresSummary.categories.forEach(cat => {
          currentBreakdown[cat.id] = cat.score;
        });
        if (!cancelled) setCategoryBreakdown(currentBreakdown);
      } else if (assessments.length > 0) {
        const latest = await getCoachAssessment(user.uid, assessments[0].id, undefined, readOrgId, userProfile);
        if (cancelled) return;
        if (latest?.formData) {
          setCurrentAssessment({ formData: latest.formData, overallScore: latest.overallScore });
          const scores = computeScores(latest.formData);
          scores.categories.forEach(cat => {
            currentBreakdown[cat.id] = cat.score;
          });
          if (!cancelled) setCategoryBreakdown(currentBreakdown);
        }
      }

      if (cancelled) return;

      if (Object.keys(currentBreakdown).length > 0 && snapshots.length > 0) {
        const latestSnapshot = snapshots.find(s => {
          const diff = Date.now() - s.timestamp.toDate().getTime();
          return diff > 5 * 60 * 1000;
        }) || snapshots[1];

        if (latestSnapshot) {
          const prevScores = computeScores(latestSnapshot.formData);
          const changes: Record<string, number> = {};
          prevScores.categories.forEach(cat => {
            const currentScore = currentBreakdown[cat.id] || 0;
            changes[cat.id] = currentScore - cat.score;
          });
          if (!cancelled) setCategoryChanges(changes);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, clientName, assessments, snapshots, currentAssessment, readOrgId, userProfile]);

  // Handle client transfer (Phase E)
  const handleTransferClient = useCallback(async (toCoachUid: string) => {
    if (!user || !clientName || !userProfile?.organizationId) return;
    try {
      const { transferClient } = await import('@/services/clientProfiles');
      const result = await transferClient(
        clientName,
        userProfile.organizationId,
        user.uid,
        toCoachUid,
        userProfile,
      );
      if (result.success) {
        toast({ title: 'Client transferred', description: result.message });
      } else {
        toast({ title: 'Transfer failed', description: result.message, variant: 'destructive' });
      }
    } catch (err) {
      logger.error('Failed to transfer client', 'CLIENT_DETAIL', err);
      toast({ title: 'Error', description: 'Failed to transfer client.', variant: 'destructive' });
    }
  }, [user, clientName, userProfile, toast]);

  // Pause client account (coach-initiated)
  const handlePauseClient = useCallback(async (reason?: string) => {
    const orgId = readOrgId;
    if (!orgId || !clientName) return;
    const { pauseClient } = await import('@/services/clientProfiles');
    await pauseClient({
      organizationId: orgId,
      clientSlug: generateClientSlug(clientName),
      pausedBy: user?.uid || 'unknown',
      reason,
      profile: userProfile,
    });
    toast({ title: `${clientName} paused`, description: 'All reassessment countdowns are frozen.' });
    // Notify the client if they have a Firebase UID
    if (profile?.firebaseUid) {
      try {
        const { writeNotification } = await import('@/services/notificationWriter');
        await writeNotification({
          recipientUid: profile.firebaseUid,
          type: 'account_paused',
          title: 'Your account has been paused',
          body: reason ? `Reason: ${reason}` : 'Your coach has paused your assessment schedule.',
          priority: 'medium',
        });
      } catch { /* non-fatal */ }
    }
  }, [readOrgId, userProfile, clientName, user, toast, profile?.firebaseUid]);

  // Unpause client account
  const handleUnpauseClient = useCallback(async (mode: 'resume' | 'reset') => {
    const orgId = readOrgId;
    if (!orgId || !clientName) return;
    const { unpauseClient } = await import('@/services/clientProfiles');
    await unpauseClient({
      organizationId: orgId,
      clientSlug: generateClientSlug(clientName),
      mode,
      profile: userProfile,
    });
    toast({
      title: `${clientName} unpaused`,
      description: mode === 'resume' ? 'Countdowns resumed where they left off.' : 'Countdowns reset to today.',
    });
    // Notify the client
    if (profile?.firebaseUid) {
      try {
        const { writeNotification } = await import('@/services/notificationWriter');
        await writeNotification({
          recipientUid: profile.firebaseUid,
          type: 'account_unpaused',
          title: 'Your account is active again',
          body: mode === 'resume' ? 'Your assessment schedule has resumed.' : 'Your assessment schedule has been reset.',
          priority: 'medium',
        });
      } catch { /* non-fatal */ }
    }
  }, [readOrgId, userProfile, clientName, toast, profile?.firebaseUid]);

  const handleArchiveClient = useCallback(async (reason?: string) => {
    const orgId = readOrgId;
    if (!orgId || !clientName) return;
    try {
      const { archiveClient } = await import('@/services/clientProfiles');
      await archiveClient({
        organizationId: orgId,
        clientSlug: generateClientSlug(clientName),
        archivedBy: user?.uid || 'unknown',
        reason,
        profile: userProfile,
      });
      // Full reload so dashboard re-fetches client status from Firestore
      window.location.href = ROUTES.DASHBOARD;
    } catch (err) {
      logger.error('Failed to archive client', 'CLIENT_DETAIL', err);
      toast({ title: 'Failed to archive', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
      throw err;
    }
  }, [readOrgId, clientName, user, userProfile, toast]);

  const handleReactivateClient = useCallback(async (mode: 'resume' | 'reset') => {
    const orgId = readOrgId;
    if (!orgId || !clientName) return;
    try {
      const { reactivateClient } = await import('@/services/clientProfiles');
      await reactivateClient({
        organizationId: orgId,
        clientSlug: generateClientSlug(clientName),
        mode,
        profile: userProfile,
      });
      // Full reload so dashboard re-fetches client status from Firestore
      window.location.href = ROUTES.DASHBOARD;
    } catch (err) {
      logger.error('Failed to reactivate client', 'CLIENT_DETAIL', err);
      toast({ title: 'Failed to reactivate', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
      throw err;
    }
  }, [readOrgId, clientName, userProfile, toast]);

  const handleDeleteClientPermanently = useCallback(async () => {
    const orgId = readOrgId;
    if (!orgId || !clientName) {
      toast({ title: 'Delete failed', description: 'Organisation context not found. Please refresh and try again.', variant: 'destructive' });
      return;
    }
    try {
      const { deleteClientPermanently } = await import('@/services/clientProfiles');
      await deleteClientPermanently({
        organizationId: orgId,
        clientSlug: generateClientSlug(clientName),
        clientName,
        knownAssessmentId: assessments[0]?.id,
      });
      toast({ title: `${clientName} permanently deleted`, description: 'All client data has been removed.' });
      // Use a hard navigation so the dashboard's Firestore listener re-initialises
      // with fresh data rather than serving a stale cached snapshot.
      window.location.href = ROUTES.DASHBOARD;
    } catch (err) {
      logger.error('Failed to permanently delete client', 'CLIENT_DETAIL', err);
      toast({ title: 'Delete failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
      throw err;
    }
  }, [readOrgId, clientName, assessments, toast]);

  return {
    clientName,
    displayClientName,
    user,
    
    loading,
    loadingSnapshots,
    
    assessments,
    profile,
    snapshots,
    currentAssessment,
    categoryBreakdown,
    categoryChanges,
    stats,
    
    isEditing,
    editData,
    deleteDialog,
    deleteSnapshotDialog,
    incompleteDraft,
    
    setIsEditing,
    setEditData,
    setDeleteDialog,
    setDeleteSnapshotDialog,
    
    handleSaveProfile,
    handleNewAssessment,
    handleFinishAssessment,
    handleDeleteAssessment,
    handleEditSnapshot,
    handleDeleteSnapshot,
    handleTransferClient,
    handlePauseClient,
    handleUnpauseClient,
    handleArchiveClient,
    handleReactivateClient,
    handleDeleteClientPermanently,
    navigateBack,
  };
}
