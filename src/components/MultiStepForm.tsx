import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { FormProvider, useFormContext, type FormData } from '@/contexts/FormContext';
import { Timestamp } from 'firebase/firestore';
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
import { downloadElementAsPdf } from '@/lib/pdf';
import { generateInteractiveHtml } from '@/lib/htmlExport';
import { useSettings } from '@/hooks/useSettings';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAssessmentNavigation } from '@/hooks/useAssessmentNavigation';
import { useAssessmentSave } from '@/hooks/useAssessmentSave';
import { useCameraHandler } from '@/hooks/useCameraHandler';
import { CameraCapture } from './camera/CameraCapture';
import { PostureCompanionModal } from './camera/PostureCompanionModal';
import { InBodyCompanionModal } from './camera/InBodyCompanionModal';
import { SingleFieldFlow } from './assessment/SingleFieldFlow';
import { FieldControl } from './assessment/FieldControl';

// Lazy load results component
const AssessmentResults = React.lazy(() => import('./assessment/AssessmentResults'));

import { processInBodyScan } from '@/lib/ai/ocrEngine';
import { compressImageForDisplay } from '@/lib/utils/imageCompression';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

type FieldValue = string | string[];
// ...

type IntakeSection = {
  id: string;
  title: string;
  fields: PhaseField[];
};

type SectionType = PhaseSection | IntakeSection;

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
  const { user, profile, orgSettings } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Determine client name from storage or form
  const clientNameFromStorage = useMemo(() => {
    try {
      const partialData = sessionStorage.getItem('partialAssessment');
      if (partialData) return JSON.parse(partialData).clientName as string;
      const prefillData = sessionStorage.getItem('prefillClientData');
      if (prefillData) return JSON.parse(prefillData).clientName as string;
    } catch {}
    return '';
  }, []);

  const activeClientName = clientNameFromStorage || formData.fullName || '';
  
  // Use navigation hook
  const navigation = useAssessmentNavigation({ formData, orgSettings });
  const {
    activePhaseIdx,
    setActivePhaseIdx,
    visiblePhases,
    totalPhases,
    activePhase,
    isResultsPhase,
    isPartialAssessment,
    setIsPartialAssessment,
    partialCategory,
    setPartialCategory,
    isFieldVisible,
    isSectionCompleted,
    isPhaseCompleted,
    progressValue,
  } = navigation;

  // Legacy visiblePhases calculation (now in hook, but keeping for compatibility)
  const visiblePhasesLegacy = useMemo(() => {
    // Mapping of assessment module keys to section IDs
    const assessmentToSectionMap: Record<string, string[]> = {
      parq: ['parq'],
      inbody: ['body-comp'],
      fitness: ['fitness-assessment'],
      posture: ['posture'],
      overheadSquat: ['overhead-squat'],
      hinge: ['hinge-assessment'],
      lunge: ['lunge-assessment'],
      mobility: ['mobility'],
      strength: ['strength-endurance'],
      lifestyle: ['lifestyle-overview'],
    };

    const modules = orgSettings?.modules;
    let phases = phaseDefinitions;
    
    // 1. Filter phases and sections by granular assessment toggles
    if (modules) {
      phases = phaseDefinitions.map(phase => {
        // Always show structural phases (P0, P6, P7)
        if (phase.id === 'P0' || phase.id === 'P6' || phase.id === 'P7') {
          return phase;
        }
        
        // Filter sections within each phase based on enabled assessments
        const filteredSections = (phase.sections || []).filter(section => {
          // Find which assessment module(s) this section belongs to
          const enabledAssessments = Object.entries(assessmentToSectionMap)
            .filter(([assessmentKey, sectionIds]) => sectionIds.includes(section.id))
            .map(([assessmentKey]) => assessmentKey);
          
          // If this section belongs to any enabled assessment, show it
          return enabledAssessments.some(assessmentKey => modules[assessmentKey as keyof typeof modules] === true);
        });
        
        // If phase has no enabled sections (and isn't a structural phase), exclude it
        if (filteredSections.length === 0) {
          return null;
        }
        
        return {
          ...phase,
          sections: filteredSections
        } as typeof phase;
      }).filter((p): p is NonNullable<typeof p> => p !== null);
    }

    // 2. Then, filter further if in partial assessment mode
    if (!isPartialAssessment || !partialCategory) {
      return phases;
    }
    
    // Map category to allowed phase IDs and specific section IDs (updated for new phase structure)
    const categoryConfig: Record<string, { phaseIds: PhaseId[], sectionIds?: string[] }> = {
      'inbody': { 
        phaseIds: ['P0', 'P2', 'P7'], 
        sectionIds: ['basic-client-info', 'parq', 'body-comp'] 
      },
      'posture': { 
        phaseIds: ['P0', 'P4', 'P7'], 
        sectionIds: ['basic-client-info', 'parq', 'posture', 'overhead-squat', 'hinge-assessment', 'lunge-assessment', 'mobility'] 
      },
      'fitness': { 
        phaseIds: ['P0', 'P3', 'P7'], 
        sectionIds: ['basic-client-info', 'parq', 'fitness-assessment'] 
      },
      'strength': { 
        phaseIds: ['P0', 'P5', 'P7'], 
        sectionIds: ['basic-client-info', 'parq', 'strength-endurance'] 
      },
      'lifestyle': { 
        phaseIds: ['P0', 'P1', 'P7'], 
        sectionIds: ['basic-client-info', 'parq', 'lifestyle-overview'] 
      },
    };
    
    const config = categoryConfig[partialCategory] || { phaseIds: ['P0'] };
    
    return phases
      .filter(phase => (config.phaseIds as string[]).includes(phase.id))
      .map(phase => {
        if (!config.sectionIds) return phase;
        
        // Filter sections based on enabled assessments (granular control)
        const filteredSections = (phase.sections || []).filter(section => {
          if (!config.sectionIds) return true;
          if (!config.sectionIds.includes(section.id)) return false;
          
          // Additional granular filtering: check if the assessment for this section is enabled
          if (modules) {
            const sectionAssessments = Object.entries(assessmentToSectionMap)
              .filter(([_, sectionIds]) => sectionIds.includes(section.id))
              .map(([assessmentKey]) => assessmentKey);
            
            // If this section's assessment is disabled, hide it
            if (sectionAssessments.length > 0 && !sectionAssessments.some(key => modules[key as keyof typeof modules])) {
              return false;
            }
          }
          
          return true;
        });
        if (filteredSections.length === 0 && phase.id !== 'P7') return null;
        return {
          ...phase,
          sections: filteredSections
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
  }, [isPartialAssessment, partialCategory, orgSettings?.modules]);

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

    // If there are NO required fields, ALL fields must be filled to count as "completed"
    // This prevents auto-advancing after just one field (like lifestyle phase)
    return visibleFields.every(field => {
      const value = formData[field.id];
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null && value !== '';
    });
  }, [formData, isFieldVisible]);

  const isPhaseCompleted = useCallback((phaseIdx: number) => {
    const phase = visiblePhases[phaseIdx];
    if (!phase) return false;
    const sections = phase.sections || [];
    if (sections.length === 0) return true;
    return sections.every(sec => isSectionCompleted(sec as PhaseSection));
  }, [visiblePhases, isSectionCompleted]);

  // Load current assessment data when starting partial assessment
  useEffect(() => {
    const loadCurrentAssessment = async () => {
      if (!user || !activeClientName) return;

      // EXCLUSIVE COACH USE: Never pre-fill previous assessment results for a fresh assessment.
      // This ensures coaches always start with a clean slate for each new session.
      if (!isPartialAssessment) {
        console.log(`[MultiStepForm] Starting fresh assessment for ${activeClientName}.`);
        return;
      }

      try {
        const { getCurrentAssessment } = await import('@/services/assessmentHistory');
        const current = await getCurrentAssessment(user.uid, activeClientName);
        if (current?.formData) {
          console.log(`[MultiStepForm] Pre-filling from current assessment for ${activeClientName}`);
          
          // Determine which fields belong to the current partial assessment category
          let fieldsToSkip: string[] = [];
          if (isPartialAssessment && partialCategory) {
            const categoryConfig: Record<string, string[]> = {
              'inbody': ['inbody', 'segmental', 'bmr', 'visceral', 'waistHip'],
              'posture': ['posture', 'ohs', 'hinge', 'lunge', 'mobility'],
              'fitness': ['cardio', 'ymca', 'treadmill'],
              'strength': ['pushup', 'squat', 'plank', 'grip', 'chairStand', 'dynamometer'],
              'lifestyle': ['activityLevel', 'stepsPerDay', 'sedentaryHours', 'workHours', 'sleep', 'stress', 'nutrition', 'hydration', 'caffeine'],
            };
            fieldsToSkip = categoryConfig[partialCategory] || [];
          }

          // Merge current data into form context, skipping fields in the partial category
          const updates: Partial<FormData> = {};
          Object.keys(current.formData).forEach((key) => {
            const value = current.formData[key as keyof FormData];
            if (value !== undefined && value !== null) {
              // Only pre-fill if it's NOT a field we are trying to update in partial mode
              const shouldSkip = fieldsToSkip.some(prefix => key.toLowerCase().includes(prefix.toLowerCase()));
              if (!isPartialAssessment || !shouldSkip) {
                updates[key as keyof FormData] = value as any; // Cast back to any because updateFormData expects specific types
              }
            }
          });
          updateFormData(updates);
        }
      } catch (e) {
        console.error('Failed to load current assessment:', e);
      }
    };
    loadCurrentAssessment();
  }, [user, activeClientName, isPartialAssessment, partialCategory]); // Run when user is ready or client name changes (e.g. from storage)
  
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [recentlyCompletedSections, setRecentlyCompletedSections] = useState<Set<string>>(new Set());
  const phaseRefs = useRef<Record<number, HTMLButtonElement | null>>({});
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

  const totalPhases = visiblePhases.length;
  const activePhase = useMemo(() => {
    return visiblePhases[activePhaseIdx] || {
      id: 'empty',
      title: 'No Phases Available',
      summary: 'Phase definitions are currently being loaded or configured.',
      sections: []
    };
  }, [activePhaseIdx, visiblePhases]);

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

  // Determine progress percentage
  const progressValue = useMemo(() => {
    if (isPartialAssessment) return 0; // Hide progress for partial updates
    const completed = visiblePhases.filter((_, i) => isPhaseCompleted(i)).length;
    return (completed / (totalPhases - 1)) * 100;
  }, [visiblePhases, totalPhases, isPhaseCompleted, isPartialAssessment]);

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
    
    // For client-side PDF fallback, we need the element to be visible
    // This is less reliable now that results are in a separate component
    // but we'll try to find it by the data-pdf-target attribute
    const reportEl = document.querySelector('[data-pdf-target]') as HTMLElement;
    if (!reportEl) throw new Error('Report element not found');
    
    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).default;
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const canvasEl = await html2canvas(reportEl, {
      scale: 3,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      windowWidth: reportEl.scrollWidth,
      windowHeight: reportEl.scrollHeight,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.querySelector(`[data-pdf-target]`) as HTMLElement;
        if (clonedElement) {
          clonedElement.style.backgroundColor = '#ffffff';
          clonedElement.style.width = `${reportEl.scrollWidth}px`;
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

  const handlePrint = useCallback(async (view: 'client' | 'coach') => {
    try {
      setShareLoading(true);
      const { blob } = await fetchReportPdfBlob(view);
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
  }, [fetchReportPdfBlob, toast]);

  const handleShare = useCallback(async (view: 'client' | 'coach') => {
    try {
      setShareLoading(true);
      let shareUrl = window.location.origin;
      if (user && savingId) {
          const artifacts = await ensureShareArtifacts(view);
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
  }, [ensureShareArtifacts, toast, user, savingId]);

  const handleEmailLink = useCallback(async (view: 'client' | 'coach') => {
    const email = (formData.email || '').trim();
    if (!email) {
      toast({ title: 'Client email missing', variant: 'destructive' });
      return;
    }
    if (!savingId) return;
    try {
      setShareLoading(true);
      await sendReportEmail({ assessmentId: savingId, view, to: email, clientName: formData.fullName });
      toast({ title: 'Report emailed', description: `Sent to ${email}` });
    } catch (error) {
      toast({ title: 'Email failed', variant: 'destructive' });
    } finally {
      setShareLoading(false);
    }
  }, [formData.email, formData.fullName, savingId, toast]);

  const handleWhatsAppShare = useCallback(async (view: 'client' | 'coach') => {
    try {
      setShareLoading(true);
      const artifacts = await ensureShareArtifacts(view);
      window.open(`https://wa.me/?text=${encodeURIComponent(artifacts.whatsappText)}`, '_blank');
    } catch (error) {
      toast({ title: 'WhatsApp share failed', variant: 'destructive' });
    } finally {
      setShareLoading(false);
    }
  }, [ensureShareArtifacts, toast]);

  const handleCopyLink = useCallback(async (view: 'client' | 'coach') => {
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

  const handleDownloadPdf = useCallback(async (view: 'client' | 'coach') => {
    const safeName = (formData.fullName || 'report').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    try {
      setShareLoading(true);
      const { blob } = await fetchReportPdfBlob(view);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeName}-${view}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast({ title: 'PDF downloaded' });
    } catch (error) {
      toast({ title: 'Download failed', variant: 'destructive' });
    } finally {
      setShareLoading(false);
    }
  }, [fetchReportPdfBlob, formData.fullName, toast]);

  const handleDownloadInteractiveHtml = useCallback(async () => {
    try {
      setShareLoading(true);
      const { generateBodyCompInterpretation } = await import('@/lib/recommendations');
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
      console.error('HTML download failed', error);
      toast({ title: 'Download failed', variant: 'destructive' });
    } finally {
      setShareLoading(false);
    }
  }, [formData, scores, roadmap, toast]);

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
      
      toast({ title: `${currentView.toUpperCase()} captured`, description: "Processing image alignment..." });
      
      try {
        setIsProcessingOcr(true); // Re-use OCR loading mask for local analysis
        
        // Use unified processing system (ONE FLOW FOR ALL SOURCES)
        toast({ title: "Processing posture...", description: "Aligning, calculating, and analyzing..." });
        const { processPostureImage } = await import('@/services/postureProcessing');
        const processed = await processPostureImage(imageSrc, currentView, undefined, 'this-device');
        
        // Compress final image for storage/form
        const compressed = await compressImageForDisplay(processed.imageWithDeviations, 800, 0.8);
        
        // Use processed analysis
        const analysis = processed.analysis;
        
        // Map analysis to form
        const suggestions: Partial<FormData> = {};
        
        // Store the final processed image in the form
        const imageField = `postureImage${currentView.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')}` as keyof FormData;
        (suggestions as any)[imageField] = compressed.compressed;

        if (currentView === 'side-right' || currentView === 'side-left') {
          suggestions.postureHeadOverall = [analysis.forward_head.status.toLowerCase().includes('neutral') ? 'neutral' : 'forward-head'];
          suggestions.postureBackOverall = [analysis.kyphosis.status.toLowerCase().includes('severe') ? 'increased-kyphosis' : 'neutral'];
        } else if (currentView === 'front') {
          suggestions.postureShouldersOverall = [analysis.shoulder_alignment.status.toLowerCase().includes('neutral') ? 'neutral' : 'rounded'];
        }

        updateFormData(suggestions);

        if (postureStep < views.length - 1) {
          setPostureStep(prev => prev + 1);
        } else {
          setShowCamera(false);
          toast({ title: "Posture analysis complete", description: "Aligned images and findings have been applied." });
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
            // No auto-results for partial assessments anymore
            toast({ title: "Data applied", description: "You can now review the fields and click Update Report when ready." });
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
          category as 'inbody' | 'posture' | 'fitness' | 'strength' | 'lifestyle',
          profile?.organizationId
          );
          
          // Update client profile with last assessment date for this category
          const { createOrUpdateClientProfile } = await import('@/services/clientProfiles');
          const updateData: Record<string, Timestamp> = {};
          const now = Timestamp.now();
          
          if (category === 'inbody') updateData.lastInBodyDate = now;
          else if (category === 'posture') updateData.lastPostureDate = now;
          else if (category === 'fitness') updateData.lastFitnessDate = now;
          else if (category === 'strength') updateData.lastStrengthDate = now;
          else if (category === 'lifestyle') updateData.lastLifestyleDate = now;
          
          if (Object.keys(updateData).length > 0) {
            await createOrUpdateClientProfile(user.uid, clientName, updateData, profile?.organizationId);
          }
          
          // Set highlight category for the report
          sessionStorage.setItem('highlightCategory', category);
          
          // Clear partial assessment flag
          sessionStorage.removeItem('partialAssessment');
        } else {
          // Full assessment
          assessmentId = await saveCoachAssessment(user.uid, user.email, formData, scores.overall, profile?.organizationId);
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
    (!isReviewMode && !allAssessmentsCompleted) && !isPartialAssessment, 
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

  const handleViewResults = () => {
    // If we're already at the results phase, don't do anything
    if (activePhaseIdx === totalPhases - 1) return;
    
    // Attempt to save before showing results
    void handleSaveToDashboard();
    
    setIsReviewMode(false);
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
            const key = f.id as keyof FormData;
            if (f.type === 'parq') {
              fieldUpdates[key] = 'completed' as any; // Still need any because TS doesn't know f.id matches parq field
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
              (fieldUpdates as any)[key] = raw;
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
      {!isPartialAssessment && (
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
                      className={`group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all ${isActive ? 'bg-slate-900 text-white shadow-md' : isCompleted ? 'text-primary hover:bg-brand-light' : isDisabled ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold border ${isActive ? 'bg-white/20 border-white/20' : isCompleted ? 'bg-primary border-primary text-white' : isDisabled ? 'bg-slate-100 border-slate-200 text-slate-300' : 'bg-white border-slate-200 text-slate-400'}`}>
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
                              className={`flex w-full items-center justify-between py-2 text-xs font-medium transition-colors ${isExpanded ? 'text-primary' : isSecComp ? 'text-slate-700' : 'text-slate-400'} hover:text-primary`}
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
      )}

      <main className={`flex-1 bg-slate-50/50 p-6 lg:p-10 overflow-y-auto ${isPartialAssessment ? 'w-full' : ''}`}>
        <div className="mx-auto max-w-3xl space-y-8">
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-primary mb-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{activePhase.id}</span>
              <div className="h-px w-8 bg-brand-light"></div>
              {isPartialAssessment && <span className="text-[10px] font-black uppercase tracking-widest bg-brand-light px-2 py-0.5 rounded text-primary">Quick Update: {partialCategory}</span>}
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">{activePhase.title}</h2>
            <p className="text-slate-500 text-lg leading-relaxed max-w-2xl">{activePhase.summary}</p>
          </section>

          <section className="space-y-6">
            {renderAllSections()}
            
            {/* Show "Update Live Report" or "Generate Full Report" only when everything is truly finished */}
            {activePhaseIdx >= 1 && activePhaseIdx < totalPhases - 1 && allAssessmentsCompleted && (
              <div className="flex items-center justify-center border-t border-slate-200 pt-8">
                <Button onClick={handleViewResults} className="h-14 px-10 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-xl transition-all hover:scale-[1.05]">
                  {isPartialAssessment ? '📊 Update Live Report' : '📊 Generate Full Report'}
                </Button>
              </div>
            )}

            {/* Show "Preview Results" only for partial assessments */}
            {isPartialAssessment && activePhaseIdx >= 1 && activePhaseIdx < totalPhases - 1 && !allAssessmentsCompleted && anyAssessmentCompleted && (
              <div className="flex items-center justify-center border-t border-slate-200 pt-8">
                <Button variant="outline" onClick={handleViewResults} className="h-14 px-10 rounded-2xl border-primary/20 text-primary font-bold hover:bg-brand-light transition-all">
                  📊 Update Live Report
                </Button>
              </div>
            )}

            {activePhase?.id === 'P7' && (
              <React.Suspense fallback={
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-sm font-black uppercase tracking-widest text-slate-400">Finalizing Report...</p>
                  </div>
              }>
                <AssessmentResults
                  formData={formData}
                      scores={scores} 
                      roadmap={roadmap} 
                      plan={plan} 
                  bodyCompInterp={bodyCompInterp}
                  savingId={savingId}
                  onStartNew={handleStartNewAssessment}
                  onShare={(view) => {
                    handleShare(view);
                  }}
                  onDownloadPdf={(view) => {
                    handleDownloadPdf(view);
                  }}
                  onDownloadHtml={handleDownloadInteractiveHtml}
                  onPrint={(view) => {
                    handlePrint(view);
                  }}
                  onCopyLink={(view) => {
                    handleCopyLink(view);
                  }}
                  onEmailLink={(view) => {
                    handleEmailLink(view);
                  }}
                  onWhatsAppShare={(view) => {
                    handleWhatsAppShare(view);
                  }}
                  shareLoading={shareLoading}
                    />
              </React.Suspense>
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
              <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
              <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-primary to-primary/60 animate-pulse flex items-center justify-center">
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
              <Scan className="h-5 w-5 text-primary" />
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
                    <span className="text-[9px] font-black uppercase tracking-widest text-primary/70 mb-2">
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

