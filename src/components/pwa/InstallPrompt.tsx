/**
 * PWA Install Prompt
 *
 * Detects if the app can be installed and shows a subtle install banner.
 * - Chromium-based browsers: `beforeinstallprompt`
 * - Browsers without that event: manual “Add to Home Screen” instructions
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Download, X, Share } from 'lucide-react';
import { PWA_UI_COPY } from '@/constants/pwaUiCopy';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'pwa-install-dismissed';
const REMOTE_INTAKE_COMPLETE_KEY = 'remote-intake-complete';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || ('standalone' in window.navigator && (navigator as unknown as { standalone: boolean }).standalone);
}

/** True when the browser is likely Apple mobile Safari (no install prompt API). */
function isAppleMobileWebKitWithoutInstallPrompt(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
}

function wasDismissedRecently(): boolean {
  const dismissed = localStorage.getItem(DISMISSED_KEY);
  if (!dismissed) return false;
  return Date.now() - parseInt(dismissed, 10) < DISMISS_DURATION_MS;
}

export function InstallPrompt() {
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showManualHomeScreenPrompt, setShowManualHomeScreenPrompt] = useState(false);
  const [visible, setVisible] = useState(false);
  const [forceShow, setForceShow] = useState(false);

  const onRemoteIntakeRoute =
    /^\/remote\/[^/]+$/i.test(location.pathname) &&
    sessionStorage.getItem(REMOTE_INTAKE_COMPLETE_KEY) !== '1';

  const onClientPortalRoute = /^\/r(\/|$)/i.test(location.pathname);
  const promptBottomClass = onClientPortalRoute
    ? 'bottom-[calc(5rem+env(safe-area-inset-bottom,0px))]'
    : 'bottom-4';

  useEffect(() => {
    const showAfterIntake = () => setForceShow(true);
    window.addEventListener('oneassess-show-install-prompt', showAfterIntake);
    return () => window.removeEventListener('oneassess-show-install-prompt', showAfterIntake);
  }, []);

  useEffect(() => {
    if (onRemoteIntakeRoute && !forceShow && !onClientPortalRoute) return;
    if (isStandalone() || wasDismissedRecently()) return;

    // Chromium-style install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    if (isAppleMobileWebKitWithoutInstallPrompt() && !isStandalone()) {
      const timer = setTimeout(() => setShowManualHomeScreenPrompt(true), 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handler);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [forceShow, onRemoteIntakeRoute, onClientPortalRoute]);

  useEffect(() => {
    if (!forceShow || isStandalone() || wasDismissedRecently()) return;
    if (isAppleMobileWebKitWithoutInstallPrompt()) {
      setShowManualHomeScreenPrompt(true);
    }
  }, [forceShow]);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setShowManualHomeScreenPrompt(false);
    setForceShow(false);
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
  }, []);

  if (onRemoteIntakeRoute && !forceShow && !onClientPortalRoute) {
    return null;
  }

  const positionClass = `fixed left-4 right-4 sm:left-auto sm:right-4 sm:w-[360px] z-[99] animate-in slide-in-from-bottom-4 fade-in duration-300 ${promptBottomClass}`;

  // Install prompt (Chromium family)
  if ((visible && deferredPrompt) || (forceShow && deferredPrompt)) {
    return (
      <div className={positionClass}>
        <div className="bg-background dark:bg-foreground rounded-xl shadow-xl p-4 flex items-start gap-3 border border-border dark:border-border/50">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/15 dark:bg-primary/25 flex items-center justify-center">
            <Download className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground dark:text-white">{PWA_UI_COPY.installTitle}</p>
            <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-0.5">
              {PWA_UI_COPY.installBody}
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={handleInstall}
                className="h-9 sm:h-8 px-3 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {PWA_UI_COPY.installCta}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="h-9 sm:h-8 px-3 text-xs text-muted-foreground hover:text-foreground-secondary dark:text-muted-foreground dark:hover:text-white rounded-lg"
              >
                {PWA_UI_COPY.installDismiss}
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground-secondary dark:text-muted-foreground dark:hover:text-foreground-secondary transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (showManualHomeScreenPrompt || (forceShow && isAppleMobileWebKitWithoutInstallPrompt())) {
    return (
      <div className={positionClass}>
        <div className="bg-background dark:bg-foreground rounded-xl shadow-xl p-4 flex items-start gap-3 border border-border dark:border-border/50">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/15 dark:bg-primary/25 flex items-center justify-center">
            <Share className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground dark:text-white">{PWA_UI_COPY.iosTitle}</p>
            <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1 leading-relaxed">
              {PWA_UI_COPY.iosBodyBeforeStrong}{' '}
              <Share className="w-3 h-3 inline -mt-0.5" /> then{' '}
              <strong>&quot;{PWA_UI_COPY.iosBodyStrong}&quot;</strong> {PWA_UI_COPY.iosBodyAfterStrong}
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="h-9 sm:h-8 px-3 text-xs text-muted-foreground mt-2 rounded-lg"
            >
              {PWA_UI_COPY.iosGotIt}
            </Button>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground-secondary dark:text-muted-foreground dark:hover:text-foreground-secondary transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
