/**
 * FeatureAnnouncementBanner
 *
 * Dismissible banner for product announcements (new features, releases).
 * Driven by `platform/config.announcement` in Firestore via useFeatureFlags().
 * Each announcement has a unique ID; dismissals are tracked per-ID in localStorage.
 * Hidden on admin routes (same as MaintenanceBanner).
 */

import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Megaphone, X, ArrowRight } from 'lucide-react';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

const DISMISS_PREFIX = 'oa_announcement_dismissed_';

export function FeatureAnnouncementBanner() {
  const location = useLocation();
  const { announcement } = useFeatureFlags();

  const id = announcement?.id;
  const [dismissed, setDismissed] = useState(() => {
    if (!id) return false;
    try { return localStorage.getItem(`${DISMISS_PREFIX}${id}`) === '1'; } catch { return false; }
  });

  const isAdminRoute = location.pathname.startsWith('/admin');
  const show = !isAdminRoute && !dismissed && announcement?.active && announcement?.message;

  if (!show || !announcement) return null;

  const handleDismiss = () => {
    try { localStorage.setItem(`${DISMISS_PREFIX}${announcement.id}`, '1'); } catch { /* noop */ }
    setDismissed(true);
  };

  const isExternalLink = announcement.ctaHref?.startsWith('http');

  return (
    <div
      className="flex items-center justify-center gap-2 py-2 px-4 bg-primary/10 border-b border-primary/20 text-primary"
      role="status"
    >
      <Megaphone className="w-4 h-4 shrink-0" />
      <p className="text-sm font-medium">{announcement.message}</p>
      {announcement.ctaLabel && announcement.ctaHref && (
        isExternalLink ? (
          <a
            href={announcement.ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-bold underline underline-offset-2 hover:no-underline"
          >
            {announcement.ctaLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        ) : (
          <Link
            to={announcement.ctaHref}
            className="inline-flex items-center gap-1 text-sm font-bold underline underline-offset-2 hover:no-underline"
          >
            {announcement.ctaLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )
      )}
      <button
        onClick={handleDismiss}
        className="ml-2 p-0.5 rounded hover:bg-primary/10 transition-colors shrink-0"
        aria-label="Dismiss announcement"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
