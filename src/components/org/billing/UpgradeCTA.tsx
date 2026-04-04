import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, ArrowRight, CreditCard } from 'lucide-react';
import { ROUTES } from '@/constants/routes';

interface UpgradeCTAProps {
  plan: string;
  status: string;
  /** Active clients ÷ plan client limit (0–1+). */
  clientCapacityRatio: number;
}

export function UpgradeCTA({ plan, status, clientCapacityRatio }: UpgradeCTAProps) {
  const navigate = useNavigate();

  const isPastDue = status === 'past_due';
  const isCancelled = status === 'cancelled';
  const isAtCapacity = clientCapacityRatio >= 1;
  const isEnterprise = plan === 'enterprise';

  if (isEnterprise && !isPastDue && !isCancelled) return null;

  const ctaConfig = (() => {
    if (isPastDue) return {
      label: 'Update payment method',
      icon: CreditCard,
      route: ROUTES.BILLING,
      description: 'Resolve your outstanding payment to keep your account active.',
      variant: 'destructive' as const,
    };
    if (isCancelled) return {
      label: 'Resubscribe',
      icon: TrendingUp,
      route: ROUTES.BILLING,
      description: 'Restore full access by choosing a plan.',
      variant: 'default' as const,
    };
    if (isAtCapacity) return {
      label: 'Upgrade client capacity',
      icon: TrendingUp,
      route: ROUTES.BILLING,
      description:
        'You are at your plan’s client limit. Upgrade on billing to add more active clients (and higher tiers when you need them).',
      variant: 'default' as const,
    };
    return {
      label: 'View available plans',
      icon: TrendingUp,
      route: ROUTES.BILLING,
      description: 'See capacity tiers, billing options, and add-ons like custom branding.',
      variant: 'outline' as const,
    };
  })();

  const Icon = ctaConfig.icon;

  return (
    <Card className="border-dashed">
      <CardContent className="p-4 sm:p-6">
        <p className="text-sm text-foreground-secondary mb-4">{ctaConfig.description}</p>
        <Button
          variant={ctaConfig.variant}
          className="w-full"
          onClick={() => navigate(ctaConfig.route)}
        >
          <Icon className="w-4 h-4 mr-2" />
          {ctaConfig.label}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
