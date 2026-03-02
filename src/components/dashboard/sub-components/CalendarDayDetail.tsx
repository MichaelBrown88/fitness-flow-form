import React from 'react';
import { format } from 'date-fns';
import { X, GripVertical } from 'lucide-react';
import { getPillarLabel } from '@/constants/pillars';
import type { ScheduleStatus } from '@/hooks/useReassessmentQueue';

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

export function ClientPill({ entry, dateKey }: { entry: DueEntry; dateKey: string }) {
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

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`flex items-center gap-0.5 px-1 py-0.5 rounded border text-[9px] sm:text-[10px] font-semibold leading-tight cursor-grab active:cursor-grabbing truncate ${STATUS_COLORS[entry.status]}`}
      title={`${entry.name} — ${getPillarLabel(entry.pillar)}`}
    >
      <GripVertical className="h-2.5 w-2.5 shrink-0 opacity-40" />
      <span className="truncate">{firstName}</span>
      <span className="opacity-60 shrink-0">{pillarAbbrev(entry.pillar)}</span>
    </div>
  );
}

export function DayDetailPanel({
  selectedDay,
  onClose,
  onStartAssessment,
}: {
  selectedDay: DayClients;
  onClose: () => void;
  onStartAssessment: (clientName: string, pillar?: string) => void;
}) {
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
        {selectedDay.clients.map((c, i) => (
          <li key={`${c.name}-${c.pillar}-${i}`} className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`shrink-0 w-2 h-2 rounded-full ${
                c.status === 'overdue' ? 'bg-red-500' :
                c.status === 'due-soon' ? 'bg-amber-500' : 'bg-emerald-500'
              }`} />
              <span className="text-sm text-slate-700 truncate">
                <span className="font-semibold">{c.name}</span>
                <span className="text-slate-400 ml-2 text-xs">{getPillarLabel(c.pillar)}</span>
              </span>
            </div>
            <button
              onClick={() => onStartAssessment(c.name, c.pillar)}
              className="text-[10px] font-bold uppercase tracking-wide text-violet-600 hover:text-violet-800 px-2 py-1 rounded-lg hover:bg-violet-50 transition-colors shrink-0"
            >
              Start
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
