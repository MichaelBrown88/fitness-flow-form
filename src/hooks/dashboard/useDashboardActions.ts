/**
 * Dashboard Actions Hook
 *
 * Handles delete, view history, and new assessment actions.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/utils/logger';
import {
  deleteCoachAssessment,
  getClientAssessments,
  getCoachAssessment,
  type CoachAssessmentSummary
} from '@/services/coachAssessments';
import { getClientAssessmentHistory, deleteSnapshot } from '@/services/assessmentHistory';
import type { AssessmentSnapshot } from '@/services/assessmentHistory';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { ROUTES } from '@/constants/routes';
import { UI_TOASTS } from '@/constants/ui';
import { clearDraft } from '@/hooks/useAssessmentDraft';
import type { User } from 'firebase/auth';
import type { UserProfile } from '@/types/auth';

export function useDashboardActions(
  user: User | null,
  profile?: UserProfile | null,
  /** Effective org ID for reads (supports impersonation) */
  effectiveOrgId?: string | null,
) {
  // Reads use effectiveOrgId (impersonation), writes use profile.organizationId (real org)
  const readOrgId = effectiveOrgId || profile?.organizationId;
  const navigate = useNavigate();
  const { toast } = useToast();

  const [deleteDialog, setDeleteDialog] = useState<{ id: string; name: string } | null>(null);
  const [clientHistoryDialog, setClientHistoryDialog] = useState<string | null>(null);
  const [clientHistory, setClientHistory] = useState<AssessmentSnapshot[]>([]);
  const [clientSummaryId, setClientSummaryId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [deleteSnapshotDialog, setDeleteSnapshotDialog] = useState<{ clientName: string; snapshotId: string } | null>(null);

  const handleDelete = async () => {
    if (!user || !deleteDialog) return;
    try {
      await deleteCoachAssessment(user.uid, deleteDialog.id, profile?.organizationId, profile);
      toast({
        title: UI_TOASTS.SUCCESS.ASSESSMENT_DELETED,
        description: `Assessment for ${deleteDialog.name} has been removed.`,
      });
      setDeleteDialog(null);
    } catch (err) {
      toast({
        title: UI_TOASTS.ERROR.GENERIC,
        description: err instanceof Error ? err.message : UI_TOASTS.ERROR.FAILED_TO_DELETE,
        variant: "destructive",
      });
    }
  };

  const handleViewHistory = async (clientName: string) => {
    if (!user || !readOrgId) return;
    setClientHistoryDialog(clientName);
    setLoadingHistory(true);
    try {
      const [snapshots, summaries] = await Promise.all([
        getClientAssessmentHistory(user.uid, clientName, readOrgId, 50),
        getClientAssessments(user.uid, clientName, readOrgId, 1),
      ]);
      setClientHistory(snapshots);
      setClientSummaryId(summaries[0]?.id ?? null);
    } catch (err) {
      toast({
        title: UI_TOASTS.ERROR.GENERIC,
        description: UI_TOASTS.ERROR.FAILED_TO_LOAD,
        variant: "destructive",
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleEditSnapshot = (snapshot: AssessmentSnapshot) => {
    if (!clientHistoryDialog || !clientSummaryId) return;
    try {
      const rawType = snapshot.type;
      const editType =
        rawType?.startsWith('partial-')
          ? rawType
          : rawType === 'manual' || !rawType
            ? 'partial-strength'
            : rawType;
      const editPayload = {
        assessmentId: clientSummaryId,
        formData: snapshot.formData,
        snapshotId: snapshot.id ?? undefined,
        editType,
      };
      sessionStorage.setItem(STORAGE_KEYS.EDIT_ASSESSMENT, JSON.stringify(editPayload));
      if (editType.startsWith('partial-')) {
        const category = editType.replace('partial-', '');
        sessionStorage.setItem(STORAGE_KEYS.PARTIAL_ASSESSMENT, JSON.stringify({
          category,
          clientName: snapshot.formData?.fullName || clientHistoryDialog,
        }));
      }
    } catch (e) {
      logger.warn('Failed to set EDIT_ASSESSMENT', e);
    }
    setClientHistoryDialog(null);
    navigate(ROUTES.ASSESSMENT);
  };

  const handleDeleteSnapshot = async () => {
    if (!user || !deleteSnapshotDialog || !readOrgId) return;
    try {
      const result = await deleteSnapshot(
        user.uid,
        deleteSnapshotDialog.clientName,
        deleteSnapshotDialog.snapshotId,
        readOrgId,
      );
      if (result.success) {
        toast({ title: 'Snapshot removed', description: result.message });
        if (clientHistoryDialog === deleteSnapshotDialog.clientName) {
          const snapshots = await getClientAssessmentHistory(user.uid, deleteSnapshotDialog.clientName, readOrgId, 50);
          setClientHistory(snapshots);
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
    } finally {
      setDeleteSnapshotDialog(null);
    }
  };

  const handleNewAssessmentForClient = async (clientName: string, category?: string) => {
    if (!user) return;
    if (category) {
      sessionStorage.setItem(STORAGE_KEYS.PARTIAL_ASSESSMENT, JSON.stringify({ category, clientName }));
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.PARTIAL_ASSESSMENT);
    }
    // CRITICAL: Clear all previous assessment modes + draft to prevent data bleed
    sessionStorage.removeItem(STORAGE_KEYS.IS_DEMO);
    sessionStorage.removeItem(STORAGE_KEYS.PREFILL_CLIENT);
    sessionStorage.removeItem(STORAGE_KEYS.EDIT_ASSESSMENT);
    clearDraft();
    try {
      const history = await getClientAssessments(user.uid, clientName, readOrgId);
      if (history.length > 0) {
        const latest = await getCoachAssessment(user.uid, history[0].id, undefined, readOrgId, profile);
        if (latest?.formData) {
          sessionStorage.setItem(STORAGE_KEYS.PREFILL_CLIENT, JSON.stringify({
            clientName: latest.formData.fullName,
            dateOfBirth: latest.formData.dateOfBirth,
            email: latest.formData.email,
            phone: latest.formData.phone,
          }));
        }
      }
    } catch (e) {
      logger.error('Failed to pre-fill data:', e);
    }
    navigate('/assessment');
  };

  return {
    deleteDialog,
    setDeleteDialog,
    clientHistoryDialog,
    setClientHistoryDialog,
    clientHistory,
    clientSummaryId,
    loadingHistory,
    deleteSnapshotDialog,
    setDeleteSnapshotDialog,
    handleDelete,
    handleViewHistory,
    handleEditSnapshot,
    handleDeleteSnapshot,
    handleNewAssessmentForClient,
  };
}
