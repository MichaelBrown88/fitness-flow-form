import React, { useState, useMemo, useCallback } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  format,
  addMonths,
  subMonths,
  isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { UseReassessmentQueueResult } from '@/hooks/useReassessmentQueue';
import { setDueDateOverride } from '@/services/clientProfiles';
import { logger } from '@/lib/utils/logger';
import { ClientPill, DayDetailPanel } from './CalendarDayDetail';
import type { DueEntry, DayClients, DragPayload } from './CalendarDayDetail';

interface CalendarViewProps {
  reassessmentQueue: UseReassessmentQueueResult;
  onNewAssessmentForClient: (clientName: string, category?: string) => void;
  organizationId?: string;
  onScheduleChanged?: () => void;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_VISIBLE_PILLS = 3;

export const CalendarView: React.FC<CalendarViewProps> = ({
  reassessmentQueue,
  onNewAssessmentForClient,
  organizationId,
  onScheduleChanged,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayClients | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dueByDay = useMemo(() => {
    const map = new Map<string, DueEntry[]>();
    for (const item of reassessmentQueue.queue) {
      for (const ps of item.pillarSchedules) {
        const key = format(ps.dueDate, 'yyyy-MM-dd');
        const existing = map.get(key) ?? [];
        existing.push({ name: item.clientName, pillar: ps.pillar, status: ps.status });
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

  const handleDrop = useCallback(async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    setDragOverKey(null);
    if (!organizationId || saving) return;

    try {
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      const payload: DragPayload = JSON.parse(raw);
      const targetKey = format(targetDate, 'yyyy-MM-dd');
      if (payload.fromDate === targetKey) return;

      setSaving(true);
      await setDueDateOverride(payload.clientName, organizationId, payload.pillar, targetDate);
      onScheduleChanged?.();
    } catch (err) {
      logger.error('Failed to reschedule via drag-and-drop', err);
    } finally {
      setSaving(false);
    }
  }, [organizationId, saving, onScheduleChanged]);

  const handleDragOver = useCallback((e: React.DragEvent, key: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverKey(key);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverKey(null);
  }, []);

  return (
    <div className="space-y-4">
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

      <div className="grid grid-cols-7 gap-px">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 py-2">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden border border-slate-200">
        {calendarDays.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const clients = dueByDay.get(key) ?? [];
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const isDropTarget = dragOverKey === key;
          const visibleClients = clients.slice(0, MAX_VISIBLE_PILLS);
          const overflow = clients.length - MAX_VISIBLE_PILLS;

          return (
            <div
              key={key}
              onClick={() => clients.length > 0 && setSelectedDay({ date: day, clients })}
              onDragOver={(e) => handleDragOver(e, key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, day)}
              className={`relative min-h-[72px] sm:min-h-[96px] p-1 sm:p-1.5 text-left bg-white transition-colors ${
                inMonth ? 'hover:bg-slate-50' : 'bg-slate-50/50'
              } ${clients.length > 0 ? 'cursor-pointer' : 'cursor-default'} ${
                isDropTarget ? 'ring-2 ring-inset ring-violet-400 bg-violet-50/50' : ''
              }`}
            >
              <span className={`text-[10px] sm:text-xs font-semibold ${
                today ? 'bg-slate-900 text-white w-5 h-5 sm:w-6 sm:h-6 rounded-full inline-flex items-center justify-center' :
                inMonth ? 'text-slate-700' : 'text-slate-300'
              }`}>
                {format(day, 'd')}
              </span>
              {clients.length > 0 && (
                <div className="mt-0.5 space-y-0.5">
                  {visibleClients.map((entry, i) => (
                    <ClientPill key={`${entry.name}-${entry.pillar}-${i}`} entry={entry} dateKey={key} />
                  ))}
                  {overflow > 0 && (
                    <span className="block text-[9px] font-bold text-slate-400 pl-1">
                      +{overflow} more
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {saving && (
        <div className="text-xs text-center text-slate-400 font-medium animate-pulse">
          Rescheduling…
        </div>
      )}

      {selectedDay && (
        <DayDetailPanel
          selectedDay={selectedDay}
          onClose={() => setSelectedDay(null)}
          onStartAssessment={onNewAssessmentForClient}
        />
      )}
    </div>
  );
};
