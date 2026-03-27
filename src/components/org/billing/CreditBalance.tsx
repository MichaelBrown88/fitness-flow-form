/**
 * CreditBalance
 *
 * Shows the org's remaining AI assessment credits in the dashboard header.
 * Surfaces a top-up CTA when credits fall below a warning threshold.
 *
 * Reads `assessmentCredits` directly from the live org doc subscription
 * (the field is updated by the Stripe webhook on purchase and on renewal).
 */

import { Zap, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCheckout } from '@/hooks/useCheckout';
import { useAuth } from '@/hooks/useAuth';
import { isUnlimitedAiCredits } from '@/constants/pricing';

interface CreditBalanceProps {
  credits: number | undefined;
  className?: string;
}

const LOW_CREDITS_THRESHOLD = 5;

export function CreditBalance({ credits, className }: CreditBalanceProps) {
  const { effectiveOrgId } = useAuth();
  const { purchaseCreditTopup, loading } = useCheckout();

  if (credits === undefined || credits === null) return null;
  const isUnlimited = isUnlimitedAiCredits(credits);
  const isLow = !isUnlimited && credits <= LOW_CREDITS_THRESHOLD;

  const handleTopup = async () => {
    const orgId = effectiveOrgId;
    if (!orgId) return;
    await purchaseCreditTopup(orgId);
  };

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-colors ${
          isLow
            ? 'bg-amber-50 text-amber-700 border border-amber-200'
            : 'bg-primary/5 text-on-brand-tint border border-primary/10'
        }`}
      >
        <Zap className={`h-3.5 w-3.5 ${isLow ? 'text-amber-500' : 'text-on-brand-tint'}`} />
        {isUnlimited ? (
          <span>Unlimited AI</span>
        ) : (
          <span>{credits} AI credit{credits !== 1 ? 's' : ''}</span>
        )}
      </div>
      {isLow && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 rounded-xl border-amber-300 text-amber-700 text-xs font-bold hover:bg-amber-50 gap-1"
          onClick={handleTopup}
          disabled={loading}
        >
          <ShoppingCart className="h-3 w-3" />
          Top up
        </Button>
      )}
    </div>
  );
}
