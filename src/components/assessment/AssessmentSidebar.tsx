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
  timeEstimate?: string;
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
  isMobile,
  timeEstimate,
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

  const activePhase = visiblePhases[activePhaseIdx];
  const activeSections = (activePhase?.sections || []) as PhaseSection[];
  const completedPhases = visiblePhases.filter((_, i) => isPhaseCompleted(i)).length;
  const totalPhases = visiblePhases.filter(p => p.id !== 'P7').length;

  return (
    <>
      {/* Desktop sidebar — compact progress bar layout */}
      <aside className={`w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-border bg-background p-5 shrink-0 lg:sticky top-[64px] z-30 overflow-y-auto max-h-[calc(100vh-64px)] ${sidebarOpen ? 'block fixed inset-0 z-50 pt-20' : 'hidden lg:block'}`}>
        {/* Mobile close button */}
        <div className="flex items-center justify-between lg:hidden mb-4">
          <h3 className="text-lg font-bold text-foreground">Navigation</h3>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="h-9 w-9 rounded-full bg-muted">
            <X className="h-4 w-4 text-foreground-secondary" />
          </Button>
        </div>

        {/* Progress bar + label */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
              Progress
            </span>
            <span className="text-xs font-bold text-foreground-secondary">
              {Math.round(progressValue)}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressValue}%` }}
            />
          </div>
          {timeEstimate && (
            <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">{timeEstimate}</p>
          )}
        </div>

        {/* Phase list (compact) */}
        <div className="space-y-1 mb-4">
          {visiblePhases.map((phase, idx) => {
            const { isActive, isCompleted, isDisabled } = getPhaseState(idx, phase);
            return (
              <button
                key={phase.id}
                onClick={() => !isDisabled && handlePhaseClick(idx, (phase.sections || []) as PhaseSection[])}
                disabled={isDisabled}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-foreground font-bold'
                    : isCompleted
                      ? 'text-foreground-secondary font-medium hover:bg-muted/50'
                      : isDisabled
                        ? 'text-muted-foreground/60 cursor-not-allowed'
                        : 'text-muted-foreground font-medium hover:bg-muted/50'
                }`}
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  isCompleted
                    ? 'bg-primary text-primary-foreground'
                    : isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                }`}>
                  {isCompleted ? '✓' : idx + 1}
                </span>
                <span className="truncate text-left text-xs">{phase.title}</span>
              </button>
            );
          })}
        </div>

        {/* Active phase sections */}
        {activeSections.length > 0 && (
          <div className="border-t border-border pt-3">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground mb-2">
              {activePhase.title}
            </p>
            <div className="space-y-0.5">
              {activeSections.map(sec => {
                const isExpanded = expandedSections[sec.id];
                const isSecComp = isSectionCompleted(sec);
                return (
                  <button
                    key={sec.id}
                    onClick={() => toggleSection(sec.id)}
                    className={`flex w-full items-center py-1.5 px-2 rounded text-xs transition-colors ${
                      isExpanded
                        ? 'text-foreground font-semibold bg-muted/50'
                        : isSecComp
                          ? 'text-muted-foreground'
                          : 'text-muted-foreground'
                    } hover:text-foreground hover:bg-muted/50`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full mr-2 shrink-0 ${
                      isExpanded ? 'bg-primary' : isSecComp ? 'bg-primary/40' : 'bg-muted'
                    }`} />
                    <span className="truncate">{sec.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </aside>

      {/* Mobile bottom phase strip */}
      <MobilePhaseStrip
        visiblePhases={visiblePhases}
        activePhaseIdx={activePhaseIdx}
        progressValue={progressValue}
        getPhaseState={getPhaseState}
        onPhaseClick={(idx) => {
          const sections = (visiblePhases[idx].sections || []) as PhaseSection[];
          handlePhaseClick(idx, sections);
        }}
      />
    </>
  );
};

// Mobile bottom strip — simplified with progress %
interface MobilePhaseStripProps {
  visiblePhases: { id: string; title: string; sections?: PhaseSection[] }[];
  activePhaseIdx: number;
  progressValue: number;
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
  progressValue,
  getPhaseState,
  onPhaseClick,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const activeBtn = el.querySelector(`[data-phase-idx="${activePhaseIdx}"]`) as HTMLElement | null;
    if (activeBtn) {
      const left = activeBtn.offsetLeft - el.offsetWidth / 2 + activeBtn.offsetWidth / 2;
      el.scrollTo({ left, behavior: 'smooth' });
    }
  }, [activePhaseIdx]);

  const activePhase = visiblePhases[activePhaseIdx];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-background border-t border-border safe-area-bottom">
      {/* Progress bar at top */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progressValue}%` }}
        />
      </div>

      {/* Phase name + progress */}
      <div className="flex items-center justify-between px-4 py-1">
        <span className="text-xs font-bold text-foreground truncate">
          {activePhase?.title}
        </span>
        <span className="text-[10px] font-bold text-muted-foreground">
          {Math.round(progressValue)}%
        </span>
      </div>

      {/* Phase dots */}
      <div ref={scrollRef} className="flex items-center justify-center gap-1.5 px-4 pb-2.5">
        {visiblePhases.map((phase, idx) => {
          const { isActive, isCompleted, isDisabled } = getPhaseState(idx, phase);
          return (
            <button
              key={phase.id}
              data-phase-idx={idx}
              onClick={() => !isDisabled && onPhaseClick(idx)}
              disabled={isDisabled}
              className={`h-2 rounded-full transition-all duration-300 ${
                isActive ? 'w-6 bg-primary' :
                isCompleted ? 'w-2 bg-primary/60' :
                'w-2 bg-muted'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
};
