/**
 * MaintenanceBanner
 *
 * Non-dismissible banner shown to end users when platform maintenance mode
 * is enabled. Uses useFeatureFlags() for real-time updates. Hidden on admin routes.
 */

import { useLocation } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

export function MaintenanceBanner() {
  const location = useLocation();
  const { maintenance } = useFeatureFlags();

  const isAdminRoute = location.pathname.startsWith('/admin');
  const showBanner =
    !isAdminRoute &&
    maintenance?.is_maintenance_mode === true &&
    maintenance?.message;

  if (!showBanner) return null;

  return (
    <div
      className="flex items-center justify-center gap-2 py-2 px-4 bg-score-amber-light border-b border-score-amber-muted text-score-amber-fg"
      role="alert"
    >
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <p className="text-sm font-medium">{maintenance.message}</p>
    </div>
  );
}
