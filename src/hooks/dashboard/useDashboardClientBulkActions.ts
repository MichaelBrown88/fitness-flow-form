/**
 * Bulk pause/archive from the dashboard client table.
 * Writes use profile.organizationId (real org), not impersonation read scope.
 */

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/utils/logger';
import { batchArchiveClients, batchPauseClients } from '@/services/clientProfiles';
import { DASHBOARD_TASKS } from '@/constants/dashboardTasksCopy';
import type { UserProfile } from '@/types/auth';
import { UI_TOASTS } from '@/constants/ui';

interface UseDashboardClientBulkActionsOptions {
  writeOrganizationId: string | undefined;
  coachUid: string | undefined;
  profile: UserProfile | null | undefined;
  onSuccess?: () => void;
}

export function useDashboardClientBulkActions(options: UseDashboardClientBulkActionsOptions) {
  const { toast } = useToast();
  const [bulkBusy, setBulkBusy] = useState(false);
  const writeOrganizationId = options.writeOrganizationId;
  const coachUid = options.coachUid;
  const profile = options.profile;
  const onSuccess = options.onSuccess;

  const runPause = useCallback(
    async (clientSlugs: string[]) => {
      const orgId = writeOrganizationId;
      const uid = coachUid;
      if (!orgId || !uid || clientSlugs.length === 0) return;
      setBulkBusy(true);
      try {
        await batchPauseClients({
          organizationId: orgId,
          clientSlugs,
          pausedBy: uid,
          profile: profile ?? null,
        });
        toast({
          title: DASHBOARD_TASKS.BULK_TOAST_PAUSED_TITLE,
          description: DASHBOARD_TASKS.BULK_SUCCESS_PAUSED_DESC(clientSlugs.length),
        });
        onSuccess?.();
      } catch (err) {
        logger.error('Bulk pause failed', orgId, clientSlugs.length, err);
        toast({
          title: UI_TOASTS.ERROR.GENERIC,
          description: DASHBOARD_TASKS.BULK_ERROR,
          variant: 'destructive',
        });
        throw err;
      } finally {
        setBulkBusy(false);
      }
    },
    [coachUid, onSuccess, profile, toast, writeOrganizationId],
  );

  const runArchive = useCallback(
    async (clientSlugs: string[], clientNames?: string[]) => {
      const orgId = writeOrganizationId;
      const uid = coachUid;
      if (!orgId || !uid || clientSlugs.length === 0) return;
      setBulkBusy(true);
      try {
        await batchArchiveClients({
          organizationId: orgId,
          clientSlugs,
          archivedBy: uid,
          profile: profile ?? null,
          clientNames,
        });
        toast({
          title: DASHBOARD_TASKS.BULK_TOAST_ARCHIVED_TITLE,
          description: DASHBOARD_TASKS.BULK_SUCCESS_ARCHIVED_DESC(clientSlugs.length),
        });
        onSuccess?.();
      } catch (err) {
        logger.error('Bulk archive failed', orgId, clientSlugs.length, err);
        toast({
          title: UI_TOASTS.ERROR.GENERIC,
          description: DASHBOARD_TASKS.BULK_ERROR,
          variant: 'destructive',
        });
        throw err;
      } finally {
        setBulkBusy(false);
      }
    },
    [coachUid, onSuccess, profile, toast, writeOrganizationId],
  );

  return { bulkBusy, runPause, runArchive };
}
