import { useState } from 'react';
import { useFormContext } from '@/contexts/FormContext';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ASSESSMENT_COPY } from '@/constants/assessmentCopy';
import { UI_TOASTS } from '@/constants/ui';
import { functionsCallableUserMessage } from '@/lib/firebase/functionsCallableUserMessage';
import { buildFullBaselinePlan } from '@/lib/assessment/baselineSession';
import { markBaselineAssessmentSession } from '@/lib/assessment/baselineSession';
import { Copy, Loader2, Mail, Monitor, Smartphone } from 'lucide-react';
import { intakePayloadFromFormData } from '@/lib/remote/remoteIntakePrefill';
import {
  createRemoteAssessmentTokenForClient,
  sendRemoteIntakeLinkEmail,
} from '@/services/remoteAssessmentClient';
import { logger } from '@/lib/utils/logger';

export function BaselineIntakeChooser({ onComplete }: { onComplete: () => void }) {
  const { updateFormData, formData } = useFormContext();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [intakeMode, setIntakeMode] = useState<'studio' | 'send_link_first' | null>(null);
  const [remoteLink, setRemoteLink] = useState<string | null>(null);
  const [remoteToken, setRemoteToken] = useState<string | null>(null);
  const [intakeEmail, setIntakeEmail] = useState(() => (formData.email || '').trim());
  const [remoteBusy, setRemoteBusy] = useState(false);
  const [emailSending, setEmailSending] = useState(false);

  const trimmedIntakeEmail = intakeEmail.trim();
  const isValidIntakeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedIntakeEmail);

  const handleStartStudio = () => {
    const plan = buildFullBaselinePlan();
    markBaselineAssessmentSession('studio');
    updateFormData({
      assessmentPlan: plan,
      assessmentIntakeMode: 'studio',
    });
    logger.debug('[Assessment] Baseline studio session', { templateId: plan.templateId });
    onComplete();
  };

  const handleStartStudioAnyway = () => {
    setIntakeMode('studio');
    handleStartStudio();
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-10">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
          {ASSESSMENT_COPY.BASELINE_CHOOSER_TITLE}
        </h2>
        <p className="text-sm text-muted-foreground">{ASSESSMENT_COPY.BASELINE_CHOOSER_SUBTITLE}</p>
      </div>

      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          How will you run their first assessment?
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setIntakeMode('studio');
              handleStartStudio();
            }}
            className={`rounded-lg border p-4 text-left transition-colors min-h-[88px] ${
              intakeMode === 'studio'
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-border/70 bg-background hover:bg-muted/40'
            }`}
          >
            <Monitor className="h-5 w-5 text-muted-foreground mb-2" aria-hidden />
            <p className="font-semibold text-foreground">{ASSESSMENT_COPY.STUDIO_FIRST_TITLE}</p>
            <p className="text-xs text-muted-foreground mt-1">{ASSESSMENT_COPY.BASELINE_STUDIO_DESC}</p>
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
            <p className="text-xs text-muted-foreground mt-1">{ASSESSMENT_COPY.BASELINE_SEND_LINK_DESC}</p>
          </button>
        </div>
      </section>

      {intakeMode === 'send_link_first' && profile?.organizationId && formData.fullName?.trim() ? (
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">{ASSESSMENT_COPY.BASELINE_LINK_SECTION_TITLE}</p>
          <p className="text-xs text-muted-foreground">{ASSESSMENT_COPY.BASELINE_LINK_SECTION_DESC}</p>
          <div className="flex flex-col sm:flex-row gap-2 items-start">
            <Button
              type="button"
              variant="secondary"
              disabled={remoteBusy}
              className="min-h-[44px] shrink-0"
              onClick={async () => {
                setRemoteBusy(true);
                setRemoteLink(null);
                setRemoteToken(null);
                try {
                  const res = await createRemoteAssessmentTokenForClient(
                    profile.organizationId!,
                    formData.fullName.trim(),
                    {
                      remoteScope: 'full',
                      intake: {
                        ...intakePayloadFromFormData(formData as unknown as Record<string, unknown>),
                        ...(trimmedIntakeEmail ? { email: trimmedIntakeEmail } : {}),
                      },
                    },
                  );
                  markBaselineAssessmentSession('send_link_first');
                  updateFormData({
                    assessmentPlan: buildFullBaselinePlan(),
                    assessmentIntakeMode: 'send_link_first',
                    ...(trimmedIntakeEmail ? { email: trimmedIntakeEmail } : {}),
                  });
                  setRemoteToken(res.token);
                  setRemoteLink(`${window.location.origin}/remote/${res.token}`);
                  toast({ title: 'Link created', description: 'Copy the link or email it to your client.' });
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
              {remoteBusy ? 'Creating…' : ASSESSMENT_COPY.BASELINE_GENERATE_LINK}
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
          {remoteLink && remoteToken && profile.organizationId ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="client@example.com"
                value={intakeEmail}
                onChange={(e) => setIntakeEmail(e.target.value)}
                disabled={emailSending}
                className="h-11 min-w-0 flex-1"
              />
              <Button
                type="button"
                variant="outline"
                disabled={!isValidIntakeEmail || emailSending}
                className="min-h-[44px] shrink-0 gap-2"
                onClick={async () => {
                  setEmailSending(true);
                  try {
                    await sendRemoteIntakeLinkEmail({
                      organizationId: profile.organizationId!,
                      token: remoteToken,
                      to: trimmedIntakeEmail,
                      clientName: formData.fullName.trim(),
                    });
                    toast({
                      title: UI_TOASTS.SUCCESS.INTAKE_LINK_EMAILED,
                      description: `Sent to ${trimmedIntakeEmail}`,
                    });
                  } catch (e) {
                    logger.warn('[BaselineIntakeChooser] intake email failed', e);
                    toast({
                      title: UI_TOASTS.ERROR.INTAKE_EMAIL_NOT_SENT,
                      description: functionsCallableUserMessage(
                        e,
                        UI_TOASTS.ERROR.INTAKE_EMAIL_NOT_SENT_DESC,
                      ),
                      variant: 'destructive',
                    });
                  } finally {
                    setEmailSending(false);
                  }
                }}
              >
                {emailSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Mail className="h-4 w-4" aria-hidden />
                )}
                {emailSending ? 'Sending…' : 'Email link'}
              </Button>
            </div>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            className="text-sm text-muted-foreground"
            onClick={handleStartStudioAnyway}
          >
            {ASSESSMENT_COPY.BASELINE_START_STUDIO_ANYWAY}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
