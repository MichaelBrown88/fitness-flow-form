import React, { useState } from 'react';
import { FormProvider } from '@/contexts/FormContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import AppShell from '@/components/layout/AppShell';
import { PhaseFormContent } from './assessment/PhaseFormContent';

const MultiStepForm = () => {
  const [demoTrigger, setDemoTrigger] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const handleDemoFill = () => setDemoTrigger(prev => prev + 1);
  
  return (
    <TooltipProvider delayDuration={0}>
      <FormProvider>
        <AppShell 
          title="Fitness Assessment" 
          showDemoFill={true} 
          onDemoFill={handleDemoFill}
          variant="full-width"
          onMenuToggle={() => setSidebarOpen(prev => !prev)}
        >
          <PhaseFormContent demoTrigger={demoTrigger} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        </AppShell>
      </FormProvider>
    </TooltipProvider>
  );
};

export default MultiStepForm;
