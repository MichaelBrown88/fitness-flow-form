import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { getInitialFormDataFromSession } from '@/contexts/form/initialFormFromSession';
import { clearPartialPrefillEditDraft } from '@/lib/assessment/assessmentSessionStorage';
import {
  type FormData,
  initialFormData,
  createEmptyAssessmentForm,
} from '@/types/assessmentForm';

// Shared types + test helpers are intentionally co-exported with the provider.
/* eslint-disable react-refresh/only-export-components */
export type { FormData };
export { createEmptyAssessmentForm };
/* eslint-enable react-refresh/only-export-components */

interface FormContextType {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
  resetForm: () => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  totalSteps: number;
}

const FormContext = createContext<FormContextType | undefined>(undefined);

export const FormProvider = ({ children }: { children: ReactNode }) => {
  const [formData, setFormData] = useState<FormData>(() =>
    getInitialFormDataFromSession<FormData>(initialFormData),
  );
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  const updateFormData = useCallback((data: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setCurrentStep(1);
    clearPartialPrefillEditDraft();
  }, []);

  const contextValue = React.useMemo(
    () => ({
      formData,
      updateFormData,
      resetForm,
      currentStep,
      setCurrentStep,
      totalSteps,
    }),
    [formData, updateFormData, resetForm, currentStep, totalSteps],
  );

  return <FormContext.Provider value={contextValue}>{children}</FormContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useFormContext = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within FormProvider');
  }
  return context;
};
