/**
 * Companion Loading and Error States
 * Extracted from Companion.tsx to improve maintainability
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface CompanionLoadingStatesProps {
  isValidating: boolean;
  isAuthorized: boolean;
  errorMsg: string | null;
  onRetry: () => void;
  mode: 'posture' | 'bodycomp';
  viewIdx: number;
  totalViews: number;
}

export function CompanionLoadingStates({
  isValidating,
  isAuthorized,
  errorMsg,
  onRetry,
  mode,
  viewIdx,
  totalViews,
}: CompanionLoadingStatesProps) {
  if (isValidating) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white font-bold">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
        <div>Connecting...</div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-white text-center font-bold">
        <h1 className="text-2xl mb-2">Session Invalid</h1>
        <p className="mt-2 text-xs text-white/40">{errorMsg || 'Unable to connect'}</p>
        <Button onClick={onRetry} className="mt-6 bg-primary hover:brightness-110">
          Retry
        </Button>
      </div>
    );
  }

  // Body comp completion
  if (mode === 'bodycomp' && viewIdx === 999) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-white text-center">
        <div className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Data Added</h1>
        <p className="text-white/60 text-sm mb-4">
          Body composition data has been added to the app.
        </p>
        <p className="text-white/40 text-xs">You can close this window.</p>
      </div>
    );
  }

  // Posture completion
  if (mode === 'posture' && viewIdx >= totalViews) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-white text-center">
        <div className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Sync Complete</h1>
        <p className="text-white/60 text-sm">Return to the app.</p>
      </div>
    );
  }

  return null;
}

