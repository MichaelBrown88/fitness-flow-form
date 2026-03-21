import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useClientCapacity } from '@/hooks/useClientCapacity';
import { ROUTES } from '@/constants/routes';

export interface ClientCapacityGuardProps {
  children: ReactNode;
  /** When false, shows upgrade modal instead of children */
  active?: boolean;
}

/**
 * Blocks client-creation UI when the org is at billing capacity.
 * Server-side Firestore rules also enforce the limit.
 */
export function ClientCapacityGuard({ children, active = true }: ClientCapacityGuardProps) {
  const navigate = useNavigate();
  const {
    loading,
    atClientLimit,
    clientCount,
    clientLimit,
    currentTierLabel,
    getUpgradeRecommendation,
    planKind,
  } = useClientCapacity();

  if (!active) {
    return <>{children}</>;
  }

  if (loading) {
    return <>{children}</>;
  }

  if (!atClientLimit) {
    return <>{children}</>;
  }

  const next = getUpgradeRecommendation(clientLimit + 1);
  const isSoloFree = planKind === 'solo_free';

  return (
    <>
      <Dialog open>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>You&apos;ve reached your client limit</DialogTitle>
            <DialogDescription className="space-y-3 text-left">
              <span className="block">
                You&apos;re using <strong>{clientCount}</strong> of <strong>{clientLimit}</strong> clients on{' '}
                <strong>{currentTierLabel}</strong>.
              </span>
              <span className="block">
                {isSoloFree ? (
                  <>
                    The free solo plan includes up to {clientLimit} clients. Upgrade to a paid capacity tier to
                    add more clients and unlock higher AI limits.
                  </>
                ) : (
                  <>
                    Upgrade to <strong>{next.label}</strong> (up to {next.clientLimit} clients,{' '}
                    {next.monthlyAiCredits} AI scans/mo from £{next.monthlyPriceGbp}/mo) to add more clients.
                  </>
                )}
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => navigate(ROUTES.DASHBOARD)}>
              Back
            </Button>
            <Button type="button" onClick={() => navigate(ROUTES.BILLING)}>
              View billing and upgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
