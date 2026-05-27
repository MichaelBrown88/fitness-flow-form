import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RemoteMobileShellProps {
  progress: number;
  title?: string;
  subtitle?: string;
  /** Centered, larger question layout (native mobile intake pattern). */
  layout?: 'default' | 'centered';
  children: ReactNode;
  primaryLabel: string;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  onPrimary: () => void;
  showBack?: boolean;
  onBack?: () => void;
  className?: string;
}

export function RemoteMobileShell({
  progress,
  title,
  subtitle,
  layout = 'default',
  children,
  primaryLabel,
  primaryDisabled = false,
  primaryLoading = false,
  onPrimary,
  showBack = false,
  onBack,
  className,
}: RemoteMobileShellProps) {
  const pct = Math.min(100, Math.max(0, progress * 100));
  const centered = layout === 'centered';

  return (
    <div className={cn('flex h-full min-h-0 flex-col bg-background', className)}>
      <div className="shrink-0 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <div className="mx-auto w-full max-w-md">
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${pct}%` }}
              role="progressbar"
              aria-valuenow={Math.round(pct)}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      </div>

      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col overflow-x-hidden overscroll-contain px-4 pb-4',
          centered ? 'justify-center' : 'overflow-y-auto',
        )}
      >
        <div
          className={cn(
            'mx-auto flex w-full max-w-md flex-col',
            centered && 'flex-1 justify-center gap-8 py-4',
          )}
        >
          {(title || subtitle) && (
            <div className={cn('space-y-2', centered && 'text-center')}>
              {title ? (
                <h1
                  className={cn(
                    'font-bold tracking-tight text-foreground',
                    centered ? 'text-3xl leading-tight' : 'text-xl font-semibold',
                  )}
                >
                  {title}
                </h1>
              ) : null}
              {subtitle ? (
                <p
                  className={cn(
                    'leading-relaxed text-muted-foreground',
                    centered ? 'text-base' : 'text-sm',
                  )}
                >
                  {subtitle}
                </p>
              ) : null}
            </div>
          )}
          <div className={cn(centered && 'w-full')}>{children}</div>
        </div>
      </div>

      <div className="shrink-0 border-t border-border bg-background px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-md space-y-2">
          <Button
            type="button"
            className="h-12 w-full rounded-2xl text-base font-semibold"
            disabled={primaryDisabled || primaryLoading}
            onClick={onPrimary}
          >
            {primaryLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Please wait…
              </>
            ) : (
              primaryLabel
            )}
          </Button>
          {showBack && onBack ? (
            <Button
              type="button"
              variant="ghost"
              className="h-10 w-full rounded-xl text-sm text-muted-foreground"
              onClick={onBack}
              disabled={primaryLoading}
            >
              <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
              Back
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
