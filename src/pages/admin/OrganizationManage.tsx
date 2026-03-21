/**
 * Organization Management Page
 * 
 * Platform admin page to manage individual organizations:
 * - View full details (contact, address, etc.)
 * - Manage subscription (cancel, pause, reactivate, change plan)
 * - Delete organization
 * - Edit organization details
 * 
 * Logic extracted to useOrgManagement hook for clean separation.
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrgManagement } from '@/hooks/useOrgManagement';
import { useAuth } from '@/hooks/useAuth';
import type { OrganizationDetails } from '@/types/platform';
import { 
  Building2, 
  LogOut, 
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
  DollarSign,
  Users,
  FileText,
  Lock,
  Unlock,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  REGIONS,
  REGION_LABELS,
  SEAT_TIERS,
  CAPACITY_CLIENT_LIMITS,
  DEFAULT_REGION,
  DEFAULT_CURRENCY,
} from '@/constants/pricing';

const PLAN_SEAT_OPTIONS = [...new Set([...CAPACITY_CLIENT_LIMITS, ...SEAT_TIERS, 300])].sort((a, b) => a - b);
import { formatPrice } from '@/lib/utils/currency';
import { getLocaleForRegion } from '@/lib/utils/currency';
import type { Region } from '@/constants/pricing';

// Sub-components for cleaner organization
const LoadingState = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="text-slate-400 flex items-center gap-2">
      <Building2 className="w-4 h-4 animate-pulse" />
      Loading organization...
    </div>
  </div>
);

const NotFoundState = ({ onBack }: { onBack: () => void }) => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="text-center space-y-4">
      <p className="text-slate-400">Organization not found</p>
      <Button onClick={onBack} variant="outline">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>
    </div>
  </div>
);

const OrganizationManage = () => {
  const navigate = useNavigate();
  const { orgId } = useParams<{ orgId: string }>();
  const { startImpersonation, impersonation } = useAuth();
  
  // Impersonation dialog state
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

  // Handle impersonation start
  const handleStartImpersonation = async () => {
    if (!org || !orgId) return;
    
    setImpersonating(true);
    try {
      await startImpersonation(orgId, org.name || 'Unknown Org', impersonateReason || undefined);
      setShowImpersonateDialog(false);
      setImpersonateReason('');
      // Navigate to the org's dashboard view
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
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <Header 
        org={org} 
        onBack={() => navigate('/admin')} 
        onSignOut={handleSignOut}
        onImpersonate={() => setShowImpersonateDialog(true)}
        isImpersonating={!!impersonation}
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details */}
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

          {/* Sidebar */}
          <div className="space-y-6">
            <SubscriptionCard
              org={org}
              editing={editing}
              saving={saving}
              setOrg={setOrg}
            />

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

      {/* Dialogs */}
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

      <PauseDialog
        open={showPauseDialog}
        onOpenChange={setShowPauseDialog}
        onPause={handlePause}
      />

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

// Header Component
interface HeaderProps {
  org: OrganizationDetails;
  onBack: () => void;
  onSignOut: () => void;
  onImpersonate: () => void;
  isImpersonating: boolean;
}

const Header = ({ org, onBack, onSignOut, onImpersonate, isImpersonating }: HeaderProps) => (
  <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
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
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onImpersonate}
          disabled={isImpersonating}
          className="border-amber-600/50 text-amber-400 hover:bg-amber-600/20 hover:text-amber-300"
        >
          <Eye className="w-4 h-4 mr-2" />
          View as Org
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSignOut}
          className="text-slate-400 hover:text-white"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </div>
  </header>
);

// Organization Details Card
interface OrganizationDetailsCardProps {
  org: OrganizationDetails;
  editing: boolean;
  saving: boolean;
  setOrg: React.Dispatch<React.SetStateAction<OrganizationDetails | null>>;
  setEditing: React.Dispatch<React.SetStateAction<boolean>>;
  onSave: () => Promise<void>;
}

const OrganizationDetailsCard = ({ org, editing, saving, setOrg, setEditing, onSave }: OrganizationDetailsCardProps) => (
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
            onClick={onSave}
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
              onValueChange={(value: OrganizationDetails['type']) => setOrg({ ...org, type: value })}
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
          <ContactField
            icon={<Mail className="w-3 h-3" />}
            label="Admin Email"
            value={org.adminEmail}
            editing={editing}
            type="email"
            onChange={(value) => setOrg({ ...org, adminEmail: value })}
          />
          <ContactField
            icon={<Phone className="w-3 h-3" />}
            label="Phone"
            value={org.phone}
            editing={editing}
            type="tel"
            onChange={(value) => setOrg({ ...org, phone: value })}
          />
          <ContactField
            icon={<MapPin className="w-3 h-3" />}
            label="Address"
            value={org.address}
            editing={editing}
            onChange={(value) => setOrg({ ...org, address: value })}
          />
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
);

// Contact Field Component
interface ContactFieldProps {
  icon: React.ReactNode;
  label: string;
  value: string | undefined;
  editing: boolean;
  type?: string;
  onChange: (value: string) => void;
}

const ContactField = ({ icon, label, value, editing, type = 'text', onChange }: ContactFieldProps) => (
  <div>
    <Label className="text-xs text-slate-500 mb-1 flex items-center gap-1">
      {icon}
      {label}
    </Label>
    {editing ? (
      <Input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="bg-slate-800 border-slate-700 text-white"
      />
    ) : (
      <p className="text-sm text-slate-300">{value || 'N/A'}</p>
    )}
  </div>
);

// Subscription Card
interface SubscriptionCardProps {
  org: OrganizationDetails;
  editing: boolean;
  saving: boolean;
  setOrg: React.Dispatch<React.SetStateAction<OrganizationDetails | null>>;
}

const SubscriptionCard = ({ org, editing, saving, setOrg }: SubscriptionCardProps) => {
  const region = (org.region ?? DEFAULT_REGION) as Region;
  const seatBlock = org.seatBlock ?? org.clientSeats ?? 10;
  const currency = org.currency ?? DEFAULT_CURRENCY;
  const locale = getLocaleForRegion(region);
  const monthlyAmount = org.monthlyAmountLocal ?? org.monthlyFeeKwd ?? 0;

  return (
  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-white font-semibold">Subscription</h2>
      {editing && <span className="text-xs text-amber-400">Editing Mode</span>}
    </div>
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-slate-500 mb-1">Region</Label>
        {editing ? (
          <Select
            value={region}
            onValueChange={(value: string) => setOrg({ ...org, region: value as Region })}
          >
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REGIONS.map((r) => (
                <SelectItem key={r} value={r}>{REGION_LABELS[r]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm text-white font-medium">{REGION_LABELS[region] ?? org.region ?? '—'}</p>
        )}
      </div>
      <div>
        <Label className="text-xs text-slate-500 mb-1">Client count (plan)</Label>
        {editing ? (
          <Select
            value={String(seatBlock)}
            onValueChange={(value: string) => setOrg({ ...org, seatBlock: parseInt(value, 10) })}
          >
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLAN_SEAT_OPTIONS.map((t) => (
                <SelectItem key={t} value={String(t)}>
                  {t === 300 ? '300+ clients' : `${t} clients`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm text-slate-300">{seatBlock} clients</p>
        )}
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-1">Monthly Fee</p>
        <p className="text-sm text-slate-300">
          {org.isComped ? (
            <span className="text-violet-400 font-medium">Comped (Free)</span>
          ) : (
            currency ? formatPrice(monthlyAmount, currency, locale) : '—'
          )}
        </p>
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-1">Custom branding</p>
        <p className="text-sm text-slate-300">
          {org.customBrandingEnabled ? (
            <span className="text-emerald-400">Enabled{org.customBrandingPaidAt ? ` (${org.customBrandingPaidAt.toLocaleDateString()})` : ''}</span>
          ) : (
            'Not purchased'
          )}
        </p>
      </div>
      <div>
        <Label className="text-xs text-slate-500 mb-1">Status</Label>
        {editing ? (
          <Select
            value={org.status || 'none'}
            onValueChange={(value: string) => setOrg({ ...org, status: value as OrganizationDetails['status'] })}
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

      {(org.stripeCustomerId || org.stripeSubscriptionId || org.stripePriceId) && (
        <div className="pt-3 border-t border-slate-800">
          <h3 className="text-xs font-medium text-slate-400 mb-2">Stripe (support)</h3>
          <div className="space-y-1.5 text-xs font-mono text-slate-400">
            {org.stripeCustomerId && (
              <div>
                <span className="text-slate-500">Customer:</span>{' '}
                <span className="text-slate-300 break-all">{org.stripeCustomerId}</span>
              </div>
            )}
            {org.stripeSubscriptionId && (
              <div>
                <span className="text-slate-500">Subscription:</span>{' '}
                <span className="text-slate-300 break-all">{org.stripeSubscriptionId}</span>
              </div>
            )}
            {org.stripePriceId && (
              <div>
                <span className="text-slate-500">Price:</span>{' '}
                <span className="text-slate-300">{org.stripePriceId}</span>
              </div>
            )}
          </div>
        </div>
      )}

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
  );
};

// Data Access Card
interface DataAccessCardProps {
  org: OrganizationDetails;
  hasDataAccess: boolean;
  onGrantAccess: () => void;
  onRevokeAccess: () => void;
}

const DataAccessCard = ({ org, hasDataAccess, onGrantAccess, onRevokeAccess }: DataAccessCardProps) => {
  if (!hasDataAccess) {
    return (
      <div className="bg-amber-900/20 border border-amber-500/30 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-white font-semibold mb-1">Data Access Restricted</h3>
            <p className="text-xs text-slate-400 mb-3">
              Per GDPR/HIPAA compliance, platform admins cannot view assessment or client data without explicit permission.
            </p>
            <Button
              size="sm"
              onClick={onGrantAccess}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Unlock className="w-4 h-4 mr-2" />
              Request Data Access
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (org?.dataAccessPermission?.grantedAt) {
    return (
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
                onClick={onRevokeAccess}
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
    );
  }

  return null;
};

// Statistics Card
interface StatisticsCardProps {
  org: OrganizationDetails;
  hasDataAccess: boolean;
}

const StatisticsCard = ({ org, hasDataAccess }: StatisticsCardProps) => (
  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
    <h2 className="text-white font-semibold mb-4">Statistics</h2>
    {!hasDataAccess && (
      <div className="mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
        <p className="text-xs text-slate-400">
          <AlertTriangle className="w-3 h-3 inline mr-1 text-amber-400" />
          Only aggregated counts visible.
        </p>
      </div>
    )}
    <div className="space-y-3">
      <StatRow icon={<Users className="w-4 h-4" />} label="Coaches" value={org.coachCount} />
      <StatRow icon={<Users className="w-4 h-4" />} label="Clients" value={org.clientCount} />
      <StatRow icon={<FileText className="w-4 h-4" />} label="Assessments" value={org.assessmentCount} />
      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-amber-500" />
          <span className="text-xs text-slate-500">AI Costs (MTD)</span>
        </div>
        <span className="text-sm text-amber-400 font-medium">
          {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format((org.aiCostsMtdCents || 0) / 100)}
        </span>
      </div>
    </div>
  </div>
);

const StatRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | undefined }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <span className="text-slate-500">{icon}</span>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
    <span className="text-sm text-white font-medium">{value ?? 0}</span>
  </div>
);

// Platform Features Card
interface PlatformFeaturesCardProps {
  org: OrganizationDetails;
  saving: boolean;
  onUpdateDemoAutoFill: (enabled: boolean) => Promise<void>;
}

const PlatformFeaturesCard = ({ org, saving, onUpdateDemoAutoFill }: PlatformFeaturesCardProps) => (
  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
    <h2 className="text-white font-semibold mb-4">Platform Features</h2>
    <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700">
      <div className="flex-1">
        <Label className="text-sm font-semibold text-white mb-1 block">
          Demo Auto-Fill (Affiliate/Sales Tool)
        </Label>
        <p className="text-xs text-slate-400 leading-relaxed">
          Enable AI-powered demo persona auto-fill for affiliates.
          <br />
          <span className="text-amber-400 font-medium">Platform admin controlled.</span>
        </p>
      </div>
      <Switch
        checked={org?.demoAutoFillEnabled ?? false}
        disabled={saving || !org}
        onCheckedChange={async (enabled) => {
          try {
            await onUpdateDemoAutoFill(enabled);
          } catch (error) {
            alert(`Failed to update: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }}
      />
    </div>
  </div>
);

// Actions Card
interface ActionsCardProps {
  org: OrganizationDetails;
  onPause: () => void;
  onCancel: () => void;
  onReactivate: () => void;
  onDelete: () => void;
  onPermanentlyDelete: () => void;
  onImpersonate: () => void;
  isImpersonating: boolean;
}

const ActionsCard = ({ org, onPause, onCancel, onReactivate, onDelete, onPermanentlyDelete, onImpersonate, isImpersonating }: ActionsCardProps) => (
  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
    <h2 className="text-white font-semibold mb-4">Actions</h2>
    <div className="space-y-2">
      {/* Impersonation - Primary action for support */}
      <Button
        variant="outline"
        size="sm"
        onClick={onImpersonate}
        disabled={isImpersonating}
        className="w-full border-amber-600/50 text-amber-400 hover:bg-amber-600/20"
      >
        <Eye className="w-4 h-4 mr-2" />
        {isImpersonating ? 'Currently Viewing' : 'View as Organization'}
      </Button>
      
      {org.status === 'active' && !org.isComped && (
        <Button
          variant="outline"
          size="sm"
          onClick={onPause}
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
          onClick={onCancel}
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
          onClick={onReactivate}
          className="w-full border-slate-700 text-slate-300 hover:bg-slate-700"
        >
          <Play className="w-4 h-4 mr-2" />
          Reactivate Subscription
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={onDelete}
        className="w-full border-red-700 text-red-400 hover:bg-red-900/20"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Archive (Soft Delete)
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onPermanentlyDelete}
        className="w-full border-red-800 text-red-500 hover:bg-red-900/30"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Permanently Delete
      </Button>
    </div>
  </div>
);

// Dialog Components
interface GrantAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessReason: string;
  setAccessReason: (reason: string) => void;
  onGrant: () => void;
}

const GrantAccessDialog = ({ open, onOpenChange, accessReason, setAccessReason, onGrant }: GrantAccessDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="bg-slate-900 border-slate-800 text-white">
      <DialogHeader>
        <DialogTitle className="text-white flex items-center gap-2">
          <Unlock className="w-5 h-5 text-amber-400" />
          Grant Data Access Permission
        </DialogTitle>
        <DialogDescription className="text-slate-400">
          Granting access allows platform admins to view assessment and client data. Required for GDPR/HIPAA compliance.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label className="text-xs text-slate-400 mb-2 block">Reason for Access (Required):</Label>
          <Input
            value={accessReason}
            onChange={(e) => setAccessReason(e.target.value)}
            placeholder="e.g., Support ticket #12345"
            className="bg-slate-800 border-slate-700 text-white"
          />
          <p className="text-xs text-slate-500 mt-1">This will be logged for compliance auditing.</p>
        </div>
      </div>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => { onOpenChange(false); setAccessReason(''); }}
          className="border-slate-700 text-slate-300 hover:bg-slate-700"
        >
          Cancel
        </Button>
        <Button
          onClick={onGrant}
          disabled={!accessReason.trim()}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          <Unlock className="w-4 h-4 mr-2" />
          Grant Access
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

interface RevokeAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRevoke: () => void;
}

const RevokeAccessDialog = ({ open, onOpenChange, onRevoke }: RevokeAccessDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="bg-slate-900 border-slate-800 text-white">
      <DialogHeader>
        <DialogTitle className="text-white flex items-center gap-2">
          <Lock className="w-5 h-5 text-red-400" />
          Revoke Data Access Permission
        </DialogTitle>
        <DialogDescription className="text-slate-400">
          Revoking access will prevent platform admins from viewing assessment and client data.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="border-slate-700 text-slate-300 hover:bg-slate-700"
        >
          Cancel
        </Button>
        <Button variant="destructive" onClick={onRevoke} className="bg-red-600 hover:bg-red-700">
          <Lock className="w-4 h-4 mr-2" />
          Revoke Access
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgName: string;
  confirmText: string;
  setConfirmText: (text: string) => void;
  onDelete: () => void;
}

const DeleteDialog = ({ open, onOpenChange, orgName, confirmText, setConfirmText, onDelete }: DeleteDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="bg-slate-900 border-slate-800 text-white">
      <DialogHeader>
        <DialogTitle className="text-white">Archive Organization</DialogTitle>
        <DialogDescription className="text-slate-400">
          This will soft-delete the organization. It will be hidden from the dashboard but data is retained. Use Permanently Delete to remove all data.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label className="text-xs text-slate-400 mb-2 block">
            Type <strong>{orgName}</strong> to confirm archive:
          </Label>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={orgName}
            className="bg-slate-800 border-slate-700 text-white"
          />
        </div>
      </div>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => { onOpenChange(false); setConfirmText(''); }}
          className="border-slate-700 text-slate-300 hover:bg-slate-700"
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={onDelete}
          disabled={confirmText !== orgName}
          className="bg-red-600 hover:bg-red-700"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Archive Organization
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

interface PermanentlyDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  confirmText: string;
  setConfirmText: (text: string) => void;
  onDelete: () => void;
}

const PermanentlyDeleteDialog = ({ open, onOpenChange, confirmText, setConfirmText, onDelete }: PermanentlyDeleteDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="bg-slate-900 border-slate-800 text-white">
      <DialogHeader>
        <DialogTitle className="text-white">Permanently Delete Organization</DialogTitle>
        <DialogDescription className="text-slate-400">
          This will permanently delete the organization, all subcollections, user profiles, and Firebase Auth users. This cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label className="text-xs text-slate-400 mb-2 block">
            Type <strong>PERMANENTLY DELETE</strong> to confirm:
          </Label>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="PERMANENTLY DELETE"
            className="bg-slate-800 border-slate-700 text-white"
          />
        </div>
      </div>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => { onOpenChange(false); setConfirmText(''); }}
          className="border-slate-700 text-slate-300 hover:bg-slate-700"
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={onDelete}
          disabled={confirmText !== 'PERMANENTLY DELETE'}
          className="bg-red-600 hover:bg-red-700"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Permanently Delete
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

interface PauseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPause: () => void;
}

const PauseDialog = ({ open, onOpenChange, onPause }: PauseDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
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
          onClick={() => onOpenChange(false)}
          className="border-slate-700 text-slate-300 hover:bg-slate-700"
        >
          Cancel
        </Button>
        <Button onClick={onPause} className="bg-indigo-600 hover:bg-indigo-700">
          <Pause className="w-4 h-4 mr-2" />
          Pause Subscription
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// Impersonation Dialog
interface ImpersonateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgName: string;
  reason: string;
  setReason: (reason: string) => void;
  onImpersonate: () => void;
  loading: boolean;
}

const ImpersonateDialog = ({ open, onOpenChange, orgName, reason, setReason, onImpersonate, loading }: ImpersonateDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="bg-slate-900 border-slate-800 text-white">
      <DialogHeader>
        <DialogTitle className="text-white flex items-center gap-2">
          <Eye className="w-5 h-5 text-amber-400" />
          View as Organization
        </DialogTitle>
        <DialogDescription className="text-slate-400">
          You will view the app as if you were a member of <strong className="text-white">{orgName}</strong>. 
          This is a <span className="text-amber-400 font-medium">read-only</span> session and all actions will be logged for audit purposes.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="p-3 bg-amber-900/20 border border-amber-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-200">
              <p className="font-medium mb-1">Security Notice</p>
              <ul className="list-disc list-inside space-y-0.5 text-amber-300/80">
                <li>Session expires after 4 hours</li>
                <li>All navigation is logged</li>
                <li>Write operations are disabled</li>
                <li>Session can be ended anytime</li>
              </ul>
            </div>
          </div>
        </div>
        <div>
          <Label className="text-xs text-slate-400 mb-2 block">Reason for Access (Optional but recommended):</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Support ticket #12345, investigating reported bug, training demo..."
            className="bg-slate-800 border-slate-700 text-white min-h-[80px]"
          />
          <p className="text-xs text-slate-500 mt-1">This will be recorded in the audit log.</p>
        </div>
      </div>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => { onOpenChange(false); setReason(''); }}
          className="border-slate-700 text-slate-300 hover:bg-slate-700"
        >
          Cancel
        </Button>
        <Button
          onClick={onImpersonate}
          disabled={loading}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          <Eye className="w-4 h-4 mr-2" />
          {loading ? 'Starting...' : 'Start Viewing'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default OrganizationManage;
