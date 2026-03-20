/**
 * Public-facing GDPR Article 17 erasure request page.
 * Accessible at /r/:token/erasure — no authentication required.
 * Writes an erasure request to organizations/{orgId}/erasureRequests/{requestId}.
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

type Status = 'idle' | 'loading' | 'success' | 'error' | 'not_found';

export default function RequestErasure() {
  const { token } = useParams<{ token: string }>();
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    setStatus('loading');

    try {
      const db = getDb();
      const reportSnap = await getDoc(doc(db, 'publicReports', token));
      if (!reportSnap.exists()) {
        setStatus('not_found');
        return;
      }

      const reportData = reportSnap.data();
      const organizationId: string | undefined = reportData.organizationId;
      const assessmentId: string | undefined = reportData.assessmentId;

      if (!organizationId) {
        setStatus('not_found');
        return;
      }

      const requestsRef = collection(db, `organizations/${organizationId}/erasureRequests`);
      await addDoc(requestsRef, {
        shareToken: token,
        assessmentId: assessmentId ?? null,
        organizationId,
        reason: reason.trim() || 'No reason provided',
        status: 'pending',
        requestedAt: serverTimestamp(),
        schemaVersion: 1,
      });

      setStatus('success');
    } catch {
      setErrorMessage('Something went wrong. Please try again or contact support.');
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
          <h1 className="text-lg font-semibold text-slate-900">Request received</h1>
          <p className="mt-2 text-sm text-slate-500">
            Your erasure request has been submitted. Your coach or organisation administrator will
            process it within 30 days in line with GDPR Article 17.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'not_found') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-rose-400" />
          <h1 className="text-lg font-semibold text-slate-900">Link not recognised</h1>
          <p className="mt-2 text-sm text-slate-500">
            This link doesn't match any report in our system. Please use the link from your report email.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50">
            <Trash2 className="h-5 w-5 text-rose-500" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-900">Request data erasure</h1>
            <p className="text-xs text-slate-500">GDPR Article 17 — Right to erasure</p>
          </div>
        </div>

        <p className="mb-6 text-sm text-slate-600">
          You can request that all personal data associated with your report is permanently deleted.
          Once submitted, your coach or organisation admin will action this request within 30 days.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reason" className="mb-1.5 block text-xs font-medium text-slate-600">
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
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{errorMessage}</p>
          )}

          <Button
            type="submit"
            variant="destructive"
            className="w-full"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              'Submit erasure request'
            )}
          </Button>

          <p className="text-center text-xs text-slate-400">
            This action does not immediately delete your data. A request is sent to your coach for action.
          </p>
        </form>
      </div>
    </div>
  );
}
