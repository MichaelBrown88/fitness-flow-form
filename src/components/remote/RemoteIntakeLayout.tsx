import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RemoteIntakeLayoutProps {
  /** Optional so the loading shell can render with no content. */
  children?: ReactNode;
  /** Full-viewport shell for the step wizard (no marketing footer). */
  fullBleed?: boolean;
  loading?: boolean;
  loadingMessage?: string;
}

/**
 * Minimal public shell for /remote/:token — no coach chrome, no "1 of 5" wizard header.
 */
export function RemoteIntakeLayout({
  children,
  fullBleed = false,
  loading = false,
  loadingMessage = 'Checking your link…',
}: RemoteIntakeLayoutProps) {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 px-4 py-24 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
          <p className="text-base">{loadingMessage}</p>
        </div>
      ) : (
        <div
          className={cn(
            fullBleed ? 'min-h-0 flex-1' : 'mx-auto max-w-md px-4 py-6',
          )}
        >
          {children}
        </div>
      )}

      {!fullBleed && !loading ? (
        <footer className="py-6 text-center text-xs text-muted-foreground">
          Powered by One Assess
        </footer>
      ) : null}
    </div>
  );
}
