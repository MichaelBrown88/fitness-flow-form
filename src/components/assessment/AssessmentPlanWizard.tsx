/**
 * Post–client-pick session setup: intake mode (copy) + template or custom phase scope.
 */

import { useState } from 'react';
import { useFormContext } from '@/contexts/FormContext';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ASSESSMENT_COPY } from '@/constants/assessmentCopy';
import {
  buildPlanFromFocusToggles,
  planFromTemplateKey,
  type SessionFocusTemplateKey,
  type SessionFocusToggles,
} from '@/lib/types/assessmentPlan';
import { ChevronDown, Monitor, Smartphone } from 'lucide-react';
import { logger } from '@/lib/utils/logger';
import type { RemoteAssessmentScope } from '@/lib/types/remoteAssessment';

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

const INITIAL_TOGGLES: SessionFocusToggles = {
  lifestyle: false,
  bodyComp: false,
  cardio: false,
  strength: false,
  movement: false,
};

export function AssessmentPlanWizard({ onComplete }: { onComplete: () => void }) {
  const { updateFormData, formData } = useFormContext();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [intakeMode, setIntakeMode] = useState<'studio' | 'send_link_first' | null>(null);
  const [templateKey, setTemplateKey] = useState<SessionFocusTemplateKey>('full');
  const [customOpen, setCustomOpen] = useState(false);
  const [toggles, setToggles] = useState<SessionFocusToggles>(INITIAL_TOGGLES);
  const [remoteLink, setRemoteLink] = useState<string | null>(null);
  const [remoteBusy, setRemoteBusy] = useState(false);
  const [remoteLinkScope, setRemoteLinkScope] = useState<RemoteAssessmentScope>('lifestyle');

  const hasCustomModule = Object.values(toggles).some(Boolean);

  const handleContinue = () => {
    if (!intakeMode) return;
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
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-10">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">{ASSESSMENT_COPY.WIZARD_TITLE}</h2>
        <p className="text-sm text-muted-foreground">{ASSESSMENT_COPY.WIZARD_SUBTITLE}</p>
      </div>

      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">How will you run it?</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setIntakeMode('studio')}
            className={`rounded-lg border p-4 text-left transition-colors min-h-[88px] ${
              intakeMode === 'studio'
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-border/70 bg-background hover:bg-muted/40'
            }`}
          >
            <Monitor className="h-5 w-5 text-muted-foreground mb-2" aria-hidden />
            <p className="font-semibold text-foreground">{ASSESSMENT_COPY.STUDIO_FIRST_TITLE}</p>
            <p className="text-xs text-muted-foreground mt-1">{ASSESSMENT_COPY.STUDIO_FIRST_DESC}</p>
          </button>
          <button
            type="button"
            onClick={() => setIntakeMode('send_link_first')}
            className={`rounded-lg border p-4 text-left transition-colors min-h-[88px] ${
              intakeMode === 'send_link_first'
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-border/70 bg-background hover:bg-muted/40'
            }`}
          >
            <Smartphone className="h-5 w-5 text-muted-foreground mb-2" aria-hidden />
            <p className="font-semibold text-foreground">{ASSESSMENT_COPY.SEND_LINK_FIRST_TITLE}</p>
            <p className="text-xs text-muted-foreground mt-1">{ASSESSMENT_COPY.SEND_LINK_FIRST_DESC}</p>
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Templates</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {TEMPLATE_ORDER.map((key) => (
            <button
              key={key}
              type="button"
              disabled={hasCustomModule}
              onClick={() => {
                setTemplateKey(key);
              }}
              className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors min-h-[72px] ${
                !hasCustomModule && templateKey === key
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border/70 bg-background hover:bg-muted/40 disabled:opacity-50'
              }`}
            >
              <span className="font-semibold text-foreground block">{TEMPLATE_LABEL[key]}</span>
              <span className="text-xs text-muted-foreground mt-1 block">{TEMPLATE_DESC[key]}</span>
            </button>
          ))}
        </div>

        <Collapsible open={customOpen} onOpenChange={setCustomOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 min-h-[44px]">
            {ASSESSMENT_COPY.CUSTOM_FOCUS_LABEL}
            <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${customOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-2">
            <p className="text-xs text-muted-foreground px-1">{ASSESSMENT_COPY.CUSTOM_FOCUS_HINT}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(INITIAL_TOGGLES) as (keyof SessionFocusToggles)[]).map((key) => {
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
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggle(key)}
                    className={`rounded-lg border px-3 py-3 text-left text-sm font-medium min-h-[44px] ${
                      toggles[key] ? 'border-primary bg-primary/10' : 'border-border/70 bg-background'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </section>

      {intakeMode === 'send_link_first' && profile?.organizationId && formData.fullName?.trim() ? (
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Generate a secure link for this client. Requires the remote assessment MVP to be enabled for your project
            (see functions env).
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {(
              [
                { scope: 'lifestyle' as const, label: ASSESSMENT_COPY.REMOTE_LINK_SCOPE_LIFESTYLE },
                { scope: 'lifestyle_posture' as const, label: ASSESSMENT_COPY.REMOTE_LINK_SCOPE_LIFESTYLE_POSTURE },
                { scope: 'posture' as const, label: ASSESSMENT_COPY.REMOTE_LINK_SCOPE_POSTURE },
              ] as const
            ).map(({ scope, label }) => (
              <button
                key={scope}
                type="button"
                onClick={() => setRemoteLinkScope(scope)}
                className={`rounded-lg border px-3 py-2 text-left text-xs font-medium min-h-[44px] ${
                  remoteLinkScope === scope ? 'border-primary bg-primary/10' : 'border-border/70 bg-background'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={remoteBusy}
              className="min-h-[44px]"
              onClick={async () => {
                setRemoteBusy(true);
                setRemoteLink(null);
                try {
                  const { createRemoteAssessmentTokenForClient } = await import('@/services/remoteAssessmentClient');
                  const res = await createRemoteAssessmentTokenForClient(
                    profile.organizationId!,
                    formData.fullName.trim(),
                    { remoteScope: remoteLinkScope },
                  );
                  setRemoteLink(`${window.location.origin}/remote/${res.token}`);
                  toast({ title: 'Link created', description: 'Copy and send it to your client.' });
                } catch (e) {
                  toast({
                    title: 'Could not create link',
                    description: e instanceof Error ? e.message : 'Check Cloud Functions and REMOTE_ASSESSMENT_MVP.',
                    variant: 'destructive',
                  });
                } finally {
                  setRemoteBusy(false);
                }
              }}
            >
              {remoteBusy ? 'Creating…' : 'Generate client link'}
            </Button>
            {remoteLink ? (
              <code className="text-xs break-all rounded-lg bg-background border border-border p-2 self-center">
                {remoteLink}
              </code>
            ) : null}
          </div>
        </div>
      ) : null}

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={!intakeMode ? 'cursor-not-allowed' : undefined}>
              <Button
                type="button"
                size="lg"
                className="w-full sm:w-auto min-h-[48px]"
                disabled={!intakeMode}
                onClick={handleContinue}
              >
                {ASSESSMENT_COPY.CONTINUE_TO_ASSESSMENT}
              </Button>
            </span>
          </TooltipTrigger>
          {!intakeMode && (
            <TooltipContent side="top">
              Choose how you will run the session above to continue
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
