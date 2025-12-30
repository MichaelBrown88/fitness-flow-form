import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Share2, 
  Download, 
  Loader2 
} from 'lucide-react';
import ClientReport from '@/components/reports/ClientReport';
import CoachReport from '@/components/reports/CoachReport';
import { useAuth } from '@/contexts/AuthContext';
import { type FormData } from '@/contexts/FormContext';
import { type ScoreSummary } from '@/lib/scoring';
import { generateBodyCompInterpretation } from '@/lib/recommendations';

interface AssessmentResultsProps {
  formData: FormData;
  scores: ScoreSummary;
  roadmap: import('@/lib/scoring').RoadmapPhase[];
  plan: import('@/lib/recommendations').CoachPlan;
  bodyCompInterp: import('@/lib/recommendations').BodyCompInterpretation | null;
  savingId: string | null;
  onStartNew: () => void;
  onShare: (view: 'client' | 'coach') => void;
  onDownloadPdf: (view: 'client' | 'coach') => void;
  onDownloadHtml: () => void;
  onPrint: (view: 'client' | 'coach') => void;
  onCopyLink: (view: 'client' | 'coach') => void;
  onEmailLink: (view: 'client' | 'coach') => void;
  onWhatsAppShare: (view: 'client' | 'coach') => void;
  shareLoading: boolean;
}

const AssessmentResults: React.FC<AssessmentResultsProps> = ({
  formData,
  scores,
  roadmap,
  plan,
  bodyCompInterp,
  savingId,
  onStartNew,
  onShare,
  onDownloadPdf,
  onDownloadHtml,
  onPrint,
  onCopyLink,
  onEmailLink,
  onWhatsAppShare,
  shareLoading
}) => {
  const [reportView, setReportView] = useState<'client' | 'coach'>('client');
  const reportRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
          <button 
            onClick={() => setReportView('client')} 
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${reportView === 'client' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Client Report
          </button>
          <button 
            onClick={() => setReportView('coach')} 
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${reportView === 'coach' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Coach Plan
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="lg" className="rounded-xl px-4 h-12" disabled={shareLoading}>
                {shareLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
                Share
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuItem onClick={() => onShare(reportView)} className="py-3 text-sm font-medium">System Share</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEmailLink(reportView)} className="py-3 text-sm font-medium">Email PDF Link</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onWhatsAppShare(reportView)} className="py-3 text-sm font-medium">WhatsApp Message</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCopyLink(reportView)} className="py-3 text-sm font-medium">Copy Report Link</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="lg" className="rounded-xl px-4 h-12" disabled={shareLoading}>
                {shareLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuItem onClick={() => onDownloadPdf(reportView)} className="py-3 text-sm font-medium">Download as PDF</DropdownMenuItem>
              {reportView === 'client' && (
                <DropdownMenuItem onClick={onDownloadHtml} className="py-3 text-sm font-medium">Download Interactive HTML</DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onPrint(reportView)} className="py-3 text-sm font-medium">Print Report</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="lg" onClick={onStartNew} className="rounded-xl h-12 text-sm font-bold">
            🔄 New Client
          </Button>
        </div>
      </div>

      <div 
        ref={reportRef} 
        data-pdf-target 
        className="rounded-3xl border border-slate-200 bg-white p-6 lg:p-10 shadow-2xl shadow-slate-200/50" 
        style={{ minWidth: '100%', maxWidth: '100%', overflow: 'visible' }}
      >
        {reportView === 'client' ? (
          <ClientReport 
            scores={scores} 
            roadmap={roadmap} 
            goals={Array.isArray(formData.clientGoals) ? formData.clientGoals : []} 
            bodyComp={bodyCompInterp ? { timeframeWeeks: bodyCompInterp.timeframeWeeks } : undefined} 
            formData={formData} 
            plan={plan} 
            highlightCategory={sessionStorage.getItem('highlightCategory') || undefined}
          />
        ) : (
          <CoachReport 
            plan={plan} 
            scores={scores} 
            bodyComp={bodyCompInterp} 
            formData={formData} 
            highlightCategory={sessionStorage.getItem('highlightCategory') || undefined}
          />
        )}
      </div>
    </div>
  );
};

export default AssessmentResults;

