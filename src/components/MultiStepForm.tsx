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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { phaseDefinitions, type PhaseField, type PhaseSection } from '@/lib/phaseConfig';
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
  onComplete 
}: { 
  section: SectionType; 
  activeFieldIdx: number;
  setActiveFieldIdx: (idx: number | ((prev: number) => number)) => void;
  onComplete: () => void;
}) => {
  const { formData } = useFormContext();

  // Filter visible fields and group paired ones
  const steps = useMemo(() => {
    const visible = (section.fields as PhaseField[]).filter(field => {
      if (!('conditional' in field) || !field.conditional || !field.conditional.showWhen) return true;
      const { showWhen } = field.conditional;
      const dependentValue = formData[showWhen.field as keyof FormData];
      let ok = true;
      if (showWhen.exists !== undefined) {
        ok = ok && (dependentValue !== undefined && dependentValue !== null && String(dependentValue).trim() !== '');
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
          {!isParqField && <span>{activeFieldIdx + 1} of {steps.length}</span>}
        </div>
        {!isParqField && <Progress value={((activeFieldIdx + 1) / steps.length) * 100} className="h-1" />}
      </div>

      <div className="bg-white rounded-3xl p-8 lg:p-10 shadow-xl shadow-indigo-100/20 border border-indigo-50 min-h-[400px] flex flex-col justify-center relative">
        {movementPattern && (
          <div className="mb-6 flex items-center justify-between">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-100">
              {movementPattern}
            </span>
            
            {coachNotes && (
              <div className="flex items-center gap-2 text-indigo-400">
                <Info className="h-3 w-3" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Coach Instruction</span>
              </div>
            )}
          </div>
        )}

        {coachNotes && (
          <div className="mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100 italic text-sm text-slate-600">
            {coachNotes}
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
              <FieldControl field={field} />
            </div>
          ))}
        </div>
        
        {!isParqField && (
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

const FieldControl = ({ field }: { field: PhaseField }) => {
  const { formData, updateFormData } = useFormContext();

  // Check conditional logic
  const shouldShow = () => {
    if (!('conditional' in field) || !field.conditional || !field.conditional.showWhen) return true;

    const { showWhen } = field.conditional;
    const dependentValue = formData[showWhen.field as keyof FormData];
    let ok = true;
    if (showWhen.exists !== undefined) {
      ok = ok && (dependentValue !== undefined && dependentValue !== null && String(dependentValue).trim() !== '');
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
    updateFormData({ [field.id]: value } as Partial<FormData>);
  };

  const renderLabel = () => (
    <div className="flex items-start justify-between gap-4 mb-2">
      <div className="flex flex-col flex-1">
        <label className={labelTextClasses}>{field.label}</label>
        {field.description && <p className={supportTextClasses}>{field.description}</p>}
      </div>
      {field.tooltip && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="mt-0.5 h-8 w-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
              aria-label={`More information about ${field.label}`}
            >
              <Info className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs p-4 rounded-xl shadow-xl border-slate-200">
            <p className="text-sm leading-relaxed text-slate-600">{field.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );

  const renderInput = () => {
    const value = formData[field.id];
    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
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
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleChange(option.value)}
                  className={`flex h-11 items-center gap-3 rounded-xl border-2 px-4 text-left transition-all ${
                    isSelected
                      ? 'border-slate-900 bg-slate-900 text-white shadow-lg scale-[1.02]'
                      : `bg-white text-slate-600 ${colorClass}`
                  }`}
                >
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    isSelected ? 'bg-white/20 border-white/20 text-white' : 'border-slate-200 bg-white'
                  }`}>
                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                  <span className="font-bold text-xs leading-tight">{option.label}</span>
                </button>
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
                  className={`flex h-11 items-center gap-3 rounded-xl border-2 px-4 text-left transition-all ${
                    isActive
                      ? 'border-slate-900 bg-slate-900 text-white shadow-lg scale-[1.02]'
                      : `bg-white text-slate-600 ${colorClass}`
                  }`}
                  aria-pressed={isActive}
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

const PhaseFormContent = ({ demoTrigger }: { demoTrigger?: number }) => {
  const { formData, updateFormData } = useFormContext();
  const { settings } = useSettings();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activePhaseIdx, setActivePhaseIdx] = useState(0);
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

  const totalPhases = phaseDefinitions.length;
  const activePhase = useMemo(() => {
    return phaseDefinitions[activePhaseIdx] || {
      id: 'empty',
      title: 'No Phases Available',
      summary: 'Phase definitions are currently being loaded or configured.',
      sections: []
    };
  }, [activePhaseIdx]);

  // Precompute reports data when needed
  const scores = useMemo(() => {
    try {
      return computeScores(formData);
    } catch (e) {
      console.error('Error computing scores:', e);
      return { overall: 0, categories: [] };
    }
  }, [formData]);

  const roadmap = useMemo(() => {
    try {
      return buildRoadmap(scores);
    } catch (e) {
      console.error('Error building roadmap:', e);
      return [];
    }
  }, [scores]);

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
  }, [ensureShareArtifacts, user, savingId, reportView]);

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
      let shareUrl = window.location.href;
      if (user && savingId) {
        try {
          const artifacts = await ensureShareArtifacts(reportView);
          shareUrl = artifacts.shareUrl;
        } catch (e) {}
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

  const handleSaveToDashboard = useCallback(async () => {
    if (!user || saving || savingId) return;
    try {
      setSaving(true);
      const id = await saveCoachAssessment(user.uid, user.email, formData, scores.overall);
      setSavingId(id);
    } catch (e) {
      console.error('Save failed', e);
    } finally {
      setSaving(false);
    }
  }, [user, saving, savingId, formData, scores.overall]);

  useEffect(() => {
    if (activePhase?.id === 'P7' && user && !savingId && !saving && !isDemoAssessment) {
      void handleSaveToDashboard();
    }
  }, [activePhase?.id, user, savingId, saving, isDemoAssessment, handleSaveToDashboard]);

  useEffect(() => {
    shareCacheRef.current = { client: null, coach: null };
    setShareCache({ client: null, coach: null });
  }, [savingId]);

  const handleCopyLink = useCallback(async () => {
    try {
      setShareLoading(true);
      let shareUrl = window.location.href;
      if (user && savingId) {
        try {
          const artifacts = await ensureShareArtifacts(reportView);
          shareUrl = artifacts.shareUrl;
        } catch (e) {}
      }
      await navigator.clipboard.writeText(shareUrl);
      toast({ description: 'Link copied' });
    } catch (error) {
      toast({ title: 'Copy failed', variant: 'destructive' });
    } finally {
      setShareLoading(false);
    }
  }, [ensureShareArtifacts, reportView, toast, user, savingId]);

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
        formData, scores, roadmap, bodyComp: generateBodyCompInterpretation(formData) || undefined, view: 'client',
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

  const isFieldVisible = useCallback((field: PhaseField) => {
    if (!('conditional' in field) || !field.conditional || !field.conditional.showWhen) return true;
    const { showWhen } = field.conditional;
    const dependentValue = formData[showWhen.field as keyof FormData];
    let ok = true;
    if (showWhen.exists !== undefined) {
      ok = ok && (dependentValue !== undefined && dependentValue !== null && String(dependentValue).trim() !== '');
    }
    if (showWhen.value !== undefined) ok = ok && dependentValue === showWhen.value;
    if (showWhen.notValue !== undefined) ok = ok && dependentValue !== showWhen.notValue;
    if (showWhen.includes !== undefined) {
      if (Array.isArray(dependentValue)) ok = ok && (dependentValue as string[]).includes(showWhen.includes);
      else ok = false;
    }
    return ok;
  }, [formData]);

  const isSectionCompleted = useCallback((section: PhaseSection) => {
    return (section.fields as PhaseField[]).every(field => {
      if (!isFieldVisible(field)) return true;
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
    return (sections as PhaseSection[]).every(section =>
      (section.fields as PhaseField[]).every(field => {
        if (!isFieldVisible(field)) return true;
        const value = formData[field.id];
        if (Array.isArray(value)) return value.length > 0;
        return value !== undefined && value !== null && value !== '';
      })
    );
  }, [formData, isFieldVisible]);

  const maxUnlockedPhaseIdx = useMemo(() => {
    let idx = 0;
    while (idx < totalPhases - 1 && isPhaseCompleted(idx)) idx += 1;
    return idx;
  }, [totalPhases, isPhaseCompleted]);

  const allAssessmentsCompleted = useMemo(() => {
    const requiredFields = ['parqQuestionnaire', 'postureHeadOverall', 'pushupsOneMinuteReps', 'plankDurationSeconds', 'cardioTestSelected', 'clientGoals'];
    return requiredFields.every((field) => {
      const val = formData[field as keyof FormData] as unknown;
      if (Array.isArray(val)) return val.length > 0;
      return val !== '' && val !== undefined && val !== null;
    });
  }, [formData]);

  const canAutoAdvance = useMemo(() => !isReviewMode && !allAssessmentsCompleted, [isReviewMode, allAssessmentsCompleted]);

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
      const timeout = setTimeout(() => setActivePhaseIdx(prev => prev + 1), 250);
      return () => clearTimeout(timeout);
    }
  }, [activePhase, activePhaseIdx, totalPhases]);

  useEffect(() => {
    if (!canAutoAdvance) return;
    const p0FirstSectionId = phaseDefinitions[0]?.sections?.[0]?.id ?? 'phase0';
    if (activePhaseIdx === 0 && isIntakeCompleted() && !recentlyCompletedSections.has(p0FirstSectionId)) {
      setRecentlyCompletedSections(prev => new Set(prev).add(p0FirstSectionId));
      setTimeout(() => setActivePhaseIdx(1), 1500);
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
        } else if (activePhaseIdx < totalPhases - 2) {
          setActivePhaseIdx(prev => prev + 1);
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
          setActivePhaseIdx(prev => prev + 1);
        }
      }, 1500);
    }
  }, [formData, expandedSections, activePhaseIdx, totalPhases, getAllSections, isIntakeCompleted, recentlyCompletedSections, isSectionCompleted, canAutoAdvance]);

  useEffect(() => { setActiveFieldIdx(0); }, [activePhaseIdx, expandedSections]);

  const progressValue = useMemo(() => ((activePhaseIdx + 1) / totalPhases) * 100, [activePhaseIdx, totalPhases]);

  useEffect(() => {
    if (!canAutoAdvance) return;
    if (allAssessmentsCompleted && activePhaseIdx < totalPhases - 1) {
      const t = setTimeout(() => {
        setIsReviewMode(false);
        setReportView('client');
        setActivePhaseIdx(totalPhases - 1);
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (_e) {}
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [allAssessmentsCompleted, activePhaseIdx, totalPhases, canAutoAdvance]);

  const handleViewResults = () => {
    if (allAssessmentsCompleted) {
      setIsReviewMode(false);
      setReportView('client');
      setActivePhaseIdx(totalPhases - 1);
      setTimeout(() => { try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (_e) {} }, 100);
    }
  };

  const handleStartNewAssessment = () => {
    setIsReviewMode(false);
    window.location.reload();
  };

  const runDemoSequential = async () => {
    setIsDemoAssessment(true);
    const payload = await generateDemoData();
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
    for (let p = 0; p < totalPhases; p++) {
      const ph = phaseDefinitions[p];
      if (!ph || ph.id === 'P7') break;
      setActivePhaseIdx(p);
      await delay(1500);
      const secs = ph.sections ?? [];
      for (const sec of secs) {
        setExpandedSections({ [sec.id]: true });
        await delay(1000);
        const sectionVisibleFields = (sec.fields as PhaseField[]).filter(f => isFieldVisible(f));
        for (let i = 0; i < sectionVisibleFields.length; i++) {
          const f = sectionVisibleFields[i];
          const key = f.id;
          setActiveFieldIdx(i);
          let raw: any = payload[key] ?? formData[key];
          if (!raw) {
            if (f.type === 'multiselect') raw = [];
            else if (f.type === 'select') raw = f.options?.[0]?.value || '';
            else raw = f.type === 'number' ? '0' : 'OK';
          }
          updateFormData({ [key]: raw } as Partial<FormData>);
          await delay(600);
        }
        setRecentlyCompletedSections(prev => new Set(prev).add(sec.id));
        await delay(1000);
      }
    }
    setActivePhaseIdx(totalPhases - 1);
    setReportView('client');
  };

  useEffect(() => {
    if (demoTrigger && demoTrigger > 0) runDemoSequential();
  }, [demoTrigger]);

  const toggleSection = (sectionId: string) => {
    setIsReviewMode(true);
    setExpandedSections(prev => {
      const next: Record<string, boolean> = {};
      const willOpen = !prev[sectionId];
      Object.keys(prev).forEach(id => { next[id] = false; });
      next[sectionId] = willOpen;
      return next;
    });
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
        onComplete={() => {
          const currentIndex = allSections.findIndex(s => s.id === activeSection.id);
          if (currentIndex < allSections.length - 1) {
            setExpandedSections({ [allSections[currentIndex + 1].id]: true });
          } else if (activePhaseIdx < totalPhases - 1) {
            setActivePhaseIdx(prev => prev + 1);
          }
        }}
      />
    );
  };

  if (totalPhases === 0) return <div className="text-center py-20">No phases configured.</div>;

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-73px)]">
      <aside className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white p-6 shrink-0 sticky top-[73px] z-30 overflow-y-auto max-h-[calc(100vh-73px)]">
        <div className="space-y-8">
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Assessment Phases</h3>
            <Progress value={progressValue} className="h-1" />
            <p className="text-[10px] font-medium text-slate-500 text-right">{Math.round(progressValue)}% Complete</p>
          </div>
          <nav className="space-y-1.5">
            {phaseDefinitions.map((phase, idx) => {
              const isActive = idx === activePhaseIdx;
              const isCompleted = isPhaseCompleted(idx) && idx <= maxUnlockedPhaseIdx;
              const isDisabled = idx > maxUnlockedPhaseIdx;
              return (
                <button
                  key={phase.id}
                  onClick={() => { if (!isDisabled) { setIsReviewMode(true); setActivePhaseIdx(idx); } }}
                  disabled={isDisabled}
                  className={`group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${isActive ? 'bg-slate-900 text-white shadow-md' : isCompleted ? 'text-indigo-600 hover:bg-indigo-50' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold border ${isActive ? 'bg-white/20 border-white/20' : isCompleted ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>
                    {isCompleted ? <Check className="h-3 w-3" /> : idx + 1}
                  </span>
                  <span className="truncate flex-1 text-left">{phase.title}</span>
                </button>
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
            {activePhaseIdx >= 1 && activePhaseIdx < totalPhases - 1 && allAssessmentsCompleted && (
              <div className="flex items-center justify-center border-t border-slate-200 pt-8">
                <Button onClick={handleViewResults} className="h-14 px-10 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-xl transition-all hover:scale-[1.05]">
                  📊 Generate Full Report
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
                    <ClientReport scores={scores} roadmap={roadmap} goals={Array.isArray(formData.clientGoals) ? formData.clientGoals : []} bodyComp={bodyCompInterp ? { timeframeWeeks: bodyCompInterp.timeframeWeeks } : undefined} formData={formData} />
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
    </div>
  );
};

const MultiStepForm = () => {
  const [demoTrigger, setDemoTrigger] = useState(0);
  const handleDemoFill = () => setDemoTrigger(prev => prev + 1);
  return (
    <FormProvider>
      <AppShell title="Fitness Assessment" showDemoFill={true} onDemoFill={handleDemoFill} variant="full-width">
        <PhaseFormContent demoTrigger={demoTrigger} />
      </AppShell>
    </FormProvider>
  );
};

export default MultiStepForm;
