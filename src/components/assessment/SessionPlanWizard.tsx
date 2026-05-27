import { useState, useMemo } from 'react';
import { useFormContext } from '@/contexts/FormContext';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ASSESSMENT_COPY } from '@/constants/assessmentCopy';
import {
  buildPlanFromFocusToggles,
  planFromTemplateKey,
  type SessionFocusTemplateKey,
  type SessionFocusToggles,
} from '@/lib/types/assessmentPlan';
import { readPrefillPillarCadenceHints, type PillarCadenceHint } from '@/lib/assessment/assessmentSessionStorage';
import { ChevronDown, AlertTriangle, Clock } from 'lucide-react';
import { logger } from '@/lib/utils/logger';

const TEMPLATE_ORDER: SessionFocusTemplateKey[] = [
  'full',
  'lifestyle',
  'body_comp',
  'cardio',
  'strength',
  'movement',
];

const TEMPLATE_LABEL: Record<SessionFocusTemplateKey, string> = {
  full: ASSESSMENT_COPY.TEMPLATE_FULL,
  lifestyle: ASSESSMENT_COPY.TEMPLATE_LIFESTYLE,
  body_comp: ASSESSMENT_COPY.TEMPLATE_BODY_COMP,
  cardio: ASSESSMENT_COPY.TEMPLATE_CARDIO,
  strength: ASSESSMENT_COPY.TEMPLATE_STRENGTH,
  movement: ASSESSMENT_COPY.TEMPLATE_MOVEMENT,
};

const TEMPLATE_DESC: Record<SessionFocusTemplateKey, string> = {
  full: ASSESSMENT_COPY.TEMPLATE_FULL_DESC,
  lifestyle: ASSESSMENT_COPY.TEMPLATE_LIFESTYLE_DESC,
  body_comp: ASSESSMENT_COPY.TEMPLATE_BODY_COMP_DESC,
  cardio: ASSESSMENT_COPY.TEMPLATE_CARDIO_DESC,
  strength: ASSESSMENT_COPY.TEMPLATE_STRENGTH_DESC,
  movement: ASSESSMENT_COPY.TEMPLATE_MOVEMENT_DESC,
};

const CADENCE_TO_TOGGLE: Record<string, keyof SessionFocusToggles> = {
  lifestyle: 'lifestyle',
  bodycomp: 'bodyComp',
  fitness: 'cardio',
  strength: 'strength',
  posture: 'movement',
};

function buildInitialTogglesFromCadence(hints: PillarCadenceHint[]): {
  toggles: SessionFocusToggles;
  hasDue: boolean;
} {
  const toggles: SessionFocusToggles = {
    lifestyle: false,
    bodyComp: false,
    cardio: false,
    strength: false,
    movement: false,
  };
  let hasDue = false;
  for (const hint of hints) {
    const key = CADENCE_TO_TOGGLE[hint.pillar];
    if (key && (hint.status === 'overdue' || hint.status === 'due-soon')) {
      toggles[key] = true;
      hasDue = true;
    }
  }
  return { toggles, hasDue };
}

export function SessionPlanWizard({
  intakeMode,
  onComplete,
}: {
  intakeMode: 'studio' | 'send_link_first';
  onComplete: () => void;
}) {
  const { updateFormData } = useFormContext();

  const cadenceHints = useMemo(() => readPrefillPillarCadenceHints(), []);
  const cadenceMap = useMemo(() => {
    const map = new Map<string, PillarCadenceHint>();
    for (const h of cadenceHints) {
      const key = CADENCE_TO_TOGGLE[h.pillar];
      if (key) map.set(key, h);
    }
    return map;
  }, [cadenceHints]);
  const initialState = useMemo(() => buildInitialTogglesFromCadence(cadenceHints), [cadenceHints]);

  const [templateKey, setTemplateKey] = useState<SessionFocusTemplateKey>(
    initialState.hasDue ? 'full' : 'full',
  );
  const [customOpen, setCustomOpen] = useState(initialState.hasDue);
  const [toggles, setToggles] = useState<SessionFocusToggles>(
    initialState.hasDue
      ? initialState.toggles
      : {
          lifestyle: false,
          bodyComp: false,
          cardio: false,
          strength: false,
          movement: false,
        },
  );

  const hasCustomModule = Object.values(toggles).some(Boolean);

  const handleContinue = () => {
    const plan = hasCustomModule ? buildPlanFromFocusToggles(toggles) : planFromTemplateKey(templateKey);
    logger.debug('[Assessment] Session plan selected', {
      templateId: plan.templateId,
      includedPhaseIds: plan.includedPhaseIds,
      intakeMode,
    });
    updateFormData({
      assessmentPlan: plan,
      assessmentIntakeMode: intakeMode,
    });
    onComplete();
  };

  const toggle = (key: keyof SessionFocusToggles) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <section className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Templates</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {TEMPLATE_ORDER.map((key) => (
          <button
            key={key}
            type="button"
            disabled={hasCustomModule}
            onClick={() => setTemplateKey(key)}
            className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors min-h-[72px] ${
              !hasCustomModule && templateKey === key
                ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                : 'border-border/70 bg-background hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            <span className="font-semibold text-foreground block">{TEMPLATE_LABEL[key]}</span>
            <span className="text-xs text-muted-foreground mt-1 block">{TEMPLATE_DESC[key]}</span>
          </button>
        ))}
      </div>
      {hasCustomModule && (
        <p className="text-xs text-muted-foreground px-1">
          Templates are paused while custom focus is active. Clear your selections below to use a template.
        </p>
      )}

      <Collapsible open={customOpen} onOpenChange={setCustomOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 min-h-[44px]">
          {ASSESSMENT_COPY.CUSTOM_FOCUS_LABEL}
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${customOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-2">
          <p className="text-xs text-muted-foreground px-1">{ASSESSMENT_COPY.CUSTOM_FOCUS_HINT}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(['lifestyle', 'bodyComp', 'cardio', 'strength', 'movement'] as (keyof SessionFocusToggles)[]).map(
              (key) => {
                const label =
                  key === 'lifestyle'
                    ? ASSESSMENT_COPY.TOGGLE_LIFESTYLE
                    : key === 'bodyComp'
                      ? ASSESSMENT_COPY.TOGGLE_BODY_COMP
                      : key === 'cardio'
                        ? ASSESSMENT_COPY.TOGGLE_CARDIO
                        : key === 'strength'
                          ? ASSESSMENT_COPY.TOGGLE_STRENGTH
                          : ASSESSMENT_COPY.TOGGLE_MOVEMENT;
                const hint = cadenceMap.get(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggle(key)}
                    className={`rounded-lg border px-3 py-3 text-left text-sm font-medium min-h-[44px] flex items-center justify-between gap-2 ${
                      toggles[key] ? 'border-primary bg-primary/10' : 'border-border/70 bg-background'
                    }`}
                  >
                    <span>{label}</span>
                    {hint?.status === 'overdue' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-score-red-muted/60 px-2 py-0.5 text-[10px] font-bold text-score-red-fg">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        Overdue
                      </span>
                    )}
                    {hint?.status === 'due-soon' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-score-amber-muted/60 px-2 py-0.5 text-[10px] font-bold text-score-amber-fg">
                        <Clock className="h-2.5 w-2.5" />
                        Due soon
                      </span>
                    )}
                  </button>
                );
              },
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Button type="button" size="lg" className="w-full sm:w-auto min-h-[48px]" onClick={handleContinue}>
        {ASSESSMENT_COPY.CONTINUE_TO_ASSESSMENT}
      </Button>
    </section>
  );
}
