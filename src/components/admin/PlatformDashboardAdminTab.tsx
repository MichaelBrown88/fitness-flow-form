/**
 * Platform Dashboard – Admin Tab
 *
 * Feature kill switches, maintenance mode, backfill, audit log, platform admins.
 */

import { useState } from 'react';
import {
  Power,
  AlertTriangle,
  Camera,
  ScanLine,
  FileBarChart,
  Loader2,
  UserPlus,
  Trash2,
  PackageCheck,
  PackageX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { PlatformConfig, PlatformFeatureFlags, PlatformAdmin } from '@/types/platform';
import type { PlatformPermission } from '@/types/platform';
import type { PlatformHealth } from '@/services/platform/platformHealth';

const PLATFORM_PERMISSIONS: PlatformPermission[] = ['view_metrics', 'view_organizations', 'manage_organizations', 'view_ai_costs', 'manage_admins'];
const PERMISSION_LABELS: Record<PlatformPermission, string> = {
  view_metrics: 'View metrics',
  view_organizations: 'View organizations',
  manage_organizations: 'Manage organizations',
  view_ai_costs: 'View AI costs',
  manage_admins: 'Manage admins',
};

interface FeatureToggleCardProps {
  featureKey: keyof PlatformFeatureFlags;
  icon: React.ReactNode;
  enabled: boolean;
  updating: boolean;
  onToggle: (key: keyof PlatformFeatureFlags, enabled: boolean) => void;
  featureNames: Record<string, string>;
  featureDescriptions: Record<string, string>;
}

function FeatureToggleCard({ featureKey, icon, enabled, updating, onToggle, featureNames, featureDescriptions }: FeatureToggleCardProps) {
  const [confirmPending, setConfirmPending] = useState<boolean | null>(null);
  const constantKey = featureKey.toUpperCase() as keyof typeof featureNames;
  const name = featureNames[constantKey] || featureKey;
  const description = featureDescriptions[constantKey] || '';

  const handleSwitchChange = (checked: boolean) => {
    // Disabling a feature requires confirmation (could break things for all users)
    if (!checked) {
      setConfirmPending(checked);
    } else {
      onToggle(featureKey, checked);
    }
  };

  return (
    <>
      <div
        className={`p-4 rounded-xl border transition-colors ${
          enabled ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
              }`}
            >
              {icon}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{name}</p>
              <p className={`text-xs ${enabled ? 'text-emerald-400' : 'text-red-400'}`}>{enabled ? 'Enabled' : 'Disabled'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {updating && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />}
            <Switch checked={enabled} onCheckedChange={handleSwitchChange} disabled={updating} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">{description}</p>
      </div>

      {/* Confirmation dialog for disabling features */}
      <Dialog open={confirmPending !== null} onOpenChange={(open) => !open && setConfirmPending(null)}>
        <DialogContent className="sm:max-w-[400px] bg-admin-card border-admin-border">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Disable {name}?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will immediately disable {name.toLowerCase()} for all organizations. Coaches using this feature will see errors until it's re-enabled.
          </p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="ghost" onClick={() => setConfirmPending(null)} className="text-muted-foreground">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onToggle(featureKey, false);
                setConfirmPending(null);
              }}
            >
              Disable
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export interface PlatformDashboardAdminTabProps {
  platformConfig: PlatformConfig;
  updatingFeature: keyof PlatformFeatureFlags | null;
  handleToggleFeature: (key: keyof PlatformFeatureFlags, enabled: boolean) => Promise<void>;
  handleSetMaintenanceMode: (isEnabled: boolean, message?: string, affectedFeatures?: (keyof PlatformFeatureFlags)[]) => Promise<void>;
  updatingMaintenance: boolean;
  maintenanceMessage: string;
  setMaintenanceMessage: (v: string) => void;
  maintenanceFeatures: (keyof PlatformFeatureFlags)[];
  setMaintenanceFeatures: (v: (keyof PlatformFeatureFlags)[]) => void;
  auditLogEntries: Array<{ id: string; timestamp: Date; adminUid: string; action: string; target?: string }>;
  hasMoreAuditLogs: boolean;
  loadMoreAuditLogs: () => Promise<void>;
  platformAdmins: PlatformAdmin[];
  handleRemovePlatformAdmin: (uid: string) => Promise<void>;
  handleUpdatePlatformAdminPermissions: (uid: string, permissions: PlatformPermission[]) => Promise<void>;
  handleAddPlatformAdmin: (email: string, displayName: string) => Promise<void>;
  admin: PlatformAdmin | null;
  FEATURE_KEYS: (keyof PlatformFeatureFlags)[];
  FEATURE_NAMES: Record<string, string>;
  FEATURE_DESCRIPTIONS: Record<string, string>;
  platformHealth: PlatformHealth | null;
}

export function PlatformDashboardAdminTab({
  platformConfig,
  updatingFeature,
  handleToggleFeature,
  handleSetMaintenanceMode,
  updatingMaintenance,
  maintenanceMessage,
  setMaintenanceMessage,
  maintenanceFeatures,
  setMaintenanceFeatures,
  auditLogEntries,
  hasMoreAuditLogs,
  loadMoreAuditLogs,
  platformAdmins,
  handleRemovePlatformAdmin,
  handleUpdatePlatformAdminPermissions,
  handleAddPlatformAdmin,
  admin,
  FEATURE_KEYS,
  FEATURE_NAMES,
  FEATURE_DESCRIPTIONS,
  platformHealth,
}: PlatformDashboardAdminTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addDisplayName, setAddDisplayName] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    const email = addEmail.trim().toLowerCase();
    const displayName = addDisplayName.trim() || 'Platform Admin';
    if (!email) return;
    setAdding(true);
    try {
      await handleAddPlatformAdmin(email, displayName);
      setShowAddDialog(false);
      setAddEmail('');
      setAddDisplayName('');
    } finally {
      setAdding(false);
    }
  };

  const aiConfig = platformHealth?.aiConfig ?? null;
  const dependencies = platformHealth?.dependencies ?? null;
  const stalePackages = dependencies
    ? Object.entries(dependencies.packages).filter(([, v]) => v.needsUpdate)
    : [];
  const allUpToDate = dependencies !== null && stalePackages.length === 0;

  return (
    <div className="space-y-8">
      {/* AI Model Deprecation Banner — only shown when model is not active */}
      {aiConfig && aiConfig.status !== 'active' && (
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 ${
            aiConfig.status === 'sunset'
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-amber-500/10 border-amber-500/30'
          }`}
        >
          <AlertTriangle
            className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
              aiConfig.status === 'sunset' ? 'text-score-red' : 'text-score-amber'
            }`}
          />
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-semibold ${
                aiConfig.status === 'sunset' ? 'text-score-red' : 'text-score-amber'
              }`}
            >
              AI Model Warning
            </p>
            <p className="text-xs text-admin-fg-muted mt-1">
              <span className="font-mono">{aiConfig.modelId}</span> has been{' '}
              <strong>{aiConfig.status}</strong>.
              {aiConfig.newerModelId && (
                <>
                  {' '}
                  <span className="font-mono">{aiConfig.newerModelId}</span> is available.
                </>
              )}
            </p>
            {aiConfig.deprecationMessage && (
              <p className="text-xs text-admin-fg-muted mt-1">{aiConfig.deprecationMessage}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Update <span className="font-mono">MODEL_NAME</span> in{' '}
              <span className="font-mono">src/config/index.ts</span> to resolve.
            </p>
          </div>
        </div>
      )}

      {/* Dependency Health Card */}
      <div className="bg-admin-card/50 border border-admin-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              allUpToDate
                ? 'bg-emerald-500/20 text-emerald-400'
                : dependencies === null
                  ? 'bg-muted/500/20 text-muted-foreground'
                  : 'bg-amber-500/20 text-amber-400'
            }`}
          >
            {allUpToDate ? (
              <PackageCheck className="w-5 h-5" />
            ) : (
              <PackageX className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="text-admin-fg font-semibold">Dependency Health</h3>
            <p className="text-xs text-admin-fg-muted">
              {dependencies
                ? `Last checked ${dependencies.checkedAt?.toLocaleDateString() ?? 'unknown'}`
                : 'Not yet checked — run window.checkPlatformHealth() to populate'}
            </p>
          </div>
        </div>

        {dependencies ? (
          <div className="space-y-2">
            {Object.entries(dependencies.packages).map(([name, pkg]) => (
              <div
                key={name}
                className={`flex items-center justify-between rounded-xl border p-3 text-xs ${
                  pkg.needsUpdate
                    ? 'border-amber-500/30 bg-amber-500/10'
                    : 'border-admin-border/70 bg-admin-surface-inset'
                }`}
              >
                <span className="font-mono text-admin-fg">{name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-admin-fg-muted">v{pkg.current}</span>
                  {pkg.needsUpdate && (
                    <span className="text-score-amber font-medium">
                      → v{pkg.latest} available
                    </span>
                  )}
                  {!pkg.needsUpdate && (
                    <span className="text-emerald-400">current</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-admin-fg-muted text-center py-4">
            No health data yet. Run <span className="font-mono">await window.checkPlatformHealth()</span> from the browser console.
          </p>
        )}

        {allUpToDate && (
          <p className="text-xs text-emerald-400 mt-4 font-medium">All dependencies up to date</p>
        )}
      </div>

      {/* Feature Kill Switches */}
      <div className="rounded-2xl border border-admin-border bg-admin-card/80 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600/20">
              <Power className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Feature Kill Switches</h3>
              <p className="text-xs text-admin-fg-muted">Toggle AI services globally</p>
            </div>
          </div>
          {platformConfig.maintenance.is_maintenance_mode && (
            <span className="px-3 py-1.5 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full border border-amber-500/30 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" />
              Maintenance Mode
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureToggleCard
            featureKey="posture_enabled"
            icon={<Camera className="w-5 h-5" />}
            enabled={platformConfig.features.posture_enabled}
            updating={updatingFeature === 'posture_enabled'}
            onToggle={handleToggleFeature}
            featureNames={FEATURE_NAMES}
            featureDescriptions={FEATURE_DESCRIPTIONS}
          />
          <FeatureToggleCard
            featureKey="ocr_enabled"
            icon={<ScanLine className="w-5 h-5" />}
            enabled={platformConfig.features.ocr_enabled}
            updating={updatingFeature === 'ocr_enabled'}
            onToggle={handleToggleFeature}
            featureNames={FEATURE_NAMES}
            featureDescriptions={FEATURE_DESCRIPTIONS}
          />
          <FeatureToggleCard
            featureKey="report_generation_enabled"
            icon={<FileBarChart className="w-5 h-5" />}
            enabled={platformConfig.features.report_generation_enabled}
            updating={updatingFeature === 'report_generation_enabled'}
            onToggle={handleToggleFeature}
            featureNames={FEATURE_NAMES}
            featureDescriptions={FEATURE_DESCRIPTIONS}
          />
        </div>

        <p className="text-xs text-foreground-secondary mt-4">
          Last updated: {platformConfig.updatedAt.toLocaleString()} by {platformConfig.updatedBy}
        </p>
      </div>

      {/* Maintenance Mode Controls */}
      <div className="rounded-2xl border border-admin-border bg-admin-card/80 p-6">
        <div className="mb-6 rounded-xl border border-admin-border/80 bg-admin-surface-inset p-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-white">Maintenance Mode</h4>
                <p className="text-xs text-admin-fg-muted">Toggle maintenance and set a message for end users</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {updatingMaintenance && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />}
              <Switch
                checked={platformConfig.maintenance.is_maintenance_mode ?? false}
                onCheckedChange={async (checked) => {
                  if (checked) {
                    await handleSetMaintenanceMode(true, maintenanceMessage || undefined, maintenanceFeatures.length > 0 ? maintenanceFeatures : undefined);
                  } else {
                    await handleSetMaintenanceMode(false);
                  }
                }}
                disabled={updatingMaintenance}
              />
            </div>
          </div>
          {platformConfig.maintenance.is_maintenance_mode && (
            <div className="space-y-4 pt-4 border-t border-border">
              <div>
                <Label htmlFor="maintenance-message" className="text-xs text-muted-foreground">
                  Message (optional)
                </Label>
                <Input
                  id="maintenance-message"
                  value={maintenanceMessage || platformConfig.maintenance.message || ''}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                  placeholder="We are performing scheduled maintenance..."
                  className="mt-1 border-admin-border bg-admin-surface-inset text-white"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Affected features (leave empty for all)</Label>
                <div className="flex flex-wrap gap-4">
                  {FEATURE_KEYS.map((key) => {
                    const effectiveFeatures =
                      maintenanceFeatures.length > 0 ? maintenanceFeatures : (platformConfig.maintenance.affected_features ?? []);
                    return (
                      <label key={key} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={effectiveFeatures.includes(key)}
                          onCheckedChange={(checked) => {
                            const base = effectiveFeatures;
                            setMaintenanceFeatures(checked ? [...new Set([...base, key])] : base.filter((k) => k !== key));
                          }}
                        />
                        <span className="text-xs text-muted-foreground">{FEATURE_NAMES[key.toUpperCase()] || key}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <Button
                size="sm"
                onClick={async () => {
                  await handleSetMaintenanceMode(
                    true,
                    maintenanceMessage || platformConfig.maintenance.message || undefined,
                    maintenanceFeatures.length > 0 ? maintenanceFeatures : undefined
                  );
                }}
                disabled={updatingMaintenance}
              >
                {updatingMaintenance ? 'Updating...' : 'Update Message & Features'}
              </Button>
            </div>
          )}
        </div>

        {platformConfig.maintenance.message && (
          <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="text-sm text-amber-400">{platformConfig.maintenance.message}</p>
          </div>
        )}
      </div>

      {/* Admin Audit Log */}
      <div className="overflow-hidden rounded-2xl border border-admin-border bg-admin-card/80">
        <div className="border-b border-admin-border px-5 py-4">
          <h3 className="font-semibold text-white">Admin Audit Log</h3>
          <p className="mt-0.5 text-xs text-admin-fg-muted">Security and platform administration events</p>
        </div>
        {auditLogEntries.length === 0 ? (
          <div className="px-5 py-12 text-center text-muted-foreground text-sm">No audit entries yet</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Time</th>
                    <th className="px-5 py-3 font-medium">Action</th>
                    <th className="px-5 py-3 font-medium">Target</th>
                    <th className="px-5 py-3 font-medium">Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogEntries.map((entry) => (
                    <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{entry.timestamp.toLocaleString()}</td>
                      <td className="px-5 py-3 text-white font-mono text-xs">{entry.action.replace(/_/g, ' ')}</td>
                      <td className="px-5 py-3 text-muted-foreground">{entry.target ?? '—'}</td>
                      <td className="px-5 py-3 text-muted-foreground font-mono text-xs truncate max-w-[120px]" title={entry.adminUid}>
                        {entry.adminUid.slice(0, 8)}…
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hasMoreAuditLogs && (
              <div className="px-5 py-4 flex justify-center border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMoreAuditLogs}
                  className="border-admin-border text-admin-fg-muted hover:bg-admin-surface-inset hover:text-white"
                >
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Platform Admins (manage_admins only) */}
      {admin?.permissions?.includes('manage_admins') && (
        <div className="rounded-2xl border border-admin-border bg-admin-card/80 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-white">Platform Admins</h3>
            <Button size="sm" onClick={() => setShowAddDialog(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Admin
            </Button>
          </div>
          <div className="space-y-3">
            {platformAdmins.map((a) => (
              <div
                key={a.uid}
                className="flex items-center justify-between rounded-lg border border-admin-border/70 bg-admin-surface-inset p-3"
              >
                <div>
                  <p className="text-sm font-medium text-white">{a.displayName || a.email}</p>
                  <p className="font-mono text-xs text-slate-300">{a.email}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {PLATFORM_PERMISSIONS.map((perm) => (
                      <label key={perm} className="flex items-center gap-1.5 cursor-pointer">
                        <Checkbox
                          checked={a.permissions.includes(perm)}
                          onCheckedChange={(checked) => {
                            const next = checked ? [...new Set([...a.permissions, perm])] : a.permissions.filter((p) => p !== perm);
                            handleUpdatePlatformAdminPermissions(a.uid, next);
                          }}
                        />
                        <span className="text-xs text-slate-300">{PERMISSION_LABELS[perm]}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemovePlatformAdmin(a.uid)}
                  disabled={a.uid === admin.uid}
                  className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogContent className="max-w-md border-admin-border bg-admin-card text-white">
              <DialogHeader>
                <DialogTitle>Add Platform Admin</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <Input
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="mt-1 border-admin-border bg-admin-surface-inset text-white"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Display name</Label>
                  <Input
                    value={addDisplayName}
                    onChange={(e) => setAddDisplayName(e.target.value)}
                    placeholder="Platform Admin"
                    className="mt-1 border-admin-border bg-admin-surface-inset text-white"
                  />
                </div>
                <p className="text-xs text-muted-foreground">They will need to visit /admin/login to set their password.</p>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowAddDialog(false)} className="border-border">
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleAdd} disabled={adding || !addEmail.trim()}>
                    {adding ? 'Adding...' : 'Add'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
