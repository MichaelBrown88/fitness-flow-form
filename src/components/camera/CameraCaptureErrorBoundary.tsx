import { useState, type ReactNode } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';

interface CameraCaptureErrorBoundaryProps {
  children: ReactNode;
  /** e.g. close modal or return to previous wizard step */
  onDismiss?: () => void;
}

/**
 * Remounts the camera subtree on retry so ErrorBoundary internal state resets.
 */
export function CameraCaptureErrorBoundary({ children, onDismiss }: CameraCaptureErrorBoundaryProps) {
  const [boundaryKey, setBoundaryKey] = useState(0);

  const fallback = (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col items-center justify-center gap-4 p-6 font-sans">
      <p className="text-sm text-center text-white/90 max-w-sm">
        The camera preview hit an unexpected error. You can try again or close and use another capture method.
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        <Button type="button" variant="secondary" onClick={() => setBoundaryKey((k) => k + 1)}>
          Try again
        </Button>
        {onDismiss ? (
          <Button type="button" variant="ghost" className="text-white hover:bg-white/10" onClick={onDismiss}>
            Close
          </Button>
        ) : null}
      </div>
    </div>
  );

  return (
    <ErrorBoundary key={boundaryKey} fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
}
