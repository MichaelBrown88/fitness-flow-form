/**
 * Public-facing GDPR Article 17 erasure request page.
 * Accessible at /r/:token/erasure — no authentication required.
 * Submits via `submitPublicErasureRequest` callable (server validates token → org).
 */

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import AppShell from '@/components/layout/AppShell';
import { ROUTES } from '@/constants/routes';
import { Trash2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { logger } from '@/lib/utils/logger';

type Status = 'idle' | 'loading' | 'success' | 'error' | 'not_found';

export default function RequestErasure() {
  const { token } = useParams<{ token: string }>();
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const trimmedToken = token?.trim() ?? '';
  const shellCommon = {
    mode: 'public' as const,
    clientName: 'Client' as const,
    shareToken: trimmedToken || undefined,
    showClientNav: Boolean(trimmedToken && status !== 'not_found'),
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmedToken) return;

    setStatus('loading');

    try {
      const fn = httpsCallable<{ shareToken: string; reason?: string }, { success: boolean }>(
        getFunctions(),
        'submitPublicErasureRequest',
      );
      await fn({ shareToken: trimmedToken, reason: reason.trim() || undefined });
      setStatus('success');
    } catch (err) {
      logger.warn('[RequestErasure] submitPublicErasureRequest failed', err);
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code: string }).code)
          : '';
      if (code === 'functions/not-found' || code === 'functions/failed-precondition') {
        setStatus('not_found');
        return;
      }
      setErrorMessage('Something went wrong. Please try again or contact support.');
      setStatus('error');
    }
  }

  if (!trimmedToken) {
    return (
      <AppShell title="Data erasure" {...shellCommon} showClientNav={false}>
        <div className="max-w-md mx-auto px-4 py-8 text-center text-muted-foreground text-sm">
          <p className="text-foreground font-medium mb-2">Invalid link</p>
          <p>Open the erasure link from your report email, or go back to your report.</p>
          <Button variant="outline" size="sm" className="mt-6 rounded-xl" asChild>
            <Link to={ROUTES.HOME}>Go to home</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  if (status === 'success') {
    return (
      <AppShell title="Request received" {...shellCommon}>
        <div className="max-w-md mx-auto px-4 py-8 space-y-6 text-center">
          <div className="rounded-2xl border border-border bg-card text-card-foreground p-8 shadow-sm">
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-score-green" aria-hidden />
            <h1 className="text-lg font-semibold text-foreground">Request received</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your erasure request has been submitted. Your coach or organisation administrator will process it within
              30 days in line with GDPR Article 17.
            </p>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl" asChild>
            <Link to={`/r/${trimmedToken}`}>Back to report</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  if (status === 'not_found') {
    return (
      <AppShell title="Data erasure" {...shellCommon} showClientNav={false}>
        <div className="max-w-md mx-auto px-4 py-8 space-y-6 text-center">
          <div className="rounded-2xl border border-border bg-card text-card-foreground p-8 shadow-sm">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" aria-hidden />
            <h1 className="text-lg font-semibold text-foreground">Link not recognised</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This link does not match any report in our system. Please use the link from your report email.
            </p>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl" asChild>
            <Link to={ROUTES.HOME}>Go to home</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Request data erasure" {...shellCommon}>
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="rounded-2xl border border-border bg-card text-card-foreground p-6 sm:p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
              <Trash2 className="h-5 w-5 text-destructive" aria-hidden />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground">Request data erasure</h1>
              <p className="text-xs text-muted-foreground">GDPR Article 17 — Right to erasure</p>
            </div>
          </div>

          <p className="mb-6 text-sm text-muted-foreground">
            You can request that all personal data associated with your report is permanently deleted. Once submitted,
            your coach or organisation admin will action this request within 30 days.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reason" className="mb-1.5 block text-xs font-medium text-foreground">
                Reason (optional)
              </label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. I no longer wish my data to be stored."
                rows={3}
                className="resize-none text-sm"
              />
            </div>

            {status === 'error' && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
                {errorMessage}
              </p>
            )}

            <Button type="submit" variant="destructive" className="w-full" disabled={status === 'loading'}>
              {status === 'loading' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" aria-hidden />
                  Submitting…
                </>
              ) : (
                'Submit erasure request'
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              This action does not immediately delete your data. A request is sent to your coach for action.
            </p>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
            <Link to={`/r/${trimmedToken}`}>Back to report</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
