/**
 * PWA Reload Prompt
 * 
 * Shows a toast-like notification when a new version of the app is available.
 * Uses vite-plugin-pwa's virtual module for service worker registration.
 */

import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/utils/logger';
import { RefreshCw, X } from 'lucide-react';
import { PWA_UI_COPY } from '@/constants/pwaUiCopy';

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
      logger.error('SW registration error:', error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-[360px] z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-foreground text-white rounded-xl shadow-xl p-4 flex items-start gap-3 border border-border/50">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/25 flex items-center justify-center">
          <RefreshCw className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{PWA_UI_COPY.updateTitle}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {PWA_UI_COPY.updateBody}
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={() => updateServiceWorker(true)}
              className="h-9 sm:h-8 px-3 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {PWA_UI_COPY.updateCta}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setNeedRefresh(false)}
              className="h-9 sm:h-8 px-3 text-xs text-muted-foreground hover:text-white hover:bg-foreground/90 rounded-lg"
            >
              {PWA_UI_COPY.updateLater}
            </Button>
          </div>
        </div>
        <button
          onClick={() => setNeedRefresh(false)}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground-secondary transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
