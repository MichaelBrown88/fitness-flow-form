import { useCallback, useRef } from 'react';
import type { FormData } from '@/contexts/FormContext';
import { phaseDefinitions } from '@/lib/phaseConfig';

export const useDemoAssessment = (
  updateFormData: (data: Partial<FormData>) => void,
  setActivePhaseIdx: (idx: number) => void,
  setActiveFieldIdx: (idx: number) => void,
  setExpandedSections: (sections: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void,
  setIsDemoAssessment: (val: boolean) => void,
  totalPhases: number,
  isDemoAssessment: boolean
) => {
  const isRunningDemoRef = useRef(false);

  const runDemoSequential = useCallback(async () => {
    // Prevent multiple simultaneous runs
    if (isRunningDemoRef.current || isDemoAssessment) {
      console.warn('[DEMO] Auto-fill already in progress, skipping...');
      return;
    }
    
    isRunningDemoRef.current = true;
    setIsDemoAssessment(true);
    try {
      const { generateDemoData } = await import('@/lib/demoGenerator');
      const payload = await generateDemoData();
      const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
      
      // OPTIMIZATION: Set all data at once in a single batch to minimize re-renders
      updateFormData(payload as Partial<FormData>);
      
      // Use requestAnimationFrame to yield to browser for smoother performance
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await delay(300);
    
      setActivePhaseIdx(0);
      setActiveFieldIdx(0);
      await delay(500); // Reduced initial delay

      for (let p = 0; p < totalPhases; p++) {
        const ph = phaseDefinitions[p];
        if (!ph || ph.id === 'P7') break;
        
        setActivePhaseIdx(p);
        await delay(800); // Reduced delay
        
        const sections = ph.sections ?? [];
        for (const sec of sections) {
          // Ensure section is expanded before processing
          setExpandedSections((prev: Record<string, boolean>) => ({ ...prev, [sec.id]: true }));
          await delay(400); // Reduced delay
          
          let fieldIdx = 0;
          let finishedSection = false;
          
          const fields = sec.fields ?? [];
          for (const _field of fields) {
            // Visualize typing/filling
            setActiveFieldIdx(fieldIdx++);
            await delay(150); // Very fast per field
          }
          finishedSection = true;
          
          if (finishedSection) {
            // Collapse section after completion (visual cleanup)
            // await delay(200);
            // setExpandedSections(prev => ({ ...prev, [sec.id]: false }));
          }
        }
      }
    } catch (error) {
      console.error('[DEMO] Sequence failed:', error);
    } finally {
      isRunningDemoRef.current = false;
      // Keep isDemoAssessment = true so UI knows we are in demo mode (some fields might behave differently)
    }
  }, [
    isDemoAssessment, 
    updateFormData, 
    setActivePhaseIdx, 
    setActiveFieldIdx, 
    setExpandedSections, 
    setIsDemoAssessment, 
    totalPhases
  ]);

  return { runDemoSequential, isRunningDemoRef };
};
