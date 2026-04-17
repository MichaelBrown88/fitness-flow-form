/**
 * Floating bulk action bar + confirm dialogs for UnifiedClientTable.
 */

import React, { useMemo, useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { Pause, Archive, ArrowRightLeft, X, Loader2, Trash2 } from 'lucide-react';
import type { ClientGroup } from '@/hooks/dashboard/types';
import { clientSlugFromName } from '@/lib/database/paths';
import { useDashboardClientBulkActions } from '@/hooks/dashboard/useDashboardClientBulkActions';
import { DASHBOARD_TASKS } from '@/constants/dashboardTasksCopy';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/types/auth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface ClientTableBulkActionsProps {
  selected: Set<string>;
  clients: ClientGroup[];
  onClearSelection: () => void;
  writeOrganizationId?: string;
  coachUid?: string;
  profile?: UserProfile | null;
  onBulkComplete?: () => void;
  navigate: NavigateFunction;
}

export function ClientTableBulkActions({
  selected,
  clients,
  onClearSelection,
  writeOrganizationId,
  coachUid,
  profile,
  onBulkComplete,
  navigate,
}: ClientTableBulkActionsProps) {
  const { toast } = useToast();
  const [confirm, setConfirm] = useState<'pause' | 'archive' | 'delete' | null>(null);

  const bulkEnabled = Boolean(writeOrganizationId && coachUid);
  const { bulkBusy, runPause, runArchive } = useDashboardClientBulkActions({
    writeOrganizationId,
    coachUid,
    profile,
    onSuccess: onBulkComplete,
  });

  const selectedGroups = useMemo(() => {
    const byId = new Map(clients.map((c) => [c.id, c]));
    return [...selected]
      .map((id) => byId.get(id))
      .filter((c): c is ClientGroup => Boolean(c));
  }, [selected, clients]);

  const pauseSlugs = useMemo(
    () =>
      selectedGroups
        .filter((c) => c.clientStatus !== 'paused' && c.clientStatus !== 'archived' && c.clientStatus !== 'deleted')
        .map((c) => clientSlugFromName(c.name)),
    [selectedGroups],
  );

  const archiveClients = useMemo(
    () =>
      selectedGroups.filter((c) => c.clientStatus !== 'archived'),
    [selectedGroups],
  );
  const archiveSlugs = useMemo(
    () => archiveClients.map((c) => clientSlugFromName(c.name)),
    [archiveClients],
  );
  const archiveNames = useMemo(
    () => archiveClients.map((c) => c.name),
    [archiveClients],
  );

  if (selected.size === 0) return null;

  const handlePauseClick = () => {
    if (!bulkEnabled) return;
    if (pauseSlugs.length === 0) {
      toast({ description: DASHBOARD_TASKS.BULK_NONE_ELIGIBLE_PAUSE });
      return;
    }
    setConfirm('pause');
  };

  const handleArchiveClick = () => {
    if (!bulkEnabled) return;
    if (archiveSlugs.length === 0) {
      toast({ description: DASHBOARD_TASKS.BULK_NONE_ELIGIBLE_ARCHIVE });
      return;
    }
    setConfirm('archive');
  };

  const handleDeleteClick = () => {
    if (!bulkEnabled) return;
    if (selectedGroups.length === 0) return;
    setConfirm('delete');
  };

  const confirmDelete = () => {
    void (async () => {
      try {
        const { deleteClientPermanently, deleteClientByDocId, generateClientSlug } = await import('@/services/clientProfiles');
        for (const client of selectedGroups) {
          try {
            await deleteClientPermanently({
              organizationId: writeOrganizationId!,
              clientSlug: generateClientSlug(client.name),
              clientName: client.name,
              deletedBy: coachUid!,
              knownAssessmentId: client.assessments[0]?.id,
            });
          } catch {
            const slug = generateClientSlug(client.name);
            await deleteClientByDocId(writeOrganizationId!, slug, coachUid!).catch(() => {
              if (client.id && client.id !== slug) {
                return deleteClientByDocId(writeOrganizationId!, client.id, coachUid!);
              }
            });
          }
        }
        toast({ title: 'Deleted', description: `${selectedGroups.length} client${selectedGroups.length !== 1 ? 's' : ''} moved to trash. You can restore within 30 days.` });
        setConfirm(null);
        onClearSelection();
        onBulkComplete?.();
      } catch (err) {
        toast({ title: 'Delete failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
      }
    })();
  };

  const handleTransferClick = () => {
    if (selectedGroups.length !== 1) {
      toast({ description: DASHBOARD_TASKS.BULK_TRANSFER_ONE_AT_A_TIME });
      return;
    }
    navigate(`/client/${encodeURIComponent(selectedGroups[0].name)}?transfer=true`);
    onClearSelection();
  };

  const confirmPause = () => {
    void (async () => {
      try {
        await runPause(pauseSlugs);
        setConfirm(null);
        onClearSelection();
      } catch {
        /* toast in hook */
      }
    })();
  };

  const confirmArchive = () => {
    void (async () => {
      try {
        await runArchive(archiveSlugs, archiveNames);
        setConfirm(null);
        onClearSelection();
      } catch {
        /* toast in hook */
      }
    })();
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background rounded-xl shadow-2xl px-4 py-3 flex flex-wrap items-center gap-3 sm:gap-4 max-w-[calc(100vw-1.5rem)] animate-in slide-in-from-bottom-4 duration-200">
        <span className="text-xs font-bold whitespace-nowrap">{selected.size} selected</span>
        <div className="h-4 w-px bg-background/25 hidden sm:block" aria-hidden />
        {bulkBusy ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-label="Working" />
        ) : null}
        <button
          type="button"
          disabled={!bulkEnabled || bulkBusy}
          onClick={handlePauseClick}
          className="flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-background/90 hover:text-background transition-colors disabled:opacity-50"
        >
          <Pause className="h-3.5 w-3.5 shrink-0" />
          Pause
        </button>
        <button
          type="button"
          disabled={!bulkEnabled || bulkBusy}
          onClick={handleArchiveClick}
          className="flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-background/90 hover:text-background transition-colors disabled:opacity-50"
        >
          <Archive className="h-3.5 w-3.5 shrink-0" />
          Archive
        </button>
        <button
          type="button"
          disabled={bulkBusy}
          onClick={handleTransferClick}
          className="flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-background/90 hover:text-background transition-colors disabled:opacity-50"
        >
          <ArrowRightLeft className="h-3.5 w-3.5 shrink-0" />
          Transfer
        </button>
        <button
          type="button"
          disabled={!bulkEnabled || bulkBusy}
          onClick={handleDeleteClick}
          className="flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5 shrink-0" />
          Delete
        </button>
        <div className="h-4 w-px bg-background/25 hidden sm:block" aria-hidden />
        <button
          type="button"
          disabled={bulkBusy}
          onClick={onClearSelection}
          className="text-background/50 hover:text-background transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Clear selection"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <AlertDialog open={confirm === 'pause'} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{DASHBOARD_TASKS.BULK_PAUSE_TITLE(pauseSlugs.length)}</AlertDialogTitle>
            <AlertDialogDescription>{DASHBOARD_TASKS.BULK_PAUSE_DESCRIPTION}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkBusy}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={(e) => {
                e.preventDefault();
                confirmPause();
              }}
            >
              {bulkBusy ? 'Working…' : 'Pause clients'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirm === 'archive'} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{DASHBOARD_TASKS.BULK_ARCHIVE_TITLE(archiveSlugs.length)}</AlertDialogTitle>
            <AlertDialogDescription>{DASHBOARD_TASKS.BULK_ARCHIVE_DESCRIPTION}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                confirmArchive();
              }}
            >
              {bulkBusy ? 'Working…' : 'Archive clients'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={confirm === 'delete'} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Delete {selectedGroups.length} client{selectedGroups.length !== 1 ? 's' : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Deleted clients are moved to trash and can be restored within 30 days. After that, all data including assessments, history, and reports will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              {bulkBusy ? 'Deleting…' : 'Delete permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
