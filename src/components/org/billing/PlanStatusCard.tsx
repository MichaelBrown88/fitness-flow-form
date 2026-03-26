import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface PlanStatusCardProps {
  plan: string;
  status: string;
  currency?: string;
  monthlyAmountLocal?: number;
  trialEndsAt?: Date;
}

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
  free: 'Free',
  none: 'No Plan',
};

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle }> = {
  active: { label: 'Active', variant: 'default', icon: CheckCircle },
  trial: { label: 'Trial', variant: 'secondary', icon: Clock },
  past_due: { label: 'Payment Due', variant: 'destructive', icon: AlertTriangle },
  cancelled: { label: 'Cancelled', variant: 'outline', icon: AlertTriangle },
  none: { label: 'Inactive', variant: 'outline', icon: AlertTriangle },
};

function formatTrialDays(trialEndsAt: Date): string {
  const msLeft = trialEndsAt.getTime() - Date.now();
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
  if (daysLeft === 0) return 'Trial ends today';
  if (daysLeft === 1) return '1 day remaining';
  return `${daysLeft} days remaining`;
}

export function PlanStatusCard({ plan, status, currency, monthlyAmountLocal, trialEndsAt }: PlanStatusCardProps) {
  const statusConfig = STATUS_CONFIG[status] ?? STATUS_CONFIG.none;
  const StatusIcon = statusConfig.icon;

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Crown className="w-4 h-4 text-amber-500" />
            Current Plan
          </CardTitle>
          <Badge variant={statusConfig.variant} className="flex items-center gap-1 text-xs">
            <StatusIcon className="w-3 h-3" />
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">{PLAN_LABELS[plan] ?? plan}</p>
            {monthlyAmountLocal != null && monthlyAmountLocal > 0 && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {currency} {monthlyAmountLocal.toFixed(0)} / month
              </p>
            )}
          </div>
        </div>
        {status === 'trial' && trialEndsAt && (
          <p className="text-sm text-amber-600 font-medium">{formatTrialDays(trialEndsAt)}</p>
        )}
        {status === 'past_due' && (
          <p className="text-sm text-red-600">
            Your last payment failed. Please update your payment method to avoid service interruption.
          </p>
        )}
        {status === 'cancelled' && (
          <p className="text-sm text-muted-foreground">
            Your subscription has been cancelled. Resubscribe to restore access.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
