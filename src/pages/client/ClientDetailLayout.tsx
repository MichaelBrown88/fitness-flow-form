/**
 * Client detail layout: shared data, breadcrumb, tabs (Overview | Client Report | Timeline | Settings), Outlet, and dialogs.
 */

import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useSearchParams, Outlet, useLocation } from 'react-router-dom';
import { Seo } from '@/components/seo/Seo';
import { WorkspaceBreadcrumb } from '@/components/dashboard/WorkspaceBreadcrumb';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import { UI_CLIENT_DETAIL } from '@/constants/ui';
import { getAppShellSeoForPathname } from '@/constants/seo';
import { UI_COMMAND_MENU } from '@/constants/ui';
import { useClientDetail } from '@/hooks/useClientDetail';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeft,
  UserPlus,
  MoreVertical,
  Settings as SettingsIcon,
  Trash2,
  Loader2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { TransferClientDialog } from '@/components/client/TransferClientDialog';
import { PauseClientDialog } from '@/components/client/PauseClientDialog';
import { ArchiveClientDialog } from '@/components/client/ArchiveClientDialog';
import type { UseClientDetailResult } from '@/hooks/useClientDetail';

export type ClientDetailOutletContext = UseClientDetailResult;

function buildClientPath(name: string, sub?: string): string {
  const base = `/dashboard/clients/${encodeURIComponent(name)}`;
  return sub ? `${base}/${sub}` : base;
}

/** DOM id of the slot inside the nav row where tab pages portal their actions. */
export const TAB_ACTIONS_SLOT_ID = 'client-tab-actions';

export default function ClientDetailLayout() {
  const { profile: authProfile } = useAuth();
  const clientData = useClientDetail();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [transferOpen, setTransferOpen] = useState(false);
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [deleteClientOpen, setDeleteClientOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const deleteInputRef = useRef<HTMLInputElement>(null);

  const {
    clientName,
    displayClientName,
    user,
    loading,
    profile,
    assessments,
    incompleteDraft,
    handleFinishAssessment,
    handleDiscardDraft,
    handleNewAssessment,
    navigateBack,
    deleteDialog,
    setDeleteDialog,
    deleteSnapshotDialog,
    setDeleteSnapshotDialog,
    handleDeleteAssessment,
    handleDeleteSnapshot,
    handleTransferClient,
    handlePauseClient,
    handleUnpauseClient,
    handleArchiveClient,
    handleReactivateClient,
    handleDeleteClientPermanently,
  } = clientData;

  const isPaused = profile?.status === 'paused';
  const isArchived = profile?.status === 'archived';

  useEffect(() => {
    if (!loading && clientName) {
      const edit = searchParams.get('edit');
      const transfer = searchParams.get('transfer');
      const next = new URLSearchParams(searchParams);
      let updated = false;
      if (edit === 'true') {
        navigate(buildClientPath(clientName, 'settings'), { replace: true });
        next.delete('edit');
        updated = true;
      }
      if (transfer === 'true') {
        setTransferOpen(true);
        next.delete('transfer');
        updated = true;
      }
      if (updated) {
        setSearchParams(next, { replace: true });
      }
    }
  }, [loading, clientName, searchParams, setSearchParams, setTransferOpen, navigate]);

  // Reset scroll position when navigating between client sub-tabs or to a new client
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const seoPath = location.pathname.split('?')[0];
  const clientSeoMeta = getAppShellSeoForPathname(location.pathname, {
    clientDisplayName: displayClientName,
  });

  if (!user) {
    const bootMeta = getAppShellSeoForPathname(location.pathname);
    return (
      <>
        <Seo pathname={seoPath} title={bootMeta.title} description={bootMeta.description} noindex={bootMeta.noindex} />
        <div className="flex min-h-screen items-center justify-center text-sm text-foreground-secondary">
          Loading…
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Seo pathname={seoPath} title={clientSeoMeta.title} description={clientSeoMeta.description} noindex={clientSeoMeta.noindex} />
        <div className="mx-auto flex w-full min-h-0 flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            Loading client data…
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo pathname={seoPath} title={clientSeoMeta.title} description={clientSeoMeta.description} noindex={clientSeoMeta.noindex} />
    <div className="mx-auto flex w-full min-h-0 flex-1 flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <WorkspaceBreadcrumb
        current={displayClientName}
        trail={[UI_COMMAND_MENU.CLIENTS]}
      />

      {/* In-progress notice — only shown on the Overview tab. The Report
          tab is a read-only surface and doesn't need this nudge; coaches
          will see it when they return to the client profile. */}
      {incompleteDraft && location.pathname === buildClientPath(clientName) && (
        <div className="flex items-center justify-between gap-3 rounded-full border border-score-amber-fg/20 bg-score-amber-muted/40 py-1.5 pl-4 pr-1.5">
          <p className="text-[13px] font-medium text-score-amber-fg">
            Assessment in progress — resume to complete the report.
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDiscardDraft}
              className="h-7 rounded-full px-3 text-[12px] font-medium text-score-amber-fg hover:bg-score-amber-muted/60"
            >
              Discard
            </Button>
            <Button
              size="sm"
              onClick={handleFinishAssessment}
              className="h-7 rounded-full px-3 text-[12px] font-semibold"
            >
              Finish
            </Button>
          </div>
        </div>
      )}

      {/* Tabs + Manage menu on a single row. The duplicate page-title h1
          ("Michael Brown") is gone — the breadcrumb above and the
          report hero card below are the only two name surfaces.
          The Manage button replaces the previous "More" label so it
          doesn't clash with the "More" tab dropdown. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex w-fit items-center gap-1 rounded-lg bg-muted p-1">
        <NavLink
          to={buildClientPath(clientName)}
          end
          className={({ isActive }) =>
            `px-3 py-2 text-sm font-bold rounded-lg ${isActive ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground-secondary'}`
          }
        >
          {UI_CLIENT_DETAIL.TAB_SUMMARY}
        </NavLink>
        <NavLink
          to={buildClientPath(clientName, 'report')}
          className={({ isActive }) =>
            `px-3 py-2 text-sm font-bold rounded-lg ${isActive ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground-secondary'}`
          }
        >
          {UI_CLIENT_DETAIL.TAB_REPORT}
        </NavLink>
        <NavLink
          to={buildClientPath(clientName, 'timeline')}
          className={({ isActive }) =>
            `px-3 py-2 text-sm font-bold rounded-lg ${isActive ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground-secondary'}`
          }
        >
          {UI_CLIENT_DETAIL.TAB_TIMELINE}
        </NavLink>
        </nav>

        <div className="flex items-center gap-2">
          {/* Tab-injected actions (e.g. Share on the Report tab) render
              here via a portal — keeps tab-specific state inside the
              tab page while letting it appear on the layout's nav row. */}
          <div id={TAB_ACTIONS_SLOT_ID} className="flex items-center gap-2" />

          {/* Client management menu. */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-9 shrink-0 gap-1.5 rounded-full px-3.5"
                aria-label={UI_CLIENT_DETAIL.HEADER_ACTIONS_MENU_ARIA}
              >
                <MoreVertical className="h-4 w-4" />
                Manage
              </Button>
            </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-lg">
            <DropdownMenuItem onClick={() => handleNewAssessment()} className="py-3 text-sm font-medium">
              <UserPlus className="mr-2 h-4 w-4" />
              Full assessment
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={buildClientPath(clientName, 'settings')} className="py-3 text-sm font-medium">
                <SettingsIcon className="mr-2 h-4 w-4" />
                Edit Profile
              </Link>
            </DropdownMenuItem>
            {(authProfile?.role === 'org_admin' || profile?.assignedCoachUid === user?.uid) && (
              <DropdownMenuItem onClick={() => setTransferOpen(true)} className="py-3 text-sm font-medium">
                Transfer Client
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setPauseDialogOpen(true)} className="py-3 text-sm font-medium">
              {isPaused ? 'Unpause account' : 'Pause account'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setArchiveDialogOpen(true)} className="py-3 text-sm font-medium">
              {isArchived ? 'Reactivate client' : 'Archive client'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => { setDeleteConfirmName(''); setDeleteClientOpen(true); }}
              className="py-3 text-sm font-medium text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete permanently
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>

      <Outlet context={clientData satisfies ClientDetailOutletContext} />

      <Dialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Assessment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the assessment from {deleteDialog?.date}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteDialog && handleDeleteAssessment(deleteDialog.id)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteSnapshotDialog} onOpenChange={(open) => !open && setDeleteSnapshotDialog(null)}>
        <DialogContent className="max-w-[90vw] rounded-lg sm:max-w-[425px]">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl font-bold tracking-tight">Remove snapshot</DialogTitle>
            <DialogDescription className="text-sm font-medium text-muted-foreground pt-2">
              Remove this assessment snapshot from history? If it was the latest, current will be restored from the previous snapshot.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 mt-6">
            <Button variant="outline" onClick={() => setDeleteSnapshotDialog(null)} className="h-11 flex-1 rounded-lg font-bold">Cancel</Button>
            <Button variant="destructive" onClick={() => void handleDeleteSnapshot()} className="h-11 flex-1 rounded-lg font-bold">Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {clientName && user && authProfile?.organizationId && (
        <TransferClientDialog
          open={transferOpen}
          onOpenChange={setTransferOpen}
          clientName={clientName}
          currentCoachUid={profile?.assignedCoachUid ?? user.uid}
          organizationId={authProfile.organizationId}
          onConfirm={handleTransferClient}
        />
      )}

      <PauseClientDialog
        open={pauseDialogOpen}
        onOpenChange={setPauseDialogOpen}
        clientName={clientName}
        isPaused={isPaused}
        onPause={handlePauseClient}
        onUnpause={handleUnpauseClient}
      />
      <ArchiveClientDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        clientName={clientName}
        isArchived={isArchived}
        onArchive={handleArchiveClient}
        onReactivate={handleReactivateClient}
      />

      <Dialog
        open={deleteClientOpen}
        onOpenChange={(open) => { if (!deleting) { setDeleteClientOpen(open); setDeleteConfirmName(''); } }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Permanently Delete {displayClientName}?
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-2">
              <span className="block">
                This will permanently delete <strong>{displayClientName}</strong> and remove all their data — assessments, history, snapshots, and reports. This cannot be undone.
              </span>
              <span className="block mt-2 font-medium text-foreground-secondary">
                Type <strong>{displayClientName}</strong> to confirm:
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              ref={deleteInputRef}
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder={displayClientName}
              className="rounded-lg"
              disabled={deleting}
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteClientOpen(false)} disabled={deleting} className="h-11 rounded-lg px-6 font-bold">
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmName.trim() !== displayClientName.trim() || deleting}
              className="h-11 rounded-lg px-6 font-bold"
              onClick={async () => {
                setDeleting(true);
                try {
                  await handleDeleteClientPermanently();
                  setDeleteClientOpen(false);
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? 'Deleting…' : 'Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
