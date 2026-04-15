/**
 * Client Actions Dropdown
 *
 * Unified actions menu for each client row in the dashboard table.
 * Replaces the separate "Open Report" and "Assess" buttons.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Eye,
  GitCompare,
  Link2,
  Check,
  Map,
  UserCog,
  ArrowRightLeft,
  PauseCircle,
  PlayCircle,
  History,
  ClipboardPlus,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getShareTokensForAssessment } from '@/services/share';
import { copyTextToClipboard } from '@/lib/utils/clipboard';
import { CONFIG } from '@/config';
import { formatClientDisplayName } from '@/lib/utils/clientDisplayName';
import { clientDirectoryRowActionsAria } from '@/constants/ui';

interface ClientActionsDropdownProps {
  clientName: string;
  /** The Firestore ID of the client's latest assessment (if any) */
  latestAssessmentId?: string;
  /** Current client status — when 'paused', shows Unpause option */
  clientStatus?: string;
  /** Callback to open the pause/unpause dialog */
  onPauseToggle?: () => void;
  /** Callback to open assessment history dialog (main dashboard) */
  onViewHistory?: (clientName: string) => void;
  /** Callback to start a new assessment for this client */
  onStartAssessment?: (clientName: string) => void;
}

export const ClientActionsDropdown: React.FC<ClientActionsDropdownProps> = ({
  clientName,
  latestAssessmentId,
  clientStatus,
  onPauseToggle,
  onViewHistory,
  onStartAssessment,
}) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const encodedName = encodeURIComponent(clientName);
  const displayName = formatClientDisplayName(clientName);
  const [linkState, setLinkState] = useState<'idle' | 'loading' | 'copied' | 'none'>('idle');

  const handleCopyReportLink = async () => {
    if (!latestAssessmentId || !user) return;
    setLinkState('loading');
    try {
      const tokens = await getShareTokensForAssessment(user.uid, latestAssessmentId, profile?.organizationId);
      const active = tokens.find((t) => !t.revoked);
      if (active) {
        await copyTextToClipboard(`${CONFIG.APP.HOST}/r/${active.token}`);
        setLinkState('copied');
        setTimeout(() => setLinkState('idle'), 2000);
      } else {
        setLinkState('none');
        setTimeout(() => setLinkState('idle'), 3000);
      }
    } catch {
      setLinkState('idle');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 rounded-lg p-0 text-muted-foreground hover:bg-muted hover:text-foreground sm:h-8 sm:w-8"
          aria-label={clientDirectoryRowActionsAria(displayName)}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl border-border p-1 shadow-xl">
        {onStartAssessment && (
          <>
            <DropdownMenuItem
              onClick={() => onStartAssessment(clientName)}
              className="rounded-lg text-xs font-bold px-2 py-2 cursor-pointer focus:bg-primary/10 gap-2 text-foreground-secondary"
            >
              <ClipboardPlus className="h-3.5 w-3.5" />
              Start Assessment
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-muted" />
          </>
        )}
        {/* View Section */}
        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground px-2 py-1.5">
          View
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => navigate(`/client/${encodedName}`)}
          className="rounded-lg text-xs font-bold px-2 py-2 cursor-pointer focus:bg-muted gap-2"
        >
          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          Client Dashboard
        </DropdownMenuItem>
        {onViewHistory && (
          <DropdownMenuItem
            onClick={() => onViewHistory(clientName)}
            className="rounded-lg text-xs font-medium px-2 py-2 cursor-pointer focus:bg-muted text-foreground-secondary gap-2"
          >
            <History className="h-3.5 w-3.5 text-muted-foreground" />
            View History
          </DropdownMenuItem>
        )}
        {latestAssessmentId && (
          <DropdownMenuItem
            onClick={() => navigate(`/coach/assessments/${latestAssessmentId}?clientName=${encodedName}`)}
            className="rounded-lg text-xs font-medium px-2 py-2 cursor-pointer focus:bg-muted text-foreground-secondary gap-2"
          >
            <GitCompare className="h-3.5 w-3.5 text-muted-foreground" />
            View Full Report
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => navigate(`/coach/clients/${encodedName}/roadmap`)}
          className="rounded-lg text-xs font-medium px-2 py-2 cursor-pointer focus:bg-muted text-foreground-secondary gap-2"
        >
          <Map className="h-3.5 w-3.5 text-muted-foreground" />
          View ARC™
        </DropdownMenuItem>
        {latestAssessmentId && (
          <DropdownMenuItem
            onClick={handleCopyReportLink}
            disabled={linkState === 'loading'}
            className="rounded-lg text-xs font-medium px-2 py-2 cursor-pointer focus:bg-muted text-foreground-secondary gap-2"
          >
            {linkState === 'copied' ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            {linkState === 'copied'
              ? 'Copied!'
              : linkState === 'none'
                ? 'Share from report first'
                : linkState === 'loading'
                  ? 'Finding link…'
                  : 'Copy Report Link'}
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className="bg-muted" />

        {/* Manage Section */}
        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground px-2 py-1.5">
          Manage
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => navigate(`/client/${encodedName}?edit=true`)}
          className="rounded-lg text-xs font-medium px-2 py-2 cursor-pointer focus:bg-muted text-foreground-secondary gap-2"
        >
          <UserCog className="h-3.5 w-3.5 text-muted-foreground" />
          Edit Profile
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate(`/client/${encodedName}?transfer=true`)}
          className="rounded-lg text-xs font-medium px-2 py-2 cursor-pointer focus:bg-muted text-foreground-secondary gap-2"
        >
          <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
          Transfer Client
        </DropdownMenuItem>
        {onPauseToggle && (
          <DropdownMenuItem
            onClick={onPauseToggle}
            className="rounded-lg text-xs font-medium px-2 py-2 cursor-pointer focus:bg-muted text-foreground-secondary gap-2"
          >
            {clientStatus === 'paused' ? (
              <>
                <PlayCircle className="h-3.5 w-3.5 text-emerald-500" />
                Unpause Account
              </>
            ) : (
              <>
                <PauseCircle className="h-3.5 w-3.5 text-amber-500" />
                Pause Account
              </>
            )}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
