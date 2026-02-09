/**
 * useClientDetail Hook
 * 
 * Extracted from ClientDetail.tsx to separate logic from UI.
 * Handles all state management, data fetching, and handlers for the
 * client detail page.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { getClientAssessments, type CoachAssessmentSummary } from '@/services/coachAssessments';
import { getClientProfile, createOrUpdateClientProfile, subscribeToClientProfile, type ClientProfile } from '@/services/clientProfiles';
import { getCoachAssessment } from '@/services/coachAssessments';
import { 
  getCurrentAssessment, 
  reconstructAssessmentAtDate, 
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

export interface ComparisonTarget {
  old: FormData;
  new: FormData;
  oldDate: Date;
  newDate: Date;
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
  // URL and Auth
  clientName: string;
  user: ReturnType<typeof useAuth>['user'];
  
  // Loading states
  loading: boolean;
  loadingSnapshots: boolean;
  loadingHistorical: boolean;
  
  // Data
  assessments: CoachAssessmentSummary[];
  profile: ClientProfile | null;
  snapshots: AssessmentSnapshot[];
  currentAssessment: CurrentAssessmentData | null;
  historicalAssessment: CurrentAssessmentData | null;
  categoryBreakdown: Record<string, number>;
  categoryChanges: Record<string, number>;
  stats: ClientStats;
  
  // UI State
  isEditing: boolean;
  editData: Partial<ClientProfile>;
  deleteDialog: DeleteDialogState | null;
  selectedDate: Date | undefined;
  showComparison: boolean;
  comparisonTarget: ComparisonTarget | null;
  isComparisonMode: boolean;
  
  // Setters
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  setEditData: React.Dispatch<React.SetStateAction<Partial<ClientProfile>>>;
  setDeleteDialog: React.Dispatch<React.SetStateAction<DeleteDialogState | null>>;
  setSelectedDate: React.Dispatch<React.SetStateAction<Date | undefined>>;
  setShowComparison: React.Dispatch<React.SetStateAction<boolean>>;
  setIsComparisonMode: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Handlers
  handleDateSelection: (date: Date) => Promise<void>;
  handleQuickJump: (months: number | 'first' | 'last') => void;
  handleSaveProfile: () => Promise<void>;
  handleNewAssessment: (category?: 'inbody' | 'posture' | 'fitness' | 'strength' | 'lifestyle') => Promise<void>;
  handleDeleteAssessment: (id: string) => Promise<void>;
  navigateBack: () => void;
}

export function useClientDetail(): UseClientDetailResult {
  const { clientName: encodedClientName } = useParams<{ clientName: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
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
  
  // UI state
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<ClientProfile>>({});
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState | null>(null);
  
  // Historical/comparison state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [historicalAssessment, setHistoricalAssessment] = useState<CurrentAssessmentData | null>(null);
  const [loadingHistorical, setLoadingHistorical] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonTarget, setComparisonTarget] = useState<ComparisonTarget | null>(null);
  const [isComparisonMode, setIsComparisonMode] = useState(false);

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

  // Handle date selection for historical view/comparison
  const handleDateSelection = useCallback(async (date: Date) => {
    if (!user || !clientName || !snapshots.length) return;
    
    setSelectedDate(date);
    
    // Find nearest snapshot that is <= selected date
    const sortedSnapshots = [...snapshots].sort((a, b) => 
      b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime()
    );
    const nearest = sortedSnapshots.find(s => 
      s.timestamp.toDate().getTime() <= date.getTime()
    ) || sortedSnapshots[sortedSnapshots.length - 1];
    
    if (nearest) {
      if (isComparisonMode) {
        if (currentAssessment) {
          setComparisonTarget({
            old: nearest.formData,
            new: currentAssessment.formData,
            oldDate: nearest.timestamp.toDate(),
            newDate: new Date()
          });
          setShowComparison(true);
        } else {
          toast({ title: UI_TOASTS.ERROR.CURRENT_DATA_NOT_LOADED, variant: "destructive" });
        }
      } else {
        navigate(`/coach/assessments/${nearest.id}?clientName=${encodeURIComponent(clientName)}`);
      }
    }
  }, [user, clientName, snapshots, isComparisonMode, currentAssessment, toast, navigate]);

  // Quick jump to specific time periods
  const handleQuickJump = useCallback((months: number | 'first' | 'last') => {
    if (!snapshots.length) return;
    
    let targetDate = new Date();
    if (months === 'first') {
      const sorted = [...snapshots].sort((a, b) => 
        a.timestamp.toDate().getTime() - b.timestamp.toDate().getTime()
      );
      targetDate = sorted[0].timestamp.toDate();
    } else if (months === 'last') {
      const sorted = [...snapshots].sort((a, b) => 
        b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime()
      );
      targetDate = sorted[0].timestamp.toDate();
    } else {
      targetDate.setMonth(targetDate.getMonth() - months);
    }
    
    handleDateSelection(targetDate);
  }, [snapshots, handleDateSelection]);

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
    category?: 'inbody' | 'posture' | 'fitness' | 'strength' | 'lifestyle'
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

  // Load historical assessment when date is selected
  useEffect(() => {
    if (!user || !clientName || !selectedDate) {
      setHistoricalAssessment(null);
      return;
    }
    
    setLoadingHistorical(true);
    (async () => {
      try {
        const historical = await reconstructAssessmentAtDate(
          user.uid, 
          clientName, 
          selectedDate, 
          userProfile?.organizationId
        );
        setHistoricalAssessment(historical);
      } catch (err) {
        logger.error('Failed to load historical assessment', 'CLIENT_DETAIL', err);
        setHistoricalAssessment(null);
      } finally {
        setLoadingHistorical(false);
      }
    })();
  }, [user, clientName, selectedDate, userProfile?.organizationId]);

  // Handle ?compare=true URL param: auto-open comparison dialog
  useEffect(() => {
    if (searchParams.get('compare') !== 'true') return;
    if (!currentAssessment || snapshots.length < 2) return;

    // Use oldest snapshot as "old" vs current as "new"
    const sortedSnapshots = [...snapshots].sort((a, b) =>
      a.timestamp.toDate().getTime() - b.timestamp.toDate().getTime()
    );
    const oldest = sortedSnapshots[0];

    setIsComparisonMode(true);
    setComparisonTarget({
      old: oldest.formData,
      new: currentAssessment.formData,
      oldDate: oldest.timestamp.toDate(),
      newDate: new Date(),
    });
    setShowComparison(true);

    // Clear the param so it doesn't re-trigger
    searchParams.delete('compare');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, currentAssessment, snapshots]);

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

  return {
    // URL and Auth
    clientName,
    user,
    
    // Loading states
    loading,
    loadingSnapshots,
    loadingHistorical,
    
    // Data
    assessments,
    profile,
    snapshots,
    currentAssessment,
    historicalAssessment,
    categoryBreakdown,
    categoryChanges,
    stats,
    
    // UI State
    isEditing,
    editData,
    deleteDialog,
    selectedDate,
    showComparison,
    comparisonTarget,
    isComparisonMode,
    
    // Setters
    setIsEditing,
    setEditData,
    setDeleteDialog,
    setSelectedDate,
    setShowComparison,
    setIsComparisonMode,
    
    // Handlers
    handleDateSelection,
    handleQuickJump,
    handleSaveProfile,
    handleNewAssessment,
    handleDeleteAssessment,
    handleTransferClient,
    navigateBack,
  };
}
