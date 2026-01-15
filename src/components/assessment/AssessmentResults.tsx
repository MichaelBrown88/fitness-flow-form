import React, { useRef, useState, useCallback, useEffect, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Loader2,
  Eye,
  Link as LinkIcon
} from 'lucide-react';
const ClientReport = lazy(() => import('@/components/reports/ClientReport'));
const CoachReport = lazy(() => import('@/components/reports/CoachReport'));
import { useAuth } from '@/hooks/useAuth';
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
  onCopyLink,
  onEmailLink,
  onWhatsAppShare,
  shareLoading
}) => {
  const navigate = useNavigate();
  const [reportView, setReportView] = useState<'client' | 'coach'>('client');
  const reportRef = useRef<HTMLDivElement | null>(null);
  const { user } = useAuth();
  
  // Check if we're in edit mode (just updated an assessment)
  // If lastUpdatedAssessmentId exists in sessionStorage and matches savingId, we're in edit mode
  const lastUpdatedAssessmentId = typeof window !== 'undefined' && savingId
    ? (() => {
        const stored = sessionStorage.getItem('lastUpdatedAssessmentId');
        // If stored ID matches savingId, we're in edit mode
        return stored === savingId ? stored : null;
      })()
    : null;
  
  const handleViewReport = () => {
    if (!user || !lastUpdatedAssessmentId) return;
    sessionStorage.removeItem('lastUpdatedAssessmentId');
    navigate(`/coach/assessments/${lastUpdatedAssessmentId}`);
  };

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
          {/* Primary: Copy Live Link Button */}
          <Button 
            onClick={() => onCopyLink(reportView)}
            size="lg" 
            className="bg-indigo-600 text-white gap-2 shadow-lg hover:bg-indigo-700 rounded-xl px-4 h-12" 
            disabled={shareLoading}
          >
            {shareLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
            Copy Live Link
          </Button>

          {/* Secondary: Share Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="lg" className="rounded-xl px-4 h-12" disabled={shareLoading}>
                {shareLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
                Share
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuItem onClick={() => onShare(reportView)} className="py-3 text-sm font-medium">System Share</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEmailLink(reportView)} className="py-3 text-sm font-medium">Email Link</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onWhatsAppShare(reportView)} className="py-3 text-sm font-medium">WhatsApp Message</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>


          {lastUpdatedAssessmentId && (
            <Button 
              variant="outline" 
              size="lg" 
              onClick={handleViewReport}
              className="rounded-xl h-12 text-sm font-bold"
            >
              <Eye className="mr-2 h-4 w-4" />
              View Updated Report
            </Button>
          )}
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
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm font-black uppercase tracking-widest text-slate-400">Loading Report...</p>
          </div>
        }>
          {reportView === 'client' ? (
            <ClientReport 
              scores={scores} 
              goals={Array.isArray(formData.clientGoals) ? formData.clientGoals : []} 
              formData={formData} 
              plan={plan} 
              standalone={false}
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
        </Suspense>
      </div>
    </div>
  );
};

export default AssessmentResults;

