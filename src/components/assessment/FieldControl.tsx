import React, { useMemo, useState, useEffect } from 'react';
import { useFormContext, type FormData } from '@/contexts/FormContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Check, Info, Smartphone, Camera as CameraIcon, CheckCircle2, Star } from 'lucide-react';
import { type PhaseField } from '@/lib/phaseConfig';
import { useIsMobile } from '@/hooks/use-mobile';
import ParQQuestionnaire from '../ParQQuestionnaire';
import { getBodyFatRange } from '@/lib/utils/bodyRecomposition';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  // Local state for text-based inputs to prevent global re-renders on every keystroke
  const [localValue, setLocalValue] = useState<FieldValue>((formData[field.id] as FieldValue) || '');

  // Sync local state when global state changes (e.g. from Demo auto-fill)
  useEffect(() => {
    setLocalValue((formData[field.id] as FieldValue) || '');
  }, [formData, field.id]);

  // Generate dynamic options with recommended tags and subtitles
  const fieldOptions = useMemo(() => {
    const history = formData.trainingHistory || 'beginner';
    const gender = (formData.gender || 'male').toLowerCase() as 'male' | 'female';
    const weightKg = parseFloat(formData.inbodyWeightKg || '0');
    const bf = parseFloat(formData.inbodyBodyFatPct || '0');

    if (field.id === 'goalLevelBodyRecomp') {
      const isBeginner = history === 'beginner';
      const isAdvanced = history === 'advanced';
      
      return [
        { 
          value: 'healthy', 
          label: `Healthy / Soft (${getBodyFatRange('healthy', gender)[0]}-${getBodyFatRange('healthy', gender)[1]}%)`,
          subtitle: isBeginner ? 'Great entry point for your level.' : undefined
        },
        { 
          value: 'fit', 
          label: `Fit (${getBodyFatRange('fit', gender)[0]}-${getBodyFatRange('fit', gender)[1]}%)` 
        },
        { 
          value: 'athletic', 
          label: `Athletic (${getBodyFatRange('athletic', gender)[0]}-${getBodyFatRange('athletic', gender)[1]}%)`,
          isRecommended: isBeginner,
          tag: isBeginner ? 'Recommended' : undefined,
          subtitle: isBeginner ? 'The "Holy Grail": Build muscle and lose fat simultaneously.' : undefined
        },
        { 
          value: 'shredded', 
          label: `Shredded (<${getBodyFatRange('shredded', gender)[1]}%)`,
          subtitle: isAdvanced ? 'Not Recommended: Switch to distinct phases instead.' : undefined
        },
      ];
    }

    if (field.id === 'goalLevelMuscle') {
      return [
        { 
          value: '2', 
          label: '2 kg', 
          isRecommended: history === 'advanced',
          tag: history === 'advanced' ? 'Best Fit' : undefined,
          subtitle: 'Realistic for Advanced Lifters focusing on weak points.' 
        },
        { 
          value: '4', 
          label: '4 kg', 
          isRecommended: history === 'intermediate',
          tag: history === 'intermediate' ? 'Best Fit' : undefined,
          subtitle: 'A solid year of gains for an Intermediate lifter.' 
        },
        { 
          value: '6', 
          label: '6 kg', 
          isRecommended: history === 'beginner',
          tag: history === 'beginner' ? 'Recommended' : undefined,
          subtitle: 'Maximize Newbie Gains. Great for beginners.' 
        },
        { 
          value: '8', 
          label: '8 kg', 
          subtitle: 'Ambitious transformation. Best for Beginners.' 
        },
      ];
    }

    if (field.id === 'goalLevelWeightLoss') {
      const isHighBF = (gender === 'male' && bf > 25) || (gender === 'female' && bf > 32);
      const isLean = (gender === 'male' && bf < 15) || (gender === 'female' && bf < 22);
      const recommendedLossPct = 0.08; // 8% sweet spot
      const recommendedKg = weightKg * recommendedLossPct;

      if (isHighBF) {
        return [
          { value: '5kg', label: '5 kg', subtitle: 'Initial momentum phase.' },
          { value: '10kg', label: '10 kg', isRecommended: recommendedKg >= 7.5 && recommendedKg < 12.5, tag: 'Recommended', subtitle: 'Metabolic Reset. Significant health impact.' },
          { value: '15kg', label: '15 kg', isRecommended: recommendedKg >= 12.5, tag: 'Recommended', subtitle: 'Aggressive transformation for high body fat.' },
          { value: '20kg', label: '20 kg', subtitle: 'Long-term metabolic overhaul.' },
        ];
      } else if (isLean) {
        return [
          { value: '2kg', label: '2 kg', isRecommended: true, tag: 'Recommended', subtitle: 'Mini-cut. Sharpens definition while preserving muscle.' },
          { value: '3kg', label: '3 kg', subtitle: 'Focused detail work.' },
          { value: '4kg', label: '4 kg', subtitle: 'Significant shredding phase.' },
          { value: '5kg', label: '5 kg', subtitle: 'Maximum safe loss for lean individuals.' },
        ];
      }
      // Default options if BF unknown or moderate
      return field.options;
    }

    if (field.id === 'goalLevelStrength') {
      const isMale = gender === 'male';

      if (history === 'beginner') {
        return [
          { value: 'technique-mastery', label: 'Master Technique', isRecommended: true, tag: 'Recommended', subtitle: 'Learn to Squat, Bench, and Deadlift safely.' },
          { value: 'linear-progression', label: 'Linear Progression', subtitle: 'Add weight to the bar every session.' },
          { value: 'bodyweight-basics', label: 'Bodyweight Basics', subtitle: isMale ? 'First strict pushup and pullup.' : 'First strict pushup and bodyweight row.' },
          { value: 'core-foundation', label: 'Core Foundation', subtitle: 'Build stability and protect the lower back.' },
        ];
      } else if (history === 'intermediate') {
        return isMale ? [
          { value: '1x-bw-bench', label: '1.0x BW Bench Press', subtitle: 'The gym benchmark for upper body strength.' },
          { value: '1.5x-bw-squat', label: '1.5x BW Squat', isRecommended: true, tag: 'Recommended', subtitle: 'Strong foundation for legs and core.' },
          { value: '1.5x-bw-deadlift', label: '1.5x BW Deadlift', subtitle: 'Solid posterior chain mechanics.' },
          { value: 'pullup-mastery', label: '10 Strict Pull-ups', subtitle: 'Excellent relative strength.' },
        ] : [
          { value: '0.75x-bw-bench', label: '0.75x BW Bench Press', subtitle: 'Strong upper body foundation.' },
          { value: '1x-bw-squat', label: '1.0x BW Squat', isRecommended: true, tag: 'Recommended', subtitle: 'Athletic benchmark for lower body.' },
          { value: '1.25x-bw-deadlift', label: '1.25x BW Deadlift', subtitle: 'Solid posterior chain mechanics.' },
          { value: 'pushup-mastery', label: '10 Strict Pushups', subtitle: 'Excellent relative strength.' },
        ];
      } else if (history === 'advanced') {
        return isMale ? [
          { value: '2x-bw-deadlift', label: '2.0x BW Deadlift', isRecommended: true, tag: 'Recommended', subtitle: 'Gold standard for posterior chain strength.' },
          { value: '1.75x-bw-squat', label: '1.75x BW Squat', subtitle: 'Elite lower body development.' },
          { value: '1.5x-bw-bench', label: '1.5x BW Bench Press', subtitle: 'Exceptional upper body power.' },
          { value: 'powerlifting-total', label: 'Maximize Total', subtitle: 'Focus on SBD (Squat/Bench/Deadlift) total.' },
        ] : [
          { value: '1.5x-bw-deadlift', label: '1.75x BW Deadlift', isRecommended: true, tag: 'Recommended', subtitle: 'Elite standard for posterior chain strength.' },
          { value: '1.5x-bw-squat', label: '1.5x BW Squat', subtitle: 'Elite lower body development.' },
          { value: '1x-bw-bench', label: '1.0x BW Bench Press', subtitle: 'Exceptional upper body power.' },
          { value: 'chinup-mastery', label: '3 Strict Pull-ups', subtitle: 'Elite relative strength.' },
        ];
      }
    }

    return field.options;
  }, [field.id, field.options, formData.gender, formData.trainingHistory, formData.inbodyWeightKg, formData.inbodyBodyFatPct]);

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

    // Advanced Lifter Warning for Muscle Gain
    if (field.id === 'goalLevelMuscle' && formData.trainingHistory === 'advanced') {
      const muscleVal = parseFloat(value as string);
      if (muscleVal >= 6) {
        toast({
          title: "Ambitious Goal Detected",
          description: `For an advanced lifter, ${muscleVal}kg of lean tissue is a multi-year project. We will break this down into smaller 12-week blocks for you.`,
          duration: 6000,
        });
      }
    }

    // Advanced Lifter Advice for Body Recomp
    if (field.id === 'clientGoals' && Array.isArray(value) && value.includes('body-recomposition') && formData.trainingHistory === 'advanced') {
      toast({
        title: "Recommendation for Advanced Lifters",
        description: "At your level, chasing both goals often results in achieving neither. We recommend a distinct 'Build' phase followed by a 'Cut' phase.",
        duration: 6000,
      });
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
            {fieldOptions?.map((option, idx) => {
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
            value={(localValue as string) ?? ''}
            onChange={(event) => setLocalValue(event.target.value)}
            onBlur={() => handleChange(localValue)}
            rows={4}
            className="mt-2 rounded-xl border-slate-200 focus:ring-primary"
          />
        );
      case 'select':
        // Always use a touch-optimized button grid for select fields
          return (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fieldOptions?.map((option, idx) => {
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
                      className={`flex min-h-[64px] h-auto w-full items-center gap-4 rounded-2xl border-2 px-5 py-3 text-left transition-all relative overflow-hidden ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-white shadow-lg scale-[1.02]'
                          : `bg-white text-slate-600 ${colorClass}`
                      }`}
                      aria-label={option.label}
                    >
                      {option.tag && (
                        <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[9px] font-black uppercase tracking-widest ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-900 text-white'
                        }`}>
                          {option.tag}
                        </div>
                      )}
                      
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                        isSelected ? 'bg-white/20 border-white/20 text-white' : 'border-slate-200 bg-white'
                      }`}>
                        {isSelected && <Check className="h-4 w-4 stroke-[3]" />}
                      </div>
                      
                      <div className="flex flex-col py-1">
                        <span className="font-bold text-sm leading-tight mb-0.5">{option.label}</span>
                        {option.subtitle && (
                          <span className={`text-[10px] font-medium leading-relaxed ${
                            isSelected ? 'text-white/70' : 'text-slate-500'
                          }`}>
                            {option.subtitle}
                          </span>
                        )}
                      </div>
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
            {fieldOptions?.map((opt, idx) => {
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
                    className={`flex min-h-[64px] h-auto items-center gap-4 rounded-2xl border-2 px-5 py-3 text-left transition-all relative overflow-hidden ${
                      isActive
                      ? 'border-slate-900 bg-slate-900 text-white shadow-lg scale-[1.02]'
                      : `bg-white text-slate-600 ${colorClass}`
                    }`}
                    aria-pressed={isActive}
                    aria-label={opt.label}
                  >
                    {opt.tag && (
                      <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[9px] font-black uppercase tracking-widest ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-900 text-white'
                      }`}>
                        {opt.tag}
                      </div>
                    )}

                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors ${
                      isActive ? 'bg-white/20 border-white/20 text-white' : 'border-slate-200 bg-white'
                    }`}>
                      {isActive ? (
                        <Check className="h-4 w-4 stroke-[4]" />
                      ) : (
                        <div className="h-2 w-2 rounded-sm bg-slate-100 opacity-0 group-hover:opacity-100" />
                      )}
                    </div>

                    <div className="flex flex-col py-1">
                      <span className="font-bold text-sm leading-tight mb-0.5">{opt.label}</span>
                      {opt.subtitle && (
                        <span className={`text-[10px] font-medium leading-relaxed ${
                          isActive ? 'text-white/70' : 'text-slate-500'
                        }`}>
                          {opt.subtitle}
                        </span>
                      )}
                    </div>
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
            value={(localValue as string) ?? ''}
            onChange={(event) => setLocalValue(event.target.value)}
            onBlur={() => handleChange(localValue)}
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
            value={(localValue as string) ?? ''}
            onChange={(event) => setLocalValue(event.target.value)}
            onBlur={() => handleChange(localValue)}
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
            value={(localValue as string) ?? ''}
            onChange={(event) => setLocalValue(event.target.value)}
            onBlur={() => handleChange(localValue)}
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
            value={(localValue as string) ?? ''}
            onChange={(event) => setLocalValue(event.target.value)}
            onBlur={() => handleChange(localValue)}
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
            value={(localValue as string) ?? ''}
            onChange={(event) => setLocalValue(event.target.value)}
            onBlur={() => handleChange(localValue)}
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

