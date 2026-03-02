/**
 * Simplified Client Report
 * Clean, focused report structure:
 * 1. Where you're at now (Scores, Archetype, Gap Analysis, Strengths/Focus, Lifestyle)
 * 2. Where you want to get to (Goals, Issue Resolution)
 * 3. How we'll help (Blueprint, Sample Workout, Timeline)
 *
 * Progressive disclosure: sections are collapsible, with "Starting Point"
 * expanded by default. An Expand/Collapse All toggle is in the header.
 */

import React, { useState, lazy, Suspense, useEffect } from 'react';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring';
import type { CoachPlan } from '@/lib/recommendations';
import {
  Loader2, ChevronDown,
  Activity, BarChart3, TrendingUp, Heart, Target, Map,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/use-mobile';

import { LifestyleFactorsBar } from './LifestyleFactorsBar';
import { MovementPostureMobility } from './MovementPostureMobility';
const CoachReport = lazy(() => import('./CoachReport'));
import { generateBodyCompInterpretation } from '@/lib/recommendations';

// Sub-components
import { ReportHeader } from './client/sub-components/ReportHeader';
import { ClientInfoBar } from './client/sub-components/ClientInfoBar';
import { StartingPointSection } from './client/sub-components/StartingPointSection';
import { GapAnalysisSection } from './client/sub-components/GapAnalysisSection';
import { StrengthsFocusSection } from './client/sub-components/StrengthsFocusSection';
import { DestinationSection } from './client/sub-components/DestinationSection';

// Hooks
import { useClientReportData } from './client/useClientReportData';
import { useScrollRevealSections } from '@/hooks/useScrollRevealSections';

// ── Section config ────────────────────────────────────────────────────

const SECTION_IDS = [
  'starting-point',
  'gap-analysis',
  'strengths-focus',
  'lifestyle',
  'movement',
  'destination',
  'action-plan',
] as const;

type SectionId = (typeof SECTION_IDS)[number];

// Icon component type for reuse at different sizes
const SECTION_ICON_MAP: Record<SectionId, React.ElementType> = {
  'starting-point': Activity,
  'gap-analysis': BarChart3,
  'strengths-focus': TrendingUp,
  'lifestyle': Heart,
  'movement': Activity,
  'destination': Target,
  'action-plan': Map,
};

const SECTION_META: Record<SectionId, {
  title: string;
  shortTitle: string;
  summary: string;
  icon: React.ReactNode;
}> = {
  'starting-point':  { title: 'Your Starting Point',           shortTitle: 'Start',      summary: 'Overall score, archetype, and radar chart',            icon: <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" /> },
  'gap-analysis':    { title: 'Gap Analysis',                  shortTitle: 'Gaps',       summary: 'Current vs. target in each pillar',                    icon: <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" /> },
  'strengths-focus': { title: 'Strengths & Focus Areas',       shortTitle: 'Strengths',  summary: 'What you\'re doing well and where to improve',         icon: <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" /> },
  'lifestyle':       { title: 'Lifestyle Factors',             shortTitle: 'Lifestyle',  summary: 'Sleep, nutrition, stress, and activity habits',        icon: <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" /> },
  'movement':        { title: 'Posture, Movement & Mobility',  shortTitle: 'Movement',   summary: 'Movement quality, posture, and flexibility analysis',  icon: <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" /> },
  'destination':     { title: 'Your Destination',              shortTitle: 'Goals',      summary: 'Goals and what achieving them looks like',             icon: <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" /> },
  'action-plan':     { title: 'Your Action Plan',              shortTitle: 'Plan',       summary: 'Personalised roadmap to reach your goals',             icon: <Map className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" /> },
};

const DEFAULT_OPEN: SectionId[] = ['starting-point'];

// ── Roadmap CTA (replaces Blueprint + Timeline in client reports) ────

function ActionPlanCTA({ clientName, standalone }: { clientName: string; standalone: boolean }) {
  if (standalone) {
    return (
      <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-violet-50 to-white p-8 text-center space-y-4">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-indigo-100 mx-auto">
          <Map className="h-6 w-6 text-indigo-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Your Personalised Plan</h3>
        <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
          Your coach is building a personalised roadmap based on your assessment results.
          You&apos;ll be notified when it&apos;s ready to view.
        </p>
      </div>
    );
  }

  const roadmapUrl = `/coach/clients/${encodeURIComponent(clientName)}/roadmap`;
  return (
    <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-violet-50 to-white p-6 text-center space-y-3">
      <Map className="h-8 w-8 text-indigo-500 mx-auto" />
      <h3 className="text-lg font-bold text-slate-900">Client Roadmap</h3>
      <p className="text-sm text-slate-500 max-w-md mx-auto">
        Create or review this client&apos;s personalised action plan based on the assessment findings.
      </p>
      <a
        href={roadmapUrl}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
      >
        <Map className="h-4 w-4" />
        View Roadmap
      </a>
    </div>
  );
}

// ── Collapsible section wrapper ───────────────────────────────────────
// Renders the section's icon + title as the trigger (matching existing
// header style). When collapsed, also shows a summary line.
// When expanded, the child section renders with hideHeader={true}.

interface CollapsibleSectionProps {
  id: SectionId;
  open: boolean;
  onToggle: (id: SectionId) => void;
  sectionRef?: (el: HTMLElement | null) => void;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  id, open, onToggle, sectionRef, children,
}) => {
  const meta = SECTION_META[id];
  return (
    <div ref={sectionRef} data-section-id={id}>
      <Collapsible open={open} onOpenChange={() => onToggle(id)}>
        <CollapsibleTrigger asChild>
          <button
            className="w-full flex items-center justify-between py-2 hover:opacity-80 transition-opacity group text-left"
            aria-expanded={open}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-0">
              <div className="sm:p-1.5 md:p-2 sm:bg-gradient-light text-zinc-500 sm:text-zinc-900 sm:rounded-lg shrink-0">
                {meta.icon}
              </div>
              <div className="min-w-0">
                <h3 className="text-xs md:text-sm lg:text-base font-semibold text-zinc-900">
                  {meta.title}
                </h3>
                {!open && (
                  <p className="text-xs text-zinc-400 mt-0.5 truncate">{meta.summary}</p>
                )}
              </div>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-zinc-400 shrink-0 ml-3 transition-transform duration-200 ${
                open ? 'rotate-180' : ''
              }`}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>{children}</CollapsibleContent>
      </Collapsible>
    </div>
  );
};

// ── Mobile tab config (4 story-driven tabs) ──────────────────────────

const MOBILE_TAB_IDS = ['overview', 'analysis', 'movement', 'plan'] as const;
type MobileTabId = (typeof MOBILE_TAB_IDS)[number];

const MOBILE_TAB_META: Record<MobileTabId, {
  label: string;
  icon: React.ElementType;
}> = {
  overview:  { label: 'Overview',  icon: Activity },
  analysis:  { label: 'Analysis',  icon: BarChart3 },
  movement:  { label: 'Movement',  icon: Heart },
  plan:      { label: 'Your Plan', icon: Map },
};

// ── Mobile bottom tab bar ────────────────────────────────────────────

interface MobileReportNavProps {
  activeTab: MobileTabId;
  onSelect: (id: MobileTabId) => void;
}

const MobileReportNav: React.FC<MobileReportNavProps> = ({ activeTab, onSelect }) => (
  <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] pb-2 safe-area-pb md:hidden">
    <div className="flex items-stretch justify-around px-3">
      {MOBILE_TAB_IDS.map(id => {
        const { icon: Icon, label } = MOBILE_TAB_META[id];
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={`relative flex-1 flex flex-col items-center gap-1 py-3 transition-colors touch-manipulation ${
              isActive
                ? 'text-primary'
                : 'text-slate-400 active:text-slate-600'
            }`}
          >
            {isActive && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
            )}
            <Icon className={`h-[22px] w-[22px] ${isActive ? 'text-primary' : ''}`} />
            <span className={`text-[10px] font-bold uppercase tracking-[0.15em] leading-tight ${
              isActive ? 'text-primary' : 'text-slate-400'
            }`}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  </nav>
);

// ── Main report component ─────────────────────────────────────────────

export default function ClientReport({
  scores,
  goals,
  formData,
  plan,
  bodyComp,
  previousScores,
  previousFormData,
  standalone = true,
}: {
  scores: ScoreSummary;
  goals?: string[];
  formData?: FormData;
  plan?: CoachPlan;
  bodyComp?: { timeframeWeeks: string };
  previousScores?: ScoreSummary | null;
  previousFormData?: FormData;
  standalone?: boolean;
}) {
  const {
    safeScores,
    orderedCats,
    archetype,
    strengths,
    areasForImprovement,
    clientName,
    hasAnyData,
    overallRadarData,
    previousRadarData,
    gapAnalysisData,
    previousGapAnalysisData,
    reportDate,
  } = useClientReportData({ scores, goals, formData, previousScores, previousFormData });

  const isMobile = useIsMobile();

  // ── View toggle (client vs coach) ───────────────────────────────────
  const [activeView, setActiveView] = useState<'client' | 'coach'>(standalone ? 'client' : 'client');

  useEffect(() => {
    if (standalone && activeView === 'coach') {
      setActiveView('client');
    }
  }, [standalone, activeView]);

  // ── Desktop: scroll-to-reveal sections ──────────────────────────────
  const { isOpen: isSectionOpen, toggle: toggleSection, setRef: setSectionRef } = useScrollRevealSections(SECTION_IDS, DEFAULT_OPEN);

  // ── Mobile: single active tab (4 grouped tabs) ─────────────────────
  const [mobileTab, setMobileTab] = useState<MobileTabId>('overview');

  // ── Guard ───────────────────────────────────────────────────────────
  if (!scores || !scores.categories || scores.categories.length === 0 || !hasAnyData) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-semibold mb-2">No assessment data available</p>
        <p>Please complete at least one section of the assessment to generate a report.</p>
      </div>
    );
  }

  const containerClass = standalone
    ? 'min-h-screen bg-zinc-50 text-zinc-900 px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12 py-2 sm:py-4 md:py-6 lg:py-8 xl:py-12 overflow-x-hidden'
    : 'w-full text-zinc-900 overflow-x-hidden';

  const contentClass = standalone
    ? 'max-w-[1400px] mx-auto space-y-2 sm:space-y-3 md:space-y-4 lg:space-y-5 xl:space-y-6 w-full min-w-0'
    : 'space-y-2 sm:space-y-3 md:space-y-4 lg:space-y-5 xl:space-y-6 w-full min-w-0';

  // Render a section's content by ID (shared by mobile + desktop)
  const renderSection = (id: SectionId) => {
    switch (id) {
      case 'starting-point':
        return (
          <StartingPointSection
            scores={safeScores}
            previousOverallScore={previousScores?.overall ?? null}
            archetype={archetype}
            overallRadarData={overallRadarData}
            previousRadarData={previousRadarData}
            hideHeader
          />
        );
      case 'gap-analysis':
        return (
          <GapAnalysisSection
            gapAnalysisData={gapAnalysisData}
            previousGapAnalysisData={previousGapAnalysisData}
            goals={goals}
            formData={formData}
            hideHeader
          />
        );
      case 'strengths-focus':
        return (
          <StrengthsFocusSection
            strengths={strengths}
            areasForImprovement={areasForImprovement}
          />
        );
      case 'lifestyle':
        return <LifestyleFactorsBar formData={formData} previousFormData={previousFormData} />;
      case 'movement':
        return <MovementPostureMobility formData={formData} scores={scores} standalone={standalone} hideHeader previousFormData={previousFormData} />;
      case 'destination':
        return <DestinationSection goals={goals} formData={formData} hideHeader />;
      case 'action-plan':
        return <ActionPlanCTA clientName={clientName} standalone={standalone} />;
      default:
        return null;
    }
  };

  return (
    <div className={containerClass}>
      <div className={`${contentClass} overflow-x-hidden`}>

        {standalone && (
          <>
            <ReportHeader
              clientName={clientName}
              reportDate={reportDate}
              standalone={standalone}
              activeView={activeView}
              setActiveView={setActiveView}
            />
            <ClientInfoBar formData={formData} />
          </>
        )}

        {activeView === 'coach' ? (
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-zinc-200">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm font-medium text-zinc-400">Loading Coach Plan...</p>
            </div>
          }>
            {plan ? (
              <CoachReport
                plan={plan}
                scores={scores}
                bodyComp={formData ? generateBodyCompInterpretation(formData) : undefined}
                formData={formData}
              />
            ) : (
              <div className="bg-white rounded-xl p-8 border border-zinc-200">
                <h2 className="text-xl font-bold text-zinc-900 mb-4">Coach Report</h2>
                <p className="text-zinc-600">Generating coach plan...</p>
              </div>
            )}
          </Suspense>
        ) : isMobile ? (
          /* ── Mobile: grouped tabs + bottom nav ── */
          <>
            {/* Tab title bar */}
            <div className="flex items-center gap-2 py-1.5">
              {(() => {
                const { icon: TabIcon, label } = MOBILE_TAB_META[mobileTab];
                return (
                  <>
                    <TabIcon className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <h3 className="text-xs font-semibold text-zinc-900">
                      {label}
                    </h3>
                  </>
                );
              })()}
            </div>

            {/* Active tab content -- each tab renders grouped sections */}
            <div className="pb-16 space-y-4">
              {mobileTab === 'overview' && (
                <>
                  {renderSection('starting-point')}
                  <LifestyleFactorsBar formData={formData} previousFormData={previousFormData} />
                </>
              )}
              {mobileTab === 'analysis' && (
                <>
                  {renderSection('gap-analysis')}
                  <StrengthsFocusSection
                    strengths={strengths}
                    areasForImprovement={areasForImprovement}
                  />
                </>
              )}
              {mobileTab === 'movement' && (
                <MovementPostureMobility formData={formData} scores={scores} standalone={standalone} hideHeader previousFormData={previousFormData} />
              )}
              {mobileTab === 'plan' && (
                <>
                  <DestinationSection goals={goals} formData={formData} hideHeader />
                  <ActionPlanCTA clientName={clientName} standalone={standalone} />
                </>
              )}
            </div>

            <MobileReportNav activeTab={mobileTab} onSelect={setMobileTab} />
          </>
        ) : (
          /* ── Desktop: collapsible accordion ── */
          <>
            {SECTION_IDS.map(id => (
              <CollapsibleSection
                key={id}
                id={id}
                open={isSectionOpen(id)}
                onToggle={toggleSection}
                sectionRef={setSectionRef(id)}
              >
                {renderSection(id)}
              </CollapsibleSection>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
