import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { PhaseSection } from '@/lib/phaseConfig';

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
  isMobile,
}: AssessmentSidebarProps) => {

  const handlePhaseClick = (idx: number, sections: PhaseSection[]) => {
    setIsReviewMode(true);
    setActivePhaseIdx(idx);
    if (sections.length > 0) {
      setExpandedSections({ [sections[0].id]: true });
      setActiveFieldIdx(0);
    }
    if (sections.length === 0 || isMobile) setSidebarOpen(false);
  };

  // Determine phase state for consistent rendering
  const getPhaseState = (idx: number, phase: { id: string }) => {
    const isActive = idx === activePhaseIdx;
    const isResultsPhase = phase.id === 'P7';
    const hasAnyCompleted = visiblePhases.some((p, i) =>
      i !== idx && p.id !== 'P7' && isPhaseCompleted(i)
    );
    const isCompleted = isResultsPhase
      ? false
      : (isPhaseCompleted(idx) && idx <= maxUnlockedPhaseIdx);
    const isDisabled = isResultsPhase
      ? !hasAnyCompleted
      : (idx > maxUnlockedPhaseIdx);
    return { isActive, isCompleted, isDisabled };
  };

  return (
    <>
      {/* ── Desktop sidebar ──────────────────────────────────────── */}
      <aside className={`w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white p-6 shrink-0 lg:sticky top-[64px] z-30 overflow-y-auto max-h-[calc(100vh-64px)] ${sidebarOpen ? 'block fixed inset-0 z-50 pt-20' : 'hidden lg:block'}`}>
        <div className="space-y-6">
          {/* Mobile close button */}
          <div className="flex items-center justify-between lg:hidden mb-4">
            <h3 className="text-lg font-bold text-slate-900">Navigation</h3>
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="h-9 w-9 rounded-full bg-slate-100">
              <X className="h-4 w-4 text-slate-600" />
            </Button>
          </div>

          {/* Vertical stepper */}
          <nav>
            {visiblePhases.map((phase, idx) => {
              const { isActive, isCompleted, isDisabled } = getPhaseState(idx, phase);
              const sections = (phase.sections || []) as PhaseSection[];
              const isLast = idx === visiblePhases.length - 1;

              // Connecting line is branded if THIS phase is completed
              const lineActive = isCompleted;

              return (
                <div key={phase.id} className="relative">
                  {/* Connecting line (except last phase) */}
                  {!isLast && (
                    <div
                      className={`absolute left-[15px] top-[32px] w-0.5 transition-colors duration-300 ${
                        lineActive ? 'bg-primary' : 'bg-slate-200'
                      }`}
                      style={{
                        height: isActive && sections.length > 0
                          ? `calc(100% - 16px)`
                          : '100%',
                      }}
                    />
                  )}

                  {/* Phase row */}
                  <button
                    onClick={() => !isDisabled && handlePhaseClick(idx, sections)}
                    disabled={isDisabled}
                    className={`relative flex w-full items-center gap-3 py-2.5 text-sm transition-colors ${
                      isActive
                        ? 'text-slate-900 font-bold'
                        : isCompleted
                          ? 'text-slate-700 font-medium'
                          : isDisabled
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-slate-500 font-medium hover:text-slate-700'
                    }`}
                  >
                    {/* Numbered circle */}
                    <span className={`relative z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                      isCompleted
                        ? 'bg-primary text-primary-foreground'
                        : isActive
                          ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                          : isDisabled
                            ? 'bg-slate-100 text-slate-300'
                            : 'bg-slate-100 text-slate-400'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="truncate text-left">{phase.title}</span>
                  </button>

                  {/* Section sub-list */}
                  {isActive && sections.length > 0 && (
                    <div className="ml-[15px] pl-6 border-l-2 border-primary/20 space-y-0.5 pb-2 animate-in slide-in-from-top-2 duration-300">
                      {sections.map(sec => {
                        const isExpanded = expandedSections[sec.id];
                        const isSecComp = isSectionCompleted(sec);
                        return (
                          <button
                            key={sec.id}
                            onClick={() => toggleSection(sec.id)}
                            className={`flex w-full items-center py-1.5 text-xs transition-colors ${
                              isExpanded
                                ? 'text-slate-900 font-semibold'
                                : isSecComp
                                  ? 'text-slate-600'
                                  : 'text-slate-400'
                            } hover:text-slate-900`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full mr-2.5 shrink-0 transition-colors ${
                              isExpanded ? 'bg-primary' : isSecComp ? 'bg-primary/40' : 'bg-slate-200'
                            }`} />
                            <span className="truncate">{sec.title}</span>
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

      {/* ── Mobile bottom phase strip ────────────────────────────── */}
      <MobilePhaseStrip
        visiblePhases={visiblePhases}
        activePhaseIdx={activePhaseIdx}
        getPhaseState={getPhaseState}
        onPhaseClick={(idx) => {
          const sections = (visiblePhases[idx].sections || []) as PhaseSection[];
          handlePhaseClick(idx, sections);
        }}
      />
    </>
  );
};

// ── Mobile bottom strip — horizontal connected stepper ────────────

interface MobilePhaseStripProps {
  visiblePhases: { id: string; title: string; sections?: PhaseSection[] }[];
  activePhaseIdx: number;
  getPhaseState: (idx: number, phase: { id: string }) => {
    isActive: boolean;
    isCompleted: boolean;
    isDisabled: boolean;
  };
  onPhaseClick: (idx: number) => void;
}

const MobilePhaseStrip: React.FC<MobilePhaseStripProps> = ({
  visiblePhases,
  activePhaseIdx,
  getPhaseState,
  onPhaseClick,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to keep active phase visible
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const activeBtn = el.querySelector(`[data-phase-idx="${activePhaseIdx}"]`) as HTMLElement | null;
    if (activeBtn) {
      const left = activeBtn.offsetLeft - el.offsetWidth / 2 + activeBtn.offsetWidth / 2;
      el.scrollTo({ left, behavior: 'smooth' });
    }
  }, [activePhaseIdx]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-slate-200 safe-area-bottom">
      <div className="relative">
        {/* Fade edges */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10" />

        <div
          ref={scrollRef}
          className="flex items-center gap-0 px-6 py-3 overflow-x-auto scrollbar-hide"
        >
          {visiblePhases.map((phase, idx) => {
            const { isActive, isCompleted, isDisabled } = getPhaseState(idx, phase);
            const isLast = idx === visiblePhases.length - 1;
            // Line between this phase and the next is branded if this phase is completed
            const lineActive = isCompleted;

            return (
              <React.Fragment key={phase.id}>
                <button
                  data-phase-idx={idx}
                  onClick={() => !isDisabled && onPhaseClick(idx)}
                  disabled={isDisabled}
                  className="flex flex-col items-center gap-1 shrink-0"
                >
                  {/* Circle */}
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                    isCompleted
                      ? 'bg-primary text-primary-foreground'
                      : isActive
                        ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                        : isDisabled
                          ? 'bg-slate-100 text-slate-300'
                          : 'bg-slate-100 text-slate-400'
                  }`}>
                    {idx + 1}
                  </span>
                  {/* Title — only for active */}
                  {isActive && (
                    <span className="text-[10px] font-bold text-slate-900 whitespace-nowrap max-w-[72px] truncate">
                      {phase.title}
                    </span>
                  )}
                </button>

                {/* Connecting line */}
                {!isLast && (
                  <div className={`h-0.5 w-6 shrink-0 mx-1 transition-colors duration-300 ${
                    lineActive ? 'bg-primary' : 'bg-slate-200'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
