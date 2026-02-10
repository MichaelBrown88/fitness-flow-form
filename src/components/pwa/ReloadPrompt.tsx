/**
 * PWA Reload Prompt
 * 
 * Shows a toast-like notification when a new version of the app is available.
 * Uses vite-plugin-pwa's virtual module for service worker registration.
 */

import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';

export function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      // Check for updates every 60 minutes
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-[360px] z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-slate-900 text-white rounded-xl shadow-2xl p-4 flex items-start gap-3 border border-slate-700/50">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-violet-500/20 flex items-center justify-center">
          <RefreshCw className="w-4 h-4 text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Update available</p>
          <p className="text-xs text-slate-400 mt-0.5">
            A new version of FitnessFlow is ready.
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={() => updateServiceWorker(true)}
              className="h-7 px-3 text-xs bg-violet-600 hover:bg-violet-500 text-white rounded-lg"
            >
              Refresh now
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setNeedRefresh(false)}
              className="h-7 px-3 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
            >
              Later
            </Button>
          </div>
        </div>
        <button
          onClick={() => setNeedRefresh(false)}
          className="flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
