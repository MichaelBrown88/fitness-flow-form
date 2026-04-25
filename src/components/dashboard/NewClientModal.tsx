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
import { Loader2, Copy, Check, ArrowRight, Link2, Mail } from 'lucide-react';
import { createRemoteAssessmentTokenForClient } from '@/services/remoteAssessmentClient';
import { startBaselineAssessmentSession } from '@/lib/assessment/assessmentSessionStorage';
import { ROUTES } from '@/constants/routes';

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
  const [loading, setLoading] = useState(false);
  const [remoteLink, setRemoteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const trimmedName = clientName.trim();
  const trimmedEmail = clientEmail.trim();
  const isValid = trimmedName.length >= 2;
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const hasOrgContext = organizationId.trim().length > 0;

  function handleClose(open: boolean) {
    if (!open) {
      setClientName('');
      setClientEmail('');
      setRemoteLink(null);
      setCopied(false);
    }
    onOpenChange(open);
  }

  async function handleSendLink() {
    if (!isValid || !hasOrgContext) return;
    setLoading(true);
    try {
      const res = await createRemoteAssessmentTokenForClient(organizationId, trimmedName, {
        remoteScope: 'full',
      });
      setRemoteLink(`${window.location.origin}/remote/${res.token}`);
    } catch {
      toast({
        title: 'Could not generate link',
        description: 'Check your connection and try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!remoteLink) return;
    try {
      await navigator.clipboard.writeText(remoteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Copy failed', description: 'Copy the link manually.', variant: 'destructive' });
    }
  }

  function handleEmail() {
    if (!remoteLink || !isValidEmail) return;
    const subject = `Your assessment intake - let's get started`;
    const body = `Hi ${trimmedName},\n\nHere's your private intake link. It takes about 5-10 minutes and we'll use your answers to tailor the physical assessment when you come in to the studio.\n\n${remoteLink}\n\nSee you soon!`;
    const href = `mailto:${encodeURIComponent(trimmedEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
    toast({
      title: 'Opening your mail app',
      description: `If nothing happens, copy the link and send it to ${trimmedEmail} manually.`,
    });
  }

  function truncateLink(url: string): string {
    const stripped = url.replace(/^https?:\/\//, '');
    if (stripped.length <= 52) return stripped;
    return `${stripped.slice(0, 28)}…${stripped.slice(-20)}`;
  }

  function handleStartNow() {
    if (!isValid) return;
    startBaselineAssessmentSession(trimmedName);
    handleClose(false);
    navigate(ROUTES.ASSESSMENT);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">New Client</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Send a remote intake link, or start an assessment in studio now.
          </DialogDescription>
        </DialogHeader>

        {!hasOrgContext ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Loading your organisation… If this stays here, refresh the page or sign back in.
            </p>
          </div>
        ) : (
        <div className="space-y-4 pt-1">
          <div>
            <Input
              placeholder="Client name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && isValid && !remoteLink && handleStartNow()}
              autoFocus
              className="h-11 rounded-xl"
            />
          </div>

          {!remoteLink ? (
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleSendLink}
                disabled={!isValid || loading}
                className="h-11 rounded-xl flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                Generate link
              </Button>
              <Button
                onClick={handleStartNow}
                disabled={!isValid}
                className="h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
              >
                Start now
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Share this link with <span className="font-semibold text-foreground">{trimmedName}</span> to complete their intake remotely.
              </p>
              <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-muted/50 p-3">
                <span
                  className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground"
                  title={remoteLink}
                >
                  {truncateLink(remoteLink)}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Copy link"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <Button
                className="w-full h-11 rounded-xl"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy link
                  </>
                )}
              </Button>

              <div className="space-y-2 pt-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Or send by email
                </p>
                <div className="flex min-w-0 gap-2">
                  <Input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder={`${trimmedName.toLowerCase().replace(/\s+/g, '.')}@example.com`}
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && isValidEmail && handleEmail()}
                    className="h-11 min-w-0 flex-1 rounded-xl"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleEmail}
                    disabled={!isValidEmail}
                    className="h-11 shrink-0 gap-2 rounded-xl px-4"
                  >
                    <Mail className="h-4 w-4" />
                    Send
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Opens your mail app with the link pre-filled — review and hit send.
                </p>
              </div>

              <Button
                variant="outline"
                onClick={() => { setRemoteLink(null); setCopied(false); }}
                className="w-full h-10 rounded-xl text-sm"
              >
                Or start now in studio instead
              </Button>
            </div>
          )}
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
