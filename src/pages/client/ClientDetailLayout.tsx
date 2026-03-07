/**
 * Client detail layout: shared data, breadcrumb, tabs (Overview | Client Report | Roadmap | Achievements | Coaches Report | History | Settings), Outlet, and dialogs.
 */

import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useSearchParams, Outlet } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import { useClientDetail } from '@/hooks/useClientDetail';
import { useAuth } from '@/hooks/useAuth';
import { getRoadmapForClient } from '@/services/roadmaps';
import {
  ArrowLeft,
  UserPlus,
  MoreVertical,
  History,
  Map,
  Settings as SettingsIcon,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { TransferClientDialog } from '@/components/client/TransferClientDialog';
import { PauseClientDialog } from '@/components/client/PauseClientDialog';
import { ArchiveClientDialog } from '@/components/client/ArchiveClientDialog';
import type { UseClientDetailResult } from '@/hooks/useClientDetail';

export type ClientDetailOutletContext = UseClientDetailResult & {
  roadmapStatus: 'loading' | 'none' | 'draft' | 'sent';
};

function buildClientPath(name: string, sub?: string): string {
  const base = `/client/${encodeURIComponent(name)}`;
  return sub ? `${base}/${sub}` : base;
}

export default function ClientDetailLayout() {
  const { profile: authProfile } = useAuth();
  const clientData = useClientDetail();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [transferOpen, setTransferOpen] = useState(false);
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  const {
    clientName,
    user,
    loading,
    profile,
    assessments,
    incompleteDraft,
    handleFinishAssessment,
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
  } = clientData;

  const isPaused = profile?.status === 'paused';
  const isArchived = profile?.status === 'archived';
  const [roadmapStatus, setRoadmapStatus] = useState<'loading' | 'none' | 'draft' | 'sent'>('loading');
  const { effectiveOrgId } = useAuth();

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

  useEffect(() => {
    if (!effectiveOrgId || !clientName) return;
    let cancelled = false;
    getRoadmapForClient(effectiveOrgId, clientName)
      .then((doc) => {
        if (cancelled) return;
        if (!doc) setRoadmapStatus('none');
        else if (doc.shareToken) setRoadmapStatus('sent');
        else setRoadmapStatus('draft');
      })
      .catch(() => {
        if (!cancelled) setRoadmapStatus('none');
      });
    return () => { cancelled = true; };
  }, [effectiveOrgId, clientName]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">
        Loading…
      </div>
    );
  }

  if (loading) {
    return (
      <AppShell title={clientName}>
        <div className="py-10 text-sm text-slate-600">Loading client data…</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={clientName}
      hideTitle
      actions={
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={navigateBack} className="h-9 w-9 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl">
              <DropdownMenuItem onClick={() => handleNewAssessment()} className="py-3 text-sm font-medium">
                <UserPlus className="mr-2 h-4 w-4" />
                New Assessment
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
              <DropdownMenuItem onClick={() => setPauseDialogOpen(true)} className="py-3 text-sm font-medium">
                {isPaused ? 'Unpause Account' : 'Pause Account'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setArchiveDialogOpen(true)} className="py-3 text-sm font-medium">
                {isArchived ? 'Reactivate Client' : 'Archive Client'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    >
      <Breadcrumb items={[{ label: 'Dashboard', href: ROUTES.DASHBOARD }, { label: clientName }]} />

      {incompleteDraft && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-amber-900">
            This client has an incomplete assessment saved. Finish it to update their live report.
          </p>
          <Button
            size="sm"
            onClick={handleFinishAssessment}
            className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white rounded-lg"
          >
            Finish assessment
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900 truncate">
          {clientName}
        </h1>
      </div>

      <nav className="flex flex-wrap items-center gap-1 mb-6 p-1 bg-slate-100 rounded-xl w-fit">
        <NavLink
          to={buildClientPath(clientName)}
          end
          className={({ isActive }) =>
            `px-3 py-2 text-sm font-bold rounded-lg ${isActive ? 'bg-white text-slate-900' : 'text-slate-500 hover:text-slate-700'}`
          }
        >
          Overview
        </NavLink>
        <NavLink
          to={buildClientPath(clientName, 'report')}
          className={({ isActive }) =>
            `px-3 py-2 text-sm font-bold rounded-lg ${isActive ? 'bg-white text-slate-900' : 'text-slate-500 hover:text-slate-700'}`
          }
        >
          Client Report
        </NavLink>
        <NavLink
          to={buildClientPath(clientName, 'roadmap')}
          className={({ isActive }) =>
            `px-3 py-2 text-sm font-bold rounded-lg ${isActive ? 'bg-white text-slate-900' : 'text-slate-500 hover:text-slate-700'}`
          }
        >
          Roadmap
        </NavLink>
        <NavLink
          to={buildClientPath(clientName, 'achievements')}
          className={({ isActive }) =>
            `px-3 py-2 text-sm font-bold rounded-lg ${isActive ? 'bg-white text-slate-900' : 'text-slate-500 hover:text-slate-700'}`
          }
        >
          Achievements
        </NavLink>
        <NavLink
          to={buildClientPath(clientName, 'coaches-report')}
          className={({ isActive }) =>
            `px-3 py-2 text-sm font-bold rounded-lg ${isActive ? 'bg-white text-slate-900' : 'text-slate-500 hover:text-slate-700'}`
          }
        >
          Coaches Report
        </NavLink>
        <NavLink
          to={buildClientPath(clientName, 'history')}
          className={({ isActive }) =>
            `px-3 py-2 text-sm font-bold rounded-lg ${isActive ? 'bg-white text-slate-900' : 'text-slate-500 hover:text-slate-700'}`
          }
        >
          History
        </NavLink>
        <NavLink
          to={buildClientPath(clientName, 'settings')}
          className={({ isActive }) =>
            `px-3 py-2 text-sm font-bold rounded-lg ${isActive ? 'bg-white text-slate-900' : 'text-slate-500 hover:text-slate-700'}`
          }
        >
          Settings
        </NavLink>
      </nav>

      <Outlet context={{ ...clientData, roadmapStatus } satisfies ClientDetailOutletContext} />

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
        <DialogContent className="rounded-2xl max-w-[90vw] sm:max-w-[425px]">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl font-bold tracking-tight">Remove snapshot</DialogTitle>
            <DialogDescription className="text-sm font-medium text-slate-500 pt-2">
              Remove this assessment snapshot from history? If it was the latest, current will be restored from the previous snapshot.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 mt-6">
            <Button variant="outline" onClick={() => setDeleteSnapshotDialog(null)} className="flex-1 rounded-xl font-bold h-11">Cancel</Button>
            <Button variant="destructive" onClick={() => void handleDeleteSnapshot()} className="flex-1 rounded-xl font-bold h-11">Remove</Button>
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
    </AppShell>
  );
}
