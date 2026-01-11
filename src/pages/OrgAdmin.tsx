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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/utils/logger';
import AppShell from '@/components/layout/AppShell';

const OrgAdmin = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [orgDetails, setOrgDetails] = useState<OrganizationDetails | null>(null);
  const [coaches, setCoaches] = useState<Array<{ uid: string; displayName: string; email?: string; role: string; assessmentCount: number; clientCount: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCoachDialog, setShowAddCoachDialog] = useState(false);
  const [newCoachEmail, setNewCoachEmail] = useState('');
  const [addingCoach, setAddingCoach] = useState(false);
  const [removingCoach, setRemovingCoach] = useState<string | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (!authUser || !profile?.organizationId) {
        navigate('/dashboard', { replace: true });
        return;
      }

      // Verify user is an org admin
      if (profile.role !== 'org_admin') {
        logger.warn('User is not an organization admin:', profile.role);
        navigate('/dashboard', { replace: true });
        return;
      }

      // Load organization details
      try {
        const orgData = await getOrganizationDetails(profile.organizationId);
        setOrgDetails(orgData);

        // Load coaches with stats - use coachManagement service for org admins
        // (getOrgCoachesWithStats requires platform admin permissions)
        const coachesData = await getOrgCoaches(profile.organizationId);
        setCoaches(coachesData);
      } catch (error) {
        logger.error('Failed to load organization details:', error);
        // Fallback: try platform admin method if available
        try {
          const coachesData = await getOrgCoachesWithStats(profile.organizationId);
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
        
        // Reload coaches list
        const updatedCoaches = await getOrgCoaches(profile.organizationId);
        setCoaches(updatedCoaches);
        
        // Reload org details to update coach count
        const updatedOrg = await getOrganizationDetails(profile.organizationId);
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
        
        // Reload coaches list
        const updatedCoaches = await getOrgCoaches(profile.organizationId);
        setCoaches(updatedCoaches);
        
        // Reload org details to update coach count
        const updatedOrg = await getOrganizationDetails(profile.organizationId);
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
      <div className="max-w-7xl mx-auto space-y-6 pb-20">
        {/* Subscription Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-gradient-dark" />
                  Subscription Plan
                </CardTitle>
                <CardDescription className="mt-1">
                  Your current package and usage
                </CardDescription>
              </div>
              {orgDetails.isComped ? (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-gradient-light text-gradient-dark border border-border-medium">
                  Comped
                </span>
              ) : (
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                  orgDetails.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  orgDetails.status === 'trial' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-slate-100 text-slate-600 border-slate-300'
                }`}>
                  {orgDetails.status || 'none'}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-xs text-foreground-secondary mb-1 font-medium">Plan</p>
                <p className="text-xl font-semibold text-foreground capitalize">{orgDetails.plan || 'free'}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-xs text-foreground-secondary mb-1 font-medium">Monthly Fee</p>
                <p className="text-xl font-semibold text-foreground">
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
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-xs text-foreground-secondary mb-1 font-medium">Client Seats</p>
                <p className="text-xl font-semibold text-foreground">
                  {maxSeats > 0 ? `${totalClientSeats} / ${maxSeats}` : totalClientSeats}
                  {maxSeats > 0 && (
                    <span className={`text-xs ml-2 font-medium ${
                      seatsUsedPercentage >= 90 ? 'text-red-600' :
                      seatsUsedPercentage >= 75 ? 'text-amber-600' :
                      'text-foreground-secondary'
                    }`}>
                      ({Math.round(seatsUsedPercentage)}% used)
                    </span>
                  )}
                </p>
                {maxSeats > 0 && seatsUsedPercentage >= 90 && (
                  <p className="text-xs text-red-600 mt-1 font-medium">
                    ⚠️ Nearly at capacity - consider upgrading
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-foreground-secondary flex items-center gap-2 font-medium">
                <Users className="w-4 h-4" />
                Coaches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{orgDetails.coachCount}</p>
              <p className="text-xs text-foreground-secondary mt-1">Active coaches in your organization</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-foreground-secondary flex items-center gap-2 font-medium">
                <Users className="w-4 h-4" />
                Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{totalClientSeats}</p>
              <p className="text-xs text-foreground-secondary mt-1">Total clients across all coaches</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-foreground-secondary flex items-center gap-2 font-medium">
                <FileText className="w-4 h-4" />
                Assessments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{orgDetails.assessmentCount}</p>
              <p className="text-xs text-foreground-secondary mt-1">Total assessments completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Coach Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Coaches</CardTitle>
                <CardDescription>
                  Manage your organization's coaches
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setShowAddCoachDialog(true)}
                className="gradient-bg text-white hover:opacity-90"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Coach
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {coaches.length === 0 ? (
              <div className="p-8 rounded-lg border-2 border-dashed border-border text-center">
                <Users className="w-10 h-10 text-foreground-tertiary mx-auto mb-3" />
                <p className="text-foreground-secondary text-sm mb-4">No coaches added yet</p>
                <Button
                  size="sm"
                  onClick={() => setShowAddCoachDialog(true)}
                  variant="outline"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Your First Coach
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {coaches.map((coach) => (
                  <div 
                    key={coach.uid}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-border-medium transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{coach.displayName}</p>
                        {coach.role === 'org_admin' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gradient-light text-gradient-dark border border-border-medium">
                            Admin
                          </span>
                        )}
                      </div>
                      {coach.email && (
                        <div className="flex items-center gap-1 mt-1">
                          <Mail className="w-3 h-3 text-foreground-tertiary" />
                          <p className="text-xs text-foreground-secondary">{coach.email}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <p className="text-foreground-secondary text-xs">Clients</p>
                        <p className="text-foreground font-medium">{coach.clientCount}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-foreground-secondary text-xs">Assessments</p>
                        <p className="text-foreground font-medium">{coach.assessmentCount}</p>
                      </div>
                      {coach.role !== 'org_admin' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveCoach(coach.uid, coach.displayName)}
                          disabled={removingCoach === coach.uid}
                          className="text-foreground-tertiary hover:text-red-600 hover:bg-red-50"
                        >
                          {removingCoach === coach.uid ? (
                            <div className="w-4 h-4 border-2 border-foreground-tertiary border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Manage Subscription</CardTitle>
            <CardDescription>
              Upgrade your plan or contact support
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                  // TODO: Link to upgrade/change plan flow
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