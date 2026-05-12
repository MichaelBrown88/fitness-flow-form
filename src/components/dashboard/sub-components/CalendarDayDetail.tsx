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

/** Semantic background colors per pillar for calendar pills */
const PILLAR_BG: Record<string, string> = {
  bodycomp: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
  posture: 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300',
  fitness: 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300',
  strength: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  lifestyle: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  full: 'bg-muted text-foreground',
};

/** Dot color for the calendar legend */
export const PILLAR_DOT_COLORS: Record<string, string> = {
  bodycomp: 'bg-blue-500',
  posture: 'bg-violet-500',
  fitness: 'bg-rose-500',
  strength: 'bg-amber-500',
  lifestyle: 'bg-emerald-500',
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
      className={`flex cursor-grab items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight active:cursor-grabbing ${PILLAR_BG[entry.pillar] ?? PILLAR_BG.full} ${
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
  /** Single-pillar callback (legacy). String pillar id or undefined for full. */
  onStartAssessment: (clientName: string, pillar?: string) => void;
  /** Multi-pillar callback — pass an array of pillar ids for a grouped session. */
  onStartSession?: (clientName: string, pillars: string[]) => void;
  onChangeDate?: (clientName: string, pillar: string, newDate: Date) => void;
  organizationId?: string;
  saving?: boolean;
}

export function DayDetailPanel({
  selectedDay,
  onClose,
  onStartAssessment,
  onStartSession,
  onChangeDate,
  organizationId,
  saving,
}: DayDetailPanelProps) {
  const [openDatePopoverId, setOpenDatePopoverId] = useState<string | null>(null);

  // Group entries by client so multi-pillar same-day clients render as ONE
  // row with a "Start session (N)" button instead of N separate Start buttons.
  // A 'full' entry (full reassessment due) is kept separate from the
  // multi-pillar group since it routes to the full assessment flow.
  const grouped = React.useMemo(() => {
    const map = new Map<string, { full: DueEntry[]; pillars: DueEntry[] }>();
    for (const c of selectedDay.clients) {
      const bucket = map.get(c.name) ?? { full: [], pillars: [] };
      if (c.pillar === 'full') bucket.full.push(c);
      else bucket.pillars.push(c);
      map.set(c.name, bucket);
    }
    return Array.from(map.entries()).map(([name, b]) => ({ name, ...b }));
  }, [selectedDay.clients]);

  const canChangeDate = !!organizationId && !!onChangeDate && !saving;

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
      <ul className="space-y-3">
        {grouped.map((g) => {
          const displayClient = formatClientDisplayName(g.name);
          const isMultiPillar = g.pillars.length > 1;
          const worstStatus: ScheduleStatus = g.pillars.some((p) => p.status === 'overdue')
            ? 'overdue'
            : g.pillars.some((p) => p.status === 'due-soon')
              ? 'due-soon'
              : 'up-to-date';
          return (
            <li key={g.name} className="rounded-lg border border-border/60 bg-card-elevated/40 p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <span
                    className={`mt-1.5 shrink-0 w-2 h-2 rounded-full ${
                      worstStatus === 'overdue'
                        ? 'bg-red-500'
                        : worstStatus === 'due-soon'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{displayClient}</p>
                    {g.pillars.length > 0 && (
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {g.pillars.map((p, i) => {
                          const popoverId = `${g.name}-${p.pillar}-${i}`;
                          return (
                            <span
                              key={popoverId}
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${
                                STATUS_COLORS[p.status]
                              }`}
                            >
                              <span>{getPillarLabel(p.pillar, 'short')}</span>
                              {canChangeDate && (
                                <Popover
                                  open={openDatePopoverId === popoverId}
                                  onOpenChange={(open) => setOpenDatePopoverId(open ? popoverId : null)}
                                >
                                  <PopoverTrigger asChild>
                                    <button
                                      type="button"
                                      className="ml-0.5 -mr-0.5 inline-flex items-center justify-center rounded-full p-0.5 text-current/70 hover:text-current hover:bg-foreground/5"
                                      title="Reschedule this pillar"
                                    >
                                      <CalendarIcon className="h-3 w-3" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent align="end" className="w-auto p-0">
                                    <Calendar
                                      mode="single"
                                      defaultMonth={selectedDay.date}
                                      selected={selectedDay.date}
                                      onSelect={(date) => {
                                        if (date) {
                                          onChangeDate?.(g.name, p.pillar, date);
                                          setOpenDatePopoverId(null);
                                        }
                                      }}
                                    />
                                  </PopoverContent>
                                </Popover>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {g.pillars.length > 0 && (
                    <Button
                      variant="default"
                      size="sm"
                      className="h-7 gap-1 rounded-full px-3 text-[11px] font-bold uppercase tracking-wide"
                      onClick={() => {
                        if (isMultiPillar && onStartSession) {
                          onStartSession(g.name, g.pillars.map((p) => p.pillar));
                        } else {
                          onStartAssessment(g.name, g.pillars[0].pillar);
                        }
                      }}
                    >
                      <Play className="h-3 w-3" />
                      {isMultiPillar ? `Start session · ${g.pillars.length}` : 'Start'}
                    </Button>
                  )}
                  {g.full.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 rounded-full px-3 text-[11px] font-bold uppercase tracking-wide"
                      onClick={() => onStartAssessment(g.name)}
                    >
                      <Play className="h-3 w-3" />
                      Start full
                    </Button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
