import React from 'react';
import { useFormContext, type FormData } from '@/contexts/FormContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Check, Info, Smartphone, Camera as CameraIcon, CheckCircle2 } from 'lucide-react';
import { type PhaseField } from '@/lib/phaseConfig';
import { useIsMobile } from '@/hooks/use-mobile';
import ParQQuestionnaire from '../ParQQuestionnaire';

type FieldValue = string | string[];

const labelTextClasses = 'text-xl font-bold tracking-tight text-slate-900 mb-2 block';
const supportTextClasses = 'text-base text-slate-500 font-medium leading-relaxed mb-6';

interface FieldControlProps {
  field: PhaseField;
  onShowCamera?: (mode: 'ocr' | 'posture') => void;
  onShowPostureCompanion?: () => void;
  onShowInBodyCompanion?: () => void;
}

export const FieldControl: React.FC<FieldControlProps> = ({
  field,
  onShowCamera,
  onShowPostureCompanion,
  onShowInBodyCompanion
}) => {
  const { formData, updateFormData } = useFormContext();
  const isMobile = useIsMobile();

  // Check conditional logic
  const shouldShow = () => {
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
  };

  if (!shouldShow()) {
    return null;
  }

  const handleChange = (value: FieldValue) => {
    const updates: Partial<FormData> = { [field.id]: value } as Partial<FormData>;
    
    // Clear AI results if switching to manual
    if (field.id === 'postureInputMode' && value === 'manual') {
      updates.postureAiResults = null;
    }
    
    updateFormData(updates);
  };

  const renderLabel = () => {
    const tooltipLines = field.tooltip?.split('\n') || [];

    return (
      <div className="flex flex-col gap-1 mb-2">
        <div className="flex items-center gap-2">
          <label htmlFor={field.id} className={labelTextClasses}>{field.label}</label>
          {field.tooltip && (
            <TooltipProvider>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <button type="button" className="text-primary hover:brightness-110 transition-colors">
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent 
                  side="right" 
                  className="z-[100] max-w-[300px] p-5 bg-slate-900 text-white rounded-2xl border-none shadow-2xl animate-in fade-in zoom-in duration-200"
                >
                  <div className="space-y-3 text-left">
                    {tooltipLines.map((line, i) => {
                      const isInstructionHeader = line.toLowerCase().includes('instructions:');
                      const isStep = line.match(/^\d+\./);
                      const isBullet = line.trim().startsWith('•');

                      if (isInstructionHeader) {
                        return (
                          <div key={i} className="flex items-center gap-2 mb-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">{line.replace(':', '')}</span>
                          </div>
                        );
                      }

                      if (isStep) {
                        const [num, ...rest] = line.split('.');
                        return (
                          <div key={i} className="flex gap-3 text-[11px] leading-relaxed">
                            <span className="font-black text-primary min-w-[12px]">{num}.</span>
                            <span className="text-slate-200 font-medium">{rest.join('.').trim()}</span>
                          </div>
                        );
                      }

                      if (isBullet) {
                        return (
                          <div key={i} className="flex gap-3 text-[11px] leading-relaxed pl-1">
                            <span className="text-primary">•</span>
                            <span className="text-slate-200 font-medium">{line.replace('•', '').trim()}</span>
                          </div>
                        );
                      }

                      return (
                        <p key={i} className="text-[11px] leading-relaxed font-medium text-slate-300">
                          {line}
                        </p>
                      );
                    })}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        
        {field.description && <p className={supportTextClasses}>{field.description}</p>}
      </div>
    );
  };

  const renderInput = () => {
    const value = formData[field.id];

    // Special UI for AI Posture Scan choice
    if (field.id === 'postureInputMode' && value === 'ai') {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {field.options?.map((option, idx) => {
              const isSelected = value === option.value;
              const colorClass = idx === 0 ? 'hover:border-slate-200 hover:bg-slate-50 text-slate-700 border-slate-100' : 'hover:border-primary/20 hover:bg-brand-light text-primary border-primary/10';
              const inputId = `${field.id}-${option.value}`;
              
              return (
                <label
                  key={option.value}
                  htmlFor={inputId}
                  className={`flex h-11 cursor-pointer items-center gap-3 rounded-xl border-2 px-4 text-left transition-all ${
                    isSelected
                      ? 'border-slate-900 bg-slate-900 text-white shadow-lg scale-[1.02]'
                      : `bg-white text-slate-600 ${colorClass}`
                  }`}
                >
                  <input 
                    type="radio" 
                    id={inputId} 
                    name={field.id} 
                    value={option.value} 
                    checked={isSelected}
                    onChange={() => handleChange(option.value)}
                    className="sr-only"
                  />
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    isSelected ? 'bg-white/20 border-white/20 text-white' : 'border-slate-200 bg-white'
                  }`}>
                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                  <span className="font-bold text-xs leading-tight">{option.label}</span>
                </label>
              );
            })}
          </div>

          <div className="p-8 bg-brand-light rounded-3xl border-2 border-dashed border-primary/20 flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="bg-white p-4 rounded-3xl shadow-sm">
              <Smartphone className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-black uppercase tracking-tight text-slate-900">AI Posture Analysis</h4>
              <p className="text-primary/70 text-sm font-medium max-w-xs mx-auto">
                {formData.postureAiResults 
                  ? "Scan complete! You can re-scan if needed or continue to the next step."
                  : "Connect your iPhone to perform a multi-view posture scan with real-time AI grading."}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
              {isMobile ? (
                <Button 
                  onClick={() => onShowCamera?.('posture')}
                  className="flex-1 h-14 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-xs gap-3 shadow-xl shadow-primary/20"
                >
                  <CameraIcon className="h-5 w-5" />
                  Start Posture Scan
                </Button>
              ) : (
                <Button 
                  onClick={onShowPostureCompanion}
                  className="flex-1 h-14 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-xs gap-3 shadow-xl shadow-primary/20"
                >
                  <Smartphone className="h-5 w-5" />
                  Open Remote Mode
                </Button>
              )}
            </div>

            {formData.postureAiResults && (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">AI Results Active</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            id={field.id}
            name={field.id}
            placeholder={field.placeholder}
            value={(value as string) ?? ''}
            onChange={(event) => handleChange(event.target.value)}
            rows={4}
            className="mt-2 rounded-xl border-slate-200 focus:ring-primary"
          />
        );
      case 'select':
        // Always use a touch-optimized button grid for select fields
          return (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {field.options?.map((option, idx) => {
                const isSelected = value === option.value;
              const colors = [
                'hover:border-emerald-200 hover:bg-emerald-50 text-emerald-700 border-emerald-100',
                'hover:border-primary/20 hover:bg-brand-light text-primary border-primary/10',
                'hover:border-sky-200 hover:bg-sky-50 text-sky-700 border-sky-100',
                'hover:border-amber-200 hover:bg-amber-50 text-amber-700 border-amber-100',
                'hover:border-fuchsia-200 hover:bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100',
                'hover:border-rose-200 hover:bg-rose-50 text-rose-700 border-rose-100',
              ];
              const colorClass = colors[idx % colors.length];
              
                return (
                  <div key={option.value} className="space-y-2">
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleChange(option.value)}
                      className={`flex min-h-[44px] h-auto w-full items-center gap-3 rounded-xl border-2 px-4 py-2 text-left transition-all ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-white shadow-lg scale-[1.02]'
                          : `bg-white text-slate-600 ${colorClass}`
                      }`}
                      aria-label={option.label}
                    >
                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      isSelected ? 'bg-white/20 border-white/20 text-white' : 'border-slate-200 bg-white'
                      }`}>
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                    <span className="font-bold text-xs leading-tight">{option.label}</span>
                    </button>
                    {isSelected && option.value === 'yes' && field.id.toLowerCase().includes('pain') && (
                      <p className="px-2 py-1.5 rounded-lg bg-rose-50 border border-rose-100 text-[10px] font-black uppercase tracking-widest text-rose-600 flex items-center gap-2 animate-pulse shadow-sm">
                        <span className="text-sm">⚠️</span> Safety Flag: Do not load this movement pattern.
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
        );
      case 'multiselect': {
          const selected = Array.isArray(value) ? (value as string[]) : [];
          const toggle = (val: string) => {
            if (selected.includes(val)) {
              handleChange(selected.filter(v => v !== val));
            } else {
              handleChange([...selected, val]);
            }
          };
        
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            {field.options?.map((opt, idx) => {
                const isActive = selected.includes(opt.value);
              const colors = [
                'hover:border-emerald-200 hover:bg-emerald-50 text-emerald-700 border-emerald-100',
                'hover:border-primary/20 hover:bg-brand-light text-primary border-primary/10',
                'hover:border-sky-200 hover:bg-sky-50 text-sky-700 border-sky-100',
                'hover:border-amber-200 hover:bg-amber-50 text-amber-700 border-amber-100',
                'hover:border-fuchsia-200 hover:bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100',
                'hover:border-rose-200 hover:bg-rose-50 text-rose-700 border-rose-100',
              ];
              const colorClass = colors[idx % colors.length];

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggle(opt.value)}
                    className={`flex min-h-[44px] h-auto items-center gap-3 rounded-xl border-2 px-4 py-2 text-left transition-all ${
                      isActive
                      ? 'border-slate-900 bg-slate-900 text-white shadow-lg scale-[1.02]'
                      : `bg-white text-slate-600 ${colorClass}`
                    }`}
                    aria-pressed={isActive}
                    aria-label={opt.label}
                  >
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                    isActive ? 'bg-white/20 border-white/20 text-white' : 'border-slate-200 bg-white'
                    }`}>
                    {isActive ? (
                      <Check className="h-3 w-3 stroke-[4]" />
                    ) : (
                      <div className="h-2 w-2 rounded-sm bg-slate-100 opacity-0 group-hover:opacity-100" />
                    )}
                    </div>
                  <span className="font-bold text-xs leading-tight">{opt.label}</span>
                  </button>
                );
              })}
          </div>
        );
      }
      case 'parq':
        return <ParQQuestionnaire />;
      case 'time':
        return (
          <Input
            id={field.id}
            name={field.id}
            type="time"
            placeholder={field.placeholder}
            value={(value as string) ?? ''}
            onChange={(event) => handleChange(event.target.value)}
            className="h-12 rounded-xl border-slate-200 focus:ring-primary"
          />
        );
      case 'date':
        return (
          <Input
            id={field.id}
            name={field.id}
            type="date"
            placeholder={field.placeholder}
            value={(value as string) ?? ''}
            onChange={(event) => handleChange(event.target.value)}
            className="h-12 rounded-xl border-slate-200 focus:ring-primary"
          />
        );
      case 'email':
        return (
          <Input
            id={field.id}
            name={field.id}
            type="email"
            placeholder={field.placeholder}
            value={(value as string) ?? ''}
            onChange={(event) => handleChange(event.target.value)}
            className="h-12 rounded-xl border-slate-200 focus:ring-primary"
          />
        );
      case 'tel':
        return (
          <Input
            id={field.id}
            name={field.id}
            type="tel"
            placeholder={field.placeholder}
            value={(value as string) ?? ''}
            onChange={(event) => handleChange(event.target.value)}
            className="h-12 rounded-xl border-slate-200 focus:ring-primary"
          />
        );
      case 'number':
      case 'text':
      default:
        return (
          <Input
            id={field.id}
            name={field.id}
            type={field.type === 'number' ? 'number' : 'text'}
            placeholder={field.placeholder}
            value={(value as string) ?? ''}
            onChange={(event) => handleChange(event.target.value)}
            className="h-12 rounded-xl border-slate-200 focus:ring-primary"
          />
        );
    }
  };

  return (
    <div className="space-y-1">
      {renderLabel()}
      {renderInput()}
    </div>
  );
};

