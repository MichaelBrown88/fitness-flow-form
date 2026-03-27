/**
 * ArchiveClientDialog
 *
 * Confirmation dialog for archiving a client who has left.
 * Archived clients are hidden from dashboards but data is fully preserved.
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
import { Archive, RotateCcw } from 'lucide-react';

interface ArchiveClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  isArchived: boolean;
  onArchive: (reason?: string) => Promise<void>;
  onReactivate: (mode: 'resume' | 'reset') => Promise<void>;
}

export function ArchiveClientDialog({
  open,
  onOpenChange,
  clientName,
  isArchived,
  onArchive,
  onReactivate,
}: ArchiveClientDialogProps) {
  const [reason, setReason] = useState('');
  const [reactivateMode, setReactivateMode] = useState<'resume' | 'reset'>('reset');
  const [submitting, setSubmitting] = useState(false);

  const handleArchive = async () => {
    setSubmitting(true);
    try {
      await onArchive(reason.trim() || undefined);
      onOpenChange(false);
      setReason('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReactivate = async () => {
    setSubmitting(true);
    try {
      await onReactivate(reactivateMode);
      onOpenChange(false);
      setReactivateMode('reset');
    } finally {
      setSubmitting(false);
    }
  };

  if (isArchived) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="sm:max-w-[440px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-emerald-600" />
              Reactivate {clientName}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Choose how to handle the assessment schedule.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4 space-y-3">
            <label className="flex items-start gap-3 rounded-xl p-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="radio"
                name="reactivate-mode"
                value="reset"
                checked={reactivateMode === 'reset'}
                onChange={() => setReactivateMode('reset')}
                className="mt-0.5 accent-emerald-600"
              />
              <div>
                <div className="text-sm font-bold text-foreground">Start fresh from today</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  All countdowns restart from today. Best for long absences.
                </div>
              </div>
            </label>
            <label className="flex items-start gap-3 rounded-xl p-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="radio"
                name="reactivate-mode"
                value="resume"
                checked={reactivateMode === 'resume'}
                onChange={() => setReactivateMode('resume')}
                className="mt-0.5 accent-emerald-600"
              />
              <div>
                <div className="text-sm font-bold text-foreground">Resume remaining time</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Countdowns pick up where they left off.
                </div>
              </div>
            </label>
          </div>

          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-xl h-11 px-6 font-bold" disabled={submitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReactivate}
              disabled={submitting}
              className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl h-11 px-6 font-bold"
            >
              {submitting ? 'Reactivating...' : 'Reactivate'}
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
            <Archive className="h-5 w-5 text-amber-600" />
            Archive {clientName}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            They will be removed from your dashboard and schedule.
            All data is preserved and you can reactivate anytime.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground block mb-2">
            Reason (optional)
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Completed program, moved away..."
            rows={3}
            className="rounded-xl resize-none"
          />
        </div>

        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel className="rounded-xl h-11 px-6 font-bold" disabled={submitting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleArchive}
            disabled={submitting}
            className="bg-amber-600 text-white hover:bg-amber-700 rounded-xl h-11 px-6 font-bold"
          >
            {submitting ? 'Archiving...' : 'Archive'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
