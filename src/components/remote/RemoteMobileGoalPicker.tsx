import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RemoteMobileGoalPickerProps {
  options: ReadonlyArray<{ value: string; label: string }>;
  selected: string[];
  onChange: (next: string[]) => void;
  maxSelections?: number;
}

/** Multi-select goals — same card pattern as {@link RemoteMobileChoiceField}. */
export function RemoteMobileGoalPicker({
  options,
  selected,
  onChange,
  maxSelections = 2,
}: RemoteMobileGoalPickerProps) {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
      return;
    }
    if (selected.length >= maxSelections) {
      onChange([...selected.slice(1), value]);
      return;
    }
    onChange([...selected, value]);
  };

  return (
    <div className="space-y-2" role="listbox" aria-label="Choose up to two goals">
      {options.map((opt) => {
        const active = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            role="option"
            aria-selected={active}
            onClick={() => toggle(opt.value)}
            className={cn(
              'flex w-full items-start gap-3 rounded-2xl border-2 px-4 py-3.5 text-left text-base leading-snug transition-colors',
              active
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border bg-card text-foreground active:bg-muted',
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-muted-foreground/40',
              )}
              aria-hidden
            >
              {active ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
            </span>
            <span className="min-w-0 flex-1 break-words">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
