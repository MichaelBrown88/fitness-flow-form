/**
 * Client Portal Entry — the landing page for the installed client PWA.
 *
 * The client PWA's manifest start_url is "/r" (no token). When a returning
 * client opens the installed app, we check localStorage for the last
 * successfully-viewed share token and redirect them straight to their report.
 *
 * If no token is stored (first install before they've tapped the link, or
 * after clearing storage) we show the standard "open the link your coach sent
 * you" message.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { STORAGE_KEYS } from '@/constants/storageKeys';

export default function ClientPortalEntry() {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const lastToken = localStorage.getItem(STORAGE_KEYS.CLIENT_LAST_TOKEN);
      if (lastToken) {
        navigate(`/r/${lastToken}`, { replace: true });
      }
    } catch {
      /* localStorage unavailable — show the default message */
    }
  }, [navigate]);

  // Check synchronously so we can skip the flash of the message when a token
  // is available. If we redirected above, this never renders.
  let hasToken = false;
  try {
    hasToken = Boolean(localStorage.getItem(STORAGE_KEYS.CLIENT_LAST_TOKEN));
  } catch {
    /* ignore */
  }

  if (hasToken) {
    return (
      <AppShell title="Your fitness report" mode="public">
        <div className="flex flex-col items-center justify-center py-20 px-4" aria-busy="true" aria-live="polite">
          <span className="sr-only">Loading your report</span>
          <Loader2 className="h-8 w-8 text-primary mb-4 motion-safe:animate-spin" aria-hidden />
          <p className="text-sm text-muted-foreground">Loading your report…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Your fitness report" mode="public">
      <div className="max-w-md mx-auto rounded-xl border border-border bg-card text-card-foreground p-6 sm:p-8 text-center space-y-4">
        <p className="text-sm font-medium text-foreground">
          Open the link your coach sent you to view your report.
        </p>
        <p className="text-xs text-muted-foreground">
          Add to home screen from that link to open it quickly next time.
        </p>
      </div>
    </AppShell>
  );
}
