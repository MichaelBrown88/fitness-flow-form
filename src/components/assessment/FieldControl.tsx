import React from 'react';
import ParQQuestionnaire from '@/components/ParQQuestionnaire';
import { Check } from 'lucide-react';
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
import { FieldAIPosture } from './fields/FieldAIPosture';
import { FieldAssignedCoach } from './fields/FieldAssignedCoach';

import type { PhaseField } from '@/lib/phaseConfig';

interface FieldControlProps {
  field: PhaseField;
  onShowCamera?: (mode: 'ocr' | 'posture') => void;
  onShowPostureCompanion?: () => void;
  onShowInBodyCompanion?: () => void;
}

export function FieldControl({
  field,
  onShowCamera,
  onShowPostureCompanion,
  onShowInBodyCompanion
}: FieldControlProps) {
  const {
    localValue,
    setLocalValue,
    orgCoaches,
    loadingCoaches,
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
              const colorClass = idx === 0 
                ? 'hover:border-slate-200 hover:bg-slate-50 text-slate-700 border-slate-100' 
                : 'hover:border-primary/20 hover:bg-brand-light text-primary border-primary/10';
              const inputId = `${field.id}-${option.value}`;
              
              return (
                <label
                  key={option.value}
                  htmlFor={inputId}
                  className={`flex h-11 cursor-pointer items-center gap-3 rounded-xl border-2 px-4 text-left transition-all ${
                    isSelected
                      ? 'border-slate-900 bg-slate-900 text-white shadow-lg scale-[1.02]'
                      : `bg-white text-slate-600 ${colorClass}`
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
                    isSelected ? 'bg-white/20 border-white/20 text-white' : 'border-slate-200 bg-white'
                  }`}>
                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                  <span className="font-bold text-xs leading-tight">{option.label}</span>
                </label>
              );
            })}
          </div>

          <FieldAIPosture 
            id={field.id}
            value={value as string}
            hasResults={!!formData.postureAiResults}
            onShowCamera={onShowCamera}
            onShowPostureCompanion={onShowPostureCompanion}
            handleChange={handleChange}
          />
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
        if (field.id === 'assignedCoach') {
          return (
            <FieldAssignedCoach 
              coaches={orgCoaches}
              loading={loadingCoaches}
              value={localValue}
              handleChange={handleChange}
            />
          );
        }
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
          />
        );
      case 'parq':
        return <ParQQuestionnaire />;
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

  return (
    <div className="space-y-1">
      <FieldLabel field={field} orgSettings={orgSettings} formData={formData} />
      {renderInput()}
    </div>
  );
}
