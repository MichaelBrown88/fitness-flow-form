import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
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
import { ChevronLeft, ChevronRight, CalendarIcon, X } from 'lucide-react';
import type { UseReassessmentQueueResult } from '@/hooks/useReassessmentQueue';
import { setDueDateOverride } from '@/services/clientProfiles';
import { logger } from '@/lib/utils/logger';
import { ClientPill, DayDetailPanel } from './CalendarDayDetail';
import type { DueEntry, DayClients, DragPayload } from './CalendarDayDetail';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';

export interface SelectedEntry {
  clientName: string;
  pillar: string;
  dateKey: string;
}

function entryKey(entry: SelectedEntry): string {
  return `${entry.clientName}|${entry.pillar}|${entry.dateKey}`;
}

interface CalendarViewProps {
  reassessmentQueue: UseReassessmentQueueResult;
  onNewAssessmentForClient: (clientName: string, category?: string) => void;
  organizationId?: string;
  onScheduleChanged?: () => void;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_VISIBLE_PILLS = 3;
const EDGE_SCROLL_ZONE = 0.12;
const EDGE_SCROLL_THROTTLE_MS = 400;

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
  const [selectedEntries, setSelectedEntries] = useState<SelectedEntry[]>([]);
  const [groupDatePickerOpen, setGroupDatePickerOpen] = useState(false);
  const calendarGridRef = useRef<HTMLDivElement>(null);
  const calendarWrapperRef = useRef<HTMLDivElement>(null);
  const edgeScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEdgeRef = useRef<'left' | 'right' | null>(null);

  const clearSelection = useCallback(() => {
    setSelectedEntries([]);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clearSelection();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [clearSelection]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (selectedEntries.length === 0) return;
      const target = e.target as Node;
      const wrapper = calendarWrapperRef.current;
      if (!wrapper?.contains(target) && !(e.target as Element).closest('[data-state="open"]')) {
        clearSelection();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [selectedEntries.length, clearSelection]);

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

  const selectedKeysSet = useMemo(
    () => new Set(selectedEntries.map(entryKey)),
    [selectedEntries],
  );

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

  useEffect(() => {
    const onDocumentDragOver = (e: DragEvent) => {
      const el = calendarGridRef.current;
      if (!el || !e.dataTransfer?.types?.includes('application/json')) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX;
      const leftEdge = rect.left + rect.width * EDGE_SCROLL_ZONE;
      const rightEdge = rect.right - rect.width * EDGE_SCROLL_ZONE;
      if (x < leftEdge) {
        if (lastEdgeRef.current !== 'left') {
          lastEdgeRef.current = 'left';
          if (edgeScrollTimeoutRef.current) clearTimeout(edgeScrollTimeoutRef.current);
          edgeScrollTimeoutRef.current = setTimeout(() => {
            setCurrentMonth((prev) => subMonths(prev, 1));
            edgeScrollTimeoutRef.current = null;
          }, EDGE_SCROLL_THROTTLE_MS);
        }
      } else if (x > rightEdge) {
        if (lastEdgeRef.current !== 'right') {
          lastEdgeRef.current = 'right';
          if (edgeScrollTimeoutRef.current) clearTimeout(edgeScrollTimeoutRef.current);
          edgeScrollTimeoutRef.current = setTimeout(() => {
            setCurrentMonth((prev) => addMonths(prev, 1));
            edgeScrollTimeoutRef.current = null;
          }, EDGE_SCROLL_THROTTLE_MS);
        }
      } else {
        lastEdgeRef.current = null;
        if (edgeScrollTimeoutRef.current) {
          clearTimeout(edgeScrollTimeoutRef.current);
          edgeScrollTimeoutRef.current = null;
        }
      }
    };
    document.addEventListener('dragover', onDocumentDragOver);
    return () => {
      document.removeEventListener('dragover', onDocumentDragOver);
      if (edgeScrollTimeoutRef.current) clearTimeout(edgeScrollTimeoutRef.current);
    };
  }, []);

  const toggleEntrySelection = useCallback((entry: DueEntry, dateKey: string) => {
    const key = `${entry.name}|${entry.pillar}|${dateKey}`;
    setSelectedEntries((prev) => {
      const has = prev.some((e) => entryKey(e) === key);
      if (has) return prev.filter((e) => entryKey(e) !== key);
      return [...prev, { clientName: entry.name, pillar: entry.pillar, dateKey }];
    });
  }, []);

  const toggleDaySelection = useCallback((date: Date, clients: DueEntry[]) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const toAdd = clients.map((c) => ({ clientName: c.name, pillar: c.pillar, dateKey }));
    const toAddKeys = new Set(toAdd.map((e) => entryKey(e)));
    setSelectedEntries((prev) => {
      const allIn = toAdd.length > 0 && toAdd.every((e) => prev.some((p) => entryKey(p) === entryKey(e)));
      if (allIn) return prev.filter((p) => !toAddKeys.has(entryKey(p)));
      const next = prev.filter((p) => !toAddKeys.has(entryKey(p)));
      return [...next, ...toAdd];
    });
  }, []);

  const handleDayCellClick = useCallback(
    (e: React.MouseEvent, day: Date, clients: DueEntry[]) => {
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        toggleDaySelection(day, clients);
        return;
      }
      if (clients.length > 0) {
        setSelectedDay({ date: day, clients });
        setSelectedEntries([]);
      }
    },
    [toggleDaySelection],
  );

  const handlePillClick = useCallback(
    (e: React.MouseEvent, day: Date, clients: DueEntry[], entry: DueEntry, dateKey: string) => {
      e.stopPropagation();
      if (e.metaKey || e.ctrlKey) {
        toggleEntrySelection(entry, dateKey);
        return;
      }
      setSelectedDay({ date: day, clients });
      setSelectedEntries([]);
    },
    [toggleEntrySelection],
  );

  const handleChangeDateSingle = useCallback(
    async (clientName: string, pillar: string, newDate: Date) => {
      if (!organizationId || saving) return;
      setSaving(true);
      try {
        await setDueDateOverride(clientName, organizationId, pillar, newDate);
        onScheduleChanged?.();
        setSelectedDay(null);
      } catch (err) {
        logger.error('Failed to change due date', err);
      } finally {
        setSaving(false);
      }
    },
    [organizationId, saving, onScheduleChanged],
  );

  const handleGroupChangeDate = useCallback(
    async (newDate: Date) => {
      if (!organizationId || saving || selectedEntries.length === 0) return;
      setGroupDatePickerOpen(false);
      setSaving(true);
      try {
        for (const entry of selectedEntries) {
          await setDueDateOverride(entry.clientName, organizationId, entry.pillar, newDate);
        }
        onScheduleChanged?.();
        setSelectedEntries([]);
      } catch (err) {
        logger.error('Failed to reschedule selected', err);
      } finally {
        setSaving(false);
      }
    },
    [organizationId, saving, selectedEntries, onScheduleChanged],
  );

  return (
    <div ref={calendarWrapperRef} className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h3 className="text-sm font-bold text-foreground">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <button
          type="button"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">⌘</kbd>
        <span className="mx-1">/</span>
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">Ctrl</kbd>
        <span className="ml-1">+ click to select multiple • Drag near edges to change month</span>
      </p>

      <div className="grid grid-cols-7 gap-px">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="py-2 text-center text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      <div
        ref={calendarGridRef}
        className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border"
      >
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
              onClick={(e) => handleDayCellClick(e, day, clients)}
              onDragOver={(e) => handleDragOver(e, key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, day)}
              className={`relative min-h-[72px] p-1 text-left transition-colors sm:min-h-[96px] sm:p-1.5 ${
                inMonth ? 'bg-card hover:bg-muted/50' : 'bg-muted/40'
              } ${clients.length > 0 ? 'cursor-pointer' : 'cursor-default'} ${
                isDropTarget ? 'bg-violet-500/15 ring-2 ring-inset ring-violet-500 dark:bg-violet-950/40' : ''
              }`}
            >
              <span className={`text-[10px] font-semibold sm:text-xs ${
                today ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground sm:h-6 sm:w-6' :
                inMonth ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {format(day, 'd')}
              </span>
              {clients.length > 0 && (
                <div className="mt-0.5 space-y-0.5">
                  {visibleClients.map((entry, i) => (
                    <ClientPill
                      key={`${entry.name}-${entry.pillar}-${i}`}
                      entry={entry}
                      dateKey={key}
                      day={day}
                      dayClients={clients}
                      onPillClick={handlePillClick}
                      isSelected={selectedKeysSet.has(`${entry.name}|${entry.pillar}|${key}`)}
                    />
                  ))}
                  {overflow > 0 && (
                    <span className="block pl-1 text-[9px] font-bold text-muted-foreground">
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
        <div className="animate-pulse text-center text-xs font-medium text-muted-foreground">
          Rescheduling…
        </div>
      )}

      {selectedEntries.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-violet-300/40 bg-violet-500/10 px-3 py-2 dark:border-violet-500/30 dark:bg-violet-950/40">
          <span className="text-sm font-semibold text-foreground">
            {selectedEntries.length} selected
          </span>
          <Popover open={groupDatePickerOpen} onOpenChange={setGroupDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 border-violet-300/50 bg-background text-violet-700 hover:bg-violet-500/10 dark:border-violet-500/40 dark:text-violet-300 dark:hover:bg-violet-950/50"
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                Change date
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                defaultMonth={currentMonth}
                onSelect={(date) => date && handleGroupChangeDate(date)}
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-muted-foreground hover:text-foreground"
            onClick={() => setSelectedEntries([])}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        </div>
      )}

      {selectedDay && (
        <DayDetailPanel
          selectedDay={selectedDay}
          onClose={() => setSelectedDay(null)}
          onStartAssessment={onNewAssessmentForClient}
          onChangeDate={handleChangeDateSingle}
          organizationId={organizationId}
          saving={saving}
        />
      )}
    </div>
  );
};
