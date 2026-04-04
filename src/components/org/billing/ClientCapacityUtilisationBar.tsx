import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { ORG_BILLING_COPY } from '@/constants/orgBilling';

export interface ClientCapacityUtilisationBarProps {
  /** Active (non-archived) clients — same source as org stats. */
  activeClients: number;
  /** Plan client limit (subscription cap). */
  clientLimit: number;
  /** Optional — shown as context (separate from client capacity). */
  coachCount?: number;
}

function utilisationColor(ratio: number): string {
  if (ratio >= 1) return 'bg-red-500';
  if (ratio >= 0.8) return 'bg-amber-500';
  return 'bg-emerald-500';
}

export function ClientCapacityUtilisationBar({
  activeClients,
  clientLimit,
  coachCount,
}: ClientCapacityUtilisationBarProps) {
  const safeLimit = Math.max(1, clientLimit);
  const ratio = Math.min(activeClients / safeLimit, 1);
  const pct = Math.round(ratio * 100);
  const remaining = Math.max(0, safeLimit - activeClients);

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="w-4 h-4 text-muted-foreground" aria-hidden />
          {ORG_BILLING_COPY.clientCapacityTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">
            {ORG_BILLING_COPY.clientCapacityUsed(activeClients, safeLimit)}
          </span>
          <span
            className={`font-semibold ${ratio >= 1 ? 'text-red-600' : ratio >= 0.8 ? 'text-amber-600' : 'text-emerald-600'}`}
          >
            {pct}%
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${utilisationColor(ratio)}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {ratio >= 1 ? (
          <p className="text-xs text-red-600 font-medium">{ORG_BILLING_COPY.clientCapacityAtLimit}</p>
        ) : null}
        {ratio >= 0.8 && ratio < 1 ? (
          <p className="text-xs text-amber-600">{ORG_BILLING_COPY.clientCapacityNearlyFull(remaining)}</p>
        ) : null}
        {coachCount != null ? (
          <p className="text-xs text-muted-foreground pt-1 border-t border-border/60">
            {ORG_BILLING_COPY.clientCapacityCoaches(coachCount)}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
