import React from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Check, X } from 'lucide-react';
import type { PhaseField, PhaseSection } from '@/lib/phaseConfig';

interface AssessmentSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  progressValue: number;
  visiblePhases: {
    id: string;
    title: string;
    sections?: PhaseSection[];
  }[];
  activePhaseIdx: number;
  setActivePhaseIdx: (idx: number) => void;
  isPhaseCompleted: (idx: number) => boolean;
  maxUnlockedPhaseIdx: number;
  expandedSections: Record<string, boolean>;
  setExpandedSections: (sections: Record<string, boolean>) => void;
  isSectionCompleted: (section: PhaseSection) => boolean;
  toggleSection: (sectionId: string) => void;
  setIsReviewMode: (isReview: boolean) => void;
  setActiveFieldIdx: (idx: number) => void;
  isMobile: boolean;
}

export const AssessmentSidebar = ({
  sidebarOpen,
  setSidebarOpen,
  progressValue,
  visiblePhases,
  activePhaseIdx,
  setActivePhaseIdx,
  isPhaseCompleted,
  maxUnlockedPhaseIdx,
  expandedSections,
  setExpandedSections,
  isSectionCompleted,
  toggleSection,
  setIsReviewMode,
  setActiveFieldIdx,
  isMobile
}: AssessmentSidebarProps) => {
  return (
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
  );
};
