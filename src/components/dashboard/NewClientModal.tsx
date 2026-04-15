import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, Check, ArrowRight, Link2 } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);
  const [remoteLink, setRemoteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const trimmedName = clientName.trim();
  const isValid = trimmedName.length >= 2;

  function handleClose(open: boolean) {
    if (!open) {
      setClientName('');
      setRemoteLink(null);
      setCopied(false);
    }
    onOpenChange(open);
  }

  async function handleSendLink() {
    if (!isValid) return;
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
        </DialogHeader>

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
                Send link
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
              <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 p-3">
                <span className="flex-1 text-xs text-muted-foreground truncate font-mono">
                  {remoteLink.replace(/^https?:\/\//, '')}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Copy link"
                >
                  {copied ? <Check className="h-4 w-4 text-score-green" /> : <Copy className="h-4 w-4" />}
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
      </DialogContent>
    </Dialog>
  );
}
