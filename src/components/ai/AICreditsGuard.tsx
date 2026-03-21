import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
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

export interface AICreditsGuardProps {
  children: ReactNode;
  /** When false, skips the guard */
  active?: boolean;
}

/**
 * Soft gate when the org has zero AI credits (explicit balance only).
 */
export function AICreditsGuard({ children, active = true }: AICreditsGuardProps) {
  const { loading, aiCredits, aiCreditLimit } = useClientCapacity();

  if (!active || loading || aiCredits === null || aiCredits > 0 || aiCredits >= 9999) {
    return <>{children}</>;
  }

  return (
    <>
      <Dialog open>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>No AI credits remaining</DialogTitle>
            <DialogDescription>
              You have 0 AI credits this cycle (allocation {aiCreditLimit}/month). Buy a top-up pack or upgrade
              your plan to continue using AI posture or report photo import.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" asChild>
              <Link to={ROUTES.DASHBOARD}>Back</Link>
            </Button>
            <Button type="button" asChild>
              <Link to={ROUTES.BILLING}>Billing & top-ups</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
