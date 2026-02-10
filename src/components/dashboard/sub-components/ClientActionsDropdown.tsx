/**
 * Client Actions Dropdown
 *
 * Unified actions menu for each client row in the dashboard table.
 * Replaces the separate "Open Report" and "Assess" buttons.
 */

import React from 'react';
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
  UserCog,
  ArrowRightLeft,
} from 'lucide-react';

interface ClientActionsDropdownProps {
  clientName: string;
  /** The Firestore ID of the client's latest assessment (if any) */
  latestAssessmentId?: string;
}

export const ClientActionsDropdown: React.FC<ClientActionsDropdownProps> = ({
  clientName,
  latestAssessmentId,
}) => {
  const navigate = useNavigate();
  const encodedName = encodeURIComponent(clientName);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 sm:h-8 sm:w-8 p-0 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-xl border-slate-200 p-1">
        {/* View Section */}
        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 py-1.5">
          View
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => navigate(`/client/${encodedName}`)}
          className="rounded-lg text-xs font-bold px-2 py-2 cursor-pointer focus:bg-slate-50 gap-2"
        >
          <Eye className="h-3.5 w-3.5 text-slate-500" />
          Client Dashboard
        </DropdownMenuItem>
        {latestAssessmentId && (
          <DropdownMenuItem
            onClick={() => navigate(`/coach/assessments/${latestAssessmentId}?clientName=${encodedName}`)}
            className="rounded-lg text-xs font-medium px-2 py-2 cursor-pointer focus:bg-slate-50 text-slate-600 gap-2"
          >
            <GitCompare className="h-3.5 w-3.5 text-slate-400" />
            View Full Report
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className="bg-slate-100" />

        {/* Manage Section */}
        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 py-1.5">
          Manage
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => navigate(`/client/${encodedName}?edit=true`)}
          className="rounded-lg text-xs font-medium px-2 py-2 cursor-pointer focus:bg-slate-50 text-slate-600 gap-2"
        >
          <UserCog className="h-3.5 w-3.5 text-slate-400" />
          Edit Profile
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate(`/client/${encodedName}?transfer=true`)}
          className="rounded-lg text-xs font-medium px-2 py-2 cursor-pointer focus:bg-slate-50 text-slate-600 gap-2"
        >
          <ArrowRightLeft className="h-3.5 w-3.5 text-slate-400" />
          Transfer Client
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
