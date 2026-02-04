import React, { useMemo, useState } from 'react';
import { useFormContext, type FormData } from '@/contexts/FormContext';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Scan, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
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
  const [showInBodyOptions, setShowInBodyOptions] = useState(false);

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

        {/* Body Composition Method Selection - Show at start of body-comp section */}
        {section.id === 'body-comp' && !formData.bodyCompMethod && (
          <div className="mb-8 space-y-4">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Choose Assessment Method</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button
                onClick={() => updateFormData({ bodyCompMethod: 'measurements' })}
                className="h-24 rounded-2xl border-2 border-primary/20 hover:bg-brand-light hover:border-primary/40 transition-all flex flex-col items-center justify-center gap-2"
              >
                <div className="text-2xl">📏</div>
                <div className="font-bold text-sm">Body Measurements</div>
                <div className="text-xs text-slate-600 font-medium">Tape measure method</div>
              </Button>
              <Button
                onClick={() => updateFormData({ bodyCompMethod: 'analyzer' })}
                className="h-24 rounded-2xl border-2 border-primary/20 hover:bg-brand-light hover:border-primary/40 transition-all flex flex-col items-center justify-center gap-2"
              >
                <div className="text-2xl">📊</div>
                <div className="font-bold text-sm">Body Composition Analysis</div>
                <div className="text-xs text-slate-600 font-medium">Analyzer report method</div>
              </Button>
            </div>
          </div>
        )}

        {/* Show fields only if method is selected */}
        {section.id === 'body-comp' && formData.bodyCompMethod && (
          <>
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

            {/* Body Comp Analysis Report Button - Only show for analyzer method */}
            {formData.bodyCompMethod === 'analyzer' && onShowCamera && (
              <div className="mt-8 pt-6 border-t border-slate-100">
                <Button 
                  variant="outline" 
                  onClick={() => setShowInBodyOptions(true)}
                  className="w-full h-14 rounded-xl border-primary/20 text-primary hover:bg-brand-light font-bold gap-2"
                >
                  <FileText className="h-5 w-5" />
                  Body Comp Analysis Report
                </Button>
                
                {/* Options Dialog */}
                <Dialog open={showInBodyOptions} onOpenChange={setShowInBodyOptions}>
                  <DialogContent className="max-w-md rounded-3xl">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-black">Body Comp Analysis Report</DialogTitle>
                      <DialogDescription>
                        Choose how you want to enter the analyzer data
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-4">
                      <Button
                        onClick={() => {
                          // Set flag to show analyzer fields for manual entry
                          updateFormData({ showAnalyzerFields: 'yes' });
                          setShowInBodyOptions(false);
                        }}
                        className="w-full h-16 rounded-2xl bg-primary text-white font-bold gap-3 justify-start px-6"
                      >
                        <FileText className="h-5 w-5" />
                        <div className="text-left">
                          <div className="font-black text-sm">Manual Entry</div>
                          <div className="text-xs opacity-90">Enter values from the report manually</div>
                        </div>
                      </Button>
                      <Button
                        onClick={() => {
                          setShowInBodyOptions(false);
                          // On desktop/iPad: show companion modal for iPhone handoff
                          // On mobile: use direct camera
                          if (!isMobile && onShowInBodyCompanion) {
                            onShowInBodyCompanion();
                          } else {
                            onShowCamera?.('ocr');
                          }
                        }}
                        variant="outline"
                        className="w-full h-16 rounded-2xl border-2 border-primary/20 hover:bg-brand-light gap-3 justify-start px-6"
                      >
                        <Scan className="h-5 w-5 text-primary" />
                        <div className="text-left">
                          <div className="font-black text-sm text-slate-900">Scan Report</div>
                          <div className="text-xs text-slate-600">Use OCR to automatically extract data</div>
                        </div>
                      </Button>
                    </div>
                    <DialogFooter>
                      <Button variant="ghost" onClick={() => setShowInBodyOptions(false)}>
                        Cancel
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </>
        )}

        {/* For non-body-comp sections, show fields normally */}
        {section.id !== 'body-comp' && (
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
        )}

        {( !isParqField || formData.parqQuestionnaire === 'completed' ) && (
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
        )}
      </div>
    </div>
  );
};

