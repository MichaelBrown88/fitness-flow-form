import React from 'react';
import type { FormData } from '@/contexts/FormContext';
import { calculateAge } from '@/lib/scoring';

interface ClientInfoBarProps {
  formData?: FormData;
}

export const ClientInfoBar: React.FC<ClientInfoBarProps> = ({ formData }) => {
  if (!formData) return null;

  return (
    <div className="glass-subtle rounded-lg sm:rounded-xl px-2 sm:px-3 md:px-4 lg:px-5 py-1.5 sm:py-2 md:py-2.5 lg:py-3 mb-2 sm:mb-3 md:mb-4 lg:mb-5">
      <div className="flex flex-nowrap items-center gap-x-1.5 sm:gap-x-2 md:gap-x-3 lg:gap-x-4 overflow-x-auto scrollbar-hide text-[8px] sm:text-[9px] md:text-[10px]">
        {formData.gender && (
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-zinc-500">Gender</span>
            <span className="text-zinc-700 font-semibold capitalize">{formData.gender}</span>
          </div>
        )}
        {formData.dateOfBirth && (
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-500">Age</span>
            <span className="text-zinc-700 font-semibold">{calculateAge(formData.dateOfBirth)}</span>
          </div>
        )}
        {formData.heightCm && parseFloat(formData.heightCm) > 0 && (
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-500">Height</span>
            <span className="text-zinc-700 font-semibold">
              {parseFloat(formData.heightCm) >= 100 
                ? `${(parseFloat(formData.heightCm) / 100).toFixed(2)} m`
                : `${formData.heightCm} cm`
              }
            </span>
          </div>
        )}
        {formData.inbodyWeightKg && parseFloat(formData.inbodyWeightKg) > 0 && (
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-500">Weight</span>
            <span className="text-zinc-700 font-semibold">{parseFloat(formData.inbodyWeightKg).toFixed(1)} kg</span>
          </div>
        )}
        {formData.inbodyBmi && parseFloat(formData.inbodyBmi) > 0 && (
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-500">BMI</span>
            <span className="text-zinc-700 font-semibold">{parseFloat(formData.inbodyBmi).toFixed(1)}</span>
          </div>
        )}
      </div>
    </div>
  );
};
