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

const labelTextClasses = 'text-sm font-bold uppercase tracking-wider text-slate-500 mb-1.5 block';
const supportTextClasses = 'text-sm text-slate-400 font-medium leading-relaxed mb-4';

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
        // If 4 or fewer options, use a touch-optimized button grid (segmented control style)
        if (field.options && field.options.length <= 4) {
          return (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field.options.map((option) => {
                const isSelected = value === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleChange(option.value)}
                    className={`flex h-16 items-center gap-4 rounded-2xl border px-5 text-left transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md ring-1 ring-indigo-600'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200 bg-white'
                    }`}>
                      {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                    <span className="font-bold text-base">{option.label}</span>
                  </button>
                );
              })}
            </div>
          );
        }
        return (
          <div className="mt-2">
            <Select
              value={(value as string) ?? ''}
              onValueChange={(next) => handleChange(next)}
            >
              <SelectTrigger className="h-12 rounded-xl border-slate-200 focus:ring-indigo-500">
                <SelectValue placeholder={field.placeholder ?? 'Select option'} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="h-11">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Dynamic helper for weight-loss target level */}
            {field.id === ('goalLevelWeightLoss' as keyof FormData) && (
              <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-100">
                {(() => {
                  const heightCm = parseFloat(String(formData.heightCm || '0'));
                  const weightKg = parseFloat(String(formData.inbodyWeightKg || '0'));
                  const h = isNaN(heightCm) ? 0 : heightCm / 100;
                  const wBMI = (bmi: number) => (h > 0 ? (bmi * h * h) : 0);
                  const t25 = wBMI(25);
                  const t23 = wBMI(23);
                  const t22 = wBMI(22);
                  if (h <= 0) {
                    return <div className="font-medium">Enter height to see specific targets for your build.</div>;
                  }
                  return (
                    <div className="space-y-2">
                      <p className="font-semibold text-slate-700">Recommended Targets (BMI-based):</p>
                      <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <li>Health (25): <span className="font-semibold">{t25 > 0 ? `${t25.toFixed(1)} kg` : '—'}</span></li>
                        <li>Average (23.5): <span className="font-semibold">{t23 > 0 ? `${((t25 + t22) / 2).toFixed(1)} kg` : '—'}</span></li>
                        <li>Optimal (23): <span className="font-semibold">{t23 > 0 ? `${t23.toFixed(1)} kg` : '—'}</span></li>
                        <li>Elite (22): <span className="font-semibold">{t22 > 0 ? `${t22.toFixed(1)} kg` : '—'}</span></li>
                      </ul>
                      {weightKg > 0 && t25 > 0 && weightKg > t25 && (
                        <p className="pt-1 border-t border-slate-200 text-indigo-600 font-medium">
                          Target reduction: ~{(weightKg - t23).toFixed(1)} kg to reach optimal range.
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        );
      case 'multiselect': {
        // Special touch-optimized grid for goals
        if ((field.id as string) === 'clientGoals' && field.options) {
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
              {field.options.map(opt => {
                const isActive = selected.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggle(opt.value)}
                    className={`flex h-16 items-center gap-4 rounded-2xl border px-5 text-left transition-all ${
                      isActive
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md ring-1 ring-indigo-600'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                    aria-pressed={isActive}
                  >
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      isActive ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200 bg-white'
                    }`}>
                      {isActive && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                    <span className="font-bold text-base">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          );
        }
        const selected = Array.isArray(value) ? (value as string[]) : [];
        const selectedLabels = field.options
          ?.filter(option => selected.includes(option.value))
          .map(option => option.label)
          .join(', ') || field.placeholder || 'Select goals';

        return (
          <div className="mt-3">
            <Select
              value=""
              onValueChange={(next) => {
                if (selected.includes(next)) {
                  // Remove if already selected
                  handleChange(selected.filter((item) => item !== next));
                      } else {
                  // Add if not selected
                  handleChange([...selected, next]);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedLabels} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => {
                  const isSelected = selected.includes(option.value);
                  return (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className={isSelected ? 'bg-slate-100 text-slate-800' : ''}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 border rounded flex items-center justify-center ${
                          isSelected ? 'bg-slate-900 border-slate-900' : 'border-gray-300'
                        }`}>
                          {isSelected && <span className="text-white text-xs">✓</span>}
                        </div>
                        {option.label}
                      </div>
                    </SelectItem>
              );
            })}
              </SelectContent>
            </Select>
            {selected.length > 0 && (
              <div className="mt-2 text-sm text-slate-600">
                Selected: {selectedLabels}
              </div>
            )}
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
  const { formData } = useFormContext();
  const { settings } = useSettings();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activePhaseIdx, setActivePhaseIdx] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [recentlyCompletedSections, setRecentlyCompletedSections] = useState<Set<string>>(new Set());
  const phaseRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const [reportView, setReportView] = useState<'client' | 'coach'>('client');
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

  // Trigger demo fill from parent
  useEffect(() => {
    if (demoTrigger && demoTrigger > 0) {
      runDemoSequential();
    }
  }, [demoTrigger]);

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
  const scores = useMemo(() => computeScores(formData), [formData]);
  const roadmap = useMemo(() => buildRoadmap(scores), [scores]);
  const plan = useMemo(() => generateCoachPlan(formData, scores), [formData, scores]);
  const bodyCompInterp = useMemo(() => generateBodyCompInterpretation(formData), [formData]);
  const ensureShareArtifacts = useCallback(async (view: 'client' | 'coach') => {
    if (!user || !savingId) {
      throw new Error('Assessment must be saved before sharing.');
    }
    // Check ref cache first (avoids stale closure issues)
    if (shareCacheRef.current[view]) {
      return shareCacheRef.current[view]!;
    }
    const artifacts = await requestShareArtifacts({ assessmentId: savingId, view });
    shareCacheRef.current[view] = artifacts;
    setShareCache((prev) => ({ ...prev, [view]: artifacts }));
    return artifacts;
  }, [savingId, user]);

  const fetchReportPdfBlob = useCallback(async (view: 'client' | 'coach') => {
    // Try to get PDF from Cloud Functions first
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
      console.warn('Cloud Functions PDF not available, falling back to client-side generation', error);
    }
    
    // Fallback: generate PDF client-side
    if (!reportRef.current) {
      throw new Error('Report element not found');
    }
    
    // Generate PDF using html2canvas and jspdf (client-side fallback)
    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).default;
    
    // Wait for fonts and images to load
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const canvasEl = await html2canvas(reportRef.current, {
      scale: 3, // Higher scale for better quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      windowWidth: reportRef.current.scrollWidth,
      windowHeight: reportRef.current.scrollHeight,
      allowTaint: false,
      removeContainer: false,
      imageTimeout: 20000,
      onclone: (clonedDoc) => {
        // Ensure all styles are preserved and optimized for PDF
        const clonedElement = clonedDoc.querySelector(`[data-pdf-target]`) || 
                             clonedDoc.body.querySelector('.rounded-xl') ||
                             clonedDoc.body;
        if (clonedElement) {
          const el = clonedElement as HTMLElement;
          el.style.backgroundColor = '#ffffff';
          el.style.width = `${reportRef.current!.scrollWidth}px`;
          el.style.height = 'auto';
          el.style.overflow = 'visible';
          
          // Hide interactive elements that shouldn't be in PDF
          const interactiveElements = clonedDoc.querySelectorAll('button, input[type="range"], .dropdown-menu, .dropdown-trigger');
          interactiveElements.forEach((el) => {
            (el as HTMLElement).style.display = 'none';
          });
        }
      },
    });
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // A4 dimensions in mm with margins
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);
    const contentHeight = pageHeight - (margin * 2);
    
    // Calculate dimensions maintaining aspect ratio
    const imgWidth = contentWidth;
    const imgHeight = (canvasEl.height * imgWidth) / canvasEl.width;
    
    // Split image across pages correctly - no duplication
    const totalPages = Math.ceil(imgHeight / contentHeight);
    
    for (let page = 0; page < totalPages; page++) {
      if (page > 0) {
        pdf.addPage();
      }
      
      // Calculate the portion of image for this page
      const sourceY = (page * contentHeight / imgHeight) * canvasEl.height;
      const remainingHeight = imgHeight - (page * contentHeight);
      const pageImageHeight = Math.min(contentHeight, remainingHeight);
      const sourceHeight = (pageImageHeight / imgHeight) * canvasEl.height;
      
      // Create a temporary canvas for this page's portion
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvasEl.width;
      pageCanvas.height = Math.ceil(sourceHeight);
      const ctx = pageCanvas.getContext('2d');
      
      if (ctx && sourceHeight > 0) {
        // Fill with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        
        // Draw the portion of the image
        ctx.drawImage(
          canvasEl, 
          0, sourceY, canvasEl.width, sourceHeight,  // source
          0, 0, canvasEl.width, sourceHeight        // destination
        );
        
        const pageImgData = pageCanvas.toDataURL('image/png', 1.0);
        pdf.addImage(pageImgData, 'PNG', margin, margin, imgWidth, pageImageHeight);
      }
    }
    
    // Add metadata for interactivity
    pdf.setProperties({
      title: `${formData.fullName || 'Client'} - ${reportView === 'client' ? 'Client' : 'Coach'} Report`,
      subject: 'Fitness Assessment Report',
      author: 'One Fitness',
      creator: 'One Fitness Assessment Engine',
    });
    
    const blob = pdf.output('blob');
    return { artifacts: null, blob };
  }, [ensureShareArtifacts, user, savingId, formData.fullName, reportView]);

  const handlePrint = useCallback(async () => {
    if (typeof window === 'undefined') return;
    try {
      setShareLoading(true);
      const { blob } = await fetchReportPdfBlob(reportView);
      const blobUrl = URL.createObjectURL(blob);
      const printWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');
      if (printWindow) {
        const triggerPrint = () => {
          printWindow.focus();
          printWindow.print();
        };
        printWindow.addEventListener('load', triggerPrint, { once: true });
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (error) {
      console.error('Print failed', error);
      toast({
        title: 'Unable to open printer dialog',
        description: 'Download the PDF instead while we retry.',
        variant: 'destructive',
      });
    } finally {
      setShareLoading(false);
    }
  }, [fetchReportPdfBlob, reportView, toast]);

  const handleShare = useCallback(async () => {
    if (typeof window === 'undefined') return;
    try {
      setShareLoading(true);
      let shareUrl = '';
      
      // Try to get share URL from Cloud Functions if available
      if (user && savingId) {
        try {
          const artifacts = await ensureShareArtifacts(reportView);
          shareUrl = artifacts.shareUrl;
        } catch (error) {
          console.warn('Cloud Functions share not available, using current page URL', error);
        }
      }
      
      // Fallback to current page URL if no share URL available
      if (!shareUrl) {
        shareUrl = window.location.href;
      }
      
      const shareData = {
        title: reportView === 'client' ? 'Client Report' : 'Coach Report',
        text: 'Assessment report generated from One Fitness.',
        url: shareUrl,
      };
      const navWithShare = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
      if (navWithShare.share) {
        await navWithShare.share(shareData as ShareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: 'Link copied',
          description: 'Share link copied to clipboard.',
        });
      }
    } catch (error) {
      console.error('System share failed', error);
      toast({
        title: 'Unable to share right now',
        description: 'Try copying the link or downloading the PDF instead.',
        variant: 'destructive',
      });
    } finally {
      setShareLoading(false);
    }
  }, [ensureShareArtifacts, reportView, toast, user, savingId]);

  const handleEmailLink = useCallback(async () => {
    const email = (formData.email || '').trim();
    if (!email) {
      toast({
        title: 'Client email missing',
        description: 'Add the client email in the intake form to email their report.',
        variant: 'destructive',
      });
      return;
    }
    if (!savingId) return;
    try {
      setShareLoading(true);
      await sendReportEmail({
        assessmentId: savingId,
        view: reportView,
        to: email,
        clientName: formData.fullName,
      });
      toast({
        title: 'Report emailed',
        description: `Sent to ${email}`,
      });
    } catch (error) {
      console.error('Failed to email report', error);
      toast({
        title: 'Email not sent',
        description: 'Verify your SendGrid credentials in Firebase functions config.',
        variant: 'destructive',
      });
    } finally {
      setShareLoading(false);
    }
  }, [formData.email, formData.fullName, reportView, savingId, toast]);

  const handleWhatsAppShare = useCallback(async () => {
    if (typeof window === 'undefined') return;
    try {
      setShareLoading(true);
      const artifacts = await ensureShareArtifacts(reportView);
      const url = `https://wa.me/?text=${encodeURIComponent(artifacts.whatsappText)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('WhatsApp share failed', error);
      toast({
        title: 'Unable to share via WhatsApp',
        description: 'Try copying the share link instead.',
        variant: 'destructive',
      });
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
      console.error('Failed to save assessment', e);
    } finally {
      setSaving(false);
    }
  }, [user, saving, savingId, formData, scores.overall]);

  // Auto-save once when we reach the Results phase and have a signed-in coach
  // Skip auto-save for demo assessments
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
    if (typeof navigator === 'undefined' || !('clipboard' in navigator)) {
      toast({
        title: 'Clipboard not available',
        description: 'Use the system share option instead.',
      });
      return;
    }
    try {
      setShareLoading(true);
      let shareUrl = '';
      
      // Try to get share URL from Cloud Functions if available
      if (user && savingId) {
        try {
          const artifacts = await ensureShareArtifacts(reportView);
          shareUrl = artifacts.shareUrl;
        } catch (error) {
          console.warn('Cloud Functions share not available, using current page URL', error);
        }
      }
      
      // Fallback to current page URL
      if (!shareUrl) {
        shareUrl = window.location.href;
      }
      
      await (navigator as Navigator & { clipboard: Clipboard }).clipboard.writeText(shareUrl);
      toast({ description: 'Share link copied to clipboard.' });
    } catch (error) {
      console.error('Copy link failed', error);
      toast({
        title: 'Unable to copy link',
        description: 'Use the download or share buttons instead.',
        variant: 'destructive',
      });
    } finally {
      setShareLoading(false);
    }
  }, [ensureShareArtifacts, reportView, toast, user, savingId]);

  const handleDownloadPdf = useCallback(async () => {
    const safeName = (formData.fullName || 'one-fitness-report')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const fileName = `${safeName || 'one-fitness-report'}-${reportView}-report.pdf`;
    try {
      setShareLoading(true);
      const { blob } = await fetchReportPdfBlob(reportView);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast({
        title: 'PDF downloaded',
        description: `Saved as ${fileName}`,
      });
    } catch (error) {
      console.error('Failed to download PDF', error);
      toast({
        title: 'Download failed',
        description: error instanceof Error ? error.message : 'Try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setShareLoading(false);
    }
  }, [fetchReportPdfBlob, formData.fullName, reportView, toast]);

  const handleDownloadInteractiveHtml = useCallback(async () => {
    if (reportView !== 'client') {
      toast({
        title: 'Interactive HTML available for client report only',
        description: 'Switch to client report view to download interactive HTML.',
        variant: 'destructive',
      });
      return;
    }
    
    const safeName = (formData.fullName || 'one-fitness-report')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const fileName = `${safeName || 'one-fitness-report'}-interactive-report.html`;
    
    try {
      setShareLoading(true);
      const bodyComp = generateBodyCompInterpretation(formData);
      const htmlBlob = await generateInteractiveHtml({
        formData,
        scores,
        roadmap,
        bodyComp: bodyComp || undefined,
        view: 'client',
      });
      
      const url = URL.createObjectURL(htmlBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      
      toast({
        title: 'Interactive HTML downloaded',
        description: `Open ${fileName} in any browser to use sliders and interactive elements.`,
      });
    } catch (error) {
      console.error('Failed to download interactive HTML', error);
      toast({
        title: 'Download failed',
        description: error instanceof Error ? error.message : 'Try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setShareLoading(false);
    }
  }, [formData, scores, roadmap, reportView, toast]);

  // Smoothly scroll active phase chip into view
  useEffect(() => {
    const el = phaseRefs.current[activePhaseIdx];
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activePhaseIdx]);

  // Debug: verify the phases loaded at runtime
  useEffect(() => {
    console.log('[Assessment] phases loaded:', phaseDefinitions.map(p => ({ id: p.id, title: p.title })));
  }, []);
  useEffect(() => {
    console.log('[Assessment] activePhaseIdx:', activePhaseIdx, 'activePhase:', activePhase?.id, activePhase?.title);
  }, [activePhaseIdx, activePhase]);

  // Check if intake fields are completed (all fields filled)
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

  // Determine if a field should be shown (matches FieldControl logic)
  const isFieldVisible = useCallback((field: PhaseField) => {
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
  }, [formData]);

  // Check if a section is completed (all visible fields filled)
  const isSectionCompleted = useCallback((section: PhaseSection) => {
    return section.fields.every(field => {
      if (!isFieldVisible(field)) return true; // hidden fields do not block completion
      const value = formData[field.id];
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value !== undefined && value !== null && value !== '';
    });
  }, [formData, isFieldVisible]);

  // Determine if a given phase is completed (all visible fields in all sections filled).
  const isPhaseCompleted = useCallback((phaseIdx: number) => {
    const phase = phaseDefinitions[phaseIdx];
    if (!phase) return false;
    const sections = phase.sections ?? [];
    if (sections.length === 0) return true; // empty phase counts as completed/unlocked
    return sections.every(section =>
      section.fields.every(field => {
        if (!isFieldVisible(field)) return true;
        const value = formData[field.id];
        if (Array.isArray(value)) return value.length > 0;
        return value !== undefined && value !== null && value !== '';
      })
    );
  }, [formData, isFieldVisible]);

  // Compute the furthest phase index the user can navigate to (completed chain unlocks next).
  const maxUnlockedPhaseIdx = useMemo(() => {
    let idx = 0;
    while (idx < totalPhases - 1 && isPhaseCompleted(idx)) {
      idx += 1;
    }
    return idx;
  }, [totalPhases, isPhaseCompleted]);

  // (moved: auto-navigate to Results when all assessments are completed)

  // Get all sections for current phase (no longer including intake globally)
  const getAllSections = useCallback(() => {
    const sections: SectionType[] = [];

    if (activePhase.sections && activePhase.sections.length > 0) {
      // Phase has sections
      sections.push(...activePhase.sections);
    }

    return sections;
  }, [activePhase]);

  // Initialize sections - first section of each phase starts expanded
  useEffect(() => {
    const allSections = getAllSections();
    const newExpandedSections: Record<string, boolean> = {};

    allSections.forEach((section, index) => {
      // First section of each phase starts expanded
      newExpandedSections[section.id] = index === 0;
    });

    setExpandedSections(newExpandedSections);
  }, [activePhaseIdx, getAllSections]);

  // Auto-skip phases that have no sections (e.g., placeholder phases)
  useEffect(() => {
    if ((activePhase.sections?.length ?? 0) === 0 && activePhaseIdx < totalPhases - 1) {
      const timeout = setTimeout(() => setActivePhaseIdx(prev => prev + 1), 250);
      return () => clearTimeout(timeout);
    }
  }, [activePhase, activePhaseIdx, totalPhases]);

  // Auto-advance sections and phases when completed (only for real-time completion)
  useEffect(() => {
    // Special handling for Phase 0 (Client Profile) completion - advance to Phase 1
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

    // Check if current section is completed and wasn't recently completed (skip hidden fields)
    const currentSectionCompleted = isSectionCompleted(currentSection);

    const wasRecentlyCompleted = recentlyCompletedSections.has(expandedSectionId);

    if (currentSectionCompleted && !wasRecentlyCompleted) {
      // Do not auto-advance from goals section to allow multiple selections without interruption
      if (currentSection.id === 'goals') {
        return;
      }
      setRecentlyCompletedSections(prev => new Set(prev).add(expandedSectionId));

      const currentIndex = allSections.findIndex(section => section.id === expandedSectionId);

      // Add delay before auto-advancing so user can see their input
      setTimeout(() => {
        // Expand next section and collapse current to ensure single-open behavior
        if (currentIndex < allSections.length - 1) {
          const nextSection = allSections[currentIndex + 1];
          setExpandedSections(prev => ({
            ...prev,
            [expandedSectionId]: false,
            [nextSection.id]: true
          }));
        } else {
          // Last section of phase - advance to next phase (but not to final results automatically)
          if (activePhaseIdx < totalPhases - 2) { // -2 to prevent auto-advancing to results
            setActivePhaseIdx(prev => prev + 1);
          }
        }
      }, 1500); // 1.5 second delay
    }

    // Special handling for PAR-Q completion - advance to next section or next phase
    if (currentSection.id === 'health-screening' && formData.parqQuestionnaire === 'completed' && !wasRecentlyCompleted) {
      setRecentlyCompletedSections(prev => new Set(prev).add('health-screening'));
      setTimeout(() => {
        const currentIndex = allSections.findIndex(section => section.id === expandedSectionId);
        if (currentIndex < allSections.length - 1) {
          const nextSection = allSections[currentIndex + 1];
          setExpandedSections(prev => ({
            ...prev,
            [expandedSectionId]: false,
            [nextSection.id]: true
          }));
        } else {
          // No next section in this phase; move to the next phase
          if (activePhaseIdx < totalPhases - 1) {
            setActivePhaseIdx(prev => prev + 1);
          }
        }
      }, 1500);
    }
  }, [formData, expandedSections, activePhaseIdx, totalPhases, getAllSections, isIntakeCompleted, recentlyCompletedSections, isSectionCompleted]);

  // Check if all assessment phases (P1-P5) are completed
  const allAssessmentsCompleted = useMemo(() => {
    // Check if we have data for key assessment fields
    const requiredFields = [
      'parqQuestionnaire', // PAR-Q
      'postureHeadOverall', // Posture assessment
      'pushupsOneMinuteReps', // Strength assessment
      'plankDurationSeconds', // Core assessment
      'cardioTestSelected', // Cardio assessment
      'clientGoals', // Ensure goals were selected before showing results
    ];

    return requiredFields.every((field) => {
      const val = formData[field as keyof FormData] as unknown;
      if (Array.isArray(val)) return val.length > 0;
      return val !== '' && val !== undefined && val !== null;
    });
  }, [formData]);

  const progressValue = useMemo(
    () => ((activePhaseIdx + 1) / totalPhases) * 100,
    [activePhaseIdx, totalPhases]
  );

  // Auto-navigate to Results when all assessments are completed
  useEffect(() => {
    if (allAssessmentsCompleted && activePhaseIdx < totalPhases - 1) {
      const t = setTimeout(() => {
        setActivePhaseIdx(totalPhases - 1);
        setReportView('client');
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (_e) { /* noop */ }
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [allAssessmentsCompleted, activePhaseIdx, totalPhases]);

  const handleNext = () => {
    const allSections = getAllSections();

    // Find the currently expanded section
    const expandedSectionId = Object.keys(expandedSections).find(id => expandedSections[id]);
    if (!expandedSectionId) return;

    const currentSectionIndex = allSections.findIndex(section => section.id === expandedSectionId);
    if (currentSectionIndex === -1) return;

    // If there's a next section in the current phase, expand it and collapse current
    if (currentSectionIndex < allSections.length - 1) {
      const nextSection = allSections[currentSectionIndex + 1];
      setExpandedSections(prev => ({
        ...prev,
        [expandedSectionId]: false,
        [nextSection.id]: true
      }));
    } else {
      // No more sections in current phase, move to next phase
    if (activePhaseIdx < totalPhases - 1) {
      setActivePhaseIdx((prev) => prev + 1);
      }
    }
  };

  const handleBack = () => {
    const allSections = getAllSections();

    // Find the currently expanded section
    const expandedSectionId = Object.keys(expandedSections).find(id => expandedSections[id]);
    if (!expandedSectionId) {
      // No expanded section, go to previous phase
      if (activePhaseIdx > 0) {
        setActivePhaseIdx((prev) => prev - 1);
      }
      return;
    }

    const currentSectionIndex = allSections.findIndex(section => section.id === expandedSectionId);
    if (currentSectionIndex === -1) return;

    // If there's a previous section in the current phase, expand it and collapse current
    if (currentSectionIndex > 0) {
      const prevSection = allSections[currentSectionIndex - 1];
      setExpandedSections(prev => ({
        ...prev,
        [expandedSectionId]: false,
        [prevSection.id]: true
      }));
    } else {
      // No previous section in current phase, move to previous phase
    if (activePhaseIdx > 0) {
      setActivePhaseIdx((prev) => prev - 1);
    }
    }
  };

  const handleViewResults = () => {
    if (allAssessmentsCompleted) {
      setActivePhaseIdx(totalPhases - 1); // Jump to final Results phase
    }
  };

  const handleStartNewAssessment = () => {
    // Reset all form data and state
    window.location.reload(); // Simple reset for now - could be more sophisticated
  };

  // Temporary: quick-fill test profiles to speed up report testing
  const { updateFormData } = useFormContext();
  const quickFill = (profile: 'obese' | 'muscle' | 'cardio') => {
    if (profile === 'obese') {
      updateFormData({
        parqQuestionnaire: 'completed',
        parq1: 'no',
        parq2: 'no',
        parq3: 'no',
        parq4: 'no',
        parq5: 'no',
        parq6: 'no',
        parq7: 'no',
        parq12: 'no',
        parq13: 'no',
        heightCm: '175',
        inbodyWeightKg: '120',
        inbodyBodyFatPct: '36',
        bodyFatMassKg: '43',
        visceralFatLevel: '14',
        skeletalMuscleMassKg: '32',
        waistHipRatio: '1.02',
        totalBodyWaterL: '38',
        inbodyBmi: '39',
        segmentalTrunkKg: '30',
        segmentalArmLeftKg: '3.0',
        segmentalArmRightKg: '3.5',
        segmentalLegLeftKg: '9.0',
        segmentalLegRightKg: '10.0',
        bmrKcal: '1750',
        inbodyScore: '62',
        sleepQuality: 'fair',
        sleepConsistency: 'inconsistent',
        stressLevel: 'high',
        hydrationHabits: 'fair',
        stepsPerDay: '3500',
        sedentaryHours: '9',
        caffeineCupsPerDay: '3',
        lastCaffeineIntake: '16:00',
        // assessments minimal
        postureHeadOverall: 'forward-head',
        postureBackOverall: 'increased-kyphosis',
        postureKneesOverall: 'valgus-knee',
        mobilityHip: 'fair',
        mobilityShoulder: 'fair',
        mobilityAnkle: 'poor',
        pushupsOneMinuteReps: '8',
        squatsOneMinuteReps: '18',
        plankDurationSeconds: '35',
        gripLeftKg: '28',
        gripRightKg: '30',
        cardioTestSelected: 'ymca-step',
        cardioRestingHr: '78',
        cardioPost1MinHr: '128',
        clientGoals: ['weight-loss'],
        goalLevelWeightLoss: 'above-average',
      });
    } else if (profile === 'muscle') {
      updateFormData({
        parqQuestionnaire: 'completed',
        parq1: 'no',
        parq2: 'no',
        parq3: 'no',
        parq4: 'no',
        parq5: 'no',
        parq6: 'no',
        parq7: 'no',
        parq12: 'no',
        parq13: 'no',
        heightCm: '180',
        inbodyWeightKg: '78',
        inbodyBodyFatPct: '18',
        bodyFatMassKg: '14',
        visceralFatLevel: '7',
        skeletalMuscleMassKg: '36',
        waistHipRatio: '0.88',
        totalBodyWaterL: '43',
        inbodyBmi: '24',
        segmentalTrunkKg: '29',
        segmentalArmLeftKg: '3.2',
        segmentalArmRightKg: '3.3',
        segmentalLegLeftKg: '9.4',
        segmentalLegRightKg: '9.6',
        bmrKcal: '1650',
        inbodyScore: '78',
        sleepQuality: 'good',
        sleepConsistency: 'consistent',
        stressLevel: 'moderate',
        hydrationHabits: 'good',
        stepsPerDay: '8000',
        sedentaryHours: '6',
        caffeineCupsPerDay: '2',
        lastCaffeineIntake: '13:00',
        postureHeadOverall: 'neutral',
        postureBackOverall: 'neutral',
        postureKneesOverall: 'neutral',
        mobilityHip: 'fair',
        mobilityShoulder: 'good',
        mobilityAnkle: 'good',
        pushupsOneMinuteReps: '28',
        squatsOneMinuteReps: '42',
        plankDurationSeconds: '95',
        gripLeftKg: '36',
        gripRightKg: '38',
        cardioTestSelected: 'treadmill',
        cardioRestingHr: '62',
        cardioPost1MinHr: '110',
        clientGoals: ['build-muscle', 'build-strength'],
        goalLevelMuscle: 'above-average',
        goalLevelStrength: 'average',
      });
    } else if (profile === 'cardio') {
      updateFormData({
        parqQuestionnaire: 'completed',
        parq1: 'no',
        parq2: 'no',
        parq3: 'no',
        parq4: 'no',
        parq5: 'no',
        parq6: 'no',
        parq7: 'no',
        parq12: 'no',
        parq13: 'no',
        heightCm: '172',
        inbodyWeightKg: '70',
        inbodyBodyFatPct: '16',
        bodyFatMassKg: '11',
        visceralFatLevel: '6',
        skeletalMuscleMassKg: '34',
        waistHipRatio: '0.84',
        totalBodyWaterL: '42',
        inbodyBmi: '23.7',
        segmentalTrunkKg: '28',
        segmentalArmLeftKg: '3.1',
        segmentalArmRightKg: '3.1',
        segmentalLegLeftKg: '9.2',
        segmentalLegRightKg: '9.2',
        bmrKcal: '1600',
        inbodyScore: '82',
        sleepQuality: 'good',
        sleepConsistency: 'very-consistent',
        stressLevel: 'low',
        hydrationHabits: 'good',
        stepsPerDay: '10000',
        sedentaryHours: '5',
        caffeineCupsPerDay: '1',
        lastCaffeineIntake: '09:30',
        postureHeadOverall: 'neutral',
        postureBackOverall: 'neutral',
        postureKneesOverall: 'neutral',
        mobilityHip: 'good',
        mobilityShoulder: 'good',
        mobilityAnkle: 'good',
        pushupsOneMinuteReps: '35',
        squatsOneMinuteReps: '48',
        plankDurationSeconds: '120',
        gripLeftKg: '34',
        gripRightKg: '35',
        cardioTestSelected: 'ymca-step',
        cardioRestingHr: '56',
        cardioPost1MinHr: '98',
        clientGoals: ['improve-fitness'],
        goalLevelFitness: 'above-average',
      });
    }
    // Navigate to results for faster iteration
    setActivePhaseIdx(totalPhases - 1);
  };

  // Sequential demo fill (simulates user typing; fills many fields one-by-one then navigates to Results)
  // Uses AI-generated unique demo data
  const runDemoSequential = async () => {
    // Mark this as a demo assessment so it won't be saved
    setIsDemoAssessment(true);
    // Generate unique demo data using AI-like algorithms
    const payload = await generateDemoData();
    // Slower, readable pacing (tune as needed)
    const DELAY_PHASE = 2000;
    const DELAY_SECTION = 1300;
    const DELAY_FIELD = 900;
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
    
    // Collect all fields from all phases to ensure we don't miss any
    const allFields: Array<{ field: PhaseField; phaseId: string; sectionId: string }> = [];
    for (let p = 0; p < totalPhases; p++) {
      const ph = phaseDefinitions[p];
      if (!ph || ph.id === 'P7') continue;
      const secs = ph.sections ?? [];
      for (const sec of secs) {
        for (const f of (sec.fields as ReadonlyArray<PhaseField>)) {
          allFields.push({ field: f, phaseId: ph.id, sectionId: sec.id });
        }
      }
    }
    
    // Traverse phases/sections to mimic user flow
    for (let p = 0; p < totalPhases; p++) {
      const ph = phaseDefinitions[p];
      if (!ph) continue;
      if (ph.id === 'P7') break;
      setActivePhaseIdx(p);
      await delay(DELAY_PHASE);
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (_e) { /* noop */ }
      const secs = ph.sections ?? [];
      for (const sec of secs) {
        setExpandedSections(prev => ({ ...prev, [sec.id]: true }));
        await delay(DELAY_SECTION);
        for (const f of (sec.fields as ReadonlyArray<PhaseField>)) {
          const key = f.id as keyof FormData;
          
          // Special handling for clientGoals (multiselect) - ensure array is properly set
          if (key === 'clientGoals') {
            const goalsValue = (payload[key] as string[] | undefined) ?? (formData[key] as string[] | undefined);
            if (goalsValue && Array.isArray(goalsValue) && goalsValue.length > 0) {
              updateFormData({ [key]: goalsValue } as Partial<FormData>);
              await delay(DELAY_FIELD);
              
              // Also fill goal level fields based on selected goals
              const goalLevelUpdates: Partial<FormData> = {};
              if (goalsValue.includes('weight-loss') && payload.goalLevelWeightLoss) {
                goalLevelUpdates.goalLevelWeightLoss = payload.goalLevelWeightLoss as string;
              }
              if (goalsValue.includes('build-muscle') && payload.goalLevelMuscle) {
                goalLevelUpdates.goalLevelMuscle = payload.goalLevelMuscle as string;
              }
              if (goalsValue.includes('build-strength') && payload.goalLevelStrength) {
                goalLevelUpdates.goalLevelStrength = payload.goalLevelStrength as string;
              }
              if (goalsValue.includes('improve-fitness') && payload.goalLevelFitness) {
                goalLevelUpdates.goalLevelFitness = payload.goalLevelFitness as string;
              }
              
              if (Object.keys(goalLevelUpdates).length > 0) {
                updateFormData(goalLevelUpdates);
                await delay(DELAY_FIELD);
              }
            }
            continue; // Skip normal processing for this field
          }
          
          // Skip goal level fields - they're handled with clientGoals
          if (key === 'goalLevelWeightLoss' || key === 'goalLevelMuscle' || key === 'goalLevelStrength' || key === 'goalLevelFitness') {
            continue;
          }
          
          // Special handling for caffeine fields - ensure lastCaffeineIntake is filled when caffeineCupsPerDay > 0
          if (key === 'caffeineCupsPerDay') {
            // Get the value from payload or use existing
            const caffeineValue = (payload[key] as string | undefined) ?? (formData[key] as string | undefined) ?? '0';
            const caffeineNum = parseFloat(caffeineValue) || 0;
            
            // Update caffeineCupsPerDay
            updateFormData({ [key]: String(caffeineNum) } as Partial<FormData>);
            await delay(DELAY_FIELD);
            
            // If caffeine > 0, also fill lastCaffeineIntake (if not already filled)
            if (caffeineNum > 0) {
              const lastCaffeineValue = (payload.lastCaffeineIntake as string | undefined) ?? 
                                       (formData.lastCaffeineIntake as string | undefined);
              if (lastCaffeineValue) {
                updateFormData({ lastCaffeineIntake: lastCaffeineValue } as Partial<FormData>);
                await delay(DELAY_FIELD);
              } else {
                // Generate a default time if not in payload
                const hour = Math.floor(8 + Math.random() * 10); // 8-18
                const minute = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
                const defaultTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                updateFormData({ lastCaffeineIntake: defaultTime } as Partial<FormData>);
                await delay(DELAY_FIELD);
              }
            } else {
              // If caffeine is 0, clear lastCaffeineIntake
              if (formData.lastCaffeineIntake) {
                updateFormData({ lastCaffeineIntake: '' } as Partial<FormData>);
                await delay(DELAY_FIELD);
              }
            }
            continue; // Skip normal processing for this field
          }
          
          // Skip lastCaffeineIntake if caffeineCupsPerDay is 0 or not set
          if (key === 'lastCaffeineIntake') {
            const caffeineValue = formData.caffeineCupsPerDay || '0';
            const caffeineNum = parseFloat(caffeineValue) || 0;
            if (caffeineNum === 0) {
              continue; // Don't fill lastCaffeineIntake if caffeine is 0
            }
          }
          
          // Respect conditional visibility so we only populate fields that would actually be shown
          if (!isFieldVisible(f)) continue;
          
          // Special handling for PAR-Q questionnaire - fill each question individually
          if (f.type === 'parq' && key === 'parqQuestionnaire') {
            // PAR-Q questions in order (matching ParQQuestionnaire component)
            const parqQuestionIds: Array<keyof FormData> = ['parq1', 'parq2', 'parq3', 'parq4', 'parq5', 'parq6', 'parq7', 'parq8', 'parq9', 'parq10', 'parq11', 'parq12', 'parq13'];
            
            // Filter based on gender (parq12 and parq13 are conditional)
            const gender = (formData?.gender || '').toLowerCase();
            const visibleParqIds = parqQuestionIds.filter(id => {
              if (id === 'parq12' || id === 'parq13') {
                return gender === 'female';
              }
              return true;
            });
            
            // Fill each PAR-Q question one by one so user can see the selection
            for (const parqId of visibleParqIds) {
              // Get the answer from payload or use default 'no'
              const parqAnswer = (payload[parqId] as string | undefined) ?? 'no';
              
              // Update the form data for this specific PAR-Q question
              updateFormData({ [parqId]: parqAnswer } as Partial<FormData>);
              
              // Wait longer for PAR-Q questions so user can see each selection
              await delay(DELAY_FIELD * 1.5);
            }
            
            // After all questions are answered, mark as completed
            // The ParQQuestionnaire component will detect this automatically
            continue;
          }
          
          // Prefer AI-generated payload value, then existing form value
          let raw: FormData[keyof FormData] | undefined =
            (payload[key as keyof FormData] as FormData[keyof FormData] | undefined) ??
            (formData[key as keyof FormData] as FormData[keyof FormData] | undefined);
          
          // Populate sensible defaults when missing (ensuring we fill ALL visible fields)
          if (raw === undefined || raw === null || raw === '') {
            if (f.type === 'multiselect') {
              raw = f.options && f.options.length > 0 ? [f.options[0].value] : [];
            } else if (f.type === 'select') {
              raw = f.options && f.options.length > 0 ? f.options[0].value : '';
            } else if (f.type === 'number') {
              // Generate more realistic defaults based on field context
              if (key.includes('height') || key.includes('Height')) {
                raw = '170';
              } else if (key.includes('weight') || key.includes('Weight')) {
                raw = '70';
              } else if (key.includes('steps') || key.includes('Steps')) {
                raw = '5000';
              } else if (key.includes('hours') || key.includes('Hours')) {
                raw = '8';
              } else if (key.includes('reps') || key.includes('Reps')) {
                raw = '20';
              } else if (key.includes('seconds') || key.includes('Seconds') || key.includes('duration')) {
                raw = '60';
              } else if (key.includes('kg') || key.includes('Kg')) {
                raw = '25';
              } else if (key.includes('hr') || key.includes('Hr') || key.includes('heart')) {
                raw = '70';
              } else {
                raw = '1';
              }
            } else if (f.type === 'date') {
              raw = '1990-01-01';
            } else if (f.type === 'time') {
              raw = '08:00';
            } else if (f.type === 'email') {
              raw = 'demo@example.com';
            } else if (f.type === 'tel') {
              raw = '+441234567890';
            } else {
              raw = 'OK';
            }
          }
          
          // Apply update (support array values for multiselect)
          updateFormData({ [key]: raw as FormData[keyof FormData] } as Partial<FormData>);
          await delay(DELAY_FIELD);
        }
        // mark section complete to avoid double auto-advance reaction
        setRecentlyCompletedSections(prev => {
          const next = new Set(prev);
          next.add(sec.id);
          return next;
        });
        await delay(DELAY_SECTION);
      }
    }
    // Navigate to results and ensure the report is visible
    setActivePhaseIdx(totalPhases - 1);
    await delay(800);
    setReportView('client');
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (_e) { /* noop */ }
  };
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next: Record<string, boolean> = {};
      const willOpen = !prev[sectionId];
      Object.keys(prev).forEach(id => {
        next[id] = false;
      });
      next[sectionId] = willOpen;
      return next;
    });
  };

  const renderSection = (section: SectionType, index: number, allSections: SectionType[]) => {
    const isExpanded = expandedSections[section.id] || false;
    const isCompleted = isSectionCompleted(section);

      return (
      <Collapsible
        key={section.id}
        open={isExpanded}
        onOpenChange={() => toggleSection(section.id)}
        className="group"
      >
        <div className={`rounded-2xl border transition-all duration-300 ${
          isExpanded
            ? 'border-indigo-100 bg-white shadow-xl shadow-indigo-100/20'
            : isCompleted
            ? 'border-slate-100 bg-slate-50/30'
            : 'border-slate-200 bg-white'
        }`}>
          <CollapsibleTrigger asChild>
            <button className="w-full px-8 py-6 text-left transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <h3 className={`text-xl font-bold tracking-tight transition-colors ${isExpanded ? 'text-indigo-600' : 'text-slate-800'}`}>
                      {section.title}
                    </h3>
                    {isCompleted && !isExpanded && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                  {'description' in section && section.description && !isExpanded && (
                    <p className="text-sm text-slate-500 font-medium line-clamp-1">{section.description}</p>
                  )}
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${isExpanded ? 'bg-indigo-600 text-white rotate-180' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}`}>
                  <ChevronDown className="h-5 w-5" />
                </div>
              </div>
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent className="animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="px-8 pb-8">
              {'description' in section && section.description && (
                <p className="text-base text-slate-600 mb-8 leading-relaxed border-l-2 border-indigo-100 pl-4">{section.description}</p>
              )}
              
              <div className="space-y-8">
                {(() => {
                  const parqField = section.fields.find(field => field.type === 'parq');
                  const otherFields = section.fields.filter(field => field.type !== 'parq');

                  // Special handling for lunge assessment - organize in left/right columns
                  if (section.id === 'lunge-assessment') {
                    const leftFields = otherFields.filter(field =>
                      field.id.includes('Left') || field.id.includes('left')
                    );
                    const rightFields = otherFields.filter(field =>
                      field.id.includes('Right') || field.id.includes('right')
                    );
                    const otherLungeFields = otherFields.filter(field =>
                      !field.id.includes('Left') && !field.id.includes('left') &&
                      !field.id.includes('Right') && !field.id.includes('right')
                    );

                    return (
                      <>
                        {/* PAR-Q questionnaire takes full width */}
                        {parqField && (
                          <div className="w-full">
                            <FieldControl field={parqField} />
                </div>
              )}

                        {/* Lunge assessment - left and right columns */}
              <div className="grid gap-6 md:grid-cols-2">
                          <div className="space-y-4">
                            <h4 className="font-medium text-slate-900 border-b border-slate-200 pb-2">Left Leg Assessment</h4>
                            {leftFields.map((field: PhaseField) => (
                  <FieldControl key={field.id} field={field} />
                ))}
                          </div>
                          <div className="space-y-4">
                            <h4 className="font-medium text-slate-900 border-b border-slate-200 pb-2">Right Leg Assessment</h4>
                            {rightFields.map((field: PhaseField) => (
                              <FieldControl key={field.id} field={field} />
                            ))}
                          </div>
                        </div>

                        {/* Any remaining fields */}
                        {otherLungeFields.length > 0 && (
              <div className="grid gap-6 md:grid-cols-2">
                            {otherLungeFields.map((field: PhaseField) => (
                  <FieldControl key={field.id} field={field} />
                ))}
                          </div>
                        )}
                      </>
                    );
                  }

                  // Special handling for fitness assessment - show dynamic instructions based on selected test
                  if (section.id === 'fitness-assessment') {
                    const test = (formData.cardioTestSelected || '').toLowerCase();
                    const instruction =
                      test === 'ymca-step'
                        ? 'Use a 12-inch step at 96 BPM for 3 minutes (Up-Up-Down-Down). At exactly 3:00, stop and stand still. Start a 1-minute timer and record HR at exactly 60s. That value (HR₆₀) is the score.'
                        : test === 'treadmill'
                        ? 'Set treadmill to 5.0 km/h at 10% incline. Walk 3 minutes without holding handles. At exactly 3:00, stop, stand on side rails, start a 1-minute timer and record HR at exactly 60s. That value (HR₆₀) is the score.'
                        : '';
                    return (
                      <>
                        {instruction && (
                          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                            {instruction}
                          </div>
                        )}
                        {/* Render fields as usual */}
                        <div className="grid gap-6 md:grid-cols-2 mt-2">
                          {otherFields.map((field: PhaseField, idx: number) => {
                            const isLast = idx === otherFields.length - 1;
                            const isOdd = otherFields.length % 2 === 1;
                            const wrapperClass = isOdd && isLast ? 'md:col-span-2' : '';
                            return (
                              <div key={field.id as string} className={wrapperClass}>
                                <FieldControl field={field} />
                              </div>
                            );
                          })}
                        </div>
                      </>
                    );
                  }

                  return (
                    <>
                      {/* PAR-Q questionnaire takes full width */}
                      {parqField && (
                        <div className="w-full">
                          <FieldControl field={parqField} />
                        </div>
                      )}

                      {/* Other fields use grid layout; if odd, last spans full width */}
                      {otherFields.length > 0 && (
                        <div className="grid gap-6 md:grid-cols-2">
                          {section.id === 'lifestyle-overview'
                            ? otherFields.map((field: PhaseField, idx: number) => {
                                // Make the 3rd sleep question and stress level span full width
                                const isSleepThird = field.id === ('sleepConsistency' as keyof FormData);
                                const isStress = field.id === ('stressLevel' as keyof FormData);
                                const wrapperClass = (isSleepThird || isStress) ? 'md:col-span-2' : '';
                                return (
                                  <div key={field.id as string} className={wrapperClass}>
                                    <FieldControl field={field} />
                                  </div>
                                );
                              })
                            : otherFields.map((field: PhaseField, idx: number) => {
                            const isLast = idx === otherFields.length - 1;
                            const isOdd = otherFields.length % 2 === 1;
                            const wrapperClass = isOdd && isLast ? 'md:col-span-2' : '';
                            return (
                              <div key={field.id as string} className={wrapperClass}>
                                <FieldControl field={field} />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  };

  const renderAllSections = () => {
    const allSections = getAllSections();

    return (
      <div className="space-y-4">
        {allSections.map((section, index) => renderSection(section, index, allSections))}
      </div>
    );
  };


  // Show configuration message if no phases are defined
  if (totalPhases === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 text-center">
        <div className="rounded-full bg-slate-100 p-4">
          <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Assessment Configuration</h2>
        <p className="text-slate-600 max-w-md">
          Phase definitions are currently being configured. The assessment phases will be available once the configuration is complete.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-73px)]">
      {/* Sidebar - Phase Navigation */}
      <aside className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white p-6 shrink-0 sticky top-[73px] z-30 overflow-y-auto max-h-[calc(100vh-73px)]">
        <div className="space-y-8">
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Assessment Phases</h3>
            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-600 transition-all duration-500 ease-in-out" 
                style={{ width: `${progressValue}%` }}
              />
            </div>
            <p className="text-[10px] font-medium text-slate-500 text-right">{Math.round(progressValue)}% Complete</p>
          </div>

          <nav className="space-y-1.5" role="tablist" aria-label="Assessment phases">
            {phaseDefinitions.map((phase, idx) => {
              const isActive = idx === activePhaseIdx;
              const isCompleted = isPhaseCompleted(idx) && idx <= maxUnlockedPhaseIdx;
              const isDisabled = idx > maxUnlockedPhaseIdx;

              return (
                <button
                  key={phase.id}
                  ref={(el) => { phaseRefs.current[idx] = el; }}
                  onClick={() => !isDisabled && setActivePhaseIdx(idx)}
                  disabled={isDisabled}
                  className={`group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-md shadow-slate-200'
                      : isCompleted
                      ? 'text-indigo-600 hover:bg-indigo-50'
                      : isDisabled
                      ? 'opacity-40 cursor-not-allowed'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold border transition-colors ${
                    isActive 
                      ? 'bg-white/20 border-white/20 text-white' 
                      : isCompleted
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-white border-slate-200 text-slate-400'
                  }`}>
                    {isCompleted ? <Check className="h-3 w-3" /> : idx + 1}
                  </span>
                  <span className="truncate flex-1 text-left">{phase.title}</span>
                  {!isDisabled && !isActive && !isCompleted && (
                    <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="pt-8 border-t border-slate-100 hidden lg:block">
            <div className="rounded-2xl bg-indigo-50 p-4 border border-indigo-100">
              <div className="flex items-center gap-2 text-indigo-700 mb-2">
                <Info className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Coach Note</span>
              </div>
              <p className="text-xs text-indigo-600 leading-relaxed">
                Complete each section to unlock the next phase. High movement quality is the priority for all new clients.
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
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

          {/* All sections content */}
          <section className="space-y-6">
            {renderAllSections()}

            {/* Show navigation buttons when the phase has content and we are not on the final phase */}
            {(activePhase.sections?.length ?? 0) > 0 && activePhaseIdx < totalPhases - 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 pt-8 mt-10">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={activePhaseIdx === 0}
                  className="h-12 px-6 rounded-xl font-semibold text-slate-600 hover:bg-white hover:text-slate-900"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Previous Phase
                </Button>

                <Button
                  onClick={handleNext}
                  className="h-12 px-8 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Next Phase
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Show "View Results" button when all assessments are completed (anywhere in phases 1-5) */}
            {activePhaseIdx >= 1 && activePhaseIdx < totalPhases - 1 && allAssessmentsCompleted && (
              <div className="flex items-center justify-center border-t border-slate-200 pt-8">
                <Button
                  onClick={handleViewResults}
                  className="h-14 px-10 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-xl shadow-emerald-100 transition-all hover:scale-[1.05] active:scale-[0.95]"
                >
                  📊 Generate Full Report
                </Button>
              </div>
            )}

            {/* Results phase - Assessment Complete */}
            {activePhase?.id === 'P7' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
                    <button
                      onClick={() => setReportView('client')}
                      className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${reportView === 'client' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                      aria-pressed={reportView === 'client'}
                    >
                      Client Report
                    </button>
                    <button
                      onClick={() => setReportView('coach')}
                      className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${reportView === 'coach' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                      aria-pressed={reportView === 'coach'}
                    >
                      Coach Plan
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="lg"
                          disabled={shareLoading}
                          className="rounded-xl border-slate-200 px-4 h-12"
                        >
                          <Share2 className="mr-2 h-4 w-4" />
                          Share
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 rounded-xl">
                        <DropdownMenuLabel>Share Assessment</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleShare} className="py-3">
                          System Share
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleEmailLink} className="py-3">
                          Email PDF Link
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleWhatsAppShare} className="py-3">
                          WhatsApp Message
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleCopyLink} className="py-3">
                          <Copy className="mr-2 h-4 w-4" />
                          Copy Report Link
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="lg"
                          disabled={shareLoading}
                          className="rounded-xl border-slate-200 px-4 h-12"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Export
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 rounded-xl">
                        <DropdownMenuLabel>Download Report</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleDownloadPdf} className="py-3">
                          Download as PDF
                        </DropdownMenuItem>
                        {reportView === 'client' && (
                          <DropdownMenuItem onClick={handleDownloadInteractiveHtml} className="py-3">
                            Download Interactive HTML
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={handlePrint} className="py-3">
                          Print Report
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button 
                      variant="ghost" 
                      size="lg" 
                      onClick={handleStartNewAssessment}
                      className="rounded-xl h-12"
                    >
                      🔄 New Client
                    </Button>
                  </div>
                </div>
                
                <div 
                  ref={reportRef} 
                  data-pdf-target 
                  className="rounded-3xl border border-slate-200 bg-white p-10 shadow-2xl shadow-slate-200/50 print:p-0 print:border-0 print:shadow-none"
                  style={{ 
                    minWidth: '100%',
                    maxWidth: '100%',
                    overflow: 'visible',
                    wordWrap: 'break-word',
                    boxSizing: 'border-box'
                  }}
                >
                  {reportView === 'client' ? (
                    <ClientReport
                      scores={scores}
                      roadmap={roadmap}
                      goals={Array.isArray(formData.clientGoals) ? formData.clientGoals : []}
                      bodyComp={bodyCompInterp ? { timeframeWeeks: bodyCompInterp.timeframeWeeks } : undefined}
                      formData={formData}
                    />
                  ) : (
                    <CoachReport plan={plan} scores={scores} bodyComp={bodyCompInterp} formData={formData} />
                  )}
                </div>
              </div>
            )}
          </section>
          
          <footer className="pt-12 pb-8 text-center text-[10px] font-bold uppercase tracking-widest text-slate-300">
            One Fitness Professional v2.1 • Confidential Client Data
          </footer>
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
      <AppShell 
        title="Fitness Assessment" 
        showDemoFill={true} 
        onDemoFill={handleDemoFill}
      >
        <PhaseFormContent demoTrigger={demoTrigger} />
      </AppShell>
    </FormProvider>
  );
};

export default MultiStepForm;