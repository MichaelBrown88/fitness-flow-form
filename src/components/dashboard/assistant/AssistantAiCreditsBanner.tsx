import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useClientCapacity } from '@/hooks/useClientCapacity';
import { isUnlimitedAiCredits, UNLIMITED_CREDITS } from '@/constants/pricing';
import { ROUTES } from '@/constants/routes';
import { COACH_ASSISTANT_COPY } from '@/constants/coachAssistantCopy';
import { cn } from '@/lib/utils';

interface AssistantAiCreditsBannerProps {
  className?: string;
  /** `inline` = single subtle line (Claude-style usage strip under the composer). */
  variant?: 'default' | 'inline';
}

/**
 * Shown only when remaining credits are at most half of the plan monthly allocation
 * (and balance is known — not unlimited).
 */
export function AssistantAiCreditsBanner({
  className,
  variant = 'default',
}: AssistantAiCreditsBannerProps) {
  const { loading, aiCredits, aiCreditLimit } = useClientCapacity();

  if (loading) return null;
  if (aiCredits == null) return null;
  if (isUnlimitedAiCredits(aiCredits)) return null;
  if (aiCreditLimit <= 0 || aiCreditLimit === UNLIMITED_CREDITS) return null;

  const ratio = aiCredits / aiCreditLimit;
  if (ratio > 0.3) return null;

  if (variant === 'inline') {
    return (
      <div
        className={cn('py-1 text-center text-xs text-muted-foreground', className)}
        role="status"
      >
        <span className="inline-flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-500" aria-hidden />
            <span className="text-foreground/80 dark:text-muted-foreground">
              {COACH_ASSISTANT_COPY.AI_CREDITS_REMAINING(aiCredits, aiCreditLimit)}
            </span>
          </span>
          <span className="text-border" aria-hidden>
            ·
          </span>
          <Link
            to={ROUTES.BILLING}
            className="font-semibold text-foreground underline underline-offset-2 decoration-foreground/35 hover:decoration-foreground"
          >
            {COACH_ASSISTANT_COPY.AI_CREDITS_REMAINING_CTA}
          </Link>
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'border-b border-border/80 pb-3 text-sm bg-transparent',
        className,
      )}
      role="status"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 min-w-0">
          <AlertTriangle
            className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-500 mt-0.5"
            aria-hidden
          />
          <div className="min-w-0">
            <p className="font-semibold text-foreground">{COACH_ASSISTANT_COPY.AI_CREDITS_LOW_TITLE}</p>
            <p className="text-xs text-foreground/70 dark:text-muted-foreground mt-0.5">
              {COACH_ASSISTANT_COPY.AI_CREDITS_REMAINING(aiCredits, aiCreditLimit)}
            </p>
          </div>
        </div>
        <Link
          to={ROUTES.BILLING}
          className="text-xs font-semibold text-foreground underline underline-offset-2 decoration-foreground/40 hover:decoration-foreground shrink-0 sm:ml-2"
        >
          {COACH_ASSISTANT_COPY.AI_CREDITS_REMAINING_CTA}
        </Link>
      </div>
    </div>
  );
}
