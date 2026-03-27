import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ListChecks } from 'lucide-react';
import { GETTING_STARTED } from '@/constants/gettingStartedCopy';
import { cn } from '@/lib/utils';
import { GettingStartedChecklistContent } from './gettingStartedChecklistContent';
import { buildGettingStartedSteps } from './gettingStartedChecklistModel';

interface GettingStartedChecklistProps {
  hasClients: boolean;
  hasAssessments: boolean;
  hasSharedReport: boolean;
  primaryAssessmentIdForShare?: string | null;
  primaryClientNameForShare?: string | null;
  businessProfileComplete?: boolean;
  equipmentDetailsDone?: boolean;
  isOrgAdmin?: boolean;
  showTrialSubscribeNudge?: boolean;
  showBrandingNudge?: boolean;
}

const DISMISSED_KEY = 'oa_checklist_dismissed';

export function GettingStartedChecklist({
  hasClients,
  hasAssessments,
  hasSharedReport,
  primaryAssessmentIdForShare = null,
  primaryClientNameForShare = null,
  businessProfileComplete = false,
  equipmentDetailsDone = false,
  isOrgAdmin = false,
  showTrialSubscribeNudge = false,
  showBrandingNudge = false,
}: GettingStartedChecklistProps) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  const [expanded, setExpanded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const { coreSteps, optionalSteps } = useMemo(
    () =>
      buildGettingStartedSteps({
        hasClients,
        hasAssessments,
        hasSharedReport,
        primaryAssessmentIdForShare: primaryAssessmentIdForShare ?? null,
        primaryClientNameForShare: primaryClientNameForShare ?? null,
        businessProfileComplete,
        equipmentDetailsDone,
        isOrgAdmin,
        showTrialSubscribeNudge,
        showBrandingNudge,
      } satisfies Parameters<typeof buildGettingStartedSteps>[0]),
    [
      hasClients,
      hasAssessments,
      hasSharedReport,
      primaryAssessmentIdForShare,
      primaryClientNameForShare,
      businessProfileComplete,
      equipmentDetailsDone,
      isOrgAdmin,
      showTrialSubscribeNudge,
      showBrandingNudge,
    ],
  );

  const completedCount =
    coreSteps.filter((s) => s.done).length + optionalSteps.filter((s) => s.done).length;
  const totalCount = coreSteps.length + optionalSteps.length;

  const coreDone = hasClients && hasAssessments && hasSharedReport;
  const optionalAllDone =
    optionalSteps.length === 0 || optionalSteps.every((s) => s.done);
  const allDone = coreDone && optionalAllDone;

  useEffect(() => {
    if (allDone) {
      try {
        localStorage.setItem(DISMISSED_KEY, '1');
      } catch {
        /* noop */
      }
    }
  }, [allDone]);

  useEffect(() => {
    if (!expanded) return;
    const onDown = (e: MouseEvent) => {
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) setExpanded(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [expanded]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    setExpanded(false);
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      /* noop */
    }
  }, []);

  const collapseAfterNavigate = useCallback(() => setExpanded(false), []);

  if (dismissed || allDone) return null;

  return (
    <div
      ref={rootRef}
      className="fixed bottom-6 right-4 z-40 flex flex-col-reverse items-end gap-2 max-sm:bottom-[max(1.5rem,env(safe-area-inset-bottom))] max-sm:right-3"
    >
      {expanded && (
        <GettingStartedChecklistContent
          coreSteps={coreSteps}
          optionalSteps={optionalSteps}
          onAfterNavigate={collapseAfterNavigate}
          onMinimize={() => setExpanded(false)}
          onDismiss={handleDismiss}
        />
      )}

      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        aria-label={GETTING_STARTED.FAB_ARIA_EXPANDED}
        className={cn(
          'pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-card py-2.5 pl-3.5 pr-3 shadow-lg',
          'min-h-[48px] hover:bg-muted/50 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        )}
      >
        <ListChecks className="h-5 w-5 text-primary shrink-0" aria-hidden />
        <span className="text-sm font-semibold text-foreground">{GETTING_STARTED.FAB_LABEL}</span>
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold tabular-nums text-on-brand-tint">
          {completedCount}/{totalCount}
        </span>
      </button>
    </div>
  );
}
