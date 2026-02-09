/**
 * Inline Due Date Editor
 *
 * Simple positioned calendar dropdown (no Radix Portal) for editing
 * pillar due dates in the Priority View. Uses a plain div with
 * click-outside detection to avoid orphaned portal issues when
 * optimistic updates cause the parent card to move/unmount.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CalendarDays, Check, Loader2 } from 'lucide-react';
import { logger } from '@/lib/utils/logger';
import type { PartialAssessmentCategory } from '@/types/client';

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

interface InlineDueDateEditorProps {
  clientName: string;
  organizationId: string;
  pillar: PartialAssessmentCategory;
  currentDate?: Date | null;
  onSave: (clientName: string, pillar: PartialAssessmentCategory, newDate: Date) => Promise<void>;
}

export const InlineDueDateEditor: React.FC<InlineDueDateEditorProps> = ({
  clientName,
  organizationId,
  pillar,
  currentDate,
  onSave,
}) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [localDate, setLocalDate] = useState<Date | null>(currentDate ?? null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(false);
  openRef.current = open;

  // Sync from prop when upstream data changes
  useEffect(() => {
    if (currentDate) setLocalDate(currentDate);
  }, [currentDate?.getTime()]);

  // Click-outside handler
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    // Use capture phase so we catch clicks before anything else
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open]);

  // Reset open state when the parent data changes (card moved sections)
  useEffect(() => {
    setOpen(false);
  }, [clientName, pillar]);

  const handleSelect = useCallback(async (date: Date | undefined) => {
    // ALWAYS close the calendar, even if the same date is re-selected
    setOpen(false);

    if (!date || !organizationId) return;

    setLocalDate(date);
    setSaving(true);
    setSaved(false);

    try {
      await onSave(clientName, pillar, date);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      logger.warn('[InlineDueDateEditor] Failed to save due date:', err);
      setLocalDate(currentDate ?? null);
    } finally {
      setSaving(false);
    }
  }, [clientName, organizationId, pillar, onSave, currentDate]);

  const displayDate = localDate
    ? localDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : '—';

  const isOverdue = localDate && localDate < new Date();
  const isDueSoon = localDate && !isOverdue && localDate.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

  return (
    <div ref={wrapperRef} className="relative inline-block">
      <Button
        variant="ghost"
        size="sm"
        disabled={saving}
        onClick={() => setOpen(prev => !prev)}
        className={`h-auto px-1.5 py-0.5 text-[10px] font-medium rounded-md gap-1 ${
          saved
            ? 'text-emerald-700 bg-emerald-50'
            : isOverdue
              ? 'text-red-700 bg-red-50 hover:bg-red-100'
              : isDueSoon
                ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        {saving ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : saved ? (
          <Check className="w-3 h-3" />
        ) : (
          <CalendarDays className="w-3 h-3" />
        )}
        {displayDate}
      </Button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 rounded-md border border-slate-200 bg-white shadow-lg">
          <Calendar
            mode="single"
            selected={localDate ?? undefined}
            onSelect={handleSelect}
            disabled={{ before: startOfToday() }}
          />
        </div>
      )}
    </div>
  );
};
