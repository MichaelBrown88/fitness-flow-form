/**
 * Platform Dashboard – Organizations Tab
 *
 * Org lifecycle (Pipeline, Active, Churned), full org table with search, filters, sort, org detail modal, load more.
 */

import { GitBranch, Search, Building2, ArrowUpRight, ArrowDownRight, Eye, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { OrganizationSummary } from '@/types/platform';
import type { CoachStats, FeatureCost } from '@/hooks/usePlatformDashboard';
import type { SortField } from '@/hooks/usePlatformDashboard';
import type { Region } from '@/constants/pricing';

export interface PlatformDashboardOrganizationsTabProps {
  metrics: { trialOrganizations: number; activeOrganizations: number; churnsLifetime?: number } | null;
  formatNumber: (num: number) => string;
  filteredOrganizations: OrganizationSummary[];
  sortedOrganizations: OrganizationSummary[];
  searchQuery: string;
  filterStatus: string;
  filterRegion: string;
  filterIncomplete: boolean;
  filterTest: boolean;
  setSearchQuery: (v: string) => void;
  setFilterStatus: (v: string) => void;
  setFilterRegion: (v: string) => void;
  setFilterIncomplete: (v: boolean) => void;
  setFilterTest: (v: boolean) => void;
  handleSort: (field: SortField) => void;
  sortField: SortField;
  sortDirection: 'asc' | 'desc';
  setSelectedOrg: (org: OrganizationSummary | null) => void;
  formatCurrency: (amountInSmallestUnit: number, currency?: 'GBP' | 'USD' | 'KWD') => string;
  formatFeatureName: (feature: string) => string;
  getStatusColor: (status: string, isComped?: boolean) => string;
  getStatusLabel: (status: string, isComped?: boolean) => string;
  getActivityColor: (daysSince: number) => string;
  getDaysSince: (date?: Date) => number;
  loadMoreOrganizations: () => Promise<void>;
  hasMoreOrganizations: boolean;
  orgAiCostsByFeature: Record<string, FeatureCost[]>;
  orgCoachesWithStats: Record<string, CoachStats[]>;
  navigateToOrg: (orgId: string) => void;
  selectedOrg: OrganizationSummary | null;
  REGIONS: readonly Region[];
  REGION_LABELS: Record<Region, string>;
}

export function PlatformDashboardOrganizationsTab({
  metrics,
  formatNumber,
  filteredOrganizations,
  searchQuery,
  filterStatus,
  filterRegion,
  filterIncomplete,
  filterTest,
  setSearchQuery,
  setFilterStatus,
  setFilterRegion,
  setFilterIncomplete,
  setFilterTest,
  handleSort,
  sortField,
  sortDirection,
  setSelectedOrg,
  formatCurrency,
  formatFeatureName,
  getStatusColor,
  getStatusLabel,
  getActivityColor,
  getDaysSince,
  loadMoreOrganizations,
  hasMoreOrganizations,
  orgAiCostsByFeature,
  orgCoachesWithStats,
  navigateToOrg,
  selectedOrg,
  REGIONS,
  REGION_LABELS,
}: PlatformDashboardOrganizationsTabProps) {
  return (
    <div className="space-y-8">
      {/* Org Lifecycle */}
      <div className="bg-foreground/50 border border-border rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-indigo-400" />
          Org Lifecycle
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Pipeline (in trial), Active (paying), Churned (cancelled, lifetime total).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-muted/40 border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Pipeline (Trial)</p>
            <p className="text-xl font-bold text-amber-400">{formatNumber(metrics?.trialOrganizations ?? 0)}</p>
          </div>
          <div className="bg-muted/40 border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Active</p>
            <p className="text-xl font-bold text-emerald-400">{formatNumber(metrics?.activeOrganizations ?? 0)}</p>
          </div>
          <div className="bg-muted/40 border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Churned (total)</p>
            <p className="text-xl font-bold text-red-400">{formatNumber(metrics?.churnsLifetime ?? 0)}</p>
          </div>
        </div>
      </div>

      <div className="bg-foreground/50 border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-white font-semibold">Organizations</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:flex-initial min-w-[140px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search orgs..."
              className="pl-8 h-9 bg-foreground/90 border-border text-white w-full sm:w-44"
            />
          </div>
          <Select value={filterStatus || 'all'} onValueChange={(v) => setFilterStatus(v === 'all' ? '' : v)}>
            <SelectTrigger className="h-9 w-28 bg-foreground/90 border-border text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="comped">Comped</SelectItem>
              <SelectItem value="none">None</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterRegion || 'all'} onValueChange={(v) => setFilterRegion(v === 'all' ? '' : v)}>
            <SelectTrigger className="h-9 w-28 bg-foreground/90 border-border text-white">
              <SelectValue placeholder="Region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All regions</SelectItem>
              {REGIONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {REGION_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={filterIncomplete} onCheckedChange={(c) => setFilterIncomplete(!!c)} />
            <span className="text-xs text-muted-foreground whitespace-nowrap">Incomplete only</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={filterTest} onCheckedChange={(c) => setFilterTest(!!c)} />
            <span className="text-xs text-muted-foreground whitespace-nowrap">Test only</span>
          </label>
        </div>
        <span className="text-xs text-muted-foreground">{filteredOrganizations.length} shown</span>
      </div>

      {filteredOrganizations.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <Building2 className="w-12 h-12 text-foreground-secondary mx-auto mb-3" />
          <p className="text-muted-foreground">No organizations yet</p>
          <p className="text-xs text-foreground-secondary mt-1">Organizations will appear here as they sign up</p>
        </div>
      ) : (
        <>
          <div className="px-5 py-3 border-b border-border grid grid-cols-12 gap-4 text-xs text-muted-foreground font-medium">
            <button
              onClick={() => handleSort('name')}
              className="col-span-2 text-left hover:text-muted-foreground flex items-center gap-1"
            >
              Organization
              {sortField === 'name' && (sortDirection === 'asc' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />)}
            </button>
            <div className="col-span-1">Region</div>
            <div className="col-span-1">Plan</div>
            <div className="col-span-1">Fee</div>
            <div className="col-span-1">Coaches</div>
            <div className="col-span-1">Clients</div>
            <button
              onClick={() => handleSort('assessments')}
              className="col-span-1 text-left hover:text-muted-foreground flex items-center gap-1"
            >
              Assessments
              {sortField === 'assessments' && (sortDirection === 'asc' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />)}
            </button>
            <button
              onClick={() => handleSort('aiCost')}
              className="col-span-1 text-left hover:text-muted-foreground flex items-center gap-1"
            >
              AI Cost
              {sortField === 'aiCost' && (sortDirection === 'asc' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />)}
            </button>
            <button
              onClick={() => handleSort('lastActive')}
              className="col-span-1 text-left hover:text-muted-foreground flex items-center gap-1"
            >
              Last Active
              {sortField === 'lastActive' && (sortDirection === 'asc' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />)}
            </button>
            <div className="col-span-1">Status</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>

          <div className="divide-y divide-border">
            {filteredOrganizations.map((org) => {
              const daysSince = getDaysSince(org.lastActiveDate);
              return (
                <div key={org.id} className="px-5 py-4 hover:bg-muted/30 transition-colors">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-2 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-foreground/90 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{org.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{org.type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <div className="col-span-1">
                      <span className="text-xs text-muted-foreground">{org.region ?? '—'}</span>
                    </div>
                    <div className="col-span-1">
                      <span className="text-xs text-muted-foreground">{org.seatBlock != null ? `${org.seatBlock} clients` : (org.plan ?? '—')}</span>
                    </div>
                    <div className="col-span-1">
                      {org.isComped ? (
                        <span className="text-violet-400 text-xs">Comped</span>
                      ) : org.currency && org.monthlyAmountLocal != null ? (
                        <span className="text-sm text-white">
                          {formatCurrency(org.monthlyAmountLocal * (org.currency === 'KWD' ? 1000 : 100), org.currency as 'GBP' | 'USD' | 'KWD')}
                        </span>
                      ) : (
                        <span className="text-sm text-white">{formatCurrency((org.monthlyFeeKwd ?? 0) * 1000, 'KWD')}</span>
                      )}
                    </div>
                    <div className="col-span-1">
                      <span className="text-sm text-white">{org.coachCount}</span>
                    </div>
                    <div className="col-span-1">
                      <span className="text-sm text-white">{org.clientCount}</span>
                    </div>
                    <div className="col-span-1">
                      <span className="text-sm text-white">{org.assessmentCount}</span>
                      {org.assessmentsThisMonth != null && org.assessmentsThisMonth > 0 && (
                        <span className="text-xs text-muted-foreground block">MTD: {org.assessmentsThisMonth}</span>
                      )}
                    </div>
                    <div className="col-span-1">
                      <span className="text-sm text-amber-400">{formatCurrency(org.aiCostsMtdCents, 'GBP')}</span>
                    </div>
                    <div className="col-span-1">
                      {org.lastActiveDate ? (
                        <span className={`text-xs ${getActivityColor(daysSince)}`}>
                          {daysSince === 0 ? 'Today' : daysSince === 1 ? 'Yesterday' : `${daysSince}d ago`}
                        </span>
                      ) : (
                        <span className="text-xs text-foreground-secondary">Never</span>
                      )}
                    </div>
                    <div className="col-span-1">
                      <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(org.status, org.isComped)}`}>
                        {getStatusLabel(org.status, org.isComped)}
                      </span>
                    </div>
                    <div className="col-span-1 flex items-center justify-end gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-9 w-9 sm:h-8 sm:w-8 p-0 text-muted-foreground hover:text-white"
                            onClick={() => setSelectedOrg(org)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-foreground border-border text-white max-w-2xl">
                          <DialogHeader>
                            <DialogTitle className="text-white">{org.name} - Details</DialogTitle>
                          </DialogHeader>
                          {selectedOrg && (
                            <OrgDetailContent
                              org={selectedOrg}
                              formatCurrency={formatCurrency}
                              formatFeatureName={formatFeatureName}
                              orgCoachesWithStats={orgCoachesWithStats}
                              orgAiCostsByFeature={orgAiCostsByFeature}
                              navigateToOrg={navigateToOrg}
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {hasMoreOrganizations && (
            <div className="px-5 py-4 flex justify-center border-t border-border">
              <Button variant="outline" size="sm" onClick={loadMoreOrganizations} className="border-border text-muted-foreground/60 hover:bg-foreground/90">
                Load more
              </Button>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}

function OrgDetailContent({
  org,
  formatCurrency,
  formatFeatureName,
  orgCoachesWithStats,
  orgAiCostsByFeature,
  navigateToOrg,
}: {
  org: OrganizationSummary;
  formatCurrency: (amountInSmallestUnit: number, currency?: 'GBP' | 'USD' | 'KWD') => string;
  formatFeatureName: (feature: string) => string;
  orgCoachesWithStats: Record<string, CoachStats[]>;
  orgAiCostsByFeature: Record<string, FeatureCost[]>;
  navigateToOrg: (orgId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Organization ID</p>
          <p className="text-sm text-muted-foreground/60 font-mono">{org.id}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Type</p>
          <p className="text-sm text-muted-foreground/60 capitalize">{org.type.replace('_', ' ')}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Region</p>
          <p className="text-sm text-muted-foreground/60">{org.region ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Plan</p>
          <p className="text-sm text-muted-foreground/60 capitalize">{org.plan}</p>
          {(org.seatBlock ?? org.clientSeats) != null && (org.seatBlock ?? org.clientSeats)! > 0 && (
            <p className="text-xs text-muted-foreground mt-1">{org.seatBlock ?? org.clientSeats} clients (plan)</p>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Monthly Fee</p>
          <p className="text-sm text-muted-foreground/60">
            {org.isComped ? (
              <span className="text-violet-400 font-medium">Comped (Free)</span>
            ) : org.currency && org.monthlyAmountLocal != null ? (
              formatCurrency(org.monthlyAmountLocal * (org.currency === 'KWD' ? 1000 : 100), org.currency as 'GBP' | 'USD' | 'KWD')
            ) : (
              org.monthlyFeeKwd != null ? formatCurrency((org.monthlyFeeKwd as number) * 1000, 'KWD') : '—'
            )}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Custom branding</p>
          <p className="text-sm text-muted-foreground/60">
            {org.customBrandingEnabled ? (
              <span className="text-emerald-400">
                Enabled{org.customBrandingPaidAt ? ` (${org.customBrandingPaidAt.toLocaleDateString()})` : ''}
              </span>
            ) : (
              'Not purchased'
            )}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Status</p>
          <p className="text-sm text-muted-foreground/60 capitalize">{org.status}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Created</p>
          <p className="text-sm text-muted-foreground/60">{org.createdAt.toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Trial Ends</p>
          <p className="text-sm text-muted-foreground/60">{org.trialEndsAt?.toLocaleDateString() || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Coaches</p>
          <p className="text-sm text-muted-foreground/60">{org.coachCount}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Clients</p>
          <p className="text-sm text-muted-foreground/60">{org.clientCount}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Assessments</p>
          <p className="text-sm text-muted-foreground/60">{org.assessmentCount}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">AI Costs (MTD)</p>
          <p className="text-sm text-amber-400">{formatCurrency(org.aiCostsMtdCents, 'GBP')}</p>
        </div>
      </div>

      {orgCoachesWithStats[org.id] && orgCoachesWithStats[org.id].length > 0 && (
        <div className="pt-4 border-t border-border">
          <h4 className="text-sm font-medium text-muted-foreground/60 mb-3">Coaches & Activity</h4>
          <div className="space-y-2">
            {orgCoachesWithStats[org.id].map((coach) => (
              <div key={coach.uid} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground/60 font-medium">{coach.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {coach.role === 'org_admin' ? 'Admin' : 'Coach'} • {coach.clientCount} client{coach.clientCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white font-semibold">{coach.assessmentCount}</p>
                  <p className="text-xs text-muted-foreground">assessment{coach.assessmentCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {org.dataAccessPermission?.platformAdminAccess !== true &&
        org.isComped !== true &&
        (!orgCoachesWithStats[org.id] || orgCoachesWithStats[org.id].length === 0) && (
          <div className="pt-4 border-t border-border">
            <div className="p-3 bg-muted/30 rounded-lg border border-amber-500/30">
              <p className="text-xs text-amber-400">Data access restricted. Visit organization details to request access.</p>
            </div>
          </div>
        )}

      {orgAiCostsByFeature[org.id] && orgAiCostsByFeature[org.id].length > 0 && (
        <div className="pt-4 border-t border-border">
          <h4 className="text-sm font-medium text-muted-foreground/60 mb-3">AI Costs by Feature (MTD)</h4>
          <div className="space-y-2">
            {orgAiCostsByFeature[org.id].map((item) => (
              <div key={item.feature} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground/60 font-medium">{formatFeatureName(item.feature)}</p>
                  <p className="text-xs text-muted-foreground">{item.count} requests</p>
                </div>
                <p className="text-xs text-amber-400 font-medium">{formatCurrency(item.costGbpPence, 'GBP')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-4 border-t border-border">
        <Button size="sm" variant="outline" className="text-xs border-border text-muted-foreground/60 hover:bg-muted" onClick={() => navigateToOrg(org.id)}>
          <Settings className="w-3 h-3 mr-1" />
          Manage Subscription
        </Button>
      </div>
    </div>
  );
}
