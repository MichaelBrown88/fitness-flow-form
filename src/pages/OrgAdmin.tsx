/**
 * Organization Admin Dashboard
 * 
 * For organization administrators to view:
 * - Their subscription plan and package details
 * - Seat usage (coaches, clients)
 * - Monthly fee breakdown
 * - Options to upgrade/change packages
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirebaseAuth } from '@/services/firebase';
import { useAuth } from '@/hooks/useAuth';
import { getOrganizationDetails } from '@/services/platformAdmin';
import { getOrgCoachesWithStats } from '@/services/platformAdmin';
import { getOrgCoaches, addCoachToOrganization, removeCoachFromOrganization } from '@/services/coachManagement';
import { calculateMonthlyFee } from '@/lib/pricing';
import type { OrganizationDetails } from '@/types/platform';
import { 
  Building2, 
  Users, 
  FileText, 
  Package,
  TrendingUp,
  ArrowRight,
  LogOut,
  Settings as SettingsIcon,
  UserPlus,
  X,
  Mail,
  AlertTriangle,
  Clock,
  UserX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/utils/logger';
import AppShell from '@/components/layout/AppShell';
import { useOrgRetention } from '@/hooks/useOrgRetention';
import { Badge } from '@/components/ui/badge';

const OrgAdmin = () => {
  const navigate = useNavigate();
  const { user, profile, effectiveOrgId } = useAuth();
  const { toast } = useToast();
  const [orgDetails, setOrgDetails] = useState<OrganizationDetails | null>(null);
  const [coaches, setCoaches] = useState<Array<{ uid: string; displayName: string; email?: string; role: string; assessmentCount: number; clientCount: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCoachDialog, setShowAddCoachDialog] = useState(false);
  const [newCoachEmail, setNewCoachEmail] = useState('');
  const [addingCoach, setAddingCoach] = useState(false);
  const [removingCoach, setRemovingCoach] = useState<string | null>(null);

  // Use effectiveOrgId for reads (supports impersonation), profile.organizationId for writes
  const readOrgId = effectiveOrgId || profile?.organizationId;

  // Retention analytics (uses read org for impersonation support)
  const { 
    summary: retentionSummary, 
    atRiskClients, 
    criticalClients,
    coachMetrics,
    loading: retentionLoading 
  } = useOrgRetention(readOrgId, coaches);
  
  // Create a map of coach metrics for easy lookup
  const coachMetricsMap = new Map(coachMetrics.map(m => [m.uid, m]));

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (!authUser || !readOrgId) {
        navigate('/dashboard', { replace: true });
        return;
      }

      // Verify user is an org admin or platform admin (impersonation)
      if (profile?.role !== 'org_admin' && !effectiveOrgId) {
        logger.warn('User is not an organization admin:', profile?.role);
        navigate('/dashboard', { replace: true });
        return;
      }

      // Load organization details (uses readOrgId for impersonation)
      try {
        const orgData = await getOrganizationDetails(readOrgId);
        setOrgDetails(orgData);

        // Load coaches with stats - use coachManagement service for org admins
        // (getOrgCoachesWithStats requires platform admin permissions)
        const coachesData = await getOrgCoaches(readOrgId);
        setCoaches(coachesData);
      } catch (error) {
        logger.error('Failed to load organization details:', error);
        // Fallback: try platform admin method if available
        try {
          const coachesData = await getOrgCoachesWithStats(readOrgId);
          setCoaches(coachesData);
        } catch (fallbackError) {
          logger.warn('Failed to load coaches with stats, using empty array:', fallbackError);
          setCoaches([]);
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate, profile]);

  if (loading) {
    return (
      <AppShell title="Organization Admin" subtitle="Loading...">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-slate-400 flex items-center gap-2">
            <Building2 className="w-4 h-4 animate-pulse" />
            Loading organization details...
          </div>
        </div>
      </AppShell>
    );
  }

  if (!orgDetails) {
    return (
      <AppShell title="Organization Admin" subtitle="Organization not found">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <p className="text-slate-400">Organization details not found</p>
            <Button onClick={() => navigate('/dashboard')} variant="outline">
              Back to Dashboard
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  // Use the calculated monthly fee and client seats from orgDetails (set during onboarding)
  const monthlyFee = orgDetails.monthlyFeeKwd ?? calculateMonthlyFee(
    orgDetails.plan || 'free',
    orgDetails.clientSeats || 0
  );

  const totalClientSeats = coaches.reduce((sum, coach) => sum + coach.clientCount, 0);
  const maxSeats = orgDetails.clientSeats || 0;
  const seatsUsedPercentage = maxSeats > 0 ? (totalClientSeats / maxSeats) * 100 : 0;

  const handleAddCoach = async () => {
    if (!profile?.organizationId || !newCoachEmail.trim()) return;
    
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    if (!emailRegex.test(newCoachEmail)) {
      toast({ 
        title: 'Invalid email', 
        description: 'Please enter a valid email address.',
        variant: 'destructive' 
      });
      return;
    }

    setAddingCoach(true);
    try {
      const result = await addCoachToOrganization(profile.organizationId, newCoachEmail.trim());
      
      if (result.success) {
        toast({ 
          title: 'Coach added', 
          description: `${newCoachEmail} has been added to your organization.` 
        });
        setNewCoachEmail('');
        setShowAddCoachDialog(false);
        
        // Reload coaches list (use readOrgId for consistency)
        const updatedCoaches = await getOrgCoaches(readOrgId!);
        setCoaches(updatedCoaches);
        
        // Reload org details to update coach count
        const updatedOrg = await getOrganizationDetails(readOrgId!);
        setOrgDetails(updatedOrg);
      } else {
        toast({ 
          title: 'Failed to add coach', 
          description: result.error || 'Unknown error occurred.',
          variant: 'destructive' 
        });
      }
    } catch (error) {
      logger.error('Error adding coach:', error);
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to add coach',
        variant: 'destructive' 
      });
    } finally {
      setAddingCoach(false);
    }
  };

  const handleRemoveCoach = async (coachUid: string, coachName: string) => {
    if (!profile?.organizationId || !confirm(`Remove ${coachName} from your organization? They will lose access to all organization data.`)) {
      return;
    }

    setRemovingCoach(coachUid);
    try {
      const result = await removeCoachFromOrganization(profile.organizationId, coachUid);
      
      if (result.success) {
        toast({ 
          title: 'Coach removed', 
          description: `${coachName} has been removed from your organization.` 
        });
        
        // Reload coaches list (use readOrgId for consistency)
        const updatedCoaches = await getOrgCoaches(readOrgId!);
        setCoaches(updatedCoaches);
        
        // Reload org details to update coach count
        const updatedOrg = await getOrganizationDetails(readOrgId!);
        setOrgDetails(updatedOrg);
      } else {
        toast({ 
          title: 'Failed to remove coach', 
          description: result.error || 'Unknown error occurred.',
          variant: 'destructive' 
        });
      }
    } catch (error) {
      logger.error('Error removing coach:', error);
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to remove coach',
        variant: 'destructive' 
      });
    } finally {
      setRemovingCoach(null);
    }
  };

  return (
    <AppShell 
      title="Organization Admin" 
      subtitle={`Manage ${orgDetails.name || 'your organization'}`}
    >
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-12 sm:pb-20">
        {/* Subscription Overview */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
              <div>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Package className="w-4 h-4 sm:w-5 sm:h-5 text-gradient-dark" />
                  Subscription Plan
                </CardTitle>
                <CardDescription className="mt-1 text-xs sm:text-sm">
                  Your current package and usage
                </CardDescription>
              </div>
              {orgDetails.isComped ? (
                <span className="px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium bg-gradient-light text-gradient-dark border border-border-medium">
                  Comped
                </span>
              ) : (
                <span className={`px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium border ${
                  orgDetails.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  orgDetails.status === 'trial' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-slate-100 text-slate-600 border-slate-300'
                }`}>
                  {orgDetails.status || 'none'}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-slate-50 rounded-lg p-3 sm:p-4 border border-slate-200">
                <p className="text-[10px] sm:text-xs text-foreground-secondary mb-1 font-medium">Plan</p>
                <p className="text-lg sm:text-xl font-semibold text-foreground capitalize">{orgDetails.plan || 'free'}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 sm:p-4 border border-slate-200">
                <p className="text-[10px] sm:text-xs text-foreground-secondary mb-1 font-medium">Monthly Fee</p>
                <p className="text-lg sm:text-xl font-semibold text-foreground">
                  {orgDetails.isComped ? (
                    <span className="text-gradient-dark">Free</span>
                  ) : (
                    new Intl.NumberFormat('en-KW', { 
                      style: 'currency', 
                      currency: 'KWD',
                      minimumFractionDigits: 2 
                    }).format(monthlyFee)
                  )}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 sm:p-4 border border-slate-200 sm:col-span-2 md:col-span-1">
                <p className="text-[10px] sm:text-xs text-foreground-secondary mb-1 font-medium">Client Seats</p>
                <p className="text-lg sm:text-xl font-semibold text-foreground">
                  {maxSeats > 0 ? `${totalClientSeats} / ${maxSeats}` : totalClientSeats}
                  {maxSeats > 0 && (
                    <span className={`text-[10px] sm:text-xs ml-2 font-medium ${
                      seatsUsedPercentage >= 90 ? 'text-red-600' :
                      seatsUsedPercentage >= 75 ? 'text-amber-600' :
                      'text-foreground-secondary'
                    }`}>
                      ({Math.round(seatsUsedPercentage)}% used)
                    </span>
                  )}
                </p>
                {maxSeats > 0 && seatsUsedPercentage >= 90 && (
                  <p className="text-[10px] sm:text-xs text-red-600 mt-1 font-medium">
                    ⚠️ Nearly at capacity - consider upgrading
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="pb-2 sm:pb-3 p-4 sm:p-6">
              <CardTitle className="text-xs sm:text-sm text-foreground-secondary flex items-center gap-1.5 sm:gap-2 font-medium">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Coaches
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{orgDetails.coachCount}</p>
              <p className="text-[10px] sm:text-xs text-foreground-secondary mt-1">Active coaches in your organization</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 sm:pb-3 p-4 sm:p-6">
              <CardTitle className="text-xs sm:text-sm text-foreground-secondary flex items-center gap-1.5 sm:gap-2 font-medium">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Clients
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{totalClientSeats}</p>
              <p className="text-[10px] sm:text-xs text-foreground-secondary mt-1">Total clients across all coaches</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 sm:pb-3 p-4 sm:p-6">
              <CardTitle className="text-xs sm:text-sm text-foreground-secondary flex items-center gap-1.5 sm:gap-2 font-medium">
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Assessments
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{orgDetails.assessmentCount}</p>
              <p className="text-[10px] sm:text-xs text-foreground-secondary mt-1">Total assessments completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Coach Management */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
              <div>
                <CardTitle className="text-base sm:text-lg">Coaches</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Manage your organization's coaches
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setShowAddCoachDialog(true)}
                className="gradient-bg text-white hover:opacity-90 text-xs sm:text-sm h-8 sm:h-9"
              >
                <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                Add Coach
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {coaches.length === 0 ? (
              <div className="p-6 sm:p-8 rounded-lg border-2 border-dashed border-border text-center">
                <Users className="w-8 h-8 sm:w-10 sm:h-10 text-foreground-tertiary mx-auto mb-2 sm:mb-3" />
                <p className="text-foreground-secondary text-xs sm:text-sm mb-3 sm:mb-4">No coaches added yet</p>
                <Button
                  size="sm"
                  onClick={() => setShowAddCoachDialog(true)}
                  variant="outline"
                  className="text-xs sm:text-sm h-8 sm:h-9"
                >
                  <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  Add Your First Coach
                </Button>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {coaches.map((coach) => {
                  const metrics = coachMetricsMap.get(coach.uid);
                  const atRiskCount = metrics?.atRiskClients || 0;
                  const avgDays = metrics?.averageDaysSinceAssessment || 0;
                  
                  return (
                    <div 
                      key={coach.uid}
                      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 p-3 sm:p-4 rounded-lg border transition-colors ${
                        atRiskCount > 0 
                          ? 'bg-amber-50/50 border-amber-200 hover:border-amber-300' 
                          : 'bg-slate-50 border-slate-200 hover:border-border-medium'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs sm:text-sm font-medium text-foreground truncate">{coach.displayName}</p>
                          {coach.role === 'org_admin' && (
                            <span className="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-gradient-light text-gradient-dark border border-border-medium shrink-0">
                              Admin
                            </span>
                          )}
                          {atRiskCount > 0 && (
                            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 text-[9px] sm:text-[10px]">
                              <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                              {atRiskCount} at risk
                            </Badge>
                          )}
                        </div>
                        {coach.email && (
                          <div className="flex items-center gap-1 mt-1">
                            <Mail className="w-3 h-3 text-foreground-tertiary shrink-0" />
                            <p className="text-[10px] sm:text-xs text-foreground-secondary truncate">{coach.email}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 sm:gap-5 text-xs sm:text-sm w-full sm:w-auto justify-between sm:justify-end">
                        <div className="text-left sm:text-right">
                          <p className="text-foreground-secondary text-[10px] sm:text-xs">Clients</p>
                          <p className="text-foreground font-medium text-xs sm:text-sm">{coach.clientCount}</p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-foreground-secondary text-[10px] sm:text-xs">Assessments</p>
                          <p className="text-foreground font-medium text-xs sm:text-sm">{coach.assessmentCount}</p>
                        </div>
                        <div className="text-left sm:text-right hidden sm:block">
                          <p className="text-foreground-secondary text-[10px] sm:text-xs">Avg Days</p>
                          <p className={`font-medium text-xs sm:text-sm ${
                            avgDays > 60 ? 'text-red-600' : 
                            avgDays > 30 ? 'text-amber-600' : 
                            'text-emerald-600'
                          }`}>
                            {avgDays > 0 ? `${avgDays}d` : '—'}
                          </p>
                        </div>
                        {coach.role !== 'org_admin' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveCoach(coach.uid, coach.displayName)}
                            disabled={removingCoach === coach.uid}
                            className="text-foreground-tertiary hover:text-red-600 hover:bg-red-50 h-7 w-7 sm:h-8 sm:w-8 p-0 shrink-0"
                          >
                            {removingCoach === coach.uid ? (
                              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-foreground-tertiary border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Client Retention Analytics */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
              <div>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                  Client Retention
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Identify clients at risk of churn
                </CardDescription>
              </div>
              {retentionSummary.atRiskClients > 0 && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {retentionSummary.atRiskClients} at risk
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {retentionLoading ? (
              <div className="text-center py-6 text-foreground-secondary text-sm">
                Loading retention data...
              </div>
            ) : retentionSummary.totalClients === 0 ? (
              <div className="text-center py-6 text-foreground-secondary text-sm">
                No client data yet. Retention analytics will appear once you have clients.
              </div>
            ) : (
              <>
                {/* Summary Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-center">
                    <p className="text-lg sm:text-xl font-bold text-foreground">{retentionSummary.totalClients}</p>
                    <p className="text-[10px] sm:text-xs text-foreground-secondary">Total Clients</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200 text-center">
                    <p className="text-lg sm:text-xl font-bold text-emerald-700">
                      {retentionSummary.totalClients - retentionSummary.clientsNeedingAttention}
                    </p>
                    <p className="text-[10px] sm:text-xs text-emerald-600">Healthy (&lt;30d)</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-200 text-center">
                    <p className="text-lg sm:text-xl font-bold text-amber-700">{retentionSummary.clientsNeedingAttention}</p>
                    <p className="text-[10px] sm:text-xs text-amber-600">Need Attention (30-60d)</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 border border-red-200 text-center">
                    <p className="text-lg sm:text-xl font-bold text-red-700">{retentionSummary.clientsAtRiskOfChurn}</p>
                    <p className="text-[10px] sm:text-xs text-red-600">At Risk (&gt;60d)</p>
                  </div>
                </div>

                {/* Critical Clients List */}
                {criticalClients.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-red-600 flex items-center gap-1.5">
                      <UserX className="w-3.5 h-3.5" />
                      Critical - No Assessment in 90+ Days
                    </h4>
                    <div className="space-y-2">
                      {criticalClients.slice(0, 5).map((client) => (
                        <div 
                          key={client.id}
                          className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
                            {client.assignedCoachName && (
                              <p className="text-[10px] text-foreground-secondary">Coach: {client.assignedCoachName}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <Badge variant="destructive" className="text-[10px]">
                              {client.daysSinceAssessment >= 999 ? 'Never' : `${client.daysSinceAssessment}d ago`}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {criticalClients.length > 5 && (
                        <p className="text-xs text-foreground-secondary text-center pt-2">
                          +{criticalClients.length - 5} more critical clients
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* At-Risk Clients List */}
                {atRiskClients.length > 0 && (
                  <div className={`space-y-2 ${criticalClients.length > 0 ? 'mt-6' : ''}`}>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      At Risk - No Assessment in 60-90 Days
                    </h4>
                    <div className="space-y-2">
                      {atRiskClients.slice(0, 5).map((client) => (
                        <div 
                          key={client.id}
                          className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
                            {client.assignedCoachName && (
                              <p className="text-[10px] text-foreground-secondary">Coach: {client.assignedCoachName}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 text-[10px]">
                              {client.daysSinceAssessment}d ago
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {atRiskClients.length > 5 && (
                        <p className="text-xs text-foreground-secondary text-center pt-2">
                          +{atRiskClients.length - 5} more at-risk clients
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* All healthy message */}
                {criticalClients.length === 0 && atRiskClients.length === 0 && retentionSummary.totalClients > 0 && (
                  <div className="text-center py-4 text-emerald-600 text-sm">
                    All clients have been assessed within the last 60 days. Great job!
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Manage Subscription</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Upgrade your plan or contact support
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/settings')}
              >
                <SettingsIcon className="w-4 h-4 mr-2" />
                Organization Settings
              </Button>
              <Button 
                variant="outline" 
                className="w-full border-gradient-dark text-gradient-dark hover:bg-gradient-light"
                onClick={() => {
                  alert('Plan upgrade flow coming soon. Please contact support for plan changes.');
                }}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Upgrade Plan
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Coach Dialog */}
      <Dialog open={showAddCoachDialog} onOpenChange={setShowAddCoachDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-gradient-dark" />
              Add Coach to Organization
            </DialogTitle>
            <DialogDescription>
              Add a coach by their email address. They must already have a FitnessFlow account.
              <br />
              <span className="text-xs text-amber-600 mt-2 block">
                Note: Full invitation system with email sending will be implemented in a future update.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm mb-2 block">Coach Email</Label>
              <Input
                type="email"
                placeholder="coach@example.com"
                value={newCoachEmail}
                onChange={(e) => setNewCoachEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCoachEmail.trim()) {
                    handleAddCoach();
                  }
                }}
                disabled={addingCoach}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddCoachDialog(false);
                setNewCoachEmail('');
              }}
              disabled={addingCoach}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddCoach}
              disabled={addingCoach || !newCoachEmail.trim()}
              className="gradient-bg text-white hover:opacity-90"
            >
              {addingCoach ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Coach
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default OrgAdmin;