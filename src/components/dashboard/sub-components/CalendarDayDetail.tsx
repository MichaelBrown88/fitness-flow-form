import React, { useState } from 'react';
import { format } from 'date-fns';
import { X, GripVertical, CalendarIcon, Play } from 'lucide-react';
import { getPillarLabel } from '@/constants/pillars';
import type { ScheduleStatus } from '@/hooks/useReassessmentQueue';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';

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
  'overdue': 'border-red-300 bg-red-50 text-red-700',
  'due-soon': 'border-amber-300 bg-amber-50 text-amber-700',
  'up-to-date': 'border-slate-200 bg-slate-50 text-slate-600',
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
  const firstName = entry.name.split(' ')[0];

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
      className={`flex items-center gap-0.5 px-1 py-0.5 rounded border text-[9px] sm:text-[10px] font-semibold leading-tight cursor-grab active:cursor-grabbing truncate ${STATUS_COLORS[entry.status]} ${
        isSelected ? 'ring-2 ring-violet-500 ring-offset-1' : ''
      }`}
      title={`${entry.name} — ${getPillarLabel(entry.pillar)} (Ctrl/Cmd+click to select multiple)`}
    >
      <GripVertical className="h-2.5 w-2.5 shrink-0 opacity-40" />
      <span className="truncate">{firstName}</span>
      <span className="opacity-60 shrink-0">{pillarAbbrev(entry.pillar)}</span>
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
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-900">
          {format(selectedDay.date, 'EEEE, MMM d')}
        </h4>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>
      <ul className="space-y-2">
        {selectedDay.clients.map((c, i) => {
          const popoverId = `${c.name}-${c.pillar}-${i}`;
          const canChangeDate = !!organizationId && !!onChangeDate && !saving;
          return (
            <li key={popoverId} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className={`shrink-0 w-2 h-2 rounded-full ${
                  c.status === 'overdue' ? 'bg-red-500' :
                  c.status === 'due-soon' ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />
                <span className="text-sm text-slate-700 truncate">
                  <span className="font-semibold">{c.name}</span>
                  <span className="text-slate-400 ml-2 text-xs">{getPillarLabel(c.pillar)}</span>
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {canChangeDate && (
                  <Popover open={openDatePopoverId === popoverId} onOpenChange={(open) => setOpenDatePopoverId(open ? popoverId : null)}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-xs text-slate-600 hover:text-slate-900"
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
                  className="h-7 gap-1 text-[10px] font-bold uppercase tracking-wide text-violet-600 hover:text-violet-800 hover:bg-violet-50"
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
