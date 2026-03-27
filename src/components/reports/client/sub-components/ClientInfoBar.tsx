import React from 'react';
import type { FormData } from '@/contexts/FormContext';
import { calculateAge } from '@/lib/scoring';

interface ClientInfoBarProps {
  formData?: FormData;
}

export const ClientInfoBar: React.FC<ClientInfoBarProps> = ({ formData }) => {
  if (!formData) return null;

  return (
    <div className="hidden sm:block glass-subtle rounded-lg sm:rounded-xl px-2 sm:px-3 md:px-4 lg:px-5 py-1 sm:py-2 md:py-2.5 lg:py-3 mb-1 sm:mb-3 md:mb-4 lg:mb-5">
      <div className="flex flex-nowrap items-center gap-x-1.5 sm:gap-x-2 md:gap-x-3 lg:gap-x-4 overflow-x-auto scrollbar-hide text-xs">
        {formData.gender && (
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-muted-foreground">Gender</span>
            <span className="text-foreground-secondary font-semibold capitalize">{formData.gender}</span>
          </div>
        )}
        {formData.dateOfBirth && (
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">Age</span>
            <span className="text-foreground-secondary font-semibold">{calculateAge(formData.dateOfBirth)}</span>
          </div>
        )}
        {formData.heightCm && parseFloat(formData.heightCm) > 0 && (
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">Height</span>
            <span className="text-foreground-secondary font-semibold">
              {parseFloat(formData.heightCm) >= 100 
                ? `${(parseFloat(formData.heightCm) / 100).toFixed(2)} m`
                : `${formData.heightCm} cm`
              }
            </span>
          </div>
        )}
        {formData.inbodyWeightKg && parseFloat(formData.inbodyWeightKg) > 0 && (
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">Weight</span>
            <span className="text-foreground-secondary font-semibold">{parseFloat(formData.inbodyWeightKg).toFixed(1)} kg</span>
          </div>
        )}
        {formData.inbodyBmi && parseFloat(formData.inbodyBmi) > 0 && (
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">BMI</span>
            <span className="text-foreground-secondary font-semibold">{parseFloat(formData.inbodyBmi).toFixed(1)}</span>
          </div>
        )}
      </div>
    </div>
  );
};
