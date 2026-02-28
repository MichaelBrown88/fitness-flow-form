import React from 'react';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getDynamicTooltip } from '@/lib/utils/dynamicTooltips';
import { labelTextClasses, supportTextClasses } from './FieldConstants';
import type { PhaseField } from '@/types/assessment';
import type { FormData } from '@/contexts/FormContext';

import type { OrgSettings } from '@/services/organizations';
 
 interface FieldLabelProps {
   field: PhaseField;
   orgSettings: OrgSettings;
   formData: FormData;
 }

export const FieldLabel: React.FC<FieldLabelProps> = ({ field, orgSettings, formData }) => {
  const dynamicTooltip = getDynamicTooltip(field, orgSettings?.equipmentConfig, field.tooltip, formData);
  const tooltipLines = dynamicTooltip?.split('\n') || [];

  return (
    <div className="flex flex-col gap-1 mb-2">
      <div className="flex items-center gap-2">
        <label htmlFor={field.id} className={labelTextClasses}>{field.label}</label>
        {dynamicTooltip && (
          <TooltipProvider>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button type="button" className="text-primary hover:brightness-110 transition-colors">
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent 
                side="right" 
                className="z-[100] max-w-[300px] p-5 bg-slate-900 text-white rounded-2xl border-none shadow-xl animate-in fade-in zoom-in duration-200"
              >
                <div className="space-y-3 text-left">
                  {tooltipLines.map((line, i) => {
                    const isInstructionHeader = line.toLowerCase().includes('instructions:');
                    const isStep = line.match(/^\d+\./);
                    const isBullet = line.trim().startsWith('•');

                    if (isInstructionHeader) {
                      return (
                        <div key={i} className="flex items-center gap-2 mb-1">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-primary/60">{line.replace(':', '')}</span>
                        </div>
                      );
                    }

                    if (isStep) {
                      const [num, ...rest] = line.split('.');
                      return (
                        <div key={i} className="flex gap-3 text-xs leading-relaxed">
                          <span className="font-bold text-primary min-w-[12px]">{num}.</span>
                          <span className="text-slate-200 font-medium">{rest.join('.').trim()}</span>
                        </div>
                      );
                    }

                    if (isBullet) {
                      return (
                        <div key={i} className="flex gap-3 text-xs leading-relaxed pl-1">
                          <span className="text-primary">•</span>
                          <span className="text-slate-200 font-medium">{line.replace('•', '').trim()}</span>
                        </div>
                      );
                    }

                    return (
                      <p key={i} className="text-xs leading-relaxed font-medium text-slate-300">
                        {line}
                      </p>
                    );
                  })}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      
      {field.description && <p className={supportTextClasses}>{field.description}</p>}
    </div>
  );
};
