/**
 * Organization Management Page
 * 
 * Platform admin page to manage individual organizations:
 * - View full details (contact, address, etc.)
 * - Manage subscription (cancel, pause, reactivate, change plan)
 * - Delete organization
 * - Edit organization details
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { 
  Shield, 
  LogOut, 
  Building2, 
  ArrowLeft,
  Trash2,
  Pause,
  Play,
  XCircle,
  Edit,
  Save,
  Mail,
  Phone,
  MapPin,
  Globe,
  Calendar,
  DollarSign,
  Users,
  FileText,
  Lock,
  Unlock,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { logger } from '@/lib/utils/logger';

const OrganizationManage = () => {
  const navigate = useNavigate();
  const { orgId } = useParams<{ orgId: string }>();
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null);
  const [org, setOrg] = useState<OrganizationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showGrantAccessDialog, setShowGrantAccessDialog] = useState(false);
  const [showRevokeAccessDialog, setShowRevokeAccessDialog] = useState(false);
  const [accessReason, setAccessReason] = useState('');

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
        logger.warn('User is not a platform admin:', user.email);
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
  }, [navigate, orgId]);

  const loadOrganizationDetails = async (id: string) => {
    try {
      const orgData = await getOrganizationDetails(id);
      setOrg(orgData);
    } catch (error) {
      logger.error('Failed to load organization details:', error);
    }
  };

  const handleSignOut = async () => {
    const auth = getFirebaseAuth();
    await signOut(auth);
    navigate('/admin/login', { replace: true });
  };

  const handleSave = async () => {
    if (!org || !orgId) return;
    
    setSaving(true);
    try {
      await updateOrganizationDetails(orgId, org);
      await loadOrganizationDetails(orgId); // Reload to get updated data
      setEditing(false);
    } catch (error) {
      logger.error('Failed to save organization details:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!orgId || deleteConfirmText !== org?.name) {
      return;
    }
    
    try {
      await deleteOrganization(orgId);
      navigate('/admin', { replace: true });
    } catch (error) {
      logger.error('Failed to delete organization:', error);
    }
  };

  const handlePause = async () => {
    if (!orgId) return;
    
    try {
      await pauseSubscription(orgId);
      await loadOrganizationDetails(orgId);
      setShowPauseDialog(false);
    } catch (error) {
      logger.error('Failed to pause subscription:', error);
    }
  };

  const handleCancel = async () => {
    if (!orgId) return;
    
    try {
      await cancelSubscription(orgId);
      await loadOrganizationDetails(orgId);
    } catch (error) {
      logger.error('Failed to cancel subscription:', error);
    }
  };

  const handleReactivate = async () => {
    if (!orgId) return;
    
    try {
      await reactivateSubscription(orgId);
      await loadOrganizationDetails(orgId);
    } catch (error) {
      logger.error('Failed to reactivate subscription:', error);
    }
  };

  const handleGrantAccess = async () => {
    if (!orgId || !admin) return;
    
    try {
      await grantDataAccess(orgId, admin.uid, accessReason || undefined);
      await loadOrganizationDetails(orgId);
      setShowGrantAccessDialog(false);
      setAccessReason('');
    } catch (error) {
      logger.error('Failed to grant data access:', error);
    }
  };

  const handleRevokeAccess = async () => {
    if (!orgId) return;
    
    try {
      await revokeDataAccess(orgId);
      await loadOrganizationDetails(orgId);
      setShowRevokeAccessDialog(false);
    } catch (error) {
      logger.error('Failed to revoke data access:', error);
    }
  };

  // Check if org has data access permission
  // Comped orgs (like One Fitness - owner's company) automatically have access
  const hasDataAccess = org?.dataAccessPermission?.platformAdminAccess === true ||
                       org?.isComped === true; // Comped orgs get automatic access

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 flex items-center gap-2">
          <Building2 className="w-4 h-4 animate-pulse" />
          Loading organization...
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-slate-400">Organization not found</p>
          <Button onClick={() => navigate('/admin')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin')}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-white font-semibold">{org.name || 'Organization'}</h1>
              <p className="text-xs text-slate-500">{org.id}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-slate-400 hover:text-white"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Organization Details */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold">Organization Details</h2>
                {!editing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(true)}
                    className="border-slate-700 text-slate-300 hover:bg-slate-700"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(false)}
                      className="border-slate-700 text-slate-300 hover:bg-slate-700"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-slate-500 mb-1">Organization Name</Label>
                    {editing ? (
                      <Input
                        value={org.name || ''}
                        onChange={(e) => setOrg({ ...org, name: e.target.value })}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    ) : (
                      <p className="text-sm text-slate-300">{org.name || 'N/A'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 mb-1">Type</Label>
                    {editing ? (
                      <Select
                        value={org.type || 'gym'}
                        onValueChange={(value: any) => setOrg({ ...org, type: value })}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solo_coach">Solo Coach</SelectItem>
                          <SelectItem value="gym">Gym</SelectItem>
                          <SelectItem value="gym_chain">Gym Chain</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-slate-300 capitalize">{(org.type || 'gym').replace('_', ' ')}</p>
                    )}
                  </div>
                </div>

                {/* Contact Information */}
                <div className="pt-4 border-t border-slate-800">
                  <h3 className="text-sm font-medium text-slate-400 mb-3">Contact Information</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        Admin Email
                      </Label>
                      {editing ? (
                        <Input
                          type="email"
                          value={org.adminEmail || ''}
                          onChange={(e) => setOrg({ ...org, adminEmail: e.target.value })}
                          className="bg-slate-800 border-slate-700 text-white"
                        />
                      ) : (
                        <p className="text-sm text-slate-300">{org.adminEmail || 'N/A'}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        Phone
                      </Label>
                      {editing ? (
                        <Input
                          type="tel"
                          value={org.phone || ''}
                          onChange={(e) => setOrg({ ...org, phone: e.target.value })}
                          className="bg-slate-800 border-slate-700 text-white"
                        />
                      ) : (
                        <p className="text-sm text-slate-300">{org.phone || 'N/A'}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Address
                      </Label>
                      {editing ? (
                        <Input
                          value={org.address || ''}
                          onChange={(e) => setOrg({ ...org, address: e.target.value })}
                          className="bg-slate-800 border-slate-700 text-white"
                        />
                      ) : (
                        <p className="text-sm text-slate-300">{org.address || 'N/A'}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        Website
                      </Label>
                      {editing ? (
                        <Input
                          type="url"
                          value={org.website || ''}
                          onChange={(e) => setOrg({ ...org, website: e.target.value })}
                          className="bg-slate-800 border-slate-700 text-white"
                        />
                      ) : (
                        <p className="text-sm text-slate-300">
                          {org.website ? (
                            <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                              {org.website}
                            </a>
                          ) : (
                            'N/A'
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Subscription & Actions */}
          <div className="space-y-6">
            {/* Subscription Details */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold">Subscription</h2>
                {editing && (
                  <span className="text-xs text-amber-400">Editing Mode</span>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-slate-500 mb-1">Plan</Label>
                  {editing ? (
                    <Select
                      value={org.plan || 'free'}
                      onValueChange={(value: any) => {
                        setOrg({ ...org, plan: value as OrganizationDetails['plan'] });
                      }}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="starter">Starter</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm text-white font-medium capitalize">{org.plan || 'free'}</p>
                  )}
                </div>
                {editing && (
                  <div>
                    <Label className="text-xs text-slate-500 mb-1">Client Seats</Label>
                    <Input
                      type="number"
                      min="0"
                      value={org.clientSeats || 0}
                      onChange={(e) => setOrg({ ...org, clientSeats: parseInt(e.target.value) || 0 })}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                )}
                {org.clientSeats && org.clientSeats > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Client Seats</p>
                    <p className="text-sm text-slate-300">{org.clientSeats}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-500 mb-1">Monthly Fee</p>
                  <p className="text-sm text-slate-300">
                    {org.isComped ? (
                      <span className="text-violet-400 font-medium">Comped (Free)</span>
                    ) : (
                      org.monthlyFeeKwd !== undefined 
                        ? new Intl.NumberFormat('en-KW', { style: 'currency', currency: 'KWD', minimumFractionDigits: 2 }).format(org.monthlyFeeKwd)
                        : '—'
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-1">Status</Label>
                  {editing ? (
                    <Select
                      value={org.status || 'none'}
                      onValueChange={(value: any) => {
                        setOrg({ ...org, status: value as OrganizationDetails['status'] });
                      }}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trial">Trial</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="past_due">Past Due</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs border ${
                      org.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                      org.status === 'trial' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                      org.status === 'cancelled' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                      org.isComped ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' :
                      'bg-slate-500/20 text-slate-400 border-slate-500/30'
                    }`}>
                      {org.isComped ? 'Comped' : org.status || 'none'}
                    </span>
                  )}
                </div>
                {editing && (
                  <div className="pt-2 border-t border-slate-800">
                    <Label className="flex items-center gap-2 text-xs text-slate-400">
                      <input
                        type="checkbox"
                        checked={org.isComped || false}
                        onChange={(e) => setOrg({ ...org, isComped: e.target.checked })}
                        className="rounded border-slate-700 bg-slate-800"
                      />
                      Comped Subscription (Free Access)
                    </Label>
                  </div>
                )}
                {!editing && org.isComped && (
                  <div className="pt-2 border-t border-slate-800">
                    <p className="text-xs text-indigo-400">This organization has complimentary access</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-500 mb-1">Created</p>
                  <p className="text-sm text-slate-300">{org.createdAt.toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* GDPR/HIPAA Data Access */}
            {!hasDataAccess && (
              <div className="bg-amber-900/20 border border-amber-500/30 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-1">Data Access Restricted</h3>
                    <p className="text-xs text-slate-400 mb-3">
                      Per GDPR/HIPAA compliance, platform admins cannot view assessment or client data without explicit permission. 
                      Only aggregated statistics (counts) are visible.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setShowGrantAccessDialog(true)}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <Unlock className="w-4 h-4 mr-2" />
                      Request Data Access
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {hasDataAccess && org?.dataAccessPermission?.grantedAt && (
              <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <Unlock className="w-5 h-5 text-emerald-400 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-1">Data Access Granted</h3>
                    <p className="text-xs text-slate-400 mb-2">
                      Granted: {org.dataAccessPermission.grantedAt.toLocaleDateString()}
                      {org.dataAccessPermission.reason && (
                        <span className="block mt-1">Reason: {org.dataAccessPermission.reason}</span>
                      )}
                    </p>
                    {org.isComped !== true && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowRevokeAccessDialog(true)}
                        className="border-emerald-700 text-emerald-300 hover:bg-emerald-900/20"
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        Revoke Access
                      </Button>
                    )}
                    {org.isComped === true && (
                      <p className="text-xs text-slate-500 mt-2">
                        Comped organizations have permanent access (owner's company)
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-white font-semibold mb-4">Statistics</h2>
              {!hasDataAccess && (
                <div className="mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <p className="text-xs text-slate-400">
                    <AlertTriangle className="w-3 h-3 inline mr-1 text-amber-400" />
                    Only aggregated counts visible. Grant data access to view detailed coach/client information.
                  </p>
                </div>
              )}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-500" />
                    <span className="text-xs text-slate-500">Coaches</span>
                  </div>
                  <span className="text-sm text-white font-medium">{org.coachCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-500" />
                    <span className="text-xs text-slate-500">Clients</span>
                  </div>
                  <span className="text-sm text-white font-medium">{org.clientCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span className="text-xs text-slate-500">Assessments</span>
                  </div>
                  <span className="text-sm text-white font-medium">{org.assessmentCount}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-amber-500" />
                    <span className="text-xs text-slate-500">AI Costs (MTD)</span>
                  </div>
                  <span className="text-sm text-amber-400 font-medium">
                    {new Intl.NumberFormat('en-KW', { style: 'currency', currency: 'KWD' }).format((org.aiCostsMtdCents || 0) / 1000)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-white font-semibold mb-4">Actions</h2>
              <div className="space-y-2">
                {org.status === 'active' && !org.isComped && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPauseDialog(true)}
                    className="w-full border-slate-700 text-slate-300 hover:bg-slate-700"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Pause Subscription
                  </Button>
                )}
                {org.status === 'active' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    className="w-full border-slate-700 text-slate-300 hover:bg-slate-700"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel Subscription
                  </Button>
                )}
                {(org.status === 'cancelled' || org.status === 'past_due') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReactivate}
                    className="w-full border-slate-700 text-slate-300 hover:bg-slate-700"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Reactivate Subscription
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="w-full border-red-700 text-red-400 hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Organization
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Grant Data Access Dialog */}
      <Dialog open={showGrantAccessDialog} onOpenChange={setShowGrantAccessDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Unlock className="w-5 h-5 text-amber-400" />
              Grant Data Access Permission
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Granting access allows platform admins to view assessment and client data for this organization. 
              This is required for GDPR/HIPAA compliance and should only be used for support purposes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-slate-400 mb-2 block">
                Reason for Access (Required):
              </Label>
              <Input
                value={accessReason}
                onChange={(e) => setAccessReason(e.target.value)}
                placeholder="e.g., Support ticket #12345, debugging issue with assessments"
                className="bg-slate-800 border-slate-700 text-white"
              />
              <p className="text-xs text-slate-500 mt-1">
                This reason will be logged for compliance auditing.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowGrantAccessDialog(false);
                setAccessReason('');
              }}
              className="border-slate-700 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGrantAccess}
              disabled={!accessReason.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Unlock className="w-4 h-4 mr-2" />
              Grant Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Data Access Dialog */}
      <Dialog open={showRevokeAccessDialog} onOpenChange={setShowRevokeAccessDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-red-400" />
              Revoke Data Access Permission
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Revoking access will immediately prevent platform admins from viewing assessment and client data 
              for this organization. This action will be logged for compliance.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRevokeAccessDialog(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevokeAccess}
              className="bg-red-600 hover:bg-red-700"
            >
              <Lock className="w-4 h-4 mr-2" />
              Revoke Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Organization</DialogTitle>
            <DialogDescription className="text-slate-400">
              This action cannot be undone. This will permanently delete the organization and all associated data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-slate-400 mb-2 block">
                Type <strong>{org.name}</strong> to confirm deletion:
              </Label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={org.name || ''}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setDeleteConfirmText('');
              }}
              className="border-slate-700 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteConfirmText !== org.name}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pause Confirmation Dialog */}
      <Dialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Pause Subscription</DialogTitle>
            <DialogDescription className="text-slate-400">
              Pausing will temporarily suspend service. The organization will retain access but billing will be paused.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPauseDialog(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePause}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Pause className="w-4 h-4 mr-2" />
              Pause Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrganizationManage;
