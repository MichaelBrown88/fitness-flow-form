import React from 'react';
import { Check } from 'lucide-react';
import { FIELD_COLORS } from './FieldConstants';
import type { FieldValue } from '../hooks/useFieldControl';

interface FieldMultiSelectProps {
  id: string;
  options?: ReadonlyArray<{ readonly value: string; readonly label: string; readonly subtitle?: string; readonly isRecommended?: boolean; readonly tag?: string }>;
  value: FieldValue;
  handleChange: (val: FieldValue) => void;
  /** When provided, shows a badge on each selected option (e.g. "Primary", "Secondary" by index). */
  selectionLabels?: (index: number) => string;
}

export const FieldMultiSelect: React.FC<FieldMultiSelectProps> = ({
  id,
  options,
  value,
  handleChange,
  selectionLabels,
}) => {
  const selected = Array.isArray(value) ? (value as string[]) : [];
  
  const toggle = (val: string) => {
    if (selected.includes(val)) {
      handleChange(selected.filter(v => v !== val));
    } else {
      handleChange([...selected, val]);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
      {options?.map((opt, idx) => {
        const isActive = selected.includes(opt.value);
        const selectedIndex = isActive ? selected.indexOf(opt.value) : -1;
        const selectionLabel = selectionLabels && selectedIndex >= 0 ? selectionLabels(selectedIndex) : null;
        const colorClass = FIELD_COLORS[idx % FIELD_COLORS.length];

        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={`flex min-h-[64px] h-auto items-center gap-4 rounded-2xl border-2 px-5 py-3 text-left transition-all relative overflow-hidden ${
              isActive
              ? 'border-foreground bg-foreground text-white shadow-lg scale-[1.02]'
              : `bg-background text-foreground-secondary ${colorClass}`
            }`}
            aria-pressed={isActive}
            aria-label={opt.label}
          >
            {(opt.tag || selectionLabel) && (
              <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[10px] font-black uppercase tracking-[0.15em] ${
                isActive ? 'bg-background/20 text-white' : 'bg-foreground text-white'
              }`}>
                {selectionLabel ?? opt.tag}
              </div>
            )}

            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors ${
              isActive ? 'bg-background/20 border-white/20 text-white' : 'border-border bg-background'
            }`}>
              {isActive ? (
                <Check className="h-4 w-4 stroke-[4]" />
              ) : (
                <div className="h-2 w-2 rounded-sm bg-muted opacity-0 group-hover:opacity-100" />
              )}
            </div>

            <div className="flex flex-col py-1">
              <span className="font-bold text-sm leading-tight mb-0.5">{opt.label}</span>
              {opt.subtitle && (
                <span className={`text-[10px] font-medium leading-relaxed ${
                  isActive ? 'text-white/70' : 'text-muted-foreground'
                }`}>
                  {opt.subtitle}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};
