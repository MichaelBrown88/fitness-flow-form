import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useFormContext, type FormData } from '@/contexts/FormContext';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { PhaseField } from '@/types/assessment';

export type FieldValue = string | number | string[] | null;

interface UseFieldControlProps {
  field: PhaseField;
}

export function useFieldControl({ field }: UseFieldControlProps) {
  const { formData, updateFormData } = useFormContext();
  const { orgSettings } = useAuth();
  const { toast } = useToast();
  
  const [localValue, setLocalValue] = useState<FieldValue>((formData[field.id as keyof FormData] as FieldValue) || '');

  const fieldValue = formData[field.id as keyof FormData];
  // Sync local state when global state changes
  useEffect(() => {
    setLocalValue((fieldValue as FieldValue) || '');
  }, [fieldValue, field.id]);

  // Auto-select cardio test based on equipment
  useEffect(() => {
    if (field.id === 'cardioTestSelected' && !localValue) {
      const hasCardioEquipment = orgSettings?.equipmentConfig?.cardioEquipment?.enabled ?? false;
      if (!hasCardioEquipment) {
        updateFormData({ [field.id]: 'ymca-step' });
        setLocalValue('ymca-step');
      }
    }
  }, [field.id, localValue, orgSettings?.equipmentConfig?.cardioEquipment?.enabled, updateFormData]);

  // Dynamic status/options
  const fieldOptions = useMemo(() => {
    if (field.id === 'cardioTestSelected' && field.options) {
      const hasCardioEquipment = orgSettings?.equipmentConfig?.cardioEquipment?.enabled ?? false;
      if (!hasCardioEquipment) {
        return field.options.filter(opt => opt.value === 'ymca-step');
      }
      return field.options;
    }

    return field.options;
  }, [field.id, field.options, orgSettings?.equipmentConfig?.cardioEquipment?.enabled]);

  const shouldShow = useMemo(() => {
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
  }, [field, formData]);

  const handleChange = useCallback((value: FieldValue) => {
    const updates: Partial<FormData> = { [field.id]: value } as Partial<FormData>;
    
    if (field.id === 'postureInputMode' && value === 'manual') {
      updates.postureAiResults = null;
    }

    if (field.id === 'clientGoals' && Array.isArray(value) && value.includes('body-recomposition') && formData.trainingHistory === 'advanced') {
      toast({
        title: "Recommendation for Advanced Lifters",
        description: "At your level, chasing both goals often results in achieving neither. We recommend a distinct 'Build' phase followed by a 'Cut' phase.",
        duration: 6000,
      });
    }
    
    updateFormData(updates);
  }, [field.id, formData.trainingHistory, updateFormData, toast]);

  // Debounced version for high-frequency inputs
  const debouncedUpdateTimer = useRef<NodeJS.Timeout | null>(null);
  
  const debouncedHandleChange = useCallback((value: FieldValue) => {
    if (debouncedUpdateTimer.current) {
      clearTimeout(debouncedUpdateTimer.current);
    }
    
    debouncedUpdateTimer.current = setTimeout(() => {
      handleChange(value);
    }, 500);
  }, [handleChange]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (debouncedUpdateTimer.current) {
        clearTimeout(debouncedUpdateTimer.current);
      }
    };
  }, []);

  return {
    localValue,
    setLocalValue,
    fieldOptions,
    shouldShow,
    handleChange,
    debouncedHandleChange,
    orgSettings,
    formData,
  };
}
