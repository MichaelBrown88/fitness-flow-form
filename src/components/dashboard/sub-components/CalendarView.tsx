import React, { useState, useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
  addMonths,
  subMonths,
  isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { UseReassessmentQueueResult } from '@/hooks/useReassessmentQueue';

interface CalendarViewProps {
  reassessmentQueue: UseReassessmentQueueResult;
  onNewAssessmentForClient: (clientName: string, category?: string) => void;
}

interface DayClients {
  date: Date;
  clients: { name: string; pillar: string }[];
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarView: React.FC<CalendarViewProps> = ({
  reassessmentQueue,
  onNewAssessmentForClient,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayClients | null>(null);

  const dueByDay = useMemo(() => {
    const map = new Map<string, { name: string; pillar: string }[]>();
    for (const item of reassessmentQueue.queue) {
      for (const ps of item.pillarSchedules) {
        const key = format(ps.dueDate, 'yyyy-MM-dd');
        const existing = map.get(key) ?? [];
        existing.push({ name: item.clientName, pillar: ps.pillar });
        map.set(key, existing);
      }
    }
    return map;
  }, [reassessmentQueue]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const start = startOfWeek(monthStart);
    const end = endOfWeek(monthEnd);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h3 className="text-sm font-bold text-slate-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-px">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden border border-slate-200">
        {calendarDays.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const clients = dueByDay.get(key) ?? [];
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);

          return (
            <button
              key={key}
              onClick={() => {
                if (clients.length > 0) {
                  setSelectedDay({ date: day, clients });
                }
              }}
              className={`relative min-h-[64px] sm:min-h-[80px] p-1.5 sm:p-2 text-left bg-white transition-colors ${
                inMonth ? 'hover:bg-slate-50' : 'bg-slate-50/50'
              } ${clients.length > 0 ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <span className={`text-xs font-semibold ${
                today ? 'bg-slate-900 text-white w-6 h-6 rounded-full inline-flex items-center justify-center' :
                inMonth ? 'text-slate-700' : 'text-slate-300'
              }`}>
                {format(day, 'd')}
              </span>
              {clients.length > 0 && (
                <div className="mt-1">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-violet-100 text-violet-700">
                    {clients.length} due
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900">
              {format(selectedDay.date, 'EEEE, MMM d')}
            </h4>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="space-y-2">
            {selectedDay.clients.map((c, i) => (
              <li key={`${c.name}-${c.pillar}-${i}`} className="flex items-center justify-between">
                <span className="text-sm text-slate-700">
                  <span className="font-semibold">{c.name}</span>
                  <span className="text-slate-400 ml-2 text-xs capitalize">{c.pillar}</span>
                </span>
                <button
                  onClick={() => onNewAssessmentForClient(c.name, c.pillar)}
                  className="text-[10px] font-bold uppercase tracking-wide text-violet-600 hover:text-violet-800 px-2 py-1 rounded-lg hover:bg-violet-50 transition-colors"
                >
                  Start
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
