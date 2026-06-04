import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, Link2, Loader2 } from 'lucide-react';
import {
  createRemoteAssessmentTokenForClient,
  sendRemoteIntakeLinkEmail,
  type RemoteAssessmentClientIntake,
} from '@/services/remoteAssessmentClient';
import { startBaselineAssessmentSession } from '@/lib/assessment/assessmentSessionStorage';
import { ROUTES } from '@/constants/routes';
import { UI_TOASTS } from '@/constants/ui';
import { functionsCallableUserMessage } from '@/lib/firebase/functionsCallableUserMessage';
import { logger } from '@/lib/utils/logger';
import { cn } from '@/lib/utils';

interface NewClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

export function NewClientModal({ open, onOpenChange, organizationId }: NewClientModalProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [loading, setLoading] = useState<'link' | 'studio' | null>(null);

  const trimmedName = clientName.trim();
  const trimmedEmail = clientEmail.trim();
  const isValidName = trimmedName.length >= 2;
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const hasOrgContext = organizationId.trim().length > 0;

  function resetState() {
    setClientName('');
    setClientEmail('');
    setLoading(null);
  }

  function handleClose(next: boolean) {
    if (!next) resetState();
    onOpenChange(next);
  }

  function buildIntakePayload(): RemoteAssessmentClientIntake {
    const intake: RemoteAssessmentClientIntake = { fullName: trimmedName };
    if (trimmedEmail) intake.email = trimmedEmail;
    return intake;
  }

  function navigateToPendingClient() {
    handleClose(false);
    navigate(`/dashboard/clients/${encodeURIComponent(trimmedName)}`);
  }

  async function handleSendLink() {
    if (!isValidName || !hasOrgContext || loading) return;
    setLoading('link');
    try {
      const res = await createRemoteAssessmentTokenForClient(organizationId, trimmedName, {
        remoteScope: 'full',
        intake: buildIntakePayload(),
      });

      if (isValidEmail) {
        try {
          await sendRemoteIntakeLinkEmail({
            organizationId,
            token: res.token,
            to: trimmedEmail,
            clientName: trimmedName,
          });
          toast({
            title: UI_TOASTS.SUCCESS.INTAKE_LINK_EMAILED,
            description: `Waiting for ${trimmedName} to complete pre-assessment.`,
          });
        } catch (e) {
          logger.error('[NewClientModal] intake email failed', e);
          toast({
            variant: 'destructive',
            title: UI_TOASTS.ERROR.INTAKE_EMAIL_NOT_SENT,
            description: functionsCallableUserMessage(e, UI_TOASTS.ERROR.INTAKE_EMAIL_NOT_SENT_DESC),
          });
        }
      } else {
        toast({
          title: 'Intake link created',
          description: `Copy the link from ${trimmedName}'s profile if you need to send it manually.`,
        });
      }

      navigateToPendingClient();
    } catch {
      toast({
        variant: 'destructive',
        title: 'Could not create pre-assessment link',
        description: 'Check your connection and try again.',
      });
    } finally {
      setLoading(null);
    }
  }

  function handleStartInStudio() {
    if (!isValidName || loading) return;
    setLoading('studio');
    startBaselineAssessmentSession({
      fullName: trimmedName,
      ...(trimmedEmail ? { email: trimmedEmail } : {}),
    });
    handleClose(false);
    navigate(ROUTES.ASSESSMENT);
  }

  if (!hasOrgContext) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">New Client</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Loading your organisation… If this stays here, refresh the page or sign back in.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-hidden border-border bg-card p-0 sm:max-w-2xl sm:rounded-[28px]">
        <div className="flex flex-col overflow-y-auto p-7">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
              Add a new client
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Send a pre-assessment link, or start physical assessment in studio now.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FieldShell label="Client name">
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Alex Chen"
                autoComplete="name"
                autoFocus
                className="h-11 rounded-2xl border-transparent bg-muted px-[18px] text-sm focus-visible:border-foreground focus-visible:ring-0"
              />
            </FieldShell>

            <FieldShell
              label="Email"
              help="We email the pre-assessment link from One Assess when you send the link."
            >
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="client@example.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="h-11 rounded-2xl border-transparent bg-muted px-[18px] text-sm focus-visible:border-foreground focus-visible:ring-0"
              />
            </FieldShell>
          </div>

          <div className="mt-7 flex flex-col-reverse items-stretch gap-2 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <Button variant="ghost" onClick={() => handleClose(false)} className="rounded-full sm:w-auto">
              Cancel
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
              <Button
                variant="outline"
                onClick={() => void handleSendLink()}
                disabled={!isValidName || loading !== null}
                className="h-11 gap-2 rounded-full sm:w-auto"
              >
                {loading === 'link' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                Send pre-assessment link
              </Button>
              <Button
                onClick={handleStartInStudio}
                disabled={!isValidName || loading !== null}
                className="h-11 gap-2 rounded-full sm:w-auto"
              >
                Start in studio
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface FieldShellProps {
  label: string;
  help?: string;
  className?: string;
  children: React.ReactNode;
}

function FieldShell({ label, help, className, children }: FieldShellProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="text-[13px] font-medium text-foreground">{label}</label>
      {children}
      {help ? <span className="text-[12px] text-muted-foreground">{help}</span> : null}
    </div>
  );
}
