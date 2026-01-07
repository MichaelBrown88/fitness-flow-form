import { ONBOARDING_STEPS } from '@/types/onboarding';
import { Check } from 'lucide-react';

interface OnboardingLayoutProps {
  currentStep: number;
  children: React.ReactNode;
}

export function OnboardingLayout({ currentStep, children }: OnboardingLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b border-border/50 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <span className="text-white font-bold text-sm">FF</span>
            </div>
            <span className="font-semibold text-lg">FitnessFlow</span>
          </div>
          <div className="text-sm text-foreground-secondary">
            Step {currentStep + 1} of {ONBOARDING_STEPS.length}
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="bg-white border-b border-border/50">
        <div className="container mx-auto px-4 py-6">
          <StepIndicator currentStep={currentStep} />
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

interface StepIndicatorProps {
  currentStep: number;
}

function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between">
      {ONBOARDING_STEPS.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isUpcoming = index > currentStep;

        return (
          <div key={step.id} className="flex items-center flex-1">
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                  isCompleted
                    ? 'bg-emerald-500 text-white'
                    : isCurrent
                    ? 'gradient-bg text-white shadow-lg'
                    : 'bg-slate-100 text-foreground-tertiary'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <div className="mt-2 text-center">
                <p
                  className={`text-sm font-medium ${
                    isCurrent ? 'text-foreground' : 'text-foreground-secondary'
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-xs text-foreground-tertiary hidden sm:block">
                  {step.description}
                </p>
              </div>
            </div>

            {/* Connector line */}
            {index < ONBOARDING_STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-4 rounded-full ${
                  index < currentStep ? 'bg-emerald-500' : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export { StepIndicator };
