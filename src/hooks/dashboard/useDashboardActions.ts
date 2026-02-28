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
import { STORAGE_KEYS } from '@/constants/storageKeys';
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
  const [clientHistory, setClientHistory] = useState<CoachAssessmentSummary[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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
    if (!user) return;
    setClientHistoryDialog(clientName);
    setLoadingHistory(true);
    try {
      const history = await getClientAssessments(user.uid, clientName, readOrgId);
      setClientHistory(history);
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
    loadingHistory,
    handleDelete,
    handleViewHistory,
    handleNewAssessmentForClient,
  };
}
