/**
 * PauseClientDialog
 *
 * AlertDialog for pausing or unpausing a client account.
 * When pausing: shows confirmation with optional reason textarea.
 * When unpausing: shows options to resume remaining time or reset fresh.
 */

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { PauseCircle, PlayCircle } from 'lucide-react';

interface PauseClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  isPaused: boolean;
  onPause: (reason?: string) => Promise<void>;
  onUnpause: (mode: 'resume' | 'reset') => Promise<void>;
}

export function PauseClientDialog({
  open,
  onOpenChange,
  clientName,
  isPaused,
  onPause,
  onUnpause,
}: PauseClientDialogProps) {
  const [reason, setReason] = useState('');
  const [unpauseMode, setUnpauseMode] = useState<'resume' | 'reset'>('resume');
  const [submitting, setSubmitting] = useState(false);

  const handlePause = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent AlertDialogAction from auto-closing before async completes
    setSubmitting(true);
    try {
      await onPause(reason.trim() || undefined);
      onOpenChange(false);
      setReason('');
    } catch {
      // Error toast shown by hook handler; keep dialog open for retry
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnpause = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent AlertDialogAction from auto-closing before async completes
    setSubmitting(true);
    try {
      await onUnpause(unpauseMode);
      onOpenChange(false);
      setUnpauseMode('resume');
    } catch {
      // Error toast shown by hook handler; keep dialog open for retry
    } finally {
      setSubmitting(false);
    }
  };

  if (isPaused) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="sm:max-w-[440px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-emerald-600" />
              Unpause {clientName}&apos;s Account
            </AlertDialogTitle>
            <AlertDialogDescription>
              Choose how to handle the assessment schedule.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4 space-y-3">
            <label className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="radio"
                name="unpause-mode"
                value="resume"
                checked={unpauseMode === 'resume'}
                onChange={() => setUnpauseMode('resume')}
                className="mt-0.5 accent-emerald-600"
              />
              <div>
                <div className="text-sm font-bold text-foreground">Resume remaining time</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Countdowns pick up where they left off before the pause.
                </div>
              </div>
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="radio"
                name="unpause-mode"
                value="reset"
                checked={unpauseMode === 'reset'}
                onChange={() => setUnpauseMode('reset')}
                className="mt-0.5 accent-emerald-600"
              />
              <div>
                <div className="text-sm font-bold text-foreground">Reset fresh from today</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  All reassessment countdowns restart from today&apos;s date.
                </div>
              </div>
            </label>
          </div>

          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-xl h-11 px-6 font-bold" disabled={submitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnpause}
              disabled={submitting}
              className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl h-11 px-6 font-bold"
            >
              {submitting ? 'Unpausing...' : 'Unpause'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[440px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <PauseCircle className="h-5 w-5 text-amber-600" />
            Pause {clientName}&apos;s Account?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will freeze all reassessment countdowns. You can unpause at any time.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground block mb-2">
            Reason (optional)
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Client on vacation, injury recovery..."
            rows={3}
            className="rounded-xl resize-none"
          />
        </div>

        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel className="rounded-xl h-11 px-6 font-bold" disabled={submitting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handlePause}
            disabled={submitting}
            className="bg-amber-600 text-white hover:bg-amber-700 rounded-xl h-11 px-6 font-bold"
          >
            {submitting ? 'Pausing...' : 'Pause'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
