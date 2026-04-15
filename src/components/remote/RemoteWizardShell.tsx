import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

interface StepMeta {
  id: string;
  label: string;
}

interface RemoteWizardShellProps {
  steps: StepMeta[];
  currentStep: number; // 0-indexed
  isValid: boolean;
  isSubmitting?: boolean;
  onBack: () => void;
  onNext: () => void;
  children: React.ReactNode;
}

export function RemoteWizardShell({
  steps,
  currentStep,
  isValid,
  isSubmitting = false,
  onBack,
  onNext,
  children,
}: RemoteWizardShellProps) {
  const isLastStep = currentStep === steps.length - 1;
  const stepLabel = steps[currentStep]?.label ?? '';
  const progressPct = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="flex flex-col min-h-[calc(100dvh-56px)]">
      {/* Progress header */}
      <div className="px-4 pt-4 pb-2 space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>{stepLabel}</span>
          <span>{currentStep + 1} of {steps.length}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 px-4 py-4 overflow-y-auto">
        {children}
      </div>

      {/* Navigation */}
      <div className="px-4 pb-6 pt-2 border-t border-border bg-background space-y-2">
        <Button
          type="button"
          className="w-full h-11 rounded-xl"
          disabled={!isValid || isSubmitting}
          onClick={onNext}
        >
          {isSubmitting ? 'Submitting...' : isLastStep ? 'Submit' : 'Next'}
        </Button>
        {currentStep > 0 && (
          <Button
            type="button"
            variant="ghost"
            className="w-full h-9 rounded-xl text-sm text-muted-foreground"
            onClick={onBack}
            disabled={isSubmitting}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        )}
      </div>
    </div>
  );
}
