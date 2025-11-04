import { FormProvider, useFormContext } from '@/contexts/FormContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import Step1 from './steps/Step1';
import Step2 from './steps/Step2';
import Step3 from './steps/Step3';
import Step4 from './steps/Step4';
import Step5 from './steps/Step5';
import Step6 from './steps/Step6';
import Step7 from './steps/Step7';

const MultiStepFormContent = () => {
  const { currentStep, setCurrentStep, totalSteps, formData } = useFormContext();

  const steps = [
    { component: Step1, title: 'Client Info' },
    { component: Step2, title: 'Body Composition' },
    { component: Step3, title: 'Posture' },
    { component: Step4, title: 'Movement' },
    { component: Step5, title: 'Strength' },
    { component: Step6, title: 'Cardio' },
    { component: Step7, title: 'Review' },
  ];

  const CurrentStepComponent = steps[currentStep - 1].component;

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = () => {
    console.log('=== FORM SUBMISSION ===');
    console.log(JSON.stringify(formData, null, 2));
    console.log('======================');
    
    toast.success('Assessment submitted successfully!', {
      description: 'Check the console for the complete data.',
    });
  };

  const progressValue = (currentStep / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-xl mx-auto">
        <div className="bg-card rounded-lg shadow-sm border border-border p-6 space-y-6">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-foreground">Fitness Assessment</h1>
              <span className="text-sm text-muted-foreground font-medium">
                Step {currentStep} of {totalSteps}
              </span>
            </div>
            <Progress value={progressValue} className="h-2" />
          </div>

          {/* Step Content */}
          <div className="min-h-[400px]">
            <CurrentStepComponent />
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button
              variant="secondary"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>

            {currentStep === totalSteps ? (
              <Button onClick={handleSubmit} className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Submit Assessment
              </Button>
            ) : (
              <Button onClick={nextStep} className="gap-2">
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Step indicators */}
        <div className="mt-6 flex justify-center gap-2">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index + 1)}
              className={`w-2 h-2 rounded-full transition-all ${
                index + 1 === currentStep
                  ? 'bg-primary w-8'
                  : index + 1 < currentStep
                  ? 'bg-primary/60'
                  : 'bg-muted'
              }`}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const MultiStepForm = () => {
  return (
    <FormProvider>
      <MultiStepFormContent />
    </FormProvider>
  );
};

export default MultiStepForm;
