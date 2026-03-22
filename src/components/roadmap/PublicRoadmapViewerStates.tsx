import type { ComponentProps } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RoadmapLoadDiagnostics } from '@/components/roadmap/RoadmapLoadDiagnostics';
import { UI_PUBLIC_ROADMAP_SUPPORT } from '@/constants/ui';
import { PUBLIC_CLIENT_URL_QUERY, ROUTES } from '@/constants/routes';

export type AppShellOuterProps = Omit<ComponentProps<typeof AppShell>, 'children'>;

export function PublicRoadmapViewerLoading({ shellProps }: { shellProps: AppShellOuterProps }) {
  return (
    <AppShell {...shellProps}>
      <div
        className="max-w-2xl mx-auto px-4 py-6 space-y-6"
        aria-busy="true"
        aria-live="polite"
      >
        <span className="sr-only">Loading your plan</span>
        <p className="text-sm text-muted-foreground text-center">Loading your plan…</p>
        <div className="space-y-4" aria-hidden>
          <Skeleton className="h-8 w-48 mx-auto rounded-lg" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    </AppShell>
  );
}

type PublicRoadmapViewerMissingProps = {
  shellProps: AppShellOuterProps;
  error: string | null;
  reportToken: string | null;
  showRoadmapLoadDebug: boolean;
  onRetry: () => void;
};

export function PublicRoadmapViewerMissing({
  shellProps,
  error,
  reportToken,
  showRoadmapLoadDebug,
  onRetry,
}: PublicRoadmapViewerMissingProps) {
  return (
    <AppShell {...shellProps}>
      <div className="max-w-2xl mx-auto px-4 py-8 text-center space-y-4">
        <p className="text-lg font-semibold text-foreground">Roadmap Not Found</p>
        <p className="text-sm text-muted-foreground">{error ?? 'This link may have expired.'}</p>
        <p className="text-xs text-muted-foreground">
          If this keeps happening, ask your coach for a new link.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
          {reportToken && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/r/${reportToken}`}>Back to report</Link>
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild>
            <Link to={ROUTES.HOME}>Go to home</Link>
          </Button>
        </div>
        {!showRoadmapLoadDebug && (
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            {UI_PUBLIC_ROADMAP_SUPPORT.DEBUG_HINT_BEFORE}
            <span className="font-mono text-foreground/80">
              ?{PUBLIC_CLIENT_URL_QUERY.ROADMAP_DEBUG}=1
            </span>
            {UI_PUBLIC_ROADMAP_SUPPORT.DEBUG_HINT_AFTER}
          </p>
        )}
        {showRoadmapLoadDebug && <RoadmapLoadDiagnostics variant="error" />}
      </div>
    </AppShell>
  );
}
