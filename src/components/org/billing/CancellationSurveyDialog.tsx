/**
 * CancellationSurveyDialog
 *
 * Pre-cancellation interstitial shown before redirecting to Stripe's portal.
 * Captures churn reason, offers alternatives, then proceeds if confirmed.
 * Saves feedback to Firestore `organizations/{orgId}/churnFeedback`.
 */

import { useState } from 'react';
import { doc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { MessageSquare, PauseCircle, ArrowDownCircle, Headphones, ExternalLink } from 'lucide-react';
import { getDb } from '@/services/firebase';
import { logger } from '@/lib/utils/logger';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

const CHURN_REASONS = [
  { id: 'too_expensive', label: 'Too expensive' },
  { id: 'not_using', label: "Not using it enough" },
  { id: 'missing_feature', label: 'Missing a feature I need' },
  { id: 'switching', label: 'Switching to another tool' },
  { id: 'closing_business', label: 'Closing my business' },
  { id: 'other', label: 'Other' },
] as const;

interface CancellationSurveyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  coachUid: string;
  onProceedToPortal: () => void;
}

export function CancellationSurveyDialog({
  open,
  onOpenChange,
  organizationId,
  coachUid,
  onProceedToPortal,
}: CancellationSurveyDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleProceed = async () => {
    if (!selectedReason) return;
    setSubmitting(true);
    try {
      const db = getDb();
      const feedbackRef = collection(doc(db, 'organizations', organizationId), 'churnFeedback');
      await addDoc(feedbackRef, {
        reason: selectedReason,
        detail: detail.trim() || null,
        submittedBy: coachUid,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      logger.error('Failed to save churn feedback:', err);
    } finally {
      setSubmitting(false);
      onOpenChange(false);
      onProceedToPortal();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg">Before you go</AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            We'd love to understand why. Your feedback helps us improve.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          {/* Reason selector */}
          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              What's the main reason?
            </legend>
            <div className="grid gap-2">
              {CHURN_REASONS.map(reason => (
                <button
                  key={reason.id}
                  type="button"
                  onClick={() => setSelectedReason(reason.id)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    selectedReason === reason.id
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                  }`}
                >
                  <span className={`h-3 w-3 rounded-full border-2 shrink-0 ${
                    selectedReason === reason.id
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground/40'
                  }`} />
                  {reason.label}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Optional detail */}
          {selectedReason && (
            <div className="space-y-1.5">
              <label htmlFor="churn-detail" className="text-xs font-semibold text-muted-foreground">
                Anything else you'd like to share? (optional)
              </label>
              <textarea
                id="churn-detail"
                value={detail}
                onChange={e => setDetail(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="Tell us more..."
              />
            </div>
          )}

          {/* Alternatives */}
          {selectedReason && (
            <div className="rounded-lg border border-dashed border-border/70 bg-muted/15 p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground">Have you considered?</p>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <ArrowDownCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span><strong>Downgrade</strong> to a smaller plan with fewer client slots</span>
                </li>
                <li className="flex items-center gap-2">
                  <PauseCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span><strong>Pause</strong> your subscription for a month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Headphones className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span><strong>Talk to us</strong> — email support@one-assess.com</span>
                </li>
              </ul>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Never mind</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={!selectedReason || submitting}
            onClick={() => void handleProceed()}
            className="gap-1.5"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full border-2 border-destructive-foreground/30 border-t-destructive-foreground animate-spin" />
                Submitting...
              </span>
            ) : (
              <>
                <ExternalLink className="h-3.5 w-3.5" />
                Continue to cancel
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
