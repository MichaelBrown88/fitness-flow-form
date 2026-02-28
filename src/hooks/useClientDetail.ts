/**
 * useClientDetail Hook
 * 
 * Extracted from ClientDetail.tsx to separate logic from UI.
 * Handles all state management, data fetching, and handlers for the
 * client detail page.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getClientAssessments, type CoachAssessmentSummary } from '@/services/coachAssessments';
import { getClientProfile, createOrUpdateClientProfile, subscribeToClientProfile, generateClientSlug, type ClientProfile } from '@/services/clientProfiles';
import { getCoachAssessment } from '@/services/coachAssessments';
import { 
  getCurrentAssessment, 
  getSnapshots,
  type AssessmentSnapshot
} from '@/services/assessmentHistory';
import { type FormData } from '@/contexts/FormContext';
import { computeScores } from '@/lib/scoring';
import { logger } from '@/lib/utils/logger';
import { UI_TOASTS } from '@/constants/ui';
import { STORAGE_KEYS } from '@/constants/storageKeys';

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
  clientName: string;
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
  
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  setEditData: React.Dispatch<React.SetStateAction<Partial<ClientProfile>>>;
  setDeleteDialog: React.Dispatch<React.SetStateAction<DeleteDialogState | null>>;
  
  handleSaveProfile: () => Promise<void>;
  handleNewAssessment: (category?: 'bodycomp' | 'posture' | 'fitness' | 'strength' | 'lifestyle') => Promise<void>;
  handleDeleteAssessment: (id: string) => Promise<void>;
  handleTransferClient: (toCoachUid: string) => Promise<void>;
  handlePauseClient: (reason?: string) => Promise<void>;
  handleUnpauseClient: (mode: 'resume' | 'reset') => Promise<void>;
  handleArchiveClient: (reason?: string) => Promise<void>;
  handleReactivateClient: (mode: 'resume' | 'reset') => Promise<void>;
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

  // Calculate stats from assessments
  const stats = useMemo<ClientStats>(() => {
    if (assessments.length === 0) {
      return {
        totalAssessments: 0,
        averageScore: 0,
        latestScore: 0,
        scoreChange: 0,
        trend: 'neutral',
        categoryScores: {},
      };
    }

    const latest = assessments[0];
    const previous = assessments[1];
    const scoreChange = previous ? (latest.overallScore || 0) - (previous.overallScore || 0) : 0;
    
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
  }, [assessments]);

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
      sessionStorage.setItem(STORAGE_KEYS.PARTIAL_ASSESSMENT, JSON.stringify({
        category,
        clientName,
      }));
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.PARTIAL_ASSESSMENT);
    }
    
    // CRITICAL: Clear all previous assessment modes to prevent data bleed
    sessionStorage.removeItem(STORAGE_KEYS.IS_DEMO);
    sessionStorage.removeItem(STORAGE_KEYS.PREFILL_CLIENT);
    sessionStorage.removeItem(STORAGE_KEYS.EDIT_ASSESSMENT);

    // Get latest assessment to pre-fill
    if (assessments.length > 0) {
      try {
        const latest = await getCoachAssessment(user.uid, assessments[0].id, undefined, readOrgId, userProfile);
        if (latest?.formData) {
          sessionStorage.setItem(STORAGE_KEYS.PREFILL_CLIENT, JSON.stringify({
            clientName: latest.formData.fullName,
            dateOfBirth: latest.formData.dateOfBirth,
            email: latest.formData.email,
            phone: latest.formData.phone,
          }));
        }
      } catch (e) {
        logger.warn('Failed to pre-fill data', 'CLIENT_DETAIL', e);
      }
    }
    
    navigate('/assessment');
  }, [user, clientName, assessments, navigate]);

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
  }, [user, toast]);

  // Navigate back
  const navigateBack = useCallback(() => {
    navigate('/');
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
        const [data, current] = await Promise.all([
          getClientAssessments(user.uid, clientName, userProfile?.organizationId),
          getCurrentAssessment(user.uid, clientName, userProfile?.organizationId),
        ]);
        setAssessments(data);

        // Set current assessment from history, or fall back to latest assessment
        if (current) {
          setCurrentAssessment(current);
        } else if (data.length > 0) {
          // Fallback: load formData from the latest assessment if no history exists
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
  }, [user, clientName, userProfile?.organizationId]);

  // Load category scores for current assessment
  useEffect(() => {
    if (!user || !clientName) return;
    
    (async () => {
      const currentBreakdown: Record<string, number> = {};
      
      if (currentAssessment) {
        const scores = computeScores(currentAssessment.formData);
        scores.categories.forEach(cat => {
          currentBreakdown[cat.id] = cat.score;
        });
        setCategoryBreakdown(currentBreakdown);
      } else if (assessments.length > 0 && assessments[0].scoresSummary) {
        assessments[0].scoresSummary.categories.forEach(cat => {
          currentBreakdown[cat.id] = cat.score;
        });
        setCategoryBreakdown(currentBreakdown);
      } else if (assessments.length > 0) {
        // Fallback to old system (uses readOrgId for impersonation support)
        const latest = await getCoachAssessment(user.uid, assessments[0].id, undefined, readOrgId, userProfile);
        if (latest?.formData) {
          setCurrentAssessment({ formData: latest.formData, overallScore: latest.overallScore });
          const scores = computeScores(latest.formData);
          scores.categories.forEach(cat => {
            currentBreakdown[cat.id] = cat.score;
          });
          setCategoryBreakdown(currentBreakdown);
        }
      }

      // Calculate changes from previous snapshot
      if (Object.keys(currentBreakdown).length > 0 && snapshots.length > 0) {
        const latestSnapshot = snapshots.find(s => {
          const diff = Date.now() - s.timestamp.toDate().getTime();
          return diff > 5 * 60 * 1000; // More than 5 minutes ago
        }) || snapshots[1];

        if (latestSnapshot) {
          const prevScores = computeScores(latestSnapshot.formData);
          const changes: Record<string, number> = {};
          prevScores.categories.forEach(cat => {
            const currentScore = currentBreakdown[cat.id] || 0;
            changes[cat.id] = currentScore - cat.score;
          });
          setCategoryChanges(changes);
        }
      }
    })();
  }, [user, clientName, assessments, snapshots, currentAssessment, userProfile?.organizationId]);

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
    if (!userProfile?.organizationId || !clientName) return;
    const { pauseClient } = await import('@/services/clientProfiles');
    await pauseClient({
      organizationId: userProfile.organizationId,
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
  }, [userProfile, clientName, user, toast, profile?.firebaseUid]);

  // Unpause client account
  const handleUnpauseClient = useCallback(async (mode: 'resume' | 'reset') => {
    if (!userProfile?.organizationId || !clientName) return;
    const { unpauseClient } = await import('@/services/clientProfiles');
    await unpauseClient({
      organizationId: userProfile.organizationId,
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
  }, [userProfile, clientName, toast]);

  const handleArchiveClient = useCallback(async (reason?: string) => {
    if (!userProfile?.organizationId || !clientName) return;
    const { archiveClient } = await import('@/services/clientProfiles');
    await archiveClient({
      organizationId: userProfile.organizationId,
      clientSlug: generateClientSlug(clientName),
      archivedBy: user?.uid || 'unknown',
      reason,
      profile: userProfile,
    });
    toast({ title: `${clientName} archived`, description: 'Removed from dashboard. Data preserved.' });
  }, [userProfile, clientName, user, toast]);

  const handleReactivateClient = useCallback(async (mode: 'resume' | 'reset') => {
    if (!userProfile?.organizationId || !clientName) return;
    const { reactivateClient } = await import('@/services/clientProfiles');
    await reactivateClient({
      organizationId: userProfile.organizationId,
      clientSlug: generateClientSlug(clientName),
      mode,
      profile: userProfile,
    });
    toast({
      title: `${clientName} reactivated`,
      description: mode === 'resume' ? 'Schedule resumed.' : 'Schedule reset to today.',
    });
  }, [userProfile, clientName, toast]);

  return {
    clientName,
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
    
    setIsEditing,
    setEditData,
    setDeleteDialog,
    
    handleSaveProfile,
    handleNewAssessment,
    handleDeleteAssessment,
    handleTransferClient,
    handlePauseClient,
    handleUnpauseClient,
    handleArchiveClient,
    handleReactivateClient,
    navigateBack,
  };
}
