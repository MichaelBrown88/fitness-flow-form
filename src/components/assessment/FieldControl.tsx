import React from 'react';
import ParQQuestionnaire from '@/components/ParQQuestionnaire';
import { Check, Smartphone, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';

// Hook
import { useFieldControl } from './hooks/useFieldControl';

// Sub-components
import { FieldLabel } from './fields/FieldLabel';
import { FieldTextArea } from './fields/FieldTextArea';
import { FieldSelect } from './fields/FieldSelect';
import { FieldMultiSelect } from './fields/FieldMultiSelect';
import { FieldInput } from './fields/FieldInput';

import type { PhaseField } from '@/lib/phaseConfig';

interface FieldControlProps {
  field: PhaseField;
  onShowCamera?: (mode: 'ocr') => void;
  onShowPostureCompanion?: () => void;
  onShowBodyCompCompanion?: () => void;
  onExitParQ?: () => void;
  onParQComplete?: () => void;
}

export function FieldControl({
  field,
  onShowCamera,
  onShowPostureCompanion,
  onShowBodyCompCompanion,
  onExitParQ,
  onParQComplete,
}: FieldControlProps) {
  const {
    localValue,
    setLocalValue,
    fieldOptions,
    shouldShow,
    handleChange,
    debouncedHandleChange,
    orgSettings,
    formData,
  } = useFieldControl({ field });

  if (!shouldShow) {
    return null;
  }

  const renderInput = () => {
    const value = formData[field.id];

    // Special UI for AI Posture Scan choice
    if (field.id === 'postureInputMode' && value === 'ai') {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fieldOptions?.map((option, idx) => {
              const isSelected = value === option.value;
              const colorClass = idx === 0 ? 'hover:border-border hover:bg-muted/50 text-foreground-secondary border-border' : 'hover:border-primary/20 hover:bg-brand-light hover:text-on-brand-tint text-foreground-secondary border-primary/10';
              const inputId = `${field.id}-${option.value}`;
              
              return (
                <label
                  key={option.value}
                  htmlFor={inputId}
                  className={`flex h-11 cursor-pointer items-center gap-3 rounded-lg border-2 px-4 text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : `bg-background text-foreground-secondary ${colorClass}`
                  }`}
                >
                  <input 
                    type="radio" 
                    id={inputId} 
                    name={field.id} 
                    value={option.value} 
                    checked={isSelected}
                    onChange={() => handleChange(option.value)}
                    className="sr-only"
                  />
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    isSelected ? 'bg-background/20 border-white/20 text-white' : 'border-border bg-background'
                  }`}>
                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                  <span className="font-bold text-xs leading-tight">{option.label}</span>
                </label>
              );
            })}
          </div>

          <div className="p-8 bg-brand-light rounded-3xl border-2 border-dashed border-primary/20 flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="bg-background p-4 rounded-3xl shadow-sm">
              <Smartphone className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-bold text-foreground">AI Posture Analysis</h4>
              <p className="text-foreground-secondary text-sm font-medium max-w-xs mx-auto">
                {formData.postureAiResults 
                  ? "Scan complete! You can re-scan if needed or continue to the next step."
                  : "Guided capture on this device or a second phone via QR — Gemini Live framing plus full analysis."}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
              <Button 
                onClick={onShowPostureCompanion}
                className="h-14 flex-1 gap-3 rounded-lg bg-primary text-xs font-bold text-primary-foreground shadow-sm"
              >
                <Smartphone className="h-5 w-5" />
                Start posture scan
              </Button>
            </div>

            {formData.postureAiResults && (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-700">AI Results Active</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    switch (field.type) {
      case 'textarea':
        return (
          <FieldTextArea 
            id={field.id}
            placeholder={field.placeholder}
            localValue={localValue}
            setLocalValue={setLocalValue}
            handleChange={handleChange}
            debouncedHandleChange={debouncedHandleChange}
          />
        );
      case 'select':
        return (
          <FieldSelect 
            id={field.id}
            options={fieldOptions}
            value={value as string}
            handleChange={handleChange}
          />
        );
      case 'multiselect':
        return (
          <FieldMultiSelect
            id={field.id}
            options={fieldOptions}
            value={value as string[]}
            handleChange={handleChange}
            selectionLabels={field.id === 'clientGoals' ? (i) => (i === 0 ? 'Primary' : 'Secondary') : undefined}
          />
        );
      case 'parq':
        return <ParQQuestionnaire onExitParQ={onExitParQ} onComplete={onParQComplete} />;
      case 'time':
      case 'date':
      case 'email':
      case 'tel':
      case 'number':
      case 'text':
      default:
        return (
          <FieldInput 
            id={field.id}
            type={field.type === 'number' ? 'number' : field.type || 'text'}
            placeholder={field.placeholder}
            value={formData[field.id] as string}
            onValueChange={(val: string) => handleChange(val)}
          />
        );
    }
  };

  // PAR-Q renders its own full sub-flow — skip the wrapper label
  if (field.type === 'parq') {
    return <>{renderInput()}</>;
  }

  return (
    <div className="space-y-1">
      <FieldLabel field={field} orgSettings={orgSettings} formData={formData} />
      {renderInput()}
    </div>
  );
}
