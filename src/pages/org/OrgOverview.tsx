import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Users, FileText, Trash2, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { OrgAdminOutletContext } from './OrgAdminLayout';

interface ErasureRequest {
  id: string;
  shareToken: string;
  reason: string;
  status: string;
  requestedAt: { toDate?: () => Date } | null;
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
  const orgId = effectiveOrgId || profile?.organizationId;
  const [erasureRequests, setErasureRequests] = useState<ErasureRequest[]>([]);

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

  async function markActioned(requestId: string) {
    if (!orgId) return;
    const ref = doc(getDb(), `organizations/${orgId}/erasureRequests/${requestId}`);
    await updateDoc(ref, { status: 'actioned' });
    setErasureRequests((prev) => prev.filter((r) => r.id !== requestId));
  }

  if (!orgDetails) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-12 sm:pb-20">
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
              <span
                className={`px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium border ${
                  orgDetails.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : orgDetails.status === 'trial'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-100 text-slate-600 border-slate-300'
                }`}
              >
                {orgDetails.status || 'none'}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
              <p className="text-[10px] sm:text-xs text-foreground-secondary mb-1 font-medium">Plan</p>
              <p className="text-lg sm:text-xl font-semibold text-foreground capitalize">{orgDetails.plan || 'free'}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
              <p className="text-[10px] sm:text-xs text-foreground-secondary mb-1 font-medium">Monthly Fee</p>
              <p className="text-lg sm:text-xl font-semibold text-foreground">
                {orgDetails.isComped ? (
                  <span className="text-gradient-dark">Free</span>
                ) : (
                  new Intl.NumberFormat('en-KW', { style: 'currency', currency: 'KWD', minimumFractionDigits: 2 }).format(monthlyFee)
                )}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 sm:p-4 border border-slate-200 sm:col-span-2 md:col-span-1">
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
              These clients have submitted a GDPR Article 17 right-to-erasure request. Action each
              request within 30 days.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
            {erasureRequests.map((req) => (
              <div key={req.id} className="flex items-start justify-between gap-4 rounded-lg border border-rose-100 bg-white px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-800">
                    Token: <span className="font-mono">{req.shareToken.slice(0, 12)}…</span>
                  </p>
                  {req.reason && (
                    <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{req.reason}</p>
                  )}
                  {req.requestedAt?.toDate && (
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {req.requestedAt.toDate().toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 gap-1.5 border-rose-200 text-rose-700 hover:bg-rose-50"
                  onClick={() => markActioned(req.id)}
                >
                  <Check className="h-3 w-3" />
                  Mark actioned
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
