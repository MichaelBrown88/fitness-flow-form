import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { Button } from '@/components/ui/button';
import { AlertCircle, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { logger } from '@/lib/utils/logger';
import { ROUTES } from '@/constants/routes';
import { UI_COMMAND_MENU } from '@/constants/ui';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  const navigate = useNavigate();

  React.useEffect(() => {
    logger.error('Error boundary caught error:', error.message || String(error));
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4" role="alert">
      <div className="max-w-md w-full rounded-2xl border border-border bg-background p-8 shadow-xl">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Something went wrong</h2>
          <p className="text-sm text-foreground-secondary">
            We encountered an unexpected error. Please try again or return to the dashboard.
          </p>
          {import.meta.env.DEV && (
            <div className="w-full rounded-xl border border-border bg-muted/50 p-3 text-left">
              <p className="text-xs font-mono text-destructive break-words">{error.message}</p>
            </div>
          )}
          <div className="flex gap-3 w-full mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(ROUTES.DASHBOARD)}
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

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
}

export function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  return (
    <ReactErrorBoundary
      FallbackComponent={fallback || ErrorFallback}
      onError={(error, info) => {
        logger.error('Error boundary error:', error.message || String(error));
        if (info.componentStack) {
          logger.error('Error boundary stack:', info.componentStack);
        }
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}
