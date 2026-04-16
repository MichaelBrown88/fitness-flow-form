import React, { useState } from 'react';
import { format } from 'date-fns';
import { X, GripVertical, CalendarIcon, Play } from 'lucide-react';
import { getPillarLabel } from '@/constants/pillars';
import type { ScheduleStatus } from '@/hooks/useReassessmentQueue';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { formatClientDisplayName } from '@/lib/utils/clientDisplayName';

export interface DueEntry {
  name: string;
  pillar: string;
  status: ScheduleStatus;
}

export interface DayClients {
  date: Date;
  clients: DueEntry[];
}

export interface DragPayload {
  clientName: string;
  pillar: string;
  fromDate: string;
}

const STATUS_COLORS: Record<ScheduleStatus, string> = {
  overdue:
    'border-score-red/40 bg-score-red-muted/60 text-score-red-fg',
  'due-soon':
    'border-score-amber/40 bg-score-amber-muted/60 text-score-amber-fg',
  'up-to-date':
    'border-border bg-muted/50 text-muted-foreground',
};

const PILLAR_ABBREV: Record<string, string> = {
  bodycomp: 'BC',
  posture: 'PO',
  fitness: 'FT',
  strength: 'ST',
  lifestyle: 'LS',
  full: 'ALL',
};

function pillarAbbrev(pillar: string): string {
  return PILLAR_ABBREV[pillar] ?? pillar.slice(0, 2).toUpperCase();
}

interface ClientPillProps {
  entry: DueEntry;
  dateKey: string;
  day?: Date;
  dayClients?: DueEntry[];
  onPillClick?: (e: React.MouseEvent, day: Date, clients: DueEntry[], entry: DueEntry, dateKey: string) => void;
  isSelected?: boolean;
}

export function ClientPill({ entry, dateKey, day, dayClients, onPillClick, isSelected }: ClientPillProps) {
  const displayName = formatClientDisplayName(entry.name);
  const firstName = displayName.split(' ')[0] ?? displayName;

  const handleDragStart = (e: React.DragEvent) => {
    const payload: DragPayload = {
      clientName: entry.name,
      pillar: entry.pillar,
      fromDate: dateKey,
    };
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleClick = (e: React.MouseEvent) => {
    if (day && dayClients && onPillClick) onPillClick(e, day, dayClients, entry, dateKey);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={handleClick}
      className={`flex cursor-grab items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight active:cursor-grabbing ${STATUS_COLORS[entry.status]} ${
        isSelected ? 'ring-1 ring-foreground/30' : ''
      }`}
      title={`${displayName} — ${getPillarLabel(entry.pillar)}`}
    >
      <span className="truncate">{firstName}</span>
      <span className="opacity-50 shrink-0 text-[9px]">{pillarAbbrev(entry.pillar)}</span>
    </div>
  );
}

interface DayDetailPanelProps {
  selectedDay: DayClients;
  onClose: () => void;
  onStartAssessment: (clientName: string, pillar?: string) => void;
  onChangeDate?: (clientName: string, pillar: string, newDate: Date) => void;
  organizationId?: string;
  saving?: boolean;
}

export function DayDetailPanel({
  selectedDay,
  onClose,
  onStartAssessment,
  onChangeDate,
  organizationId,
  saving,
}: DayDetailPanelProps) {
  const [openDatePopoverId, setOpenDatePopoverId] = useState<string | null>(null);

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-foreground">
          {format(selectedDay.date, 'EEEE, MMM d')}
        </h4>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <ul className="space-y-2">
        {selectedDay.clients.map((c, i) => {
          const popoverId = `${c.name}-${c.pillar}-${i}`;
          const canChangeDate = !!organizationId && !!onChangeDate && !saving;
          const displayClient = formatClientDisplayName(c.name);
          return (
            <li key={popoverId} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className={`shrink-0 w-2 h-2 rounded-full ${
                  c.status === 'overdue' ? 'bg-red-500' :
                  c.status === 'due-soon' ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />
                <span className="truncate text-sm text-foreground">
                  <span className="font-semibold">{displayClient}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{getPillarLabel(c.pillar)}</span>
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {canChangeDate && (
                  <Popover open={openDatePopoverId === popoverId} onOpenChange={(open) => setOpenDatePopoverId(open ? popoverId : null)}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <CalendarIcon className="h-3 w-3" />
                        Change date
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-auto p-0">
                      <Calendar
                        mode="single"
                        defaultMonth={selectedDay.date}
                        selected={selectedDay.date}
                        onSelect={(date) => {
                          if (date) {
                            onChangeDate(c.name, c.pillar, date);
                            setOpenDatePopoverId(null);
                          }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-[10px] font-bold uppercase tracking-wide text-foreground-secondary hover:bg-muted"
                  onClick={() => onStartAssessment(c.name, c.pillar)}
                >
                  <Play className="h-3 w-3" />
                  Start
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
