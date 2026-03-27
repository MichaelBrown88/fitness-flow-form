import { Link } from 'react-router-dom';
import { Check, X, ChevronDown } from 'lucide-react';
import { GETTING_STARTED } from '@/constants/gettingStartedCopy';
import { cn } from '@/lib/utils';
import type { ChecklistStepItem } from './gettingStartedChecklistTypes';

export type { ChecklistStepItem } from './gettingStartedChecklistTypes';

interface GettingStartedChecklistContentProps {
  coreSteps: ChecklistStepItem[];
  optionalSteps: ChecklistStepItem[];
  onAfterNavigate: () => void;
  onMinimize: () => void;
  onDismiss: () => void;
}

function StepRowLink({
  step,
  onAfterNavigate,
}: {
  step: ChecklistStepItem;
  onAfterNavigate: () => void;
}) {
  const actionable = !step.done && step.href;
  const content = (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors',
        step.done ? 'opacity-55' : 'bg-muted/40 border border-border/80 hover:bg-muted/60',
        actionable && 'cursor-pointer',
      )}
    >
      <div
        className={cn(
          'mt-0.5 w-7 h-7 rounded-md flex items-center justify-center shrink-0',
          step.done ? 'bg-score-green-light text-score-green-fg' : 'bg-primary/10 text-on-brand-tint',
        )}
      >
        {step.done ? <Check className="h-3.5 w-3.5" /> : <step.icon className="h-3.5 w-3.5" />}
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            'text-xs font-semibold leading-tight',
            step.done ? 'line-through text-muted-foreground' : 'text-foreground',
          )}
        >
          {step.label}
        </p>
        <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{step.description}</p>
      </div>
    </div>
  );

  if (!actionable) {
    return <div>{content}</div>;
  }

  return (
    <Link to={step.href!} onClick={onAfterNavigate}>
      {content}
    </Link>
  );
}

export function GettingStartedChecklistContent({
  coreSteps,
  optionalSteps,
  onAfterNavigate,
  onMinimize,
  onDismiss,
}: GettingStartedChecklistContentProps) {
  return (
    <div
      role="dialog"
      aria-label={GETTING_STARTED.PANEL_TITLE}
      className="w-[min(calc(100vw-1.5rem),18.5rem)] max-h-[min(70vh,26rem)] overflow-y-auto rounded-xl border border-border bg-card text-card-foreground shadow-xl p-3 sm:p-4 animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-foreground">{GETTING_STARTED.PANEL_TITLE}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">{GETTING_STARTED.PANEL_SUBTITLE}</p>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={onMinimize}
            className="rounded-md p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label={GETTING_STARTED.MINIMIZE_ARIA}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-md p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label={GETTING_STARTED.DISMISS_ARIA}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {coreSteps.map((s) => (
          <StepRowLink key={s.label} step={s} onAfterNavigate={onAfterNavigate} />
        ))}
      </div>

      {optionalSteps.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            {GETTING_STARTED.OPTIONAL_SECTION}
          </p>
          <div className="space-y-2">
            {optionalSteps.map((s) => (
              <StepRowLink key={`opt-${s.label}`} step={s} onAfterNavigate={onAfterNavigate} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
