import { useEffect, useRef, useState } from 'react';
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
import { ArrowRight, Check, Copy, Link2, Loader2, Mail } from 'lucide-react';
import {
  createRemoteAssessmentTokenForClient,
  type RemoteAssessmentClientIntake,
} from '@/services/remoteAssessmentClient';
import { startBaselineAssessmentSession } from '@/lib/assessment/assessmentSessionStorage';
import { ROUTES } from '@/constants/routes';
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
  const [remoteLink, setRemoteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const emailInputRef = useRef<HTMLInputElement>(null);

  const trimmedName = clientName.trim();
  const trimmedEmail = clientEmail.trim();
  const isValidName = trimmedName.length >= 2;
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const hasOrgContext = organizationId.trim().length > 0;

  // When the link view appears, focus the email input (if not already filled)
  // so the next likely action — sending the link — is one keystroke away.
  useEffect(() => {
    if (remoteLink && !trimmedEmail && emailInputRef.current) {
      const t = setTimeout(() => emailInputRef.current?.focus({ preventScroll: true }), 50);
      return () => clearTimeout(t);
    }
  }, [remoteLink, trimmedEmail]);

  function resetState() {
    setClientName('');
    setClientEmail('');
    setRemoteLink(null);
    setCopied(false);
    setLoading(null);
  }

  function handleClose(next: boolean) {
    if (!next) resetState();
    onOpenChange(next);
  }

  function buildIntakePayload(): RemoteAssessmentClientIntake {
    return trimmedEmail ? { email: trimmedEmail } : {};
  }

  async function handleSendLink() {
    if (!isValidName || !hasOrgContext || loading) return;
    setLoading('link');
    try {
      const res = await createRemoteAssessmentTokenForClient(organizationId, trimmedName, {
        remoteScope: 'full',
        intake: buildIntakePayload(),
      });
      setRemoteLink(`${window.location.origin}/remote/${res.token}`);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Could not generate link',
        description: 'Check your connection and try again.',
      });
    } finally {
      setLoading(null);
    }
  }

  async function handleCopy() {
    if (!remoteLink) return;
    try {
      await navigator.clipboard.writeText(remoteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ variant: 'destructive', title: 'Copy failed', description: 'Copy the link manually.' });
    }
  }

  function handleEmailLink() {
    if (!remoteLink || !isValidEmail) return;
    const greetingName = trimmedName.replace(/\b\w/g, (c) => c.toUpperCase());
    const subject = `Your assessment intake - let's get started`;
    const body = `Hi ${greetingName},\n\nHere's your private intake link. It takes about 5-10 minutes and we'll use your answers to tailor the physical assessment when you come in to the studio.\n\n${remoteLink}\n\nSee you soon!`;
    const href = `mailto:${encodeURIComponent(trimmedEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
    toast({
      variant: 'success',
      title: 'Opening your mail app',
      description: `If nothing happens, copy the link and send it to ${trimmedEmail} manually.`,
    });
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

  // ─── Render ──────────────────────────────────────────────────────────

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
              {remoteLink ? 'Intake link ready' : 'Add a new client'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {remoteLink
                ? `Share this with ${trimmedName} or send it straight to their inbox.`
                : 'Send a remote intake link, or start an assessment in studio now.'}
            </DialogDescription>
          </DialogHeader>

          {!remoteLink ? (
            <FormStage
              clientName={clientName}
              setClientName={setClientName}
              clientEmail={clientEmail}
              setClientEmail={setClientEmail}
              isValidName={isValidName}
              loading={loading}
              onSendLink={handleSendLink}
              onStartInStudio={handleStartInStudio}
              onCancel={() => handleClose(false)}
            />
          ) : (
            <LinkReadyStage
              clientName={trimmedName}
              clientEmail={clientEmail}
              setClientEmail={setClientEmail}
              emailInputRef={emailInputRef}
              remoteLink={remoteLink}
              copied={copied}
              isValidEmail={isValidEmail}
              onCopy={handleCopy}
              onEmail={handleEmailLink}
              onBackToStudio={handleStartInStudio}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Form stage ──────────────────────────────────────────────────────────

interface FormStageProps {
  clientName: string;
  setClientName: (v: string) => void;
  clientEmail: string;
  setClientEmail: (v: string) => void;
  isValidName: boolean;
  loading: 'link' | 'studio' | null;
  onSendLink: () => void;
  onStartInStudio: () => void;
  onCancel: () => void;
}

function FormStage({
  clientName, setClientName,
  clientEmail, setClientEmail,
  isValidName, loading,
  onSendLink, onStartInStudio, onCancel,
}: FormStageProps) {
  return (
    <>
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

        <FieldShell label="Email (optional)" help="We'll send the intake link here when you click Send.">
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
        <Button variant="ghost" onClick={onCancel} className="rounded-full sm:w-auto">
          Cancel
        </Button>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
          <Button
            variant="outline"
            onClick={onSendLink}
            disabled={!isValidName || loading !== null}
            className="h-11 gap-2 rounded-full sm:w-auto"
          >
            {loading === 'link' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Send intake link
          </Button>
          <Button
            onClick={onStartInStudio}
            disabled={!isValidName || loading !== null}
            className="h-11 gap-2 rounded-full sm:w-auto"
          >
            Start in studio
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

// ─── Link-ready stage ────────────────────────────────────────────────────

interface LinkReadyStageProps {
  clientName: string;
  clientEmail: string;
  setClientEmail: (v: string) => void;
  emailInputRef: React.RefObject<HTMLInputElement | null>;
  remoteLink: string;
  copied: boolean;
  isValidEmail: boolean;
  onCopy: () => void;
  onEmail: () => void;
  onBackToStudio: () => void;
}

function LinkReadyStage({
  clientName, clientEmail, setClientEmail, emailInputRef,
  remoteLink, copied, isValidEmail,
  onCopy, onEmail, onBackToStudio,
}: LinkReadyStageProps) {
  function truncateLink(url: string): string {
    const stripped = url.replace(/^https?:\/\//, '');
    if (stripped.length <= 56) return stripped;
    return `${stripped.slice(0, 30)}…${stripped.slice(-22)}`;
  }

  return (
    <div className="mt-5 space-y-4">
      <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-border bg-muted px-4 py-3">
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground" title={remoteLink}>
          {truncateLink(remoteLink)}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Copy link"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>

      <Button onClick={onCopy} className="h-11 w-full gap-2 rounded-full">
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? 'Copied!' : 'Copy link'}
      </Button>

      <FieldShell label="Send by email" help="Opens your mail app with the link pre-filled — review and hit send.">
        <div className="flex min-w-0 gap-2">
          <Input
            ref={emailInputRef}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="client@example.com"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && isValidEmail && onEmail()}
            className="h-11 min-w-0 flex-1 rounded-2xl border-transparent bg-muted px-[18px] text-sm focus-visible:border-foreground focus-visible:ring-0"
          />
          <Button
            type="button"
            variant="outline"
            onClick={onEmail}
            disabled={!isValidEmail}
            className="h-11 shrink-0 gap-2 rounded-full px-4"
          >
            <Mail className="h-4 w-4" />
            Send
          </Button>
        </div>
      </FieldShell>

      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={onBackToStudio}
          className="text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          Or start an assessment in studio for {clientName} now
        </button>
      </div>
    </div>
  );
}

// ─── Field shell ─────────────────────────────────────────────────────────

interface FieldShellProps {
  label: string;
  help?: string;
  className?: string;
  children: React.ReactNode;
}

function FieldShell({ label, help, className, children }: FieldShellProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-[13px] font-medium text-foreground">{label}</label>
      {children}
      {help ? <span className="text-[12px] text-muted-foreground">{help}</span> : null}
    </div>
  );
}
