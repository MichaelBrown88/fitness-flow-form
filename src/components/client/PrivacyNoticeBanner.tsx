import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { STORAGE_KEYS } from '@/constants/storageKeys';

/**
 * One-time privacy notice shown to clients on their first report view per session.
 * Uses sessionStorage so it reappears on a new browser session but not within the same one.
 * Cleared on tab close — no persistent tracking of whether notice was seen.
 */
export function PrivacyNoticeBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const seen = sessionStorage.getItem(STORAGE_KEYS.CLIENT_PRIVACY_NOTICE_SEEN);
      if (!seen) setVisible(true);
    } catch {
      // sessionStorage unavailable (private browsing restriction) — skip banner
    }
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      sessionStorage.setItem(STORAGE_KEYS.CLIENT_PRIVACY_NOTICE_SEEN, '1');
    } catch {
      // non-critical
    }
  }

  if (!visible) return null;

  return (
    <div
      role="banner"
      aria-label="Privacy notice"
      className="sticky top-0 z-50 w-full bg-muted/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-start gap-3 text-sm text-muted-foreground"
    >
      <p className="flex-1 leading-snug">
        <span className="font-medium text-foreground">Your data, your control.</span>{' '}
        This report is shared privately with you by your coach. Your name and assessment
        data are visible to your coach and their organisation. You can download or delete
        your data at any time using the links at the bottom of this page.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss privacy notice"
        className="mt-0.5 shrink-0 rounded-md p-1 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
