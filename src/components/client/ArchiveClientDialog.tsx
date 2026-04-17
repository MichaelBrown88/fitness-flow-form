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
  onReactivate: () => Promise<void>;
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
  const [submitting, setSubmitting] = useState(false);

  const handleArchive = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent AlertDialogAction from auto-closing before async completes
    setSubmitting(true);
    try {
      await onArchive(reason.trim() || undefined);
      onOpenChange(false);
      setReason('');
    } catch {
      // Error toast is shown by the hook handler; keep dialog open so user can retry
    } finally {
      setSubmitting(false);
    }
  };

  const handleReactivate = async (e: React.MouseEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onReactivate();
      onOpenChange(false);
    } catch {
      // Error toast is shown by the hook handler; keep dialog open so user can retry
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
              This will bring {clientName} back to your active roster. Previous assessment history
              is preserved, but they will need a fresh baseline assessment to re-establish current scores
              and restart the scheduling cadence.
            </AlertDialogDescription>
          </AlertDialogHeader>

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
