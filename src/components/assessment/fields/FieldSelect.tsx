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
              className={`flex min-h-[64px] h-auto w-full items-center gap-4 rounded-2xl border-2 px-5 py-3 text-left transition-all relative overflow-hidden ${
                isSelected
                  ? 'border-slate-900 bg-slate-900 text-white shadow-lg scale-[1.02]'
                  : `bg-white text-slate-600 ${colorClass}`
              }`}
              aria-label={option.label}
            >
              {option.tag && (
                <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[9px] font-black uppercase tracking-widest ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-900 text-white'
                }`}>
                  {option.tag}
                </div>
              )}
              
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                isSelected ? 'bg-white/20 border-white/20 text-white' : 'border-slate-200 bg-white'
              }`}>
                {isSelected && <Check className="h-4 w-4 stroke-[3]" />}
              </div>
              
              <div className="flex flex-col py-1">
                <span className="font-bold text-sm leading-tight mb-0.5">{option.label}</span>
                {option.subtitle && (
                  <span className={`text-[10px] font-medium leading-relaxed ${
                    isSelected ? 'text-white/70' : 'text-slate-500'
                  }`}>
                    {option.subtitle}
                  </span>
                )}
              </div>
            </button>
            {isSelected && option.value === 'yes' && id.toLowerCase().includes('pain') && (
              <p className="px-2 py-1.5 rounded-lg bg-rose-50 border border-rose-100 text-[10px] font-black uppercase tracking-widest text-rose-600 flex items-center gap-2 animate-pulse shadow-sm">
                <span className="text-sm">⚠️</span> Safety Flag: Do not load this movement pattern.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};
