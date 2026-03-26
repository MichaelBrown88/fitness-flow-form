/**
 * Client Profile Dropdown
 *
 * Provides the client navigation menu on public report views.
 * Uses shareToken for identity — no Firebase auth required.
 * Self-service items are informational for now (future feature).
 */

import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  Camera,
  Heart,
  Scale,
  ChevronDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ClientProfileDropdownProps {
  clientName: string;
  /** Share token used for token-scoped features */
  shareToken: string;
}

export function ClientProfileDropdown({
  clientName,
  shareToken,
}: ClientProfileDropdownProps) {
  const navigate = useNavigate();
  
  const initials =
    clientName
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'C';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 rounded-full p-0.5 hover:bg-muted/50 transition-colors"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-gradient-from to-gradient-to text-[10px] font-bold text-primary-foreground">
            {initials}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground mr-0.5" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {/* Header */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{clientName}</p>
            <p className="text-xs leading-none text-muted-foreground">Your Profile</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Achievements */}
        <DropdownMenuItem
          className="flex items-center gap-2"
          onClick={() => navigate(`/r/${shareToken}/achievements`)}
        >
          <Trophy className="h-4 w-4" />
          Achievements
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Self-service partials (informational — future feature) */}
        <DropdownMenuItem
          disabled
          className="flex items-center justify-between"
        >
          <span className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Posture Scan
          </span>
          <span className="text-[10px] font-medium text-muted-foreground">Coming soon</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="flex items-center gap-2"
          onClick={() => navigate(`/r/${shareToken}/lifestyle`)}
        >
          <Heart className="h-4 w-4" />
          Lifestyle Check-in
        </DropdownMenuItem>

        <DropdownMenuItem
          disabled
          className="flex items-center justify-between"
        >
          <span className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Body Comp Scan
          </span>
          <span className="text-[10px] font-medium text-muted-foreground">Coming soon</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
