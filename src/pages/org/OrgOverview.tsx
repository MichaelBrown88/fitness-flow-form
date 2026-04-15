import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getDb } from '@/services/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Package, Users, FileText, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { OrgAdminOutletContext } from './OrgAdminLayout';
import { formatPrice, getLocaleForRegion } from '@/lib/utils/currency';
import { DEFAULT_REGION, type Region } from '@/constants/pricing';
import { subscriptionPlanDisplayHeadline } from '@/lib/pricing/subscriptionPlanDisplay';
import { logger } from '@/lib/utils/logger';

interface ErasureRequest {
  id: string;
  shareToken: string;
  reason: string;
  status: string;
  requestedAt: { toDate?: () => Date } | null;
}

interface ExecuteClientErasureResponse {
  success: true;
  deletedDocs: number;
}

export default function OrgOverview() {
  const {
    orgDetails,
    monthlyFee,
    totalClientSeats,
    maxSeats,
    seatsUsedPercentage,
    pendingErasureCount,
  } = useOutletContext<OrgAdminOutletContext>();

  const { effectiveOrgId, profile } = useAuth();
  const { toast } = useToast();
  const orgId = effectiveOrgId || profile?.organizationId;
  const [erasureRequests, setErasureRequests] = useState<ErasureRequest[]>([]);

  // Confirmation dialog state
  const [pendingErasure, setPendingErasure] = useState<ErasureRequest | null>(null);
  const [erasing, setErasing] = useState(false);

  useEffect(() => {
    if (!orgId || pendingErasureCount === 0) return;
    const q = query(
      collection(getDb(), `organizations/${orgId}/erasureRequests`),
      where('status', '==', 'pending'),
    );
    getDocs(q).then((snap) => {
      setErasureRequests(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ErasureRequest, 'id'>) })));
    }).catch(() => {});
  }, [orgId, pendingErasureCount]);

  const statusLabel = orgDetails?.status;

  async function confirmErase() {
    if (!orgId || !pendingErasure) return;
    setErasing(true);
    try {
      const fn = httpsCallable<
        { orgId: string; erasureRequestId: string },
        ExecuteClientErasureResponse
      >(getFunctions(), 'executeClientErasure');
      await fn({ orgId, erasureRequestId: pendingErasure.id });
      setErasureRequests((prev) => prev.filter((r) => r.id !== pendingErasure.id));
      toast({ title: 'Data erased', description: 'The client\'s data has been permanently deleted.' });
    } catch (err) {
      logger.error('[OrgOverview] executeClientErasure failed', err);
      toast({
        title: 'Erasure failed',
        description: err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setErasing(false);
      setPendingErasure(null);
    }
  }

  if (!orgDetails) return null;

  const planHeadline = subscriptionPlanDisplayHeadline({
    plan: orgDetails.plan || 'free',
    capacityTierId: orgDetails.capacityTierId,
    clientCap: orgDetails.seatBlock ?? orgDetails.clientSeats,
    packageTrack: orgDetails.packageTrack,
  });

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-12 sm:pb-20">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-foreground-secondary" />
                Subscription Plan
              </CardTitle>
              <CardDescription className="mt-1 text-xs sm:text-sm">
                Your current package and usage
              </CardDescription>
            </div>
            <span
              className={`px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium border ${
                statusLabel === 'active'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : statusLabel === 'trial'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-muted text-foreground-secondary border-border-medium'
              }`}
            >
              {statusLabel || 'none'}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
              <p className="text-[10px] sm:text-xs text-foreground-secondary mb-1 font-medium">Plan</p>
              <p className="text-lg sm:text-xl font-semibold text-foreground">{planHeadline}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
              <p className="text-[10px] sm:text-xs text-foreground-secondary mb-1 font-medium">Monthly Fee</p>
              <p className="text-lg sm:text-xl font-semibold text-foreground">
                {formatPrice(
                  monthlyFee,
                  orgDetails.currency || 'GBP',
                  getLocaleForRegion((orgDetails.region ?? DEFAULT_REGION) as Region),
                )}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 sm:p-4 border border-border sm:col-span-2 md:col-span-1">
              <p className="text-[10px] sm:text-xs text-foreground-secondary mb-1 font-medium">Client Seats</p>
              <p className="text-lg sm:text-xl font-semibold text-foreground">
                {maxSeats > 0 ? `${totalClientSeats} / ${maxSeats}` : totalClientSeats}
                {maxSeats > 0 && (
                  <span
                    className={`text-[10px] sm:text-xs ml-2 font-medium ${
                      seatsUsedPercentage >= 90 ? 'text-red-600' : seatsUsedPercentage >= 75 ? 'text-amber-600' : 'text-foreground-secondary'
                    }`}
                  >
                    ({Math.round(seatsUsedPercentage)}% used)
                  </span>
                )}
              </p>
              {maxSeats > 0 && seatsUsedPercentage >= 90 && (
                <p className="text-[10px] sm:text-xs text-red-600 mt-1 font-medium">Nearly at capacity - consider upgrading</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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

      {erasureRequests.length > 0 && (
        <Card className="border-rose-200 bg-rose-50/30">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-sm text-rose-700">
              <Trash2 className="h-4 w-4" />
              Pending data erasure requests
            </CardTitle>
            <CardDescription className="text-xs text-rose-600">
              These clients have submitted a GDPR Article 17 right-to-erasure request. You must
              complete each deletion within <strong>30 days</strong> of the request date.
              Clicking <strong>Erase data</strong> permanently deletes the client&apos;s assessments,
              report, and roadmap from our systems.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
            {erasureRequests.map((req) => (
              <div key={req.id} className="flex items-start justify-between gap-4 rounded-lg border border-rose-100 bg-background px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">
                    Token: <span className="font-mono">{req.shareToken.slice(0, 12)}…</span>
                  </p>
                  {req.reason && req.reason !== 'No reason provided' && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{req.reason}</p>
                  )}
                  {req.requestedAt?.toDate && (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      Requested: {req.requestedAt.toDate().toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  className="shrink-0 gap-1.5"
                  onClick={() => setPendingErasure(req)}
                >
                  <Trash2 className="h-3 w-3" />
                  Erase data
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Erasure confirmation dialog */}
      <Dialog open={pendingErasure !== null} onOpenChange={(open) => { if (!open && !erasing) setPendingErasure(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="h-5 w-5" />
              Permanently erase client data?
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-1 text-sm text-foreground">
                <p>
                  This will immediately and <strong>permanently delete</strong>:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>All assessment records and scores</li>
                  <li>The client&apos;s shared report and all previous versions</li>
                  <li>Their ARC™ roadmap and progress data</li>
                  <li>Posture images and lifestyle check-in responses</li>
                </ul>
                <p className="text-xs text-muted-foreground">
                  The erasure request itself is kept as a compliance record. This action cannot
                  be undone.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setPendingErasure(null)}
              disabled={erasing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmErase()}
              disabled={erasing}
              className="gap-2"
            >
              {erasing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Erasing…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Yes, permanently erase
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
