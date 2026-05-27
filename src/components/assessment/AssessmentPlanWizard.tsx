/**
 * Post–client-pick session setup: baseline intake (first full assessment) or modular plan for returning clients.
 */

import { useState } from 'react';
import { useFormContext } from '@/contexts/FormContext';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ASSESSMENT_COPY } from '@/constants/assessmentCopy';
import { hasReturningSessionPlan } from '@/lib/assessment/baselineSession';
import { hasPartialAssessmentInSession } from '@/lib/assessment/assessmentSessionStorage';
import { BaselineIntakeChooser } from './BaselineIntakeChooser';
import { SessionPlanWizard } from './SessionPlanWizard';
import { Copy, Monitor, Smartphone } from 'lucide-react';

export function AssessmentPlanWizard({ onComplete }: { onComplete: () => void }) {
  const isReturningModular =
    hasPartialAssessmentInSession() || hasReturningSessionPlan();

  if (isReturningModular) {
    return <ReturningSessionPlanWizard onComplete={onComplete} />;
  }

  return <BaselineIntakeChooser onComplete={onComplete} />;
}

function ReturningSessionPlanWizard({ onComplete }: { onComplete: () => void }) {
  const { updateFormData, formData } = useFormContext();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [intakeMode, setIntakeMode] = useState<'studio' | 'send_link_first' | null>(null);
  const [remoteLink, setRemoteLink] = useState<string | null>(null);
  const [remoteBusy, setRemoteBusy] = useState(false);

  const handleIntakeChosen = (mode: 'studio' | 'send_link_first') => {
    setIntakeMode(mode);
    if (mode === 'studio') {
      updateFormData({ assessmentIntakeMode: 'studio' });
    }
  };

  const handleSessionPlanDone = () => {
    if (!intakeMode) return;
    onComplete();
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
            onClick={() => handleIntakeChosen('studio')}
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
            onClick={() => handleIntakeChosen('send_link_first')}
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

      {intakeMode === 'studio' ? (
        <SessionPlanWizard intakeMode="studio" onComplete={handleSessionPlanDone} />
      ) : null}

      {intakeMode === 'send_link_first' && profile?.organizationId && formData.fullName?.trim() ? (
        <ReturningRemoteLinkSection
          remoteBusy={remoteBusy}
          remoteLink={remoteLink}
          setRemoteBusy={setRemoteBusy}
          setRemoteLink={setRemoteLink}
          onLinkCreated={() => {
            updateFormData({ assessmentIntakeMode: 'send_link_first' });
          }}
          onContinue={handleSessionPlanDone}
        />
      ) : null}

      {intakeMode === 'send_link_first' && !formData.fullName?.trim() ? (
        <p className="text-xs text-muted-foreground">Enter a client name in setup before generating a link.</p>
      ) : null}
    </div>
  );
}

function ReturningRemoteLinkSection({
  remoteBusy,
  remoteLink,
  setRemoteBusy,
  setRemoteLink,
  onLinkCreated,
  onContinue,
}: {
  remoteBusy: boolean;
  remoteLink: string | null;
  setRemoteBusy: (v: boolean) => void;
  setRemoteLink: (v: string | null) => void;
  onLinkCreated: () => void;
  onContinue: () => void;
}) {
  const { formData } = useFormContext();
  const { profile } = useAuth();
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
        <p className="text-sm font-medium text-foreground">Generate a client link (optional)</p>
        <p className="text-xs text-muted-foreground">
          For returning clients you can still send a link for lifestyle or posture check-ins before choosing session
          focus below.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 items-start">
          <Button
            type="button"
            variant="secondary"
            disabled={remoteBusy}
            className="min-h-[44px] shrink-0"
            onClick={async () => {
              setRemoteBusy(true);
              setRemoteLink(null);
              try {
                const { createRemoteAssessmentTokenForClient } = await import('@/services/remoteAssessmentClient');
                const res = await createRemoteAssessmentTokenForClient(
                  profile!.organizationId!,
                  formData.fullName!.trim(),
                  { remoteScope: 'lifestyle' },
                );
                setRemoteLink(`${window.location.origin}/remote/${res.token}`);
                onLinkCreated();
                toast({ title: 'Link created', description: 'Copy and send it to your client.' });
              } catch (e) {
                toast({
                  title: 'Could not create link',
                  description: e instanceof Error ? e.message : 'Something went wrong. Please try again.',
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
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <code className="text-xs break-all rounded-lg bg-background border border-border px-3 py-2 flex-1">
                {remoteLink}
              </code>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="shrink-0 h-8 w-8"
                onClick={() => {
                  void navigator.clipboard.writeText(remoteLink);
                  toast({ title: 'Copied', description: 'Link copied to clipboard.' });
                }}
                aria-label="Copy link"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>
      </div>
      <SessionPlanWizard intakeMode="send_link_first" onComplete={onContinue} />
    </div>
  );
}
