import React from 'react';
import { Check } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FIELD_COLORS } from './FieldConstants';
import type { FieldValue } from '../hooks/useFieldControl';

interface FieldAssignedCoachProps {
  coaches: Array<{
    uid: string;
    displayName: string;
    email?: string;
    role: string;
  }>;
  loading: boolean;
  value: FieldValue;
  handleChange: (val: FieldValue) => void;
}

export const FieldAssignedCoach: React.FC<FieldAssignedCoachProps> = ({
  coaches,
  loading,
  value,
  handleChange,
}) => {
  const selectedCoachUid = (value as string) || '';

  if (loading) {
    return <div className="text-sm text-slate-500 mt-2">Loading coaches...</div>;
  }

  if (coaches.length === 0) {
    return (
      <div className="mt-2 p-4 rounded-xl border-2 border-amber-200 bg-amber-50 text-amber-700">
        <p className="text-sm font-bold mb-1">No coaches available</p>
        <p className="text-xs">You must add at least one coach in your organization settings before creating assessments.</p>
      </div>
    );
  }

  // Show buttons for 1-6 coaches, dropdown for 7+
  if (coaches.length <= 6) {
    return (
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {coaches.map((coach, idx) => {
          const isSelected = selectedCoachUid === coach.uid;
          const colorClass = FIELD_COLORS[idx % FIELD_COLORS.length];
          
          return (
            <button
              key={coach.uid}
              type="button"
              onClick={() => handleChange(coach.uid)}
              className={`flex min-h-[64px] h-auto w-full items-center gap-4 rounded-2xl border-2 px-5 py-3 text-left transition-all ${
                isSelected
                  ? 'border-slate-900 bg-slate-900 text-white shadow-lg scale-[1.02]'
                  : `bg-white text-slate-600 ${colorClass}`
              }`}
            >
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                isSelected ? 'bg-white/20 border-white/20 text-white' : 'border-slate-200 bg-white'
              }`}>
                {isSelected && <Check className="h-4 w-4 stroke-[3]" />}
              </div>
              
              <div className="flex flex-col py-1">
                <span className="font-bold text-sm leading-tight mb-0.5">
                  {coach.displayName}
                </span>
                {coach.email && (
                  <span className={`text-[10px] font-medium leading-relaxed ${
                    isSelected ? 'text-white/70' : 'text-slate-500'
                  }`}>
                    {coach.email}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mt-2">
      <Select
        value={selectedCoachUid}
        onValueChange={(val) => handleChange(val)}
      >
        <SelectTrigger className="h-14 rounded-2xl border-2 border-slate-200 bg-white text-slate-900 font-bold">
          <SelectValue placeholder="Select a coach" />
        </SelectTrigger>
        <SelectContent className="rounded-2xl">
          {coaches.map((coach) => (
            <SelectItem key={coach.uid} value={coach.uid} className="py-3">
              <div className="flex flex-col">
                <span className="font-bold">
                  {coach.displayName}
                </span>
                {coach.email && (
                  <span className="text-xs text-slate-500">{coach.email}</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
