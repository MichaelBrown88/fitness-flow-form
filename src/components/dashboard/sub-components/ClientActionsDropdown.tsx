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
  ClipboardList,
  Scale,
  Camera,
  Activity,
  Dumbbell,
  Heart,
  UserCog,
  ArrowRightLeft,
} from 'lucide-react';
import { getPillarLabel } from '@/constants/pillars';

interface ClientActionsDropdownProps {
  clientName: string;
  /** The Firestore ID of the client's latest assessment (if any) */
  latestAssessmentId?: string;
  onNewAssessment: (clientName: string, category?: string) => void;
}

export const ClientActionsDropdown: React.FC<ClientActionsDropdownProps> = ({
  clientName,
  latestAssessmentId,
  onNewAssessment,
}) => {
  const navigate = useNavigate();
  const encodedName = encodeURIComponent(clientName);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100"
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

        {/* Assess Section */}
        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 py-1.5">
          Assess
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => onNewAssessment(clientName)}
          className="rounded-lg text-xs font-bold px-2 py-2 cursor-pointer focus:bg-slate-50 gap-2"
        >
          <ClipboardList className="h-3.5 w-3.5 text-slate-500" />
          Full Assessment
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onNewAssessment(clientName, 'inbody')}
          className="rounded-lg text-xs font-medium px-2 py-2 cursor-pointer focus:bg-slate-50 text-slate-600 gap-2"
        >
          <Scale className="h-3.5 w-3.5 text-slate-400" />
          {getPillarLabel('inbody')} Only
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onNewAssessment(clientName, 'posture')}
          className="rounded-lg text-xs font-medium px-2 py-2 cursor-pointer focus:bg-slate-50 text-slate-600 gap-2"
        >
          <Camera className="h-3.5 w-3.5 text-slate-400" />
          {getPillarLabel('posture')} Only
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onNewAssessment(clientName, 'fitness')}
          className="rounded-lg text-xs font-medium px-2 py-2 cursor-pointer focus:bg-slate-50 text-slate-600 gap-2"
        >
          <Activity className="h-3.5 w-3.5 text-slate-400" />
          {getPillarLabel('fitness')} Only
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onNewAssessment(clientName, 'strength')}
          className="rounded-lg text-xs font-medium px-2 py-2 cursor-pointer focus:bg-slate-50 text-slate-600 gap-2"
        >
          <Dumbbell className="h-3.5 w-3.5 text-slate-400" />
          {getPillarLabel('strength')} Only
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onNewAssessment(clientName, 'lifestyle')}
          className="rounded-lg text-xs font-medium px-2 py-2 cursor-pointer focus:bg-slate-50 text-slate-600 gap-2"
        >
          <Heart className="h-3.5 w-3.5 text-slate-400" />
          {getPillarLabel('lifestyle')} Only
        </DropdownMenuItem>

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
