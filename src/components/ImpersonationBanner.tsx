/**
 * Impersonation Banner
 * 
 * Displays a prominent banner when a platform admin is viewing
 * the app as another organization. Provides clear visual indication
 * and easy exit from impersonation mode.
 */

import { Eye, X, Clock, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

export function ImpersonationBanner() {
  const { impersonation, endImpersonation } = useAuth();

  if (!impersonation) return null;

  const timeRemaining = formatDistanceToNow(impersonation.expiresAt, { addSuffix: true });

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
        {/* Left: Impersonation indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-amber-600/30 px-3 py-1 rounded-full">
            <Eye className="h-4 w-4" />
            <span className="font-semibold text-sm">Viewing as Organization</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="font-medium">{impersonation.targetOrgName}</span>
          </div>
        </div>

        {/* Center: Session info */}
        <div className="hidden md:flex items-center gap-4 text-amber-800 text-sm">
          {impersonation.reason && (
            <span>Reason: {impersonation.reason}</span>
          )}
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Expires {timeRemaining}</span>
          </div>
          <span className="px-2 py-0.5 bg-amber-600/30 rounded text-xs font-medium">
            Read-Only Mode
          </span>
        </div>

        {/* Right: Exit button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => endImpersonation()}
          className="bg-amber-600/30 hover:bg-amber-600/50 text-amber-950 font-medium"
        >
          <X className="h-4 w-4 mr-1" />
          Exit Impersonation
        </Button>
      </div>
    </div>
  );
}
