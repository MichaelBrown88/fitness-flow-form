import React, { useMemo } from 'react';
import { useFormContext, type FormData } from '@/contexts/FormContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Scan, ChevronLeft, ChevronRight } from 'lucide-react';
import { type PhaseField, type PhaseSection } from '@/lib/phaseConfig';
import { useIsMobile } from '@/hooks/use-mobile';
import { FieldControl } from './FieldControl';

type IntakeSection = {
  id: string;
  title: string;
  fields: PhaseField[];
};

type SectionType = PhaseSection | IntakeSection;

interface SingleFieldFlowProps {
  section: SectionType;
  activeFieldIdx: number;
  setActiveFieldIdx: (idx: number | ((prev: number) => number)) => void;
  onComplete: () => void;
  onShowCamera?: (mode: 'ocr' | 'posture') => void;
  onShowPostureCompanion?: () => void;
  onShowInBodyCompanion?: () => void;
}

export const SingleFieldFlow: React.FC<SingleFieldFlowProps> = ({
  section,
  activeFieldIdx,
  setActiveFieldIdx,
  onComplete,
  onShowCamera,
  onShowPostureCompanion,
  onShowInBodyCompanion
}) => {
  const { formData } = useFormContext();
  const isMobile = useIsMobile();

  // Filter visible fields and group paired ones
  const steps = useMemo(() => {
    const visible = (section.fields as PhaseField[]).filter(field => {
      if (!('conditional' in field) || !field.conditional || !field.conditional.showWhen) return true;
      const { showWhen } = field.conditional;
      const dependentValue = formData[showWhen.field as keyof FormData];
      let ok = true;
      if (showWhen.exists !== undefined) {
        const hasValue = (dependentValue !== undefined && dependentValue !== null && String(dependentValue).trim() !== '');
        ok = ok && (showWhen.exists ? hasValue : !hasValue);
      }
      if (showWhen.value !== undefined) {
        ok = ok && dependentValue === showWhen.value;
      }
      if (showWhen.notValue !== undefined) {
        ok = ok && dependentValue !== showWhen.notValue;
      }
      if (showWhen.includes !== undefined) {
        if (Array.isArray(dependentValue)) {
          ok = ok && (dependentValue as string[]).includes(showWhen.includes);
        } else if (typeof dependentValue === 'string') {
          ok = ok && dependentValue === showWhen.includes;
        } else {
          ok = false;
        }
      }
      return ok;
    });

    // Group by pairId
    const result: PhaseField[][] = [];
    const processedPairs = new Set<string>();

    visible.forEach(field => {
      if (field.pairId) {
        if (!processedPairs.has(field.pairId)) {
          const pair = visible.filter(f => f.pairId === field.pairId);
          result.push(pair);
          processedPairs.add(field.pairId);
        }
      } else {
        result.push([field]);
      }
    });

    return result;
  }, [section.fields, formData]);

  const currentStep = steps[activeFieldIdx];
  const isLastField = activeFieldIdx === steps.length - 1;
  
  const hasValue = useMemo(() => {
    if (!currentStep) return false;
    return currentStep.every(field => {
      const val = formData[field.id];
      return val !== undefined && val !== null && val !== '' && (!Array.isArray(val) || val.length > 0);
    });
  }, [currentStep, formData]);

  const handleNext = () => {
    if (isLastField) {
      onComplete();
    } else {
      setActiveFieldIdx(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (activeFieldIdx > 0) {
      setActiveFieldIdx(prev => prev - 1);
    }
  };

  if (!currentStep) return null;

  const movementPattern = currentStep[0].pattern;
  const isParqField = currentStep.some(f => f.type === 'parq') || section.id === 'parq';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Progress within section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <span>{section.title} Progress</span>
          {(!isParqField || formData.parqQuestionnaire === 'completed') && <span>{activeFieldIdx + 1} of {steps.length}</span>}
        </div>
        {(!isParqField || formData.parqQuestionnaire === 'completed') && <Progress value={((activeFieldIdx + 1) / steps.length) * 100} className="h-1" />}
      </div>

      <div className="bg-white rounded-3xl p-8 lg:p-10 shadow-xl shadow-primary/10 border border-primary/5 min-h-[400px] flex flex-col justify-center relative">

        {movementPattern && (
          <div className="mb-6 flex items-center justify-between">
            <span className="px-3 py-1 bg-brand-light text-primary rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-primary/10">
              {movementPattern}
            </span>
          </div>
        )}

        <div className={`grid gap-8 ${currentStep.length > 1 ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
          {currentStep.map(field => (
            <div key={field.id} className="space-y-4">
              {field.side && (
                <span className={`text-[10px] font-black uppercase tracking-widest ${field.side === 'left' ? 'text-emerald-500' : 'text-primary'}`}>
                  {field.side} Side
                </span>
              )}
              <FieldControl 
                field={field}
                onShowCamera={onShowCamera}
                onShowPostureCompanion={onShowPostureCompanion}
                onShowInBodyCompanion={onShowInBodyCompanion}
              />
            </div>
          ))}
        </div>

        {/* InBody Scan Button - Below input fields */}
        {section.id === 'body-comp' && onShowCamera && (
          <div className="mt-8 pt-6 border-t border-slate-100">
            <Button 
              variant="outline" 
              onClick={() => {
                // On desktop/iPad: show companion modal for iPhone handoff
                // On mobile: use direct camera
                if (!isMobile && onShowInBodyCompanion) {
                  onShowInBodyCompanion();
                } else {
                  onShowCamera('ocr');
                }
              }}
              className="w-full h-14 rounded-xl border-primary/20 text-primary hover:bg-brand-light font-bold gap-2"
            >
              <Scan className="h-5 w-5" />
              Scan InBody Report
            </Button>
          </div>
        )}
        
        {( !isParqField || formData.parqQuestionnaire === 'completed' ) && (
        <div className="flex items-center justify-between mt-12 pt-8 border-t border-slate-50">
          <Button
            variant="ghost"
            onClick={handleBack}
              disabled={activeFieldIdx === 0}
            className="h-12 px-6 rounded-xl font-bold text-slate-400 hover:text-slate-900"
          >
            <ChevronLeft className="mr-2 h-5 w-5" />
            Back
          </Button>

          <Button
            onClick={handleNext}
              disabled={!hasValue && currentStep.some(f => f.required)}
            className={`h-12 px-8 rounded-xl font-bold transition-all ${
                hasValue || !currentStep.some(f => f.required)
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isLastField ? 'Section Complete' : 'Next Step'}
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
        )}
      </div>
    </div>
  );
};

