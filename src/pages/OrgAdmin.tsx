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
import { calculateMonthlyFee } from '@/lib/pricing';
import type { OrganizationDetails } from '@/types/platform';
import { 
  Building2, 
  Users, 
  FileText, 
  DollarSign,
  Package,
  TrendingUp,
  ArrowRight,
  LogOut,
  Settings as SettingsIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { logger } from '@/lib/utils/logger';
import AppShell from '@/components/layout/AppShell';

const OrgAdmin = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [orgDetails, setOrgDetails] = useState<OrganizationDetails | null>(null);
  const [coaches, setCoaches] = useState<Array<{ uid: string; displayName: string; email?: string; role: string; assessmentCount: number; clientCount: number }>>([]);
  const [loading, setLoading] = useState(true);

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

        // Load coaches with stats
        const coachesData = await getOrgCoachesWithStats(profile.organizationId);
        setCoaches(coachesData);
      } catch (error) {
        logger.error('Failed to load organization details:', error);
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

  const monthlyFee = orgDetails.monthlyFeeKwd ?? calculateMonthlyFee(
    orgDetails.plan || 'free',
    orgDetails.clientSeats || 0
  );

  const totalClientSeats = coaches.reduce((sum, coach) => sum + coach.clientCount, 0);
  const maxSeats = orgDetails.clientSeats || 0;

  return (
    <AppShell 
      title="Organization Admin" 
      subtitle={`Manage ${orgDetails.name || 'your organization'}`}
    >
      <div className="max-w-7xl mx-auto space-y-6 pb-20">
        {/* Subscription Overview */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-400" />
                  Subscription Plan
                </CardTitle>
                <CardDescription className="text-slate-400 mt-1">
                  Your current package and usage
                </CardDescription>
              </div>
              {orgDetails.isComped ? (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  Comped
                </span>
              ) : (
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                  orgDetails.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                  orgDetails.status === 'trial' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                  'bg-slate-500/20 text-slate-400 border-slate-500/30'
                }`}>
                  {orgDetails.status || 'none'}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <p className="text-xs text-slate-500 mb-1">Plan</p>
                <p className="text-xl font-semibold text-white capitalize">{orgDetails.plan || 'free'}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <p className="text-xs text-slate-500 mb-1">Monthly Fee</p>
                <p className="text-xl font-semibold text-white">
                  {orgDetails.isComped ? (
                    <span className="text-violet-400">Free</span>
                  ) : (
                    new Intl.NumberFormat('en-KW', { 
                      style: 'currency', 
                      currency: 'KWD',
                      minimumFractionDigits: 2 
                    }).format(monthlyFee)
                  )}
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <p className="text-xs text-slate-500 mb-1">Client Seats</p>
                <p className="text-xl font-semibold text-white">
                  {maxSeats > 0 ? `${totalClientSeats} / ${maxSeats}` : totalClientSeats}
                  {maxSeats > 0 && (
                    <span className="text-xs text-slate-500 ml-2">
                      ({Math.round((totalClientSeats / maxSeats) * 100)}% used)
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Coaches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">{orgDetails.coachCount}</p>
              <p className="text-xs text-slate-500 mt-1">Active coaches in your organization</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">{totalClientSeats}</p>
              <p className="text-xs text-slate-500 mt-1">Total clients across all coaches</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Assessments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">{orgDetails.assessmentCount}</p>
              <p className="text-xs text-slate-500 mt-1">Total assessments completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Coach Activity */}
        {coaches.length > 0 && (
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Coach Activity</CardTitle>
              <CardDescription className="text-slate-400">
                Usage breakdown by coach
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {coaches.map((coach) => (
                  <div 
                    key={coach.uid}
                    className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{coach.displayName}</p>
                      {coach.email && (
                        <p className="text-xs text-slate-500">{coach.email}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <p className="text-slate-400 text-xs">Clients</p>
                        <p className="text-white font-medium">{coach.clientCount}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-400 text-xs">Assessments</p>
                        <p className="text-white font-medium">{coach.assessmentCount}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Costs */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-500" />
              AI Usage Costs (This Month)
            </CardTitle>
            <CardDescription className="text-slate-400">
              Estimated costs for AI-powered features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <p className="text-3xl font-bold text-amber-400">
                {new Intl.NumberFormat('en-KW', { 
                  style: 'currency', 
                  currency: 'KWD',
                  minimumFractionDigits: 3 
                }).format((orgDetails.aiCostsMtdCents || 0) / 1000)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Month-to-date costs for posture analysis, OCR, and other AI features
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Manage Subscription</CardTitle>
            <CardDescription className="text-slate-400">
              Upgrade your plan or contact support
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full border-slate-700 text-slate-300 hover:bg-slate-700"
                onClick={() => navigate('/settings')}
              >
                <SettingsIcon className="w-4 h-4 mr-2" />
                Organization Settings
              </Button>
              <Button 
                variant="outline" 
                className="w-full border-indigo-700 text-indigo-300 hover:bg-indigo-900/20"
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
    </AppShell>
  );
};

export default OrgAdmin;