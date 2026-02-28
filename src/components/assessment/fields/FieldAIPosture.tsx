import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, Camera as CameraIcon, Smartphone, CheckCircle2 } from 'lucide-react';
import { isMobile } from 'react-device-detect';

import type { FieldValue } from '../hooks/useFieldControl';

interface FieldAIPostureProps {
  id: string;
  value: FieldValue;
  options?: Array<{ value: string; label: string }>;
  hasResults: boolean;
  handleChange: (val: FieldValue) => void;
  onShowCamera?: (mode: 'ocr' | 'posture') => void;
  onShowPostureCompanion?: () => void;
}

export const FieldAIPosture: React.FC<FieldAIPostureProps> = ({
  id,
  value,
  options,
  hasResults,
  handleChange,
  onShowCamera,
  onShowPostureCompanion,
}) => {
  if (value !== 'ai') {
    // This component is only shown when value is 'ai'
    // But the parent handles the radio buttons for switching mode
    return null;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="p-8 bg-brand-light rounded-3xl border-2 border-dashed border-primary/20 flex flex-col items-center text-center space-y-6">
        <div className="bg-white p-4 rounded-3xl shadow-sm">
          <Smartphone className="h-10 w-10 text-primary" />
        </div>
        <div className="space-y-2">
          <h4 className="text-xl font-bold text-slate-900">AI Posture Analysis</h4>
          <p className="text-primary/70 text-sm font-medium max-w-xs mx-auto">
            {hasResults 
              ? "Scan complete! You can re-scan if needed or continue to the next step."
              : "Connect your iPhone to perform a multi-view posture scan with real-time AI grading."}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          {isMobile ? (
            <Button 
              onClick={() => onShowCamera?.('posture')}
              className="flex-1 h-14 rounded-2xl bg-primary text-white font-bold text-xs gap-3 shadow-lg shadow-primary/20"
            >
              <CameraIcon className="h-5 w-5" />
              Start Posture Scan
            </Button>
          ) : (
            <Button 
              onClick={onShowPostureCompanion}
              className="flex-1 h-14 rounded-2xl bg-primary text-white font-bold text-xs gap-3 shadow-lg shadow-primary/20"
            >
              <Smartphone className="h-5 w-5" />
              Open Remote Mode
            </Button>
          )}
        </div>

        {hasResults && (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-700">AI Results Active</span>
          </div>
        )}
      </div>
    </div>
  );
};
