import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const ITEM_H_DEFAULT = 44;
const VISIBLE_ROWS_DEFAULT = 5;
const ITEM_H_COMPACT = 38;
const VISIBLE_ROWS_COMPACT = 3;
const DAYS_31 = Array.from({ length: 31 }, (_, i) => i + 1);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export type RemoteDateWheelVariant = 'birthdate' | 'goalDeadline';

type DateParts = { year: number; month: number; day: number };

function parseIsoDate(iso: string): DateParts {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (m) {
    return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  }
  const fallbackYear = new Date().getFullYear() - 30;
  return { year: fallbackYear, month: 6, day: 15 };
}

function defaultParts(variant: RemoteDateWheelVariant, value: string): DateParts {
  if (variant === 'goalDeadline' && !value.trim()) {
    const today = new Date();
    return {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate(),
    };
  }
  return parseIsoDate(value);
}

function toIsoDate(year: number, month: number, day: number): string {
  const y = String(year);
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function clampParts(parts: DateParts): DateParts {
  const dim = daysInMonth(parts.year, parts.month);
  return { ...parts, day: Math.min(parts.day, dim) };
}

interface WheelColumnProps {
  label: string;
  values: readonly number[];
  selected: number;
  onSelect: (value: number) => void;
  format: (value: number) => string;
  disabled?: boolean;
  itemHeight: number;
  wheelHeight: number;
}

const WheelColumn = memo(function WheelColumn({
  label,
  values,
  selected,
  onSelect,
  format,
  disabled,
  itemHeight,
  wheelHeight,
}: WheelColumnProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const userInteractingRef = useRef(false);
  const scrollEndFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedIndex = Math.max(0, values.indexOf(selected));

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = 'auto') => {
      const el = listRef.current;
      if (!el) return;
      const clamped = Math.max(0, Math.min(values.length - 1, index));
      el.scrollTo({ top: clamped * itemHeight, behavior });
    },
    [itemHeight, values.length],
  );

  const commitScrollPosition = useCallback(() => {
    const el = listRef.current;
    if (!el || disabled) return;
    const idx = Math.round(el.scrollTop / itemHeight);
    const clamped = Math.max(0, Math.min(values.length - 1, idx));
    if (Math.abs(el.scrollTop - clamped * itemHeight) > 1) {
      scrollToIndex(clamped, 'auto');
    }
    const next = values[clamped];
    if (next !== undefined && next !== selected) {
      onSelect(next);
    }
  }, [disabled, itemHeight, onSelect, scrollToIndex, selected, values]);

  useEffect(() => {
    if (userInteractingRef.current) return;
    scrollToIndex(selectedIndex, 'auto');
  }, [selectedIndex, scrollToIndex]);

  const handleScrollEnd = useCallback(() => {
    userInteractingRef.current = false;
    if (scrollEndFallbackRef.current) {
      clearTimeout(scrollEndFallbackRef.current);
      scrollEndFallbackRef.current = null;
    }
    commitScrollPosition();
  }, [commitScrollPosition]);

  const handleScroll = useCallback(() => {
    if (disabled) return;
    userInteractingRef.current = true;
    if (scrollEndFallbackRef.current) {
      clearTimeout(scrollEndFallbackRef.current);
    }
    scrollEndFallbackRef.current = setTimeout(handleScrollEnd, 120);
  }, [disabled, handleScrollEnd]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.addEventListener('scrollend', handleScrollEnd);
    return () => {
      el.removeEventListener('scrollend', handleScrollEnd);
      if (scrollEndFallbackRef.current) {
        clearTimeout(scrollEndFallbackRef.current);
      }
    };
  }, [handleScrollEnd]);

  const pad = ((wheelHeight / itemHeight - 1) / 2) * itemHeight;

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center">
      <span className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="relative w-full" style={{ height: wheelHeight }}>
        <div
          className="pointer-events-none absolute inset-x-1 top-1/2 z-10 h-11 -translate-y-1/2 rounded-xl border border-primary/25 bg-primary/5"
          aria-hidden
        />
        <div
          ref={listRef}
          className={cn(
            'h-full overflow-y-auto overscroll-contain snap-y snap-mandatory',
            '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
            '[touch-action:pan-y] [will-change:scroll-position]',
            disabled && 'pointer-events-none opacity-60',
          )}
          style={{ paddingTop: pad, paddingBottom: pad }}
          onScroll={handleScroll}
          onTouchStart={() => {
            userInteractingRef.current = true;
          }}
          role="listbox"
          aria-label={label}
        >
          {values.map((v) => {
            const isSelected = v === selected;
            return (
              <button
                key={v}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={cn(
                  'flex w-full shrink-0 snap-center items-center justify-center font-semibold tabular-nums',
                  itemHeight === ITEM_H_COMPACT ? 'h-[38px] text-lg' : 'h-11 text-xl',
                  isSelected ? 'text-foreground' : 'text-muted-foreground/70',
                )}
                onClick={() => {
                  if (disabled) return;
                  userInteractingRef.current = false;
                  onSelect(v);
                  scrollToIndex(values.indexOf(v), 'auto');
                }}
              >
                {format(v)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export interface RemoteMobileDateWheelPickerProps {
  value: string;
  onChange: (isoDate: string) => void;
  readOnly?: boolean;
  variant?: RemoteDateWheelVariant;
  /** Shorter wheels so DOB / deadline fit one mobile viewport. */
  compact?: boolean;
}

/** Inline day / month / year wheels (no modal). Value: `YYYY-MM-DD`. */
export function RemoteMobileDateWheelPicker({
  value,
  onChange,
  readOnly = false,
  variant = 'birthdate',
  compact = false,
}: RemoteMobileDateWheelPickerProps) {
  const itemHeight = compact ? ITEM_H_COMPACT : ITEM_H_DEFAULT;
  const visibleRows = compact ? VISIBLE_ROWS_COMPACT : VISIBLE_ROWS_DEFAULT;
  const wheelHeight = itemHeight * visibleRows;
  const [parts, setParts] = useState<DateParts>(() => defaultParts(variant, value));
  const lastEmittedRef = useRef(value);
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentYear = new Date().getFullYear();

  const yearRange = useMemo(() => {
    if (variant === 'goalDeadline') {
      const minYear = currentYear;
      const maxYear = currentYear + 5;
      return {
        years: Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i),
      };
    }
    const minYear = currentYear - 100;
    const maxYear = currentYear - 10;
    return {
      years: Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i),
    };
  }, [currentYear, variant]);

  const emitIso = useCallback(
    (next: DateParts) => {
      const clamped = clampParts(next);
      const iso = toIsoDate(clamped.year, clamped.month, clamped.day);
      if (iso === lastEmittedRef.current) return;
      lastEmittedRef.current = iso;
      onChange(iso);
    },
    [onChange],
  );

  const scheduleEmit = useCallback(
    (next: DateParts) => {
      if (commitTimerRef.current) {
        clearTimeout(commitTimerRef.current);
      }
      commitTimerRef.current = setTimeout(() => {
        commitTimerRef.current = null;
        emitIso(next);
      }, 80);
    },
    [emitIso],
  );

  useEffect(() => {
    if (value === lastEmittedRef.current) return;
    lastEmittedRef.current = value;
    setParts(defaultParts(variant, value));
  }, [value, variant]);

  useEffect(() => {
    return () => {
      if (commitTimerRef.current) {
        clearTimeout(commitTimerRef.current);
      }
    };
  }, []);

  const didAutoFillBirthdateRef = useRef(false);
  useEffect(() => {
    if (readOnly || value.trim().length > 0 || variant !== 'birthdate') return;
    if (didAutoFillBirthdateRef.current) return;
    didAutoFillBirthdateRef.current = true;
    const clamped = clampParts(parts);
    emitIso(clamped);
  }, [emitIso, parts, readOnly, value, variant]);

  const safeParts = clampParts(parts);
  const maxDay = daysInMonth(safeParts.year, safeParts.month);

  const patchParts = useCallback(
    (partial: Partial<DateParts>) => {
      setParts((prev) => {
        const merged = clampParts({
          year: partial.year ?? prev.year,
          month: partial.month ?? prev.month,
          day: partial.day ?? prev.day,
        });
        scheduleEmit(merged);
        return merged;
      });
    },
    [scheduleEmit],
  );

  if (readOnly && value.trim()) {
    const display = new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return (
      <p className="text-center text-2xl font-semibold text-foreground">{display}</p>
    );
  }

  return (
    <div className="flex w-full gap-2 px-1">
      <WheelColumn
        label="Day"
        values={DAYS_31}
        selected={Math.min(safeParts.day, maxDay)}
        onSelect={(day) => patchParts({ day })}
        format={(d) => String(d)}
        disabled={readOnly}
        itemHeight={itemHeight}
        wheelHeight={wheelHeight}
      />
      <WheelColumn
        label="Month"
        values={MONTHS}
        selected={safeParts.month}
        onSelect={(month) => patchParts({ month })}
        format={(m) => MONTH_NAMES[m - 1] ?? String(m)}
        disabled={readOnly}
        itemHeight={itemHeight}
        wheelHeight={wheelHeight}
      />
      <WheelColumn
        label="Year"
        values={yearRange.years}
        selected={safeParts.year}
        onSelect={(year) => patchParts({ year })}
        format={(y) => String(y)}
        disabled={readOnly}
        itemHeight={itemHeight}
        wheelHeight={wheelHeight}
      />
    </div>
  );
}
