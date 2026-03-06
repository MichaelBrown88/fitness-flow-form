import { cn } from '@/lib/utils';

type Step = { title: string };

export default function Stepper({
  steps,
  currentStep,
  onStepChange,
}: {
  steps: Step[];
  currentStep: number;
  onStepChange: (index: number) => void;
}) {
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex gap-2 min-w-max">
        {steps.map((step, idx) => {
          const stepNumber = idx + 1;
          const isActive = stepNumber === currentStep;
          const isDone = stepNumber < currentStep;
          return (
            <button
              key={idx}
              type="button"
              aria-current={isActive ? 'step' : undefined}
              onClick={() => onStepChange(stepNumber)}
              className={cn(
                'group flex items-center gap-2 chip',
                isActive && 'bg-primary text-primary-foreground border-primary/60 shadow-md',
                !isActive && isDone && 'bg-brand-light text-primary border-primary/10 hover:bg-brand-medium',
                !isActive && !isDone && 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
              )}
            >
              <span
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                  isActive && 'bg-primary-foreground text-primary',
                  !isActive && isDone && 'bg-primary/20 text-primary',
                  !isActive && !isDone && 'bg-background text-muted-foreground border border-border'
                )}
              >
                {stepNumber}
              </span>
              <span className="whitespace-nowrap text-sm font-medium">{step.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}


