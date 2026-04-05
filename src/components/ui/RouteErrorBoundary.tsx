import React from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { Button } from '@/components/ui/button';
import { AlertCircle, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { logger } from '@/lib/utils/logger';
import { ROUTES } from '@/constants/routes';
import { UI_COMMAND_MENU } from '@/constants/ui';

export interface RouteErrorBoundaryProps {
  children: React.ReactNode;
  title: string;
  body: string;
  /** Navigate target for the home button (default: dashboard). */
  homeTo?: string;
}

function RouteErrorFallback({
  error,
  resetErrorBoundary,
  title,
  body,
  homeTo,
}: FallbackProps & { title: string; body: string; homeTo: string }) {
  const navigate = useNavigate();

  React.useEffect(() => {
    logger.error('Route error boundary:', error.message || String(error));
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-muted/50 p-4" role="alert">
      <div className="max-w-md w-full rounded-2xl border border-border bg-background p-8 shadow-xl">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <p className="text-sm text-foreground-secondary">{body}</p>
          {import.meta.env.DEV && (
            <div className="w-full rounded-xl border border-border bg-muted/50 p-3 text-left">
              <p className="text-xs font-mono text-destructive break-words">{error.message}</p>
            </div>
          )}
          <div className="flex gap-3 w-full mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(homeTo)}
              className="flex-1"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to {UI_COMMAND_MENU.HOME}
            </Button>
            <Button type="button" variant="default" onClick={resetErrorBoundary} className="flex-1">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RouteErrorBoundary({ children, title, body, homeTo = ROUTES.DASHBOARD }: RouteErrorBoundaryProps) {
  return (
    <ErrorBoundary
      FallbackComponent={(props) => (
        <RouteErrorFallback {...props} title={title} body={body} homeTo={homeTo} />
      )}
      onError={(err, info) => {
        logger.error('Route error boundary:', err.message || String(err));
        if (info.componentStack) {
          logger.error('Route error boundary stack:', info.componentStack);
        }
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
