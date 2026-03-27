import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/utils/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component that catches React errors and displays a fallback UI.
 * Prevents full page crashes and allows users to recover gracefully.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback error={this.state.error} onRetry={this.handleRetry} onGoHome={this.handleGoHome} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  onRetry?: () => void;
  onGoHome?: () => void;
}

/**
 * Default fallback UI shown when an error is caught
 */
export function ErrorFallback({ error, onRetry, onGoHome }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen bg-muted/50 flex items-center justify-center p-6" role="alert">
      <div className="max-w-md w-full bg-background rounded-3xl shadow-xl p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-rose-50 rounded-2xl mb-6">
          <AlertTriangle className="h-8 w-8 text-rose-500" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">Something went wrong</h1>
        <p className="text-muted-foreground mb-6">
          We encountered an unexpected error. This has been logged and we'll look into it.
        </p>

        {error && import.meta.env.DEV && (
          <div className="mb-6 p-4 bg-muted/50 rounded-xl text-left overflow-auto">
            <p className="text-xs font-mono text-rose-600 break-words">{error.message}</p>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          {onRetry && (
            <Button type="button" onClick={onRetry} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          )}
          {onGoHome && (
            <Button type="button" onClick={onGoHome} variant="default" className="gap-2">
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ErrorBoundary;
