import { useCallback, useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';

const ITEM_H = 44;
const VISIBLE_ROWS = 5;
const WHEEL_HEIGHT = ITEM_H * VISIBLE_ROWS;

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

function parseIsoDate(iso: string): { year: number; month: number; day: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (m) {
    return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  }
  const fallbackYear = new Date().getFullYear() - 30;
  return { year: fallbackYear, month: 6, day: 15 };
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

interface WheelColumnProps {
  label: string;
  values: number[];
  selected: number;
  onSelect: (value: number) => void;
  format: (value: number) => string;
  disabled?: boolean;
}

function WheelColumn({ label, values, selected, onSelect, format, disabled }: WheelColumnProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const scrollRaf = useRef<number | null>(null);

  const selectedIndex = Math.max(0, values.indexOf(selected));

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = 'auto') => {
      const el = listRef.current;
      if (!el) return;
      const clamped = Math.max(0, Math.min(values.length - 1, index));
      el.scrollTo({ top: clamped * ITEM_H, behavior });
    },
    [values.length],
  );

  useEffect(() => {
    scrollToIndex(selectedIndex, 'auto');
  }, [selectedIndex, scrollToIndex]);

  const snapToNearest = useCallback(() => {
    const el = listRef.current;
    if (!el || disabled) return;
    const idx = Math.round(el.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(values.length - 1, idx));
    scrollToIndex(clamped, 'smooth');
    const next = values[clamped];
    if (next !== undefined && next !== selected) {
      onSelect(next);
    }
  }, [disabled, onSelect, scrollToIndex, selected, values]);

  const onScroll = () => {
    if (disabled) return;
    if (scrollRaf.current !== null) {
      cancelAnimationFrame(scrollRaf.current);
    }
    scrollRaf.current = requestAnimationFrame(() => {
      scrollRaf.current = null;
      snapToNearest();
    });
  };

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScrollEnd = () => snapToNearest();
    el.addEventListener('scrollend', onScrollEnd);
    return () => el.removeEventListener('scrollend', onScrollEnd);
  }, [snapToNearest]);

  const pad = ((VISIBLE_ROWS - 1) / 2) * ITEM_H;

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center">
      <span className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="relative w-full" style={{ height: WHEEL_HEIGHT }}>
        <div
          className="pointer-events-none absolute inset-x-1 top-1/2 z-10 h-11 -translate-y-1/2 rounded-xl border border-primary/25 bg-primary/5"
          aria-hidden
        />
        <div
          ref={listRef}
          className={cn(
            'h-full overflow-y-auto overscroll-contain scroll-smooth snap-y snap-mandatory',
            '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
            disabled && 'pointer-events-none opacity-60',
          )}
          style={{ paddingTop: pad, paddingBottom: pad }}
          onScroll={onScroll}
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
                  'flex h-11 w-full shrink-0 snap-center items-center justify-center text-xl font-semibold tabular-nums transition-colors',
                  isSelected ? 'text-foreground' : 'text-muted-foreground/70',
                )}
                onClick={() => {
                  if (disabled) return;
                  onSelect(v);
                  scrollToIndex(values.indexOf(v), 'smooth');
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
}

export interface RemoteMobileDateWheelPickerProps {
  value: string;
  onChange: (isoDate: string) => void;
  readOnly?: boolean;
}

/** Inline iOS-style day / month / year wheels (no modal). Value: `YYYY-MM-DD`. */
export function RemoteMobileDateWheelPicker({
  value,
  onChange,
  readOnly = false,
}: RemoteMobileDateWheelPickerProps) {
  const parsed = useMemo(() => parseIsoDate(value), [value]);

  const maxDayInit = daysInMonth(parsed.year, parsed.month);
  const safeDayInit = Math.min(parsed.day, maxDayInit);

  useEffect(() => {
    if (readOnly || value.trim().length > 0) return;
    onChange(toIsoDate(parsed.year, parsed.month, safeDayInit));
  }, [onChange, parsed.month, parsed.year, readOnly, safeDayInit, value]);
  const currentYear = new Date().getFullYear();
  const minYear = currentYear - 100;
  const maxYear = currentYear - 10;

  const years = useMemo(
    () => Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i),
    [maxYear, minYear],
  );

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);

  const maxDay = daysInMonth(parsed.year, parsed.month);
  const days = useMemo(
    () => Array.from({ length: maxDay }, (_, i) => i + 1),
    [maxDay],
  );

  const safeDay = Math.min(parsed.day, maxDay);

  const setParts = useCallback(
    (next: Partial<{ year: number; month: number; day: number }>) => {
      const year = next.year ?? parsed.year;
      const month = next.month ?? parsed.month;
      let day = next.day ?? safeDay;
      const dim = daysInMonth(year, month);
      if (day > dim) day = dim;
      onChange(toIsoDate(year, month, day));
    },
    [onChange, parsed.year, parsed.month, safeDay],
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
        values={days}
        selected={safeDay}
        onSelect={(day) => setParts({ day })}
        format={(d) => String(d)}
        disabled={readOnly}
      />
      <WheelColumn
        label="Month"
        values={months}
        selected={parsed.month}
        onSelect={(month) => setParts({ month })}
        format={(m) => MONTH_NAMES[m - 1] ?? String(m)}
        disabled={readOnly}
      />
      <WheelColumn
        label="Year"
        values={years}
        selected={parsed.year}
        onSelect={(year) => setParts({ year })}
        format={(y) => String(y)}
        disabled={readOnly}
      />
    </div>
  );
}
