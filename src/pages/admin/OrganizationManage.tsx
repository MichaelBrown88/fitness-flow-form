/**
 * Organization Management Page
 *
 * Platform admin page to manage individual organizations.
 * Presentational panels live in `./organization-manage/OrganizationManagePanels.tsx`.
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrgManagement } from '@/hooks/useOrgManagement';
import { useAuth } from '@/hooks/useAuth';
import {
  LoadingState,
  NotFoundState,
  Header,
  OrganizationDetailsCard,
  SubscriptionCard,
  DataAccessCard,
  StatisticsCard,
  PlatformFeaturesCard,
  ActionsCard,
  GrantAccessDialog,
  RevokeAccessDialog,
  DeleteDialog,
  PermanentlyDeleteDialog,
  PauseDialog,
  ImpersonateDialog,
} from './organization-manage/OrganizationManagePanels';

const OrganizationManage = () => {
  const navigate = useNavigate();
  const { orgId } = useParams<{ orgId: string }>();
  const { startImpersonation, impersonation } = useAuth();

  const [showImpersonateDialog, setShowImpersonateDialog] = useState(false);
  const [impersonateReason, setImpersonateReason] = useState('');
  const [impersonating, setImpersonating] = useState(false);

  const {
    org,
    loading,
    editing,
    saving,
    showDeleteDialog,
    showPauseDialog,
    deleteConfirmText,
    showGrantAccessDialog,
    showRevokeAccessDialog,
    showPermanentlyDeleteDialog,
    permanentlyDeleteConfirmText,
    accessReason,
    hasDataAccess,
    setOrg,
    setEditing,
    setShowDeleteDialog,
    setShowPauseDialog,
    setDeleteConfirmText,
    setShowGrantAccessDialog,
    setShowRevokeAccessDialog,
    setShowPermanentlyDeleteDialog,
    setPermanentlyDeleteConfirmText,
    setAccessReason,
    handleSignOut,
    handleSave,
    handleDelete,
    handlePause,
    handleCancel,
    handleReactivate,
    handleGrantAccess,
    handleRevokeAccess,
    handleUpdateDemoAutoFill,
    handlePermanentlyDelete,
  } = useOrgManagement(orgId);

  const handleStartImpersonation = async () => {
    if (!org || !orgId) return;

    setImpersonating(true);
    try {
      await startImpersonation(orgId, org.name || 'Unknown Org', impersonateReason || undefined);
      setShowImpersonateDialog(false);
      setImpersonateReason('');
      navigate('/dashboard');
    } catch (error) {
      alert(`Failed to start impersonation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setImpersonating(false);
    }
  };

  if (loading) return <LoadingState />;
  if (!org) return <NotFoundState onBack={() => navigate('/admin')} />;

  return (
    <div className="min-h-screen bg-background">
      <Header
        org={org}
        onBack={() => navigate('/admin')}
        onSignOut={handleSignOut}
        onImpersonate={() => setShowImpersonateDialog(true)}
        isImpersonating={!!impersonation}
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <OrganizationDetailsCard
              org={org}
              editing={editing}
              saving={saving}
              setOrg={setOrg}
              setEditing={setEditing}
              onSave={handleSave}
            />
          </div>

          <div className="space-y-6">
            <SubscriptionCard org={org} editing={editing} saving={saving} setOrg={setOrg} />

            <DataAccessCard
              org={org}
              hasDataAccess={hasDataAccess}
              onGrantAccess={() => setShowGrantAccessDialog(true)}
              onRevokeAccess={() => setShowRevokeAccessDialog(true)}
            />

            <StatisticsCard org={org} hasDataAccess={hasDataAccess} />

            <PlatformFeaturesCard
              org={org}
              saving={saving}
              onUpdateDemoAutoFill={handleUpdateDemoAutoFill}
            />

            <ActionsCard
              org={org}
              onPause={() => setShowPauseDialog(true)}
              onCancel={handleCancel}
              onReactivate={handleReactivate}
              onDelete={() => setShowDeleteDialog(true)}
              onPermanentlyDelete={() => setShowPermanentlyDeleteDialog(true)}
              onImpersonate={() => setShowImpersonateDialog(true)}
              isImpersonating={!!impersonation}
            />
          </div>
        </div>
      </main>

      <GrantAccessDialog
        open={showGrantAccessDialog}
        onOpenChange={setShowGrantAccessDialog}
        accessReason={accessReason}
        setAccessReason={setAccessReason}
        onGrant={handleGrantAccess}
      />

      <RevokeAccessDialog
        open={showRevokeAccessDialog}
        onOpenChange={setShowRevokeAccessDialog}
        onRevoke={handleRevokeAccess}
      />

      <DeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        orgName={org.name || ''}
        confirmText={deleteConfirmText}
        setConfirmText={setDeleteConfirmText}
        onDelete={handleDelete}
      />

      <PermanentlyDeleteDialog
        open={showPermanentlyDeleteDialog}
        onOpenChange={setShowPermanentlyDeleteDialog}
        confirmText={permanentlyDeleteConfirmText}
        setConfirmText={setPermanentlyDeleteConfirmText}
        onDelete={handlePermanentlyDelete}
      />

      <PauseDialog open={showPauseDialog} onOpenChange={setShowPauseDialog} onPause={handlePause} />

      <ImpersonateDialog
        open={showImpersonateDialog}
        onOpenChange={setShowImpersonateDialog}
        orgName={org.name || 'Organization'}
        reason={impersonateReason}
        setReason={setImpersonateReason}
        onImpersonate={handleStartImpersonation}
        loading={impersonating}
      />
    </div>
  );
};

export default OrganizationManage;
