import React, { useState } from 'react';
import { FormProvider } from '@/contexts/FormContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import AppShell from '@/components/layout/AppShell';
import { PhaseFormContent } from './assessment/PhaseFormContent';
import { useAuth } from '@/hooks/useAuth';

const MultiStepForm = () => {
  const [demoTrigger, setDemoTrigger] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { orgSettings } = useAuth();
  const handleDemoFill = () => setDemoTrigger(prev => prev + 1);
  
  // Demo auto-fill is controlled by platform admin via orgSettings
  // Only show if enabled for this organization (off by default)
  const showDemoFill = orgSettings?.demoAutoFillEnabled === true;
  
  return (
    <TooltipProvider delayDuration={0}>
      <FormProvider>
        <AppShell 
          title="Fitness Assessment" 
          showDemoFill={showDemoFill} 
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
