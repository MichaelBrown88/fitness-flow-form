/**
 * Organization admin layout: auth, data loading, tabs (Overview | Team | Retention | Billing), Outlet, Add Coach dialog.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Outlet, NavLink, useLocation } from 'react-router-dom';
import { getFirebaseAuth, getDb } from '@/services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { getOrganizationDetails, getOrgCoachesWithStats } from '@/services/platformAdmin';
import { getOrgCoaches, addCoachToOrganization, removeCoachFromOrganization, sendCoachInviteEmail } from '@/services/coachManagement';
import { calculateMonthlyFee, PRICING_PLANS, type SubscriptionPlan } from '@/lib/pricing';
import { getMonthlyPrice } from '@/lib/pricing/config';
import { DEFAULT_REGION, type Region } from '@/constants/pricing';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/utils/logger';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useOrgRetention, type RetentionSummary, type ClientRetentionData, type CoachRetentionMetrics } from '@/hooks/useOrgRetention';
import type { OrganizationDetails } from '@/types/platform';
import { ROUTES } from '@/constants/routes';
import { getAppShellSeoForPathname } from '@/constants/seo';
import { Seo } from '@/components/seo/Seo';
import { UI_COMMAND_MENU } from '@/constants/ui';
import { ArrowLeft, Building2, UserPlus } from 'lucide-react';

export type OrgCoach = {
  uid: string;
  displayName: string;
  email?: string;
  role: string;
  assessmentCount: number;
  clientCount: number;
};

export type OrgAdminOutletContext = {
  orgDetails: OrganizationDetails | null;
  coaches: OrgCoach[];
  coachMetricsMap: Map<string, CoachRetentionMetrics>;
  retentionSummary: RetentionSummary;
  atRiskClients: ClientRetentionData[];
  criticalClients: ClientRetentionData[];
  retentionLoading: boolean;
  monthlyFee: number;
  totalClientSeats: number;
  maxSeats: number;
  seatsUsedPercentage: number;
  pendingErasureCount: number;
  setOrgDetails: React.Dispatch<React.SetStateAction<OrganizationDetails | null>>;
  setCoaches: React.Dispatch<React.SetStateAction<OrgCoach[]>>;
  handleRemoveCoach: (coachUid: string, coachName: string) => Promise<void>;
  setShowAddCoachDialog: (show: boolean) => void;
  removingCoach: string | null;
};

export default function OrgAdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, effectiveOrgId } = useAuth();
  const { toast } = useToast();
  const [orgDetails, setOrgDetails] = useState<OrganizationDetails | null>(null);
  const [coaches, setCoaches] = useState<OrgCoach[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCoachDialog, setShowAddCoachDialog] = useState(false);
  const [newCoachEmail, setNewCoachEmail] = useState('');
  const [addingCoach, setAddingCoach] = useState(false);
  const [removingCoach, setRemovingCoach] = useState<string | null>(null);
  const [pendingErasureCount, setPendingErasureCount] = useState(0);

  const readOrgId = effectiveOrgId || profile?.organizationId;

  const {
    summary: retentionSummary,
    atRiskClients,
    criticalClients,
    coachMetrics,
    loading: retentionLoading,
  } = useOrgRetention(readOrgId, coaches);

  const coachMetricsMap = new Map(coachMetrics.map((m) => [m.uid, m]));

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (!authUser || !readOrgId) {
        navigate(ROUTES.DASHBOARD, { replace: true });
        return;
      }
      if (profile?.role !== 'org_admin' && !effectiveOrgId) {
        logger.warn('User is not an organization admin:', profile?.role);
        navigate(ROUTES.DASHBOARD, { replace: true });
        return;
      }
      try {
        const orgData = await getOrganizationDetails(readOrgId);
        setOrgDetails(orgData);
        const coachesData = await getOrgCoaches(readOrgId);
        setCoaches(coachesData);
      } catch (error) {
        logger.error('Failed to load organization details:', error);
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
  }, [navigate, profile?.role, effectiveOrgId, readOrgId]);

  useEffect(() => {
    if (!readOrgId) return;
    const erasureRef = collection(getDb(), `organizations/${readOrgId}/erasureRequests`);
    const q = query(erasureRef, where('status', '==', 'pending'));
    getCountFromServer(q)
      .then((snap) => setPendingErasureCount(snap.data().count))
      .catch(() => {});
  }, [readOrgId]);

  const monthlyFee = useMemo(() => {
    if (orgDetails == null) return 0;
    if (orgDetails.monthlyAmountLocal != null) {
      return orgDetails.monthlyAmountLocal;
    }
    const r = (orgDetails.region ?? DEFAULT_REGION) as Region;
    const seats = orgDetails.seatBlock ?? orgDetails.clientSeats ?? 0;
    const planRaw = orgDetails.plan ?? 'free';
    const plan: SubscriptionPlan =
      planRaw in PRICING_PLANS ? (planRaw as SubscriptionPlan) : 'free';
    return r === 'KW' ? calculateMonthlyFee(plan, seats) : getMonthlyPrice(r, seats);
  }, [orgDetails]);

  const totalClientSeats = coaches.reduce((sum, coach) => sum + coach.clientCount, 0);
  const maxSeats = useMemo(() => {
    if (orgDetails == null) return 0;
    return orgDetails.seatBlock ?? orgDetails.clientSeats ?? 0;
  }, [orgDetails]);
  const seatsUsedPercentage = maxSeats > 0 ? (totalClientSeats / maxSeats) * 100 : 0;

  const handleAddCoach = async () => {
    if (!profile?.organizationId || !newCoachEmail.trim() || !orgDetails) return;
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    if (!emailRegex.test(newCoachEmail)) {
      toast({ title: 'Invalid email', description: 'Please enter a valid email address.', variant: 'destructive' });
      return;
    }
    const email = newCoachEmail.trim();
    setAddingCoach(true);
    try {
      const result = await addCoachToOrganization(profile.organizationId, email);
      if (result.success) {
        toast({ title: 'Coach added', description: `${email} has been added to your organization.` });
        setNewCoachEmail('');
        setShowAddCoachDialog(false);
        const updatedCoaches = await getOrgCoaches(readOrgId!);
        setCoaches(updatedCoaches);
        const updatedOrg = await getOrganizationDetails(readOrgId!);
        setOrgDetails(updatedOrg);
        return;
      }
      if (result.error === 'COACH_NOT_FOUND') {
        await sendCoachInviteEmail({
          email,
          organizationId: profile.organizationId,
          organizationName: orgDetails.name || 'Your organization',
          invitedBy: profile.displayName || 'A team admin',
        });
        toast({
          title: 'Invitation sent',
          description: `An email was sent to ${email}. They can sign up and join your organization from the link.`,
        });
        setNewCoachEmail('');
        setShowAddCoachDialog(false);
        return;
      }
      toast({ title: 'Failed to add coach', description: result.error || 'Unknown error occurred.', variant: 'destructive' });
    } catch (error) {
      logger.error('Error adding coach:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add coach',
        variant: 'destructive',
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
        toast({ title: 'Coach removed', description: `${coachName} has been removed from your organization.` });
        const updatedCoaches = await getOrgCoaches(readOrgId!);
        setCoaches(updatedCoaches);
        const updatedOrg = await getOrganizationDetails(readOrgId!);
        setOrgDetails(updatedOrg);
      } else {
        toast({ title: 'Failed to remove coach', description: result.error || 'Unknown error occurred.', variant: 'destructive' });
      }
    } catch (error) {
      logger.error('Error removing coach:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove coach',
        variant: 'destructive',
      });
    } finally {
      setRemovingCoach(null);
    }
  };

  const orgSeoPath = location.pathname.split('?')[0];
  const orgSeoMeta = getAppShellSeoForPathname(location.pathname);
  const orgSeo = (
    <Seo
      pathname={orgSeoPath}
      title={orgSeoMeta.title}
      description={orgSeoMeta.description}
      noindex={orgSeoMeta.noindex}
    />
  );

  if (loading) {
    return (
      <>
        {orgSeo}
      <AppShell title="Organization" subtitle="Loading...">
        <div
          className="flex items-center justify-center min-h-[400px]"
          role="status"
          aria-busy="true"
          aria-live="polite"
        >
          <div className="text-muted-foreground flex items-center gap-2">
            <Building2 className="w-4 h-4 animate-pulse" aria-hidden />
            <span>Loading organization details…</span>
          </div>
        </div>
      </AppShell>
      </>
    );
  }

  if (!orgDetails) {
    return (
      <>
        {orgSeo}
      <AppShell title="Organization" subtitle="Organization not found">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Organization details not found</p>
            <Button onClick={() => navigate(ROUTES.DASHBOARD)} variant="outline">
              Back to {UI_COMMAND_MENU.HOME}
            </Button>
          </div>
        </div>
      </AppShell>
      </>
    );
  }

  const outletContext: OrgAdminOutletContext = {
    orgDetails,
    coaches,
    coachMetricsMap,
    retentionSummary,
    atRiskClients,
    criticalClients,
    retentionLoading,
    monthlyFee,
    totalClientSeats,
    maxSeats,
    seatsUsedPercentage,
    pendingErasureCount,
    setOrgDetails,
    setCoaches,
    handleRemoveCoach,
    setShowAddCoachDialog,
    removingCoach,
  };

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 text-sm font-bold rounded-lg ${isActive ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground-secondary'}`;

  return (
    <>
      {orgSeo}
    <AppShell
      title="Organization"
      subtitle={orgDetails.name || 'Your organization'}
      actions={
        <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.DASHBOARD)} className="h-9 w-9 p-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      }
    >
      <nav className="mb-6 flex gap-1 rounded-lg bg-muted p-1">
        <NavLink to={ROUTES.ORG_DASHBOARD} end className={tabClass}>
          <span className="flex items-center gap-2">
            Overview
            {pendingErasureCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white leading-none">
                {pendingErasureCount > 9 ? '9+' : pendingErasureCount}
              </span>
            )}
          </span>
        </NavLink>
        <NavLink to={ROUTES.ORG_DASHBOARD_TEAM} className={tabClass}>
          Team
        </NavLink>
        <NavLink to={ROUTES.ORG_DASHBOARD_RETENTION} className={tabClass}>
          Retention
        </NavLink>
        <NavLink to={ROUTES.ORG_DASHBOARD_BILLING} className={tabClass}>
          Billing
        </NavLink>
        <NavLink to={ROUTES.ORG_DASHBOARD_INTEGRATIONS} className={tabClass}>
          Integrations
        </NavLink>
      </nav>

      <Outlet context={outletContext} />

      <Dialog open={showAddCoachDialog} onOpenChange={setShowAddCoachDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-gradient-dark" />
              Add Coach to Organization
            </DialogTitle>
            <DialogDescription>
              Enter the coach&apos;s email. If they already have an account, they&apos;ll be added immediately. Otherwise we&apos;ll send them an invitation to sign up and join your organization.
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
                  if (e.key === 'Enter' && newCoachEmail.trim()) handleAddCoach();
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
              className="gradient-bg text-primary-foreground hover:opacity-90"
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
    </>
  );
}
