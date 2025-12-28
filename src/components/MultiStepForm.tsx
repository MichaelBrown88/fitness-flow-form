import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { FormProvider, useFormContext, type FormData } from '@/contexts/FormContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Info,
  Share2,
  Download,
  Copy,
  Loader2,
  Camera as CameraIcon, 
  Scan, 
  CheckCircle2, 
  Smartphone,
  X
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { phaseDefinitions, type PhaseField, type PhaseSection, type PhaseId } from '@/lib/phaseConfig';
import ParQQuestionnaire from './ParQQuestionnaire';
import { computeScores, buildRoadmap } from '@/lib/scoring';
import { generateCoachPlan, generateBodyCompInterpretation } from '@/lib/recommendations';
import { useAuth } from '@/contexts/AuthContext';
import { saveCoachAssessment } from '@/services/coachAssessments';
import { requestShareArtifacts, sendReportEmail, type ShareArtifacts } from '@/services/share';
import { useToast } from '@/components/ui/use-toast';
import ClientReport from '@/components/reports/ClientReport';
import CoachReport from '@/components/reports/CoachReport';
import { downloadElementAsPdf } from '@/lib/pdf';
import { generateInteractiveHtml } from '@/lib/htmlExport';
import { useSettings } from '@/hooks/useSettings';
import { generateDemoData } from '@/lib/demoGenerator';
import { useIsMobile } from '@/hooks/use-mobile';
import { CameraCapture } from './camera/CameraCapture';
import { PostureCompanionModal } from './camera/PostureCompanionModal';
import { InBodyCompanionModal } from './camera/InBodyCompanionModal';
import { processInBodyScan } from '@/lib/ai/ocrEngine';
import { analyzePostureImage } from '@/lib/ai/postureAnalysis';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

type FieldValue = string | string[];

type IntakeSection = {
  id: string;
  title: string;
  fields: PhaseField[];
};

type SectionType = PhaseSection | IntakeSection;

const labelTextClasses = 'text-xl font-bold tracking-tight text-slate-900 mb-2 block';
const supportTextClasses = 'text-base text-slate-500 font-medium leading-relaxed mb-6';

const SingleFieldFlow = ({ 
  section, 
  activeFieldIdx,
  setActiveFieldIdx,
  onComplete,
  onShowCamera,
  onShowPostureCompanion,
  onShowInBodyCompanion
}: { 
  section: SectionType; 
  activeFieldIdx: number;
  setActiveFieldIdx: (idx: number | ((prev: number) => number)) => void;
  onComplete: () => void;
  onShowCamera?: (mode: 'ocr' | 'posture') => void;
  onShowPostureCompanion?: () => void;
  onShowInBodyCompanion?: () => void;
}) => {
  const { formData } = useFormContext();
  const isMobile = useIsMobile();

  // Filter visible fields and group paired ones
  const steps = useMemo(() => {
    const visible = (section.fields as PhaseField[]).filter(field => {
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
  });

    // Group by pairId
    const result: PhaseField[][] = [];
    const processedPairs = new Set<string>();

    visible.forEach(field => {
      if (field.pairId) {
        if (!processedPairs.has(field.pairId)) {
          const pair = visible.filter(f => f.pairId === field.pairId);
          result.push(pair);
          processedPairs.add(field.pairId);
        }
      } else {
        result.push([field]);
      }
    });

    return result;
  }, [section.fields, formData]);

  const currentStep = steps[activeFieldIdx];
  const isLastField = activeFieldIdx === steps.length - 1;
  
  const hasValue = useMemo(() => {
    if (!currentStep) return false;
    return currentStep.every(field => {
      const val = formData[field.id];
      return val !== undefined && val !== null && val !== '' && (!Array.isArray(val) || val.length > 0);
    });
  }, [currentStep, formData]);

  const handleNext = () => {
    if (isLastField) {
      onComplete();
    } else {
      setActiveFieldIdx(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (activeFieldIdx > 0) {
      setActiveFieldIdx(prev => prev - 1);
    }
  };

  if (!currentStep) return null;

  const movementPattern = currentStep[0].pattern;
  const isParqField = currentStep.some(f => f.type === 'parq') || section.id === 'parq';
  const coachNotes = 'instructions' in section ? section.instructions?.coachNotes : null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Progress within section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <span>{section.title} Progress</span>
          {(!isParqField || formData.parqQuestionnaire === 'completed') && <span>{activeFieldIdx + 1} of {steps.length}</span>}
        </div>
        {(!isParqField || formData.parqQuestionnaire === 'completed') && <Progress value={((activeFieldIdx + 1) / steps.length) * 100} className="h-1" />}
      </div>

      <div className="bg-white rounded-3xl p-8 lg:p-10 shadow-xl shadow-indigo-100/20 border border-indigo-50 min-h-[400px] flex flex-col justify-center relative">

        {movementPattern && (
          <div className="mb-6 flex items-center justify-between">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-100">
              {movementPattern}
            </span>
          </div>
        )}

        <div className={`grid gap-8 ${currentStep.length > 1 ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
          {currentStep.map(field => (
            <div key={field.id} className="space-y-4">
              {field.side && (
                <span className={`text-[10px] font-black uppercase tracking-widest ${field.side === 'left' ? 'text-emerald-500' : 'text-indigo-500'}`}>
                  {field.side} Side
                </span>
              )}
              <FieldControl 
                field={field}
                onShowCamera={onShowCamera}
                onShowPostureCompanion={onShowPostureCompanion}
                onShowInBodyCompanion={onShowInBodyCompanion}
              />
            </div>
          ))}
        </div>

        {/* InBody Scan Button - Below input fields */}
        {section.id === 'body-comp' && onShowCamera && (
          <div className="mt-8 pt-6 border-t border-slate-100">
            <Button 
              variant="outline" 
              onClick={() => {
                // On desktop/iPad: show companion modal for iPhone handoff
                // On mobile: use direct camera
                if (!isMobile && onShowInBodyCompanion) {
                  onShowInBodyCompanion();
                } else {
                  onShowCamera('ocr');
                }
              }}
              className="w-full h-14 rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-bold gap-2"
            >
              <Scan className="h-5 w-5" />
              Scan InBody Report
            </Button>
          </div>
        )}
        
        {( !isParqField || formData.parqQuestionnaire === 'completed' ) && (
        <div className="flex items-center justify-between mt-12 pt-8 border-t border-slate-50">
          <Button
            variant="ghost"
            onClick={handleBack}
              disabled={activeFieldIdx === 0}
            className="h-12 px-6 rounded-xl font-bold text-slate-400 hover:text-slate-900"
          >
            <ChevronLeft className="mr-2 h-5 w-5" />
            Back
          </Button>

          <Button
            onClick={handleNext}
              disabled={!hasValue && currentStep.some(f => f.required)}
            className={`h-12 px-8 rounded-xl font-bold transition-all ${
                hasValue || !currentStep.some(f => f.required)
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isLastField ? 'Section Complete' : 'Next Step'}
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
        )}
      </div>
    </div>
  );
};

const FieldControl = ({ 
  field,
  onShowCamera,
  onShowPostureCompanion,
  onShowInBodyCompanion
}: { 
  field: PhaseField;
  onShowCamera?: (mode: 'ocr' | 'posture') => void;
  onShowPostureCompanion?: () => void;
  onShowInBodyCompanion?: () => void;
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
    const hasInstructions = tooltipLines.some(l => l.toLowerCase().includes('instructions'));

    return (
      <div className="flex flex-col gap-1 mb-2">
        <div className="flex items-center gap-2">
          <label htmlFor={field.id} className={labelTextClasses}>{field.label}</label>
          {field.tooltip && (
            <TooltipProvider>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <button type="button" className="text-indigo-400 hover:text-indigo-600 transition-colors">
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
                            <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">{line.replace(':', '')}</span>
                          </div>
                        );
                      }

                      if (isStep) {
                        const [num, ...rest] = line.split('.');
                        return (
                          <div key={i} className="flex gap-3 text-[11px] leading-relaxed">
                            <span className="font-black text-indigo-500 min-w-[12px]">{num}.</span>
                            <span className="text-slate-200 font-medium">{rest.join('.').trim()}</span>
                          </div>
                        );
                      }

                      if (isBullet) {
                        return (
                          <div key={i} className="flex gap-3 text-[11px] leading-relaxed pl-1">
                            <span className="text-indigo-500">•</span>
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
              const colorClass = idx === 0 ? 'hover:border-slate-200 hover:bg-slate-50 text-slate-700 border-slate-100' : 'hover:border-indigo-200 hover:bg-indigo-50 text-indigo-700 border-indigo-100';
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

          <div className="p-8 bg-indigo-50 rounded-3xl border-2 border-dashed border-indigo-200 flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="bg-white p-4 rounded-3xl shadow-sm">
              <Smartphone className="h-10 w-10 text-indigo-600" />
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-black uppercase tracking-tight text-indigo-900">AI Posture Analysis</h4>
              <p className="text-indigo-600/70 text-sm font-medium max-w-xs mx-auto">
                {formData.postureAiResults 
                  ? "Scan complete! You can re-scan if needed or continue to the next step."
                  : "Connect your iPhone to perform a multi-view posture scan with real-time AI grading."}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
              {isMobile ? (
                <Button 
                  onClick={() => onShowCamera?.('posture')}
                  className="flex-1 h-14 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-widest text-xs gap-3 shadow-xl shadow-indigo-200"
                >
                  <CameraIcon className="h-5 w-5" />
                  Start Posture Scan
                </Button>
              ) : (
                <Button 
                  onClick={onShowPostureCompanion}
                  className="flex-1 h-14 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-widest text-xs gap-3 shadow-xl shadow-indigo-200"
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
            className="mt-2 rounded-xl border-slate-200 focus:ring-indigo-500"
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
                'hover:border-indigo-200 hover:bg-indigo-50 text-indigo-700 border-indigo-100',
                'hover:border-sky-200 hover:bg-sky-50 text-sky-700 border-sky-100',
                'hover:border-amber-200 hover:bg-amber-50 text-amber-700 border-amber-100',
                'hover:border-purple-200 hover:bg-purple-50 text-purple-700 border-purple-100',
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
                'hover:border-indigo-200 hover:bg-indigo-50 text-indigo-700 border-indigo-100',
                'hover:border-sky-200 hover:bg-sky-50 text-sky-700 border-sky-100',
                'hover:border-amber-200 hover:bg-amber-50 text-amber-700 border-amber-100',
                'hover:border-purple-200 hover:bg-purple-50 text-purple-700 border-purple-100',
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
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    isActive ? 'bg-white/20 border-white/20 text-white' : 'border-slate-200 bg-white'
                    }`}>
                    {isActive && <Check className="h-3 w-3 stroke-[3]" />}
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
            className="h-12 rounded-xl border-slate-200 focus:ring-indigo-500"
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
            className="h-12 rounded-xl border-slate-200 focus:ring-indigo-500"
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
            className="h-12 rounded-xl border-slate-200 focus:ring-indigo-500"
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
            className="h-12 rounded-xl border-slate-200 focus:ring-indigo-500"
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
            className="h-12 rounded-xl border-slate-200 focus:ring-indigo-500"
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

const PhaseFormContent = ({ 
  demoTrigger, 
  sidebarOpen, 
  setSidebarOpen 
}: { 
  demoTrigger?: number;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
}) => {
  const { formData, updateFormData } = useFormContext();
  const { settings } = useSettings();
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Check for partial assessment mode
  const getInitialPhase = () => {
    try {
      const partialData = sessionStorage.getItem('partialAssessment');
      if (partialData) {
        const { category } = JSON.parse(partialData);
        // Map categories to phase indices
        const categoryToPhase: Record<string, number> = {
          'inbody': 2,      // P2 - Body Composition
          'posture': 2,     // P2 - Posture & Movement (same phase as InBody)
          'fitness': 4,     // P4 - Cardiovascular Fitness
          'strength': 5,    // P5 - Strength & Power
          'lifestyle': 1,   // P1 - Lifestyle Overview
        };
        return categoryToPhase[category] || 0;
      }
    } catch (e) {
      console.warn('Failed to parse partial assessment data:', e);
    }
    return 0;
  };
  
  const [activePhaseIdx, setActivePhaseIdx] = useState(getInitialPhase());
  const [isPartialAssessment, setIsPartialAssessment] = useState(() => {
    try {
      const partialData = sessionStorage.getItem('partialAssessment');
      return !!partialData;
    } catch {
      return false;
    }
  });
  
  const [partialCategory, setPartialCategory] = useState<string | null>(() => {
    try {
      const partialData = sessionStorage.getItem('partialAssessment');
      if (partialData) {
        const { category } = JSON.parse(partialData);
        return category;
      }
    } catch {
      return null;
    }
    return null;
  });
  
  // Clear partial assessment data if navigating directly to assessment without explicit partial mode
  // This ensures full assessments aren't accidentally filtered
  useEffect(() => {
    // Only clear if there's no prefillClientData (which indicates a new client) 
    // and no explicit partialAssessment flag from a quick assessment button
    const prefillData = sessionStorage.getItem('prefillClientData');
    const partialData = sessionStorage.getItem('partialAssessment');
    
    // If we have partial data but no prefill data, it might be leftover - clear it
    // (Quick assessments should always have both prefill and partial data)
    if (partialData && !prefillData) {
      console.log('[MultiStepForm] Clearing leftover partial assessment data');
      sessionStorage.removeItem('partialAssessment');
      setIsPartialAssessment(false);
      setPartialCategory(null);
    }
  }, []);
  
  // Load current assessment data when starting partial assessment
  useEffect(() => {
    if (isPartialAssessment && user && partialCategory) {
      const loadCurrentAssessment = async () => {
        try {
          const partialData = sessionStorage.getItem('partialAssessment');
          if (partialData) {
            const { clientName } = JSON.parse(partialData);
            const { getCurrentAssessment } = await import('@/services/assessmentHistory');
            const current = await getCurrentAssessment(user.uid, clientName);
            if (current?.formData) {
              // Merge current data into form context
              const updates: Partial<FormData> = {};
              Object.keys(current.formData).forEach((key) => {
                const value = (current.formData as any)[key];
                if (value !== undefined && value !== null) {
                  updates[key as keyof FormData] = value;
                }
              });
              updateFormData(updates);
            }
          }
        } catch (e) {
          console.error('Failed to load current assessment:', e);
        }
      };
      loadCurrentAssessment();
    }
  }, [isPartialAssessment, user, partialCategory, updateFormData]);
  
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [recentlyCompletedSections, setRecentlyCompletedSections] = useState<Set<string>>(new Set());
  const phaseRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const [reportView, setReportView] = useState<'client' | 'coach'>('client');
  const [activeFieldIdx, setActiveFieldIdx] = useState(0);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [shareCache, setShareCache] = useState<Record<'client' | 'coach', ShareArtifacts | null>>({
    client: null,
    coach: null,
  });
  const shareCacheRef = useRef<Record<'client' | 'coach', ShareArtifacts | null>>({
    client: null,
    coach: null,
  });
  const [shareLoading, setShareLoading] = useState(false);
  const reportRef = useRef<HTMLDivElement | null>(null);
  const [isDemoAssessment, setIsDemoAssessment] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const isRunningDemoRef = useRef(false); // Prevent multiple simultaneous auto-fill runs
  
  // NEW CAMERA/COMPANION STATE
  const [showCamera, setShowCamera] = useState<false | 'ocr' | 'posture'>(false);
  const [showPostureCompanion, setShowPostureCompanion] = useState(false);
  const [showInBodyCompanion, setShowInBodyCompanion] = useState(false);
  const [ocrReviewData, setOcrReviewData] = useState<Partial<FormData> | null>(null);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [postureStep, setPostureStep] = useState<number>(0);

  // Filter phases for partial assessments
  const visiblePhases = useMemo(() => {
    if (!isPartialAssessment || !partialCategory) {
      return phaseDefinitions;
    }
    
    // Map category to allowed phase IDs
    const categoryToPhases: Record<string, PhaseId[]> = {
      'inbody': ['P0', 'P2', 'P7'],    // Basic info + Body Composition + Results
      'posture': ['P0', 'P2', 'P7'],   // Basic info + Posture + Results
      'fitness': ['P0', 'P4', 'P7'],   // Basic info + Fitness + Results
      'strength': ['P0', 'P5', 'P7'],  // Basic info + Strength + Results
      'lifestyle': ['P0', 'P1', 'P7'], // Basic info + Lifestyle + Results
    };
    
    const allowedPhases: PhaseId[] = categoryToPhases[partialCategory] || ['P0'];
    return phaseDefinitions.filter(phase => (allowedPhases as string[]).includes(phase.id));
  }, [isPartialAssessment, partialCategory]);
  
  const totalPhases = visiblePhases.length;
  const activePhase = useMemo(() => {
    return visiblePhases[activePhaseIdx] || {
      id: 'empty',
      title: 'No Phases Available',
      summary: 'Phase definitions are currently being loaded or configured.',
      sections: []
    };
  }, [activePhaseIdx, visiblePhases]);

  // Determine if we are in the results phase
  const isResultsPhase = activePhase?.id === 'P7';

  // Precompute reports data when needed
  const scores = useMemo(() => {
    try {
      return computeScores(formData);
    } catch (e) {
      console.error('Error computing scores:', e);
      return { overall: 0, categories: [], synthesis: [] };
    }
  }, [formData]);

  const roadmap = useMemo(() => {
    try {
      return buildRoadmap(scores, formData);
    } catch (e) {
      console.error('Error building roadmap:', e);
      return [];
    }
  }, [scores, formData]);

  const plan = useMemo(() => {
    try {
      return generateCoachPlan(formData, scores);
    } catch (e) {
      console.error('Error generating coach plan:', e);
      return {
        keyIssues: [],
        clientScript: { findings: [], whyItMatters: [], actionPlan: [], threeMonthOutlook: [], clientCommitment: [] },
        internalNotes: { doingWell: [], needsAttention: [] },
        programmingStrategies: [],
        movementBlocks: [],
        segmentalGuidance: []
      };
    }
  }, [formData, scores]);

  const bodyCompInterp = useMemo(() => {
    try {
      return generateBodyCompInterpretation(formData);
    } catch (e) {
      console.error('Error generating body comp interpretation:', e);
      return undefined;
    }
  }, [formData]);

  const ensureShareArtifacts = useCallback(async (view: 'client' | 'coach') => {
    if (!user || !savingId) {
      throw new Error('Assessment must be saved before sharing.');
    }
    if (shareCacheRef.current[view]) {
      return shareCacheRef.current[view]!;
    }
    const artifacts = await requestShareArtifacts({ assessmentId: savingId, view });
    shareCacheRef.current[view] = artifacts;
    setShareCache((prev) => ({ ...prev, [view]: artifacts }));
    return artifacts;
  }, [savingId, user]);

  const fetchReportPdfBlob = useCallback(async (view: 'client' | 'coach') => {
    try {
      if (user && savingId) {
        const artifacts = await ensureShareArtifacts(view);
        const response = await fetch(artifacts.pdfUrl);
        if (response.ok) {
          const blob = await response.blob();
          return { artifacts, blob };
        }
      }
    } catch (error) {
      console.warn('Cloud Functions PDF error, fallback to client-side', error);
    }
    
    if (!reportRef.current) throw new Error('Report element not found');
    
    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).default;
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const canvasEl = await html2canvas(reportRef.current, {
      scale: 3,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      windowWidth: reportRef.current.scrollWidth,
      windowHeight: reportRef.current.scrollHeight,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.querySelector(`[data-pdf-target]`) as HTMLElement;
        if (clonedElement) {
          clonedElement.style.backgroundColor = '#ffffff';
          clonedElement.style.width = `${reportRef.current!.scrollWidth}px`;
          clonedElement.style.height = 'auto';
          clonedElement.style.overflow = 'visible';
          clonedDoc.querySelectorAll('button, .dropdown-menu').forEach((el) => {
            (el as HTMLElement).style.display = 'none';
          });
        }
      },
    });
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);
    const imgHeight = (canvasEl.height * contentWidth) / canvasEl.width;
    const contentHeight = pageHeight - (margin * 2);
    const totalPages = Math.ceil(imgHeight / contentHeight);
    
    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage();
      const sourceY = (page * contentHeight / imgHeight) * canvasEl.height;
      const remainingHeight = imgHeight - (page * contentHeight);
      const pageImageHeight = Math.min(contentHeight, remainingHeight);
      const sourceHeight = (pageImageHeight / imgHeight) * canvasEl.height;
      
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvasEl.width;
      pageCanvas.height = Math.ceil(sourceHeight);
      const ctx = pageCanvas.getContext('2d');
      if (ctx && sourceHeight > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(canvasEl, 0, sourceY, canvasEl.width, sourceHeight, 0, 0, canvasEl.width, sourceHeight);
        const pageImgData = pageCanvas.toDataURL('image/png', 1.0);
        pdf.addImage(pageImgData, 'PNG', margin, margin, contentWidth, pageImageHeight);
      }
    }
    
    return { artifacts: null, blob: pdf.output('blob') };
  }, [ensureShareArtifacts, user, savingId]);

  const handlePrint = useCallback(async () => {
    try {
      setShareLoading(true);
      const { blob } = await fetchReportPdfBlob(reportView);
      const blobUrl = URL.createObjectURL(blob);
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.focus();
          printWindow.print();
        }, { once: true });
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (error) {
      console.error('Print failed', error);
      toast({ title: 'Print failed', variant: 'destructive' });
    } finally {
      setShareLoading(false);
    }
  }, [fetchReportPdfBlob, reportView, toast]);

  const handleShare = useCallback(async () => {
    try {
      setShareLoading(true);
      let shareUrl = window.location.origin;
      if (user && savingId) {
          const artifacts = await ensureShareArtifacts(reportView);
        shareUrl = `${window.location.origin}/share/${user.uid}/${savingId}`;
      }
      if (navigator.share) {
        await navigator.share({ title: 'Assessment Report', url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({ title: 'Link copied' });
      }
    } catch (error) {
      toast({ title: 'Share failed', variant: 'destructive' });
    } finally {
      setShareLoading(false);
    }
  }, [ensureShareArtifacts, reportView, toast, user, savingId]);

  const handleEmailLink = useCallback(async () => {
    const email = (formData.email || '').trim();
    if (!email) {
      toast({ title: 'Client email missing', variant: 'destructive' });
      return;
    }
    if (!savingId) return;
    try {
      setShareLoading(true);
      await sendReportEmail({ assessmentId: savingId, view: reportView, to: email, clientName: formData.fullName });
      toast({ title: 'Report emailed', description: `Sent to ${email}` });
    } catch (error) {
      toast({ title: 'Email failed', variant: 'destructive' });
    } finally {
      setShareLoading(false);
    }
  }, [formData.email, formData.fullName, reportView, savingId, toast]);

  const handleWhatsAppShare = useCallback(async () => {
    try {
      setShareLoading(true);
      const artifacts = await ensureShareArtifacts(reportView);
      window.open(`https://wa.me/?text=${encodeURIComponent(artifacts.whatsappText)}`, '_blank');
    } catch (error) {
      toast({ title: 'WhatsApp share failed', variant: 'destructive' });
    } finally {
      setShareLoading(false);
    }
  }, [ensureShareArtifacts, reportView, toast]);

  const handleCapture = async (imageSrc: string) => {
    if (showCamera === 'ocr') {
      setShowCamera(false);
      setIsProcessingOcr(true);
      
      toast({ 
        title: "Image Captured", 
        description: "Gemini AI is analyzing your InBody scan...",
      });

      try {
        const result = await processInBodyScan(imageSrc);
        if (result.fields && Object.keys(result.fields).length > 0) {
          setOcrReviewData(result.fields);
        } else {
          toast({ 
            title: "Scan failed", 
            description: "AI couldn't find data. Please try again with a clearer photo.",
            variant: "destructive"
          });
        }
      } catch (err) {
        console.error('OCR error:', err);
        toast({ title: "Scan failed", description: "An error occurred during AI analysis.", variant: "destructive" });
      } finally {
        setIsProcessingOcr(false);
      }
    } else if (showCamera === 'posture') {
      const views: ('front' | 'side-right' | 'side-left' | 'back')[] = ['front', 'side-right', 'side-left', 'back'];
      const currentView = views[postureStep] || 'front';
      
      toast({ title: `${currentView.toUpperCase()} captured`, description: "Analyzing posture..." });
      
      try {
        setIsProcessingOcr(true); // Re-use OCR loading mask for local analysis
        const analysis = await analyzePostureImage(imageSrc, currentView);
        
        // Map analysis to form
        const suggestions: Partial<FormData> = {};
        if (currentView === 'side-right' || currentView === 'side-left') {
          suggestions.postureHeadOverall = analysis.forward_head.status.toLowerCase().includes('neutral') ? 'neutral' : 'forward-head';
          suggestions.postureBackOverall = analysis.kyphosis.status.toLowerCase().includes('severe') ? 'increased-kyphosis' : 'neutral';
        } else if (currentView === 'front') {
          suggestions.postureShouldersOverall = analysis.shoulder_alignment.status.toLowerCase().includes('neutral') ? 'neutral' : 'rounded';
        }

        updateFormData(suggestions);

        if (postureStep < views.length - 1) {
          setPostureStep(prev => prev + 1);
        } else {
          setShowCamera(false);
          toast({ title: "Posture analysis complete", description: "Findings have been applied to the form." });
        }
      } catch (err) {
        console.error('Local posture analysis error:', err);
        toast({ title: "Analysis failed", description: "Could not analyze posture image.", variant: "destructive" });
        setShowCamera(false);
      } finally {
        setIsProcessingOcr(false);
      }
    }
  };

  const applyOcrData = () => {
    if (ocrReviewData) {
      updateFormData(ocrReviewData);
      setOcrReviewData(null);
      toast({ title: "InBody data applied", description: "All fields have been populated." });
      
      // Auto-advance: if we're in the Body Composition section, move to the next phase
      // This matches the user's request to "complete and go to the next"
      if (activePhase.id === 'P2') {
        setTimeout(() => {
          if (isPartialAssessment) {
            handleViewResults();
          } else {
            // Move to next visible phase (likely P3)
            const nextVisibleIdx = visiblePhases.findIndex((p, i) => i > activePhaseIdx);
            if (nextVisibleIdx !== -1) {
              setActivePhaseIdx(nextVisibleIdx);
            }
          }
        }, 800);
      }
    }
  };

  const handleSaveToDashboard = useCallback(async () => {
    if (!user || saving || savingId) return;
    
    // Safety check for client name
    const clientName = (formData.fullName || 'Unnamed client').trim();
    
    try {
      setSaving(true);
      console.log(`[SYNC] Starting sync for client: ${clientName}...`);
      
      // Check if this is a partial assessment
      let assessmentId: string;
      let category: string | null = null;
      
      try {
        const partialData = sessionStorage.getItem('partialAssessment');
        if (partialData) {
          const { category: cat, clientName } = JSON.parse(partialData);
          category = cat;
          
          // Use partial assessment save (merges with latest)
          const { savePartialAssessment } = await import('@/services/coachAssessments');
          assessmentId = await savePartialAssessment(
            user.uid, 
            user.email, 
            formData, 
            scores.overall, 
            clientName,
            category as 'inbody' | 'posture' | 'fitness' | 'strength' | 'lifestyle'
          );
          
          // Update client profile with last assessment date for this category
          const { createOrUpdateClientProfile } = await import('@/services/clientProfiles');
          const { Timestamp } = await import('firebase/firestore');
          const updateData: Record<string, any> = {};
          const now = Timestamp.now();
          
          if (category === 'inbody') updateData.lastInBodyDate = now;
          else if (category === 'posture') updateData.lastPostureDate = now;
          else if (category === 'fitness') updateData.lastFitnessDate = now;
          else if (category === 'strength') updateData.lastStrengthDate = now;
          else if (category === 'lifestyle') updateData.lastLifestyleDate = now;
          
          if (Object.keys(updateData).length > 0) {
            await createOrUpdateClientProfile(user.uid, clientName, updateData);
          }
          
          // Clear partial assessment flag
          sessionStorage.removeItem('partialAssessment');
        } else {
          // Full assessment
          assessmentId = await saveCoachAssessment(user.uid, user.email, formData, scores.overall);
        }
      } catch (parseErr) {
        // Fallback to regular save if partial data parsing fails
        assessmentId = await saveCoachAssessment(user.uid, user.email, formData, scores.overall);
      }
      
      setSavingId(assessmentId);
      toast({ 
        title: category ? 'Partial Assessment Saved' : 'Assessment Saved', 
        description: category ? `${category.charAt(0).toUpperCase() + category.slice(1)} data updated and merged.` : `Progress for ${clientName} has been saved.` 
      });
    } catch (e) {
      console.error('[SYNC] Save failed:', e);
      toast({ title: 'Sync Error', description: 'Unable to sync with dashboard. Please check your connection.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [user, saving, savingId, formData, scores.overall, toast]);

  useEffect(() => {
    if (isResultsPhase && user && !savingId && !saving && !isDemoAssessment) {
      void handleSaveToDashboard();
    }
  }, [isResultsPhase, user, savingId, saving, isDemoAssessment, handleSaveToDashboard]);

  useEffect(() => {
    shareCacheRef.current = { client: null, coach: null };
    setShareCache({ client: null, coach: null });
  }, [savingId]);

  const handleCopyLink = useCallback(async () => {
    try {
      setShareLoading(true);
      let shareUrl = window.location.origin;
      if (user && savingId) {
        shareUrl = `${window.location.origin}/share/${user.uid}/${savingId}`;
      }
      await navigator.clipboard.writeText(shareUrl);
      toast({ description: 'Public link copied' });
    } catch (error) {
      toast({ title: 'Copy failed', variant: 'destructive' });
    } finally {
      setShareLoading(false);
    }
  }, [user, savingId, toast]);

  const handleDownloadPdf = useCallback(async () => {
    const safeName = (formData.fullName || 'report').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    try {
      setShareLoading(true);
      const { blob } = await fetchReportPdfBlob(reportView);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeName}-${reportView}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast({ title: 'PDF downloaded' });
    } catch (error) {
      toast({ title: 'Download failed', variant: 'destructive' });
    } finally {
      setShareLoading(false);
    }
  }, [fetchReportPdfBlob, formData.fullName, reportView, toast]);

  const handleDownloadInteractiveHtml = useCallback(async () => {
    if (reportView !== 'client') return;
    try {
      setShareLoading(true);
      const htmlBlob = await generateInteractiveHtml({
        formData, scores, roadmap, bodyComp: generateBodyCompInterpretation(formData, scores) || undefined, view: 'client',
      });
      const url = URL.createObjectURL(htmlBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(formData.fullName || 'report').toLowerCase()}-interactive.html`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast({ title: 'HTML downloaded' });
    } catch (error) {
      toast({ title: 'Download failed', variant: 'destructive' });
    } finally {
      setShareLoading(false);
    }
  }, [formData, scores, roadmap, reportView, toast]);

  const isIntakeCompleted = useCallback(() => {
    const p0Sections = phaseDefinitions[0]?.sections ?? [];
    const p0Fields = p0Sections.flatMap(section => section.fields ?? []);
    if (p0Fields.length === 0) return false;
    return p0Fields.every(field => {
      const value = formData[field.id];
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null && value !== '';
    });
  }, [formData]);

  const isFieldVisible = useCallback((field: PhaseField, customData?: FormData) => {
    const data = customData || formData;
    if (!('conditional' in field) || !field.conditional || !field.conditional.showWhen) return true;
    const { showWhen } = field.conditional;
    const dependentValue = data[showWhen.field as keyof FormData];
    let ok = true;
    if (showWhen.exists !== undefined) {
      ok = ok && (dependentValue !== undefined && dependentValue !== null && String(dependentValue).trim() !== '');
    }
    if (showWhen.value !== undefined) ok = ok && dependentValue === showWhen.value;
    if (showWhen.notValue !== undefined) ok = ok && dependentValue !== showWhen.notValue;
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
  }, [formData]);

  const isSectionCompleted = useCallback((section: PhaseSection) => {
    const visibleFields = (section.fields as PhaseField[]).filter(f => isFieldVisible(f));
    if (visibleFields.length === 0) return true;

    const requiredFields = visibleFields.filter(f => f.required);
    
    // If there are required fields, they MUST all be filled
    if (requiredFields.length > 0) {
      return requiredFields.every(field => {
      const value = formData[field.id];
        if (Array.isArray(value)) return value.length > 0;
        return value !== undefined && value !== null && value !== '';
      });
    }

    // If there are NO required fields, at least ONE field must be filled to count as "completed"
    // This prevents empty sections from showing as checked immediately
    return visibleFields.some(field => {
      const value = formData[field.id];
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null && value !== '';
    });
  }, [formData, isFieldVisible]);

  const isPhaseCompleted = useCallback((phaseIdx: number) => {
    const phase = phaseDefinitions[phaseIdx];
    if (!phase) return false;
    const sections = phase.sections ?? [];
    if (sections.length === 0) return true;
    return (sections as PhaseSection[]).every(section => isSectionCompleted(section));
  }, [isSectionCompleted]);

  const maxUnlockedPhaseIdx = useMemo(() => {
    return totalPhases - 1;
  }, [totalPhases]);

  const anyAssessmentCompleted = useMemo(() => {
    const categories = ['inbodyScore', 'postureHeadOverall', 'pushupsOneMinuteReps', 'cardioTestSelected'];
    return categories.some((field) => {
      const val = formData[field as keyof FormData];
      return val !== '' && val !== undefined && val !== null;
    });
  }, [formData]);

  const allAssessmentsCompleted = useMemo(() => {
    const requiredFields = ['parqQuestionnaire', 'postureHeadOverall', 'pushupsOneMinuteReps', 'plankDurationSeconds', 'cardioTestSelected', 'clientGoals'];
    const basicsCompleted = requiredFields.every((field) => {
      const val = formData[field as keyof FormData] as unknown;
      if (Array.isArray(val)) return val.length > 0;
      return val !== '' && val !== undefined && val !== null;
    });

    if (!basicsCompleted) return false;

    const goals = Array.isArray(formData.clientGoals) ? formData.clientGoals : [];
    if (goals.includes('weight-loss') && !formData.goalLevelWeightLoss) return false;
    if (goals.includes('build-muscle') && !formData.goalLevelMuscle) return false;
    if (goals.includes('build-strength') && !formData.goalLevelStrength) return false;
    if (goals.includes('improve-fitness') && !formData.goalLevelFitness) return false;

    return true;
  }, [formData]);

  const canAutoAdvance = useMemo(() => 
    (!isReviewMode && !allAssessmentsCompleted) || isPartialAssessment, 
    [isReviewMode, allAssessmentsCompleted, isPartialAssessment]
  );

  const getAllSections = useCallback(() => {
    const sections: SectionType[] = [];
    if (activePhase.sections && activePhase.sections.length > 0) {
      sections.push(...(activePhase.sections as SectionType[]));
    }
    return sections;
  }, [activePhase]);

  useEffect(() => {
    const allSections = getAllSections();
    const newExpandedSections: Record<string, boolean> = {};
    allSections.forEach((section, index) => { newExpandedSections[section.id] = index === 0; });
    setExpandedSections(newExpandedSections);
  }, [activePhaseIdx, getAllSections]);

  useEffect(() => {
    if ((activePhase.sections?.length ?? 0) === 0 && activePhaseIdx < totalPhases - 1) {
      const timeout = setTimeout(() => {
        // Find next visible phase index
        const nextVisibleIdx = visiblePhases.findIndex((p, i) => i > activePhaseIdx);
        if (nextVisibleIdx !== -1) {
          setActivePhaseIdx(nextVisibleIdx);
        }
      }, 250);
      return () => clearTimeout(timeout);
    }
  }, [activePhase, activePhaseIdx, totalPhases, visiblePhases]);

  useEffect(() => {
    if (!canAutoAdvance) return;
    const p0FirstSectionId = visiblePhases[0]?.sections?.[0]?.id ?? 'phase0';
    if (activePhaseIdx === 0 && isIntakeCompleted() && !recentlyCompletedSections.has(p0FirstSectionId)) {
      setRecentlyCompletedSections(prev => new Set(prev).add(p0FirstSectionId));
      if (visiblePhases.length > 1) {
        setTimeout(() => setActivePhaseIdx(1), 1500);
      }
      return;
    }
    const allSections = getAllSections();
    const expandedSectionId = Object.keys(expandedSections).find(id => expandedSections[id]);
    if (!expandedSectionId) return;
    const currentSection = allSections.find(section => section.id === expandedSectionId);
    if (!currentSection) return;
    const currentSectionCompleted = isSectionCompleted(currentSection);
    const wasRecentlyCompleted = recentlyCompletedSections.has(expandedSectionId);
    if (currentSectionCompleted && !wasRecentlyCompleted) {
      if (currentSection.id === 'goals') return;
      setRecentlyCompletedSections(prev => new Set(prev).add(expandedSectionId));
      const currentIndex = allSections.findIndex(section => section.id === expandedSectionId);
      setTimeout(() => {
        if (currentIndex < allSections.length - 1) {
          const nextSection = allSections[currentIndex + 1];
          setExpandedSections({ [expandedSectionId]: false, [nextSection.id]: true });
        } else if (activePhaseIdx < totalPhases - 1) {
          // Find next visible phase
          const nextVisibleIdx = visiblePhases.findIndex((p, i) => i > activePhaseIdx);
          if (nextVisibleIdx !== -1) {
            setActivePhaseIdx(nextVisibleIdx);
          }
        }
      }, 1500);
    }
    if (currentSection.id === 'parq' && formData.parqQuestionnaire === 'completed' && !wasRecentlyCompleted) {
      setRecentlyCompletedSections(prev => new Set(prev).add('parq'));
        const currentIndex = allSections.findIndex(section => section.id === expandedSectionId);
      setTimeout(() => {
        if (currentIndex < allSections.length - 1) {
          const nextSection = allSections[currentIndex + 1];
          setExpandedSections({ [expandedSectionId]: false, [nextSection.id]: true });
        } else if (activePhaseIdx < totalPhases - 1) {
          const nextVisibleIdx = visiblePhases.findIndex((p, i) => i > activePhaseIdx);
          if (nextVisibleIdx !== -1) {
            setActivePhaseIdx(nextVisibleIdx);
          }
        }
      }, 1500);
    }
  }, [formData, expandedSections, activePhaseIdx, totalPhases, getAllSections, isIntakeCompleted, recentlyCompletedSections, isSectionCompleted, canAutoAdvance, visiblePhases]);

  useEffect(() => { setActiveFieldIdx(0); }, [activePhaseIdx, expandedSections]);

  const progressValue = useMemo(() => ((activePhaseIdx + 1) / totalPhases) * 100, [activePhaseIdx, totalPhases]);

  const handleViewResults = () => {
    // If we're already at the results phase, don't do anything
    if (activePhaseIdx === totalPhases - 1) return;
    
    // Attempt to save before showing results
    void handleSaveToDashboard();
    
    setIsReviewMode(false);
    setReportView('client');
    setActivePhaseIdx(totalPhases - 1);
    
    setTimeout(() => { 
      try { 
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
      } catch (_e) { 
        console.error('Scroll failed:', _e); 
      } 
    }, 100);

    toast({
      title: "Generating Reports",
      description: "Analyzing data and building your coaching strategy...",
    });
  };

  const handleStartNewAssessment = () => {
    setIsReviewMode(false);
    window.location.reload();
  };

  const runDemoSequential = useCallback(async () => {
    // Prevent multiple simultaneous runs
    if (isRunningDemoRef.current || isDemoAssessment) {
      console.warn('[DEMO] Auto-fill already in progress, skipping...');
      return;
    }
    
    isRunningDemoRef.current = true;
    setIsDemoAssessment(true);
    try {
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
        setExpandedSections(prev => ({ ...prev, [sec.id]: true }));
        await delay(400); // Reduced delay
        
        let fieldIdx = 0;
        let finishedSection = false;
        let loopSafety = 0;
        const maxLoops = 100; // Safety limit to prevent infinite loops
        
        while (!finishedSection && loopSafety < maxLoops) {
          loopSafety++;
          const sectionFields = sec.fields as PhaseField[];
          // Use payload for visibility check since we've already set all the data
          const visible = sectionFields.filter(f => isFieldVisible(f, payload as FormData));
          
          const steps: PhaseField[][] = [];
          const processedPairs = new Set<string>();
          visible.forEach(field => {
            if (field.pairId) {
              if (!processedPairs.has(field.pairId)) {
                const pair = visible.filter(f => f.pairId === field.pairId);
                steps.push(pair);
                processedPairs.add(field.pairId);
              }
            } else {
              steps.push([field]);
            }
          });

          if (steps.length === 0) {
            finishedSection = true;
            break;
          }
          
          if (fieldIdx >= steps.length) {
            finishedSection = true;
            break;
          }

          const currentStep = steps[fieldIdx];
          if (!currentStep || currentStep.length === 0) {
            fieldIdx++;
            await delay(200);
            continue;
          }
          
          setActiveFieldIdx(fieldIdx);
          
          // OPTIMIZATION: Batch all field updates for this step to reduce re-renders
          const fieldUpdates: Partial<FormData> = {};
          
          for (const f of currentStep) {
            const key = f.id;
            if (f.type === 'parq') {
              fieldUpdates[key] = 'completed' as any;
              continue;
            }
          
            // Get value from payload first (which we already set at the start)
            let raw: FieldValue = (payload as any)[key];
            
            // If not in payload, check current formData
            if (raw === undefined || raw === null) {
              raw = (formData as any)[key];
            }
            
            // Check if value is empty (handle empty strings, null, undefined, empty arrays)
            const isEmpty = raw === null || raw === undefined || raw === '' || 
                           (Array.isArray(raw) && raw.length === 0);
            
            if (isEmpty) {
              if (f.type === 'multiselect') {
                raw = f.options?.slice(0, 1).map(o => o.value) || [];
              } else if (f.type === 'select') {
                raw = f.options?.[0]?.value || '';
              } else {
                raw = f.type === 'number' ? '0' : 'OK';
              }
            }
            
            if (raw !== undefined && raw !== null) {
              fieldUpdates[key] = raw as any;
            }
          }
          
          // OPTIMIZATION: Update all fields in this step at once (single re-render)
          if (Object.keys(fieldUpdates).length > 0) {
            updateFormData(fieldUpdates);
            // Yield to browser to prevent blocking
            await new Promise(resolve => requestAnimationFrame(resolve));
            await delay(200); // Reduced delay since we're batching
          }
          
          await delay(400); // Reduced delay between steps
          fieldIdx++;
        }
        
        setRecentlyCompletedSections(prev => new Set(prev).add(sec.id));
        await delay(300); // Reduced delay
      }
    }
    
      await delay(500); // Reduced final delay
      setIsReviewMode(true);
      setIsDemoAssessment(false);
      isRunningDemoRef.current = false; // Reset flag
      toast({ title: "Demo data populated", description: "Review the goals and click 'Generate Full Report'." });
    } catch (error) {
      console.error('[DEMO] Auto-fill error:', error);
      setIsDemoAssessment(false);
      isRunningDemoRef.current = false; // Reset flag on error
      toast({ 
        title: "Auto-fill failed", 
        description: "An error occurred while filling the form. Please try again.", 
        variant: "destructive" 
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoAssessment]); // Minimal dependencies to prevent re-creation

  useEffect(() => {
    if (demoTrigger && demoTrigger > 0) {
      // Prevent multiple simultaneous runs
      if (isDemoAssessment) return;
      void runDemoSequential();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoTrigger]); // Only depend on demoTrigger, not runDemoSequential

  const toggleSection = (sectionId: string) => {
    setIsReviewMode(true);
    const phaseIdx = phaseDefinitions.findIndex(p => p.sections?.some(s => s.id === sectionId));
    if (phaseIdx !== -1) {
      setActivePhaseIdx(phaseIdx);
    }
    setExpandedSections({ [sectionId]: true });
    setActiveFieldIdx(0);
    setSidebarOpen(false); 
  };

  const renderAllSections = () => {
    if (activePhase?.id === 'P7') return null;
    const allSections = getAllSections();
    if (allSections.length === 0) return null;
    const expandedSectionId = Object.keys(expandedSections).find(id => expandedSections[id]);
    const activeSection = allSections.find(s => s.id === expandedSectionId) || allSections[0];
    if (!activeSection) return null;
    return (
      <SingleFieldFlow 
        key={activeSection.id}
        section={activeSection} 
        activeFieldIdx={activeFieldIdx}
        setActiveFieldIdx={setActiveFieldIdx}
        onShowCamera={(mode) => {
          setShowCamera(mode);
          if (mode === 'posture') setPostureStep(0);
        }}
        onShowPostureCompanion={() => setShowPostureCompanion(true)}
        onShowInBodyCompanion={() => setShowInBodyCompanion(true)}
        onComplete={() => {
          const currentIndex = allSections.findIndex(s => s.id === activeSection.id);
          if (currentIndex < allSections.length - 1) {
            setExpandedSections({ [allSections[currentIndex + 1].id]: true });
          } else if (activePhaseIdx < totalPhases - 1) {
            if (isPartialAssessment) {
              handleViewResults();
            } else {
              // Find next visible phase
              const nextVisibleIdx = visiblePhases.findIndex((p, i) => i > activePhaseIdx);
              if (nextVisibleIdx !== -1) {
                setActivePhaseIdx(nextVisibleIdx);
              }
            }
          }
        }}
      />
    );
  };

  if (totalPhases === 0) return <div className="text-center py-20">No phases configured.</div>;

    return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-64px)] relative">
      <aside className={`w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white p-6 shrink-0 lg:sticky top-[64px] z-30 overflow-y-auto max-h-[calc(100vh-64px)] ${sidebarOpen ? 'block fixed inset-0 z-50 pt-20' : 'hidden lg:block'}`}>
        <div className="space-y-8">
          <div className="flex items-center justify-between lg:hidden mb-8">
            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Navigation</h3>
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="h-10 w-10 rounded-full bg-slate-100">
              <X className="h-5 w-5 text-slate-600" />
            </Button>
          </div>
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Assessment Phases</h3>
            <Progress value={progressValue} className="h-1" />
            <p className="text-[10px] font-medium text-slate-500 text-right">{Math.round(progressValue)}% Complete</p>
          </div>
          <nav className="space-y-4">
            {visiblePhases.map((phase, idx) => {
              const isActive = idx === activePhaseIdx;
              const isResultsPhase = phase.id === 'P7';
              
              // Check if at least one non-Results phase is completed
              const hasAnyCompletedPhase = visiblePhases.some((p, i) => 
                i !== idx && p.id !== 'P7' && isPhaseCompleted(i)
              );
              
              // Results phase is only completed/active if at least one other phase is completed
              const isCompleted = isResultsPhase 
                ? false // Never show Results as completed (no checkmark)
                : (isPhaseCompleted(idx) && idx <= maxUnlockedPhaseIdx);
              
              // Results phase is disabled until at least one phase is completed
              const isDisabled = isResultsPhase 
                ? !hasAnyCompletedPhase 
                : (idx > maxUnlockedPhaseIdx);
              
              const sections = phase.sections || [];

              return (
                <div key={phase.id} className="space-y-1">
                <button
                    onClick={() => { 
                      if (!isDisabled) { 
                        setIsReviewMode(true); 
                        setActivePhaseIdx(idx); 
                        if (sections.length > 0) {
                          setExpandedSections({ [sections[0].id]: true });
                          setActiveFieldIdx(0);
                        }
                        if (sections.length === 0 || isMobile) setSidebarOpen(false);
                      } 
                    }}
                  disabled={isDisabled}
                    className={`group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all ${isActive ? 'bg-slate-900 text-white shadow-md' : isCompleted ? 'text-indigo-600 hover:bg-indigo-50' : isDisabled ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold border ${isActive ? 'bg-white/20 border-white/20' : isCompleted ? 'bg-indigo-600 border-indigo-600 text-white' : isDisabled ? 'bg-slate-100 border-slate-200 text-slate-300' : 'bg-white border-slate-200 text-slate-400'}`}>
                    {isCompleted ? <Check className="h-3 w-3" /> : idx + 1}
                  </span>
                    <span className="truncate flex-1 text-left uppercase tracking-wider">{phase.title}</span>
                  </button>

                  {isActive && sections.length > 0 && (
                    <div className="ml-9 space-y-1 pt-1 border-l border-slate-100 pl-4 animate-in slide-in-from-top-2 duration-300">
                      {sections.map(sec => {
                        const isExpanded = expandedSections[sec.id];
                        const isSecComp = isSectionCompleted(sec as PhaseSection);
                        return (
                          <button
                            key={sec.id}
                            onClick={() => toggleSection(sec.id)}
                            className={`flex w-full items-center justify-between py-2 text-xs font-medium transition-colors ${isExpanded ? 'text-indigo-600' : isSecComp ? 'text-slate-700' : 'text-slate-400'} hover:text-indigo-500`}
                          >
                            <span className="truncate">{sec.title}</span>
                            {isSecComp && <Check className="h-3 w-3 text-emerald-500" />}
                </button>
              );
            })}
              </div>
                  )}
            </div>
              );
            })}
          </nav>
        </div>
      </aside>

      <main className="flex-1 bg-slate-50/50 p-6 lg:p-10 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-8">
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{activePhase.id}</span>
              <div className="h-px w-8 bg-indigo-200"></div>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">{activePhase.title}</h2>
            <p className="text-slate-500 text-lg leading-relaxed max-w-2xl">{activePhase.summary}</p>
          </section>

          <section className="space-y-6">
            {renderAllSections()}
            
            {/* Show "Generate Full Report" only when everything is truly finished */}
            {activePhaseIdx >= 1 && activePhaseIdx < totalPhases - 1 && allAssessmentsCompleted && (
              <div className="flex items-center justify-center border-t border-slate-200 pt-8">
                <Button onClick={handleViewResults} className="h-14 px-10 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-xl transition-all hover:scale-[1.05]">
                  📊 Generate Full Report
                </Button>
              </div>
            )}

            {/* NEW: Show "Preview Results" for testing/partial data */}
            {activePhaseIdx >= 1 && activePhaseIdx < totalPhases - 1 && !allAssessmentsCompleted && anyAssessmentCompleted && (
              <div className="flex items-center justify-center border-t border-slate-200 pt-8">
                <Button variant="outline" onClick={handleViewResults} className="h-14 px-10 rounded-2xl border-indigo-200 text-indigo-600 font-bold hover:bg-indigo-50 transition-all">
                  🔍 Preview Partial Results
                </Button>
              </div>
            )}

            {activePhase?.id === 'P7' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
                    <button onClick={() => setReportView('client')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${reportView === 'client' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Client Report</button>
                    <button onClick={() => setReportView('coach')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${reportView === 'coach' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Coach Plan</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="outline" size="lg" className="rounded-xl px-4 h-12"><Share2 className="mr-2 h-4 w-4" />Share</Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 rounded-xl">
                        <DropdownMenuItem onClick={handleShare} className="py-3">System Share</DropdownMenuItem>
                        <DropdownMenuItem onClick={handleEmailLink} className="py-3">Email PDF Link</DropdownMenuItem>
                        <DropdownMenuItem onClick={handleWhatsAppShare} className="py-3">WhatsApp Message</DropdownMenuItem>
                        <DropdownMenuItem onClick={handleCopyLink} className="py-3">Copy Report Link</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="outline" size="lg" className="rounded-xl px-4 h-12"><Download className="mr-2 h-4 w-4" />Export</Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 rounded-xl">
                        <DropdownMenuItem onClick={handleDownloadPdf} className="py-3">Download as PDF</DropdownMenuItem>
                        {reportView === 'client' && <DropdownMenuItem onClick={handleDownloadInteractiveHtml} className="py-3">Download Interactive HTML</DropdownMenuItem>}
                        <DropdownMenuItem onClick={handlePrint} className="py-3">Print Report</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="ghost" size="lg" onClick={handleStartNewAssessment} className="rounded-xl h-12">🔄 New Client</Button>
                  </div>
                </div>
                <div ref={reportRef} data-pdf-target className="rounded-3xl border border-slate-200 bg-white p-10 shadow-2xl shadow-slate-200/50" style={{ minWidth: '100%', maxWidth: '100%', overflow: 'visible' }}>
                  {reportView === 'client' ? (
                    <ClientReport scores={scores} roadmap={roadmap} goals={Array.isArray(formData.clientGoals) ? formData.clientGoals : []} bodyComp={bodyCompInterp ? { timeframeWeeks: bodyCompInterp.timeframeWeeks } : undefined} formData={formData} plan={plan} />
                  ) : (
                    <CoachReport plan={plan} scores={scores} bodyComp={bodyCompInterp} formData={formData} />
                  )}
                </div>
              </div>
            )}
          </section>
          <footer className="pt-12 pb-8 text-center text-[10px] font-bold uppercase tracking-widest text-slate-300">One Fitness Professional v2.1 • Confidential Client Data</footer>
        </div>
      </main>

      {/* Camera Capture Modal */}
      {showCamera && (
        <CameraCapture 
          mode={showCamera} 
          onCapture={handleCapture}
          onClose={() => setShowCamera(false)}
          overlayText={showCamera === 'posture' ? `Capture ${['FRONT', 'RIGHT SIDE', 'LEFT SIDE', 'BACK'][postureStep]} View` : undefined}
        />
      )}

      {/* Posture Companion Modal */}
      <PostureCompanionModal 
        isOpen={showPostureCompanion}
        onClose={() => setShowPostureCompanion(false)}
        onStartDirectScan={() => {
          setShowCamera('posture');
          setPostureStep(0);
        }}
        onComplete={(data) => {
          updateFormData(data);
          toast({ title: "Posture data applied", description: "AI findings have been populated." });
        }}
      />

      {/* InBody Companion Modal */}
      <InBodyCompanionModal 
        isOpen={showInBodyCompanion}
        onClose={() => setShowInBodyCompanion(false)}
        onStartDirectScan={() => {
          setShowCamera('ocr');
        }}
        onComplete={(data) => {
          setOcrReviewData(data);
          toast({ title: "InBody data applied", description: "All fields have been populated." });
        }}
      />

      {/* OCR Processing Overlay */}
      {isProcessingOcr && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-8 text-white">
          <div className="flex flex-col items-center gap-8 max-w-xs text-center">
            <div className="relative h-32 w-32">
              <div className="absolute inset-0 rounded-full border-4 border-white/5" />
              <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin" />
              <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 animate-pulse flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-white animate-spin" />
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-xl font-black uppercase tracking-widest text-white">Gemini AI</h4>
              <p className="text-white/50 text-sm font-medium leading-relaxed">
                Extracting 15+ data points from your scan...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* OCR Review Dialog */}
      <Dialog open={!!ocrReviewData} onOpenChange={() => setOcrReviewData(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5 text-indigo-600" />
              Review Extracted Data
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-slate-500">
              We've found the following values in your scan. Please verify them before applying to the form.
            </p>
            <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto p-2">
              {ocrReviewData && [
                'inbodyScore',
                'inbodyWeightKg',
                'skeletalMuscleMassKg',
                'bodyFatMassKg',
                'inbodyBodyFatPct',
                'inbodyBmi',
                'totalBodyWaterL',
                'waistHipRatio',
                'visceralFatLevel',
                'bmrKcal',
                'segmentalTrunkKg',
                'segmentalArmLeftKg',
                'segmentalArmRightKg',
                'segmentalLegLeftKg',
                'segmentalLegRightKg'
              ].map(key => {
                const value = ocrReviewData[key as keyof typeof ocrReviewData] ?? '';
                return (
                  <div key={key} className={`bg-slate-50 p-4 rounded-2xl border transition-all flex flex-col justify-between ${!value ? 'border-amber-200 bg-amber-50/30' : 'border-slate-100'}`}>
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500/70 mb-2">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </span>
                    <div className="flex items-baseline gap-1">
                      <Input 
                        type="text" 
                        value={value as string} 
                        placeholder="--"
                        onChange={(e) => {
                          setOcrReviewData(prev => ({
                            ...prev,
                            [key]: e.target.value
                          }));
                        }}
                        className="h-8 text-xl font-black text-slate-900 border-none bg-transparent p-0 focus-visible:ring-0 shadow-none w-full placeholder:text-slate-300"
                      />
                      <span className="text-[10px] font-bold text-slate-400">
                        {key.toLowerCase().includes('kg') ? 'kg' : key.toLowerCase().includes('pct') ? '%' : key.toLowerCase().includes('water') ? 'L' : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOcrReviewData(null)} className="rounded-xl font-bold">
              Cancel
            </Button>
            <Button onClick={applyOcrData} className="rounded-xl bg-slate-900 font-bold gap-2 text-white hover:bg-slate-800 transition-colors">
              <CheckCircle2 className="h-4 w-4" />
              Apply to Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

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

