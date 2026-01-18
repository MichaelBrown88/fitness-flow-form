/**
 * useOrgManagement Hook
 * 
 * Extracted from OrganizationManage.tsx to separate logic from UI.
 * Handles all state management, data fetching, and handlers for the
 * organization management page.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirebaseAuth } from '@/services/firebase';
import { 
  getPlatformAdmin, 
  getOrganizationDetails,
  updateOrganizationDetails,
  deleteOrganization,
  pauseSubscription,
  cancelSubscription,
  reactivateSubscription,
  grantDataAccess,
  revokeDataAccess,
} from '@/services/platformAdmin';
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
}

export function useOrgManagement(orgId: string | undefined): UseOrgManagementResult {
  const navigate = useNavigate();

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
    } catch (error) {
      logger.error('Failed to save organization details', 'ORG_MANAGE', error);
    } finally {
      setSaving(false);
    }
  }, [org, orgId, loadOrganizationDetails]);

  const handleDelete = useCallback(async () => {
    if (!orgId || deleteConfirmText !== org?.name) {
      return;
    }
    
    try {
      await deleteOrganization(orgId);
      navigate('/admin', { replace: true });
    } catch (error) {
      logger.error('Failed to delete organization', 'ORG_MANAGE', error);
    }
  }, [orgId, deleteConfirmText, org?.name, navigate]);

  const handlePause = useCallback(async () => {
    if (!orgId) return;
    
    try {
      await pauseSubscription(orgId);
      await loadOrganizationDetails(orgId);
      setShowPauseDialog(false);
    } catch (error) {
      logger.error('Failed to pause subscription', 'ORG_MANAGE', error);
    }
  }, [orgId, loadOrganizationDetails]);

  const handleCancel = useCallback(async () => {
    if (!orgId) return;
    
    try {
      await cancelSubscription(orgId);
      await loadOrganizationDetails(orgId);
    } catch (error) {
      logger.error('Failed to cancel subscription', 'ORG_MANAGE', error);
    }
  }, [orgId, loadOrganizationDetails]);

  const handleReactivate = useCallback(async () => {
    if (!orgId) return;
    
    try {
      await reactivateSubscription(orgId);
      await loadOrganizationDetails(orgId);
    } catch (error) {
      logger.error('Failed to reactivate subscription', 'ORG_MANAGE', error);
    }
  }, [orgId, loadOrganizationDetails]);

  const handleGrantAccess = useCallback(async () => {
    if (!orgId || !admin) return;
    
    try {
      await grantDataAccess(orgId, admin.uid, accessReason || undefined);
      await loadOrganizationDetails(orgId);
      setShowGrantAccessDialog(false);
      setAccessReason('');
    } catch (error) {
      logger.error('Failed to grant data access', 'ORG_MANAGE', error);
    }
  }, [orgId, admin, accessReason, loadOrganizationDetails]);

  const handleRevokeAccess = useCallback(async () => {
    if (!orgId) return;
    
    try {
      await revokeDataAccess(orgId);
      await loadOrganizationDetails(orgId);
      setShowRevokeAccessDialog(false);
    } catch (error) {
      logger.error('Failed to revoke data access', 'ORG_MANAGE', error);
    }
  }, [orgId, loadOrganizationDetails]);

  const handleUpdateDemoAutoFill = useCallback(async (enabled: boolean) => {
    if (!orgId || !org) return;
    
    try {
      setSaving(true);
      await updateOrganizationDetails(orgId, { demoAutoFillEnabled: enabled });
      setOrg({ ...org, demoAutoFillEnabled: enabled });
      logger.info(`Demo auto-fill ${enabled ? 'enabled' : 'disabled'}`, 'ORG_MANAGE', { orgId });
    } catch (error) {
      logger.error('Failed to update demo auto-fill', 'ORG_MANAGE', error);
      throw error; // Re-throw for UI to handle
    } finally {
      setSaving(false);
    }
  }, [orgId, org]);

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
  };
}
