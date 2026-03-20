/**
 * useOrgManagement Hook
 * 
 * Extracted from OrganizationManage.tsx to separate logic from UI.
 * Handles all state management, data fetching, and handlers for the
 * organization management page.
 */

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirebaseAuth } from '@/services/firebase';
import { 
  getPlatformAdmin, 
  getOrganizationDetails,
  updateOrganizationDetails,
  callDeleteOrganization,
  pauseSubscription,
  cancelSubscription,
  reactivateSubscription,
  grantDataAccess,
  revokeDataAccess,
} from '@/services/platformAdmin';
import { logAdminAction } from '@/services/platform/auditLog';
import type { PlatformAdmin, OrganizationDetails } from '@/types/platform';
import { logger } from '@/lib/utils/logger';

export interface UseOrgManagementResult {
  // State
  admin: PlatformAdmin | null;
  org: OrganizationDetails | null;
  loading: boolean;
  editing: boolean;
  saving: boolean;
  showDeleteDialog: boolean;
  showPauseDialog: boolean;
  deleteConfirmText: string;
  showGrantAccessDialog: boolean;
  showRevokeAccessDialog: boolean;
  accessReason: string;
  hasDataAccess: boolean;

  // Setters for UI-controlled state
  setOrg: React.Dispatch<React.SetStateAction<OrganizationDetails | null>>;
  setEditing: React.Dispatch<React.SetStateAction<boolean>>;
  setShowDeleteDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPauseDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setDeleteConfirmText: React.Dispatch<React.SetStateAction<string>>;
  setShowGrantAccessDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setShowRevokeAccessDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPermanentlyDeleteDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setPermanentlyDeleteConfirmText: React.Dispatch<React.SetStateAction<string>>;
  setAccessReason: React.Dispatch<React.SetStateAction<string>>;

  // Handlers
  handleSignOut: () => Promise<void>;
  handleSave: () => Promise<void>;
  handleDelete: () => Promise<void>;
  handlePause: () => Promise<void>;
  handleCancel: () => Promise<void>;
  handleReactivate: () => Promise<void>;
  handleGrantAccess: () => Promise<void>;
  handleRevokeAccess: () => Promise<void>;
  handleUpdateDemoAutoFill: (enabled: boolean) => Promise<void>;
  handlePermanentlyDelete: () => Promise<void>;
}

export function useOrgManagement(orgId: string | undefined): UseOrgManagementResult {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Core state
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null);
  const [org, setOrg] = useState<OrganizationDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // UI state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showGrantAccessDialog, setShowGrantAccessDialog] = useState(false);
  const [showRevokeAccessDialog, setShowRevokeAccessDialog] = useState(false);
  const [showPermanentlyDeleteDialog, setShowPermanentlyDeleteDialog] = useState(false);
  const [permanentlyDeleteConfirmText, setPermanentlyDeleteConfirmText] = useState('');
  const [accessReason, setAccessReason] = useState('');

  // Load organization details
  const loadOrganizationDetails = useCallback(async (id: string) => {
    try {
      const orgData = await getOrganizationDetails(id);
      setOrg(orgData);
    } catch (error) {
      logger.error('Failed to load organization details', 'ORG_MANAGE', error);
    }
  }, []);

  // Auth and initial load
  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/admin/login', { replace: true });
        return;
      }

      // Verify this user is a platform admin
      const adminData = await getPlatformAdmin(user.uid);
      if (!adminData) {
        logger.warn('User is not a platform admin', 'ORG_MANAGE', { email: user.email });
        await signOut(auth);
        navigate('/admin/login', { replace: true });
        return;
      }

      setAdmin(adminData);
      
      // Load organization details
      if (orgId) {
        await loadOrganizationDetails(orgId);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate, orgId, loadOrganizationDetails]);

  // Computed: Check if org has data access permission
  const hasDataAccess = org?.dataAccessPermission?.platformAdminAccess === true ||
                       org?.isComped === true;

  // Handlers
  const handleSignOut = useCallback(async () => {
    const auth = getFirebaseAuth();
    await signOut(auth);
    navigate('/admin/login', { replace: true });
  }, [navigate]);

  const handleSave = useCallback(async () => {
    if (!org || !orgId) return;
    
    setSaving(true);
    try {
      await updateOrganizationDetails(orgId, org);
      await loadOrganizationDetails(orgId);
      setEditing(false);
      toast({ title: 'Organization updated' });
    } catch (error) {
      logger.error('Failed to save organization details', 'ORG_MANAGE', error);
      toast({ title: 'Failed to save', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [org, orgId, loadOrganizationDetails, toast]);

  const handleDelete = useCallback(async () => {
    if (!orgId || deleteConfirmText !== org?.name || !admin) {
      return;
    }
    
    try {
      // Soft delete: mark org as deleted so it's hidden from dashboard
      await updateOrganizationDetails(orgId, {
        metadata: {
          ...org?.metadata,
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: admin.uid,
        },
      });
      if (admin.uid) {
        await logAdminAction(admin.uid, 'org_soft_delete', orgId, { reason: 'Platform admin action' });
      }
      toast({ title: 'Organization archived (soft deleted)' });
      navigate('/admin', { replace: true });
    } catch (error) {
      logger.error('Failed to delete organization', 'ORG_MANAGE', error);
      toast({ title: 'Failed to delete', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    }
  }, [orgId, deleteConfirmText, org?.name, org?.metadata, admin, navigate, toast]);

  const handlePause = useCallback(async () => {
    if (!orgId || !admin) return;
    
    try {
      await pauseSubscription(orgId, admin.uid);
      await loadOrganizationDetails(orgId);
      setShowPauseDialog(false);
      toast({ title: 'Subscription paused' });
    } catch (error) {
      logger.error('Failed to pause subscription', 'ORG_MANAGE', error);
      toast({ title: 'Failed to pause subscription', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    }
  }, [orgId, admin, loadOrganizationDetails, toast]);

  const handleCancel = useCallback(async () => {
    if (!orgId || !admin) return;
    
    try {
      await cancelSubscription(orgId, admin.uid);
      await loadOrganizationDetails(orgId);
      toast({ title: 'Subscription cancelled' });
    } catch (error) {
      logger.error('Failed to cancel subscription', 'ORG_MANAGE', error);
      toast({ title: 'Failed to cancel subscription', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    }
  }, [orgId, admin, loadOrganizationDetails, toast]);

  const handleReactivate = useCallback(async () => {
    if (!orgId || !admin) return;
    
    try {
      await reactivateSubscription(orgId, admin.uid);
      await loadOrganizationDetails(orgId);
      toast({ title: 'Subscription reactivated' });
    } catch (error) {
      logger.error('Failed to reactivate subscription', 'ORG_MANAGE', error);
      toast({ title: 'Failed to reactivate', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    }
  }, [orgId, admin, loadOrganizationDetails, toast]);

  const handleGrantAccess = useCallback(async () => {
    if (!orgId || !admin) return;
    
    try {
      await grantDataAccess(orgId, admin.uid, accessReason || undefined);
      await loadOrganizationDetails(orgId);
      setShowGrantAccessDialog(false);
      setAccessReason('');
      toast({ title: 'Data access granted' });
    } catch (error) {
      logger.error('Failed to grant data access', 'ORG_MANAGE', error);
      toast({ title: 'Failed to grant access', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    }
  }, [orgId, admin, accessReason, loadOrganizationDetails, toast]);

  const handleRevokeAccess = useCallback(async () => {
    if (!orgId || !admin) return;
    
    try {
      await revokeDataAccess(orgId, admin.uid);
      await loadOrganizationDetails(orgId);
      setShowRevokeAccessDialog(false);
      toast({ title: 'Data access revoked' });
    } catch (error) {
      logger.error('Failed to revoke data access', 'ORG_MANAGE', error);
      toast({ title: 'Failed to revoke access', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    }
  }, [orgId, admin, loadOrganizationDetails, toast]);

  const handleUpdateDemoAutoFill = useCallback(async (enabled: boolean) => {
    if (!orgId || !org || !admin) return;
    
    try {
      setSaving(true);
      await updateOrganizationDetails(orgId, { demoAutoFillEnabled: enabled });
      setOrg({ ...org, demoAutoFillEnabled: enabled });
      await logAdminAction(admin.uid, 'demo_autofill_toggle', orgId, { enabled });
      toast({ title: enabled ? 'Demo auto-fill enabled' : 'Demo auto-fill disabled' });
      logger.info(`Demo auto-fill ${enabled ? 'enabled' : 'disabled'}`, 'ORG_MANAGE', { orgId });
    } catch (error) {
      logger.error('Failed to update demo auto-fill', 'ORG_MANAGE', error);
      toast({ title: 'Failed to update demo auto-fill', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
      throw error;
    } finally {
      setSaving(false);
    }
  }, [orgId, org, admin, toast]);

  const handlePermanentlyDelete = useCallback(async () => {
    if (!orgId || permanentlyDeleteConfirmText !== 'PERMANENTLY DELETE' || !admin) return;
    try {
      await callDeleteOrganization(orgId, true);
      if (admin.uid) {
        await logAdminAction(admin.uid, 'org_permanent_delete', orgId, {});
      }
      toast({ title: 'Organization permanently deleted' });
      navigate('/admin', { replace: true });
    } catch (error) {
      logger.error('Failed to permanently delete organization', 'ORG_MANAGE', error);
      toast({ title: 'Failed to delete', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    }
  }, [orgId, permanentlyDeleteConfirmText, admin, navigate, toast]);

  return {
    // State
    admin,
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

    // Setters
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

    // Handlers
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
  };
}
