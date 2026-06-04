import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RemoteIntakeProgressBar } from '@/components/remote/RemoteIntakeProgressBar';

export interface RemoteMobileShellProps {
  progress: number;
  title?: string;
  subtitle?: string;
  /** Centered question layout; content scrolls if taller than viewport. */
  layout?: 'default' | 'centered';
  children: ReactNode;
  primaryLabel: string;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  onPrimary: () => void;
  showBack?: boolean;
  onBack?: () => void;
  /** Optional text action above the footer row (e.g. skip posture). */
  footerHint?: ReactNode;
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
  footerHint,
  className,
}: RemoteMobileShellProps) {
  const centered = layout === 'centered';

  return (
    <div className={cn('flex h-full min-h-0 flex-col bg-background', className)}>
      <RemoteIntakeProgressBar progress={progress} />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">
          <div
            className={cn(
              'mx-auto flex w-full max-w-md min-h-full flex-col gap-5 py-3',
              centered ? 'justify-center' : 'justify-start pt-1',
            )}
          >
            {(title || subtitle) && (
              <div className={cn('space-y-1.5 shrink-0', centered && 'text-center')}>
                {title ? (
                  <h1
                    className={cn(
                      'font-bold tracking-tight text-foreground',
                      centered ? 'text-2xl leading-snug' : 'text-xl leading-snug',
                    )}
                  >
                    {title}
                  </h1>
                ) : null}
                {subtitle ? (
                  <p
                    className={cn(
                      'text-muted-foreground',
                      centered ? 'mx-auto max-w-[28ch] text-sm leading-snug' : 'text-sm leading-snug',
                    )}
                  >
                    {subtitle}
                  </p>
                ) : null}
              </div>
            )}
            <div className={cn('w-full shrink-0', centered && 'flex flex-col items-center')}>
              {children}
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-border bg-background px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto w-full max-w-md space-y-2">
            {footerHint ? (
              <div className="pb-0.5 text-center">{footerHint}</div>
            ) : null}
            <div className="flex items-stretch gap-2">
              {showBack && onBack ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 shrink-0 rounded-xl px-3 text-sm font-medium text-muted-foreground"
                  onClick={onBack}
                  disabled={primaryLoading}
                >
                  <ChevronLeft className="mr-0.5 h-4 w-4" aria-hidden />
                  Back
                </Button>
              ) : null}
              <Button
                type="button"
                className={cn(
                  'h-11 rounded-xl text-base font-semibold',
                  showBack && onBack ? 'min-w-0 flex-1' : 'w-full',
                )}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
