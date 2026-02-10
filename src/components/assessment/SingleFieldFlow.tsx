import React, { useMemo } from 'react';
import { useFormContext, type FormData } from '@/contexts/FormContext';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Camera, ChevronLeft, ChevronRight, Ruler } from 'lucide-react';
import { type PhaseField, type PhaseSection } from '@/lib/phaseConfig';
import { useIsMobile } from '@/hooks/use-mobile';
import { shouldShowField } from '@/lib/utils/equipmentFieldFilter';
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
  onGoToPreviousSection?: () => void;
}

export const SingleFieldFlow: React.FC<SingleFieldFlowProps> = ({
  section,
  activeFieldIdx,
  setActiveFieldIdx,
  onComplete,
  onShowCamera,
  onShowPostureCompanion,
  onShowInBodyCompanion,
  onGoToPreviousSection
}) => {
  const { formData, updateFormData } = useFormContext();
  const { orgSettings } = useAuth();
  const isMobile = useIsMobile();

  // Filter visible fields and group paired ones
  const steps = useMemo(() => {
    const visible = (section.fields as PhaseField[]).filter(field => {
      // First check equipment-based filtering (pass formData for conditional analyzer fields)
      if (!shouldShowField(field, orgSettings?.equipmentConfig, formData)) {
        return false;
      }
      
      // Then check conditional logic
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
  }, [section.fields, formData, orgSettings?.equipmentConfig]);

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
    } else if (onGoToPreviousSection) {
      // On first field, go to previous section
      onGoToPreviousSection();
    }
  };

  if (!currentStep) return null;

  // ── PAR-Q bypass: the component manages its own multi-step flow ─
  const isParQField = currentStep.length === 1 && currentStep[0].type === 'parq';
  if (isParQField) {
    return (
      <FieldControl
        field={currentStep[0]}
        onShowCamera={onShowCamera}
        onShowPostureCompanion={onShowPostureCompanion}
        onShowInBodyCompanion={onShowInBodyCompanion}
        onExitParQ={handleBack}
        onParQComplete={onComplete}
      />
    );
  }

  const movementPattern = currentStep[0].pattern;
  const isBodyCompSection = section.id === 'body-comp';

  // Auto-photo helper for body comp: launches camera or phone companion
  const handleSnapPhoto = () => {
    if (!isMobile && onShowInBodyCompanion) {
      onShowInBodyCompanion();
    } else {
      onShowCamera?.('ocr');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Progress within section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <span>{section.title} Progress</span>
          <span>{activeFieldIdx + 1} of {steps.length}</span>
        </div>
        <Progress value={((activeFieldIdx + 1) / steps.length) * 100} className="h-1" />
      </div>

      <div className="bg-white rounded-3xl p-8 lg:p-10 shadow-xl shadow-primary/10 border border-primary/5 min-h-[400px] flex flex-col justify-center relative">

        {movementPattern && (
          <div className="mb-6 flex items-center justify-between">
            <span className="px-3 py-1 bg-brand-light text-primary rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-primary/10">
              {movementPattern}
            </span>
          </div>
        )}

        {/* Body comp: inline "Snap a Photo" button above fields */}
        {isBodyCompSection && onShowCamera && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <Button
              onClick={handleSnapPhoto}
              className="h-10 px-5 rounded-xl bg-primary text-white font-bold gap-2 text-sm hover:brightness-110"
            >
              <Camera className="h-4 w-4" />
              Snap a Photo
            </Button>
            <span className="text-xs text-slate-400">Take a photo of the report and we'll fill in the numbers</span>
          </div>
        )}

        {/* Fields */}
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
                onExitParQ={handleBack}
              />
            </div>
          ))}
        </div>

        {/* Body comp: optional "Add Body Measurements" toggle at bottom */}
        {isBodyCompSection && isLastField && (
          <div className="mt-6 pt-4 border-t border-slate-100">
            {formData.showBodyMeasurements !== 'yes' ? (
              <Button
                variant="ghost"
                onClick={() => updateFormData({ showBodyMeasurements: 'yes' })}
                className="h-9 px-4 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-600 gap-2"
              >
                <Ruler className="h-3.5 w-3.5" />
                Add Body Measurements (optional)
              </Button>
            ) : (
              <p className="text-[10px] text-slate-400 font-medium">Body measurements are included below.</p>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-12 pt-8 border-t border-slate-50">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={activeFieldIdx === 0 && !onGoToPreviousSection}
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
      </div>
    </div>
  );
};

