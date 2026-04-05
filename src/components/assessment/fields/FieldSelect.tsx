import React from 'react';
import { Check } from 'lucide-react';
import { FIELD_COLORS } from './FieldConstants';
import type { FieldValue } from '../hooks/useFieldControl';

interface FieldSelectProps {
  id: string;
  options?: ReadonlyArray<{ readonly value: string; readonly label: string; readonly subtitle?: string; readonly isRecommended?: boolean; readonly tag?: string }>;
  value: FieldValue;
  handleChange: (val: FieldValue) => void;
}

export const FieldSelect: React.FC<FieldSelectProps> = ({
  id,
  options,
  value,
  handleChange,
}) => {
  return (
    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
      {options?.map((option, idx) => {
        const isSelected = value === option.value;
        const colorClass = FIELD_COLORS[idx % FIELD_COLORS.length];
        
        return (
          <div key={option.value} className="space-y-2">
            <button
              type="button"
              onClick={() => handleChange(option.value)}
              className={`relative flex h-auto min-h-[64px] w-full items-center gap-4 overflow-hidden rounded-lg border-2 px-5 py-3 text-left transition-all ${
                isSelected
                  ? 'border-foreground bg-foreground text-white shadow-sm'
                  : `bg-background text-foreground-secondary ${colorClass}`
              }`}
              aria-label={option.label}
            >
              {option.tag && (
                <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[10px] font-black uppercase tracking-[0.15em] ${
                  isSelected ? 'bg-background/20 text-white' : 'bg-foreground text-white'
                }`}>
                  {option.tag}
                </div>
              )}
              
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                isSelected ? 'bg-background/20 border-white/20 text-white' : 'border-border bg-background'
              }`}>
                {isSelected && <Check className="h-4 w-4 stroke-[3]" />}
              </div>
              
              <div className="flex flex-col py-1">
                <span className="font-bold text-sm leading-tight mb-0.5">{option.label}</span>
                {option.subtitle && (
                  <span className={`text-[10px] font-medium leading-relaxed ${
                    isSelected ? 'text-white/70' : 'text-muted-foreground'
                  }`}>
                    {option.subtitle}
                  </span>
                )}
              </div>
            </button>
            {isSelected && option.value === 'yes' && id.toLowerCase().includes('pain') && (
              <p className="px-2 py-1.5 rounded-lg bg-rose-50 text-[10px] font-black uppercase tracking-[0.15em] text-rose-600 flex items-center gap-2 animate-pulse">
                <span className="text-sm">⚠️</span> Safety Flag: Do not load this movement pattern.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};
