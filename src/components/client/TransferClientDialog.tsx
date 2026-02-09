/**
 * TransferClientDialog (Phase E)
 *
 * Dialog allowing org_admin (or the assigned coach) to transfer
 * a client to a different coach within the same organization.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getOrgCoaches } from '@/services/coachManagement';
import { logger } from '@/lib/utils/logger';

interface TransferClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  currentCoachUid: string;
  organizationId: string;
  onConfirm: (toCoachUid: string) => Promise<void>;
}

interface CoachOption {
  uid: string;
  displayName: string;
  email?: string;
}

export function TransferClientDialog({
  open,
  onOpenChange,
  clientName,
  currentCoachUid,
  organizationId,
  onConfirm,
}: TransferClientDialogProps) {
  const [coaches, setCoaches] = useState<CoachOption[]>([]);
  const [selectedCoach, setSelectedCoach] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch coaches when dialog opens
  useEffect(() => {
    if (!open || !organizationId) return;
    setLoading(true);
    getOrgCoaches(organizationId)
      .then((result) => {
        // Exclude the current assigned coach
        const filtered = result
          .filter((c) => c.uid !== currentCoachUid)
          .map((c) => ({ uid: c.uid, displayName: c.displayName, email: c.email }));
        setCoaches(filtered);
      })
      .catch((err) => {
        logger.error('Failed to load coaches for transfer', 'TransferDialog', err);
        setCoaches([]);
      })
      .finally(() => setLoading(false));
  }, [open, organizationId, currentCoachUid]);

  const handleConfirm = async () => {
    if (!selectedCoach) return;
    setSubmitting(true);
    try {
      await onConfirm(selectedCoach);
      onOpenChange(false);
      setSelectedCoach('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Transfer Client</DialogTitle>
          <DialogDescription>
            Transfer &ldquo;{clientName}&rdquo; to another coach. The new coach will see all
            previous reports and history.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          {loading ? (
            <p className="text-sm text-slate-500">Loading coaches...</p>
          ) : coaches.length === 0 ? (
            <p className="text-sm text-slate-500">No other coaches available.</p>
          ) : (
            <div className="grid gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Transfer to
              </label>
              <Select value={selectedCoach} onValueChange={setSelectedCoach}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select a coach..." />
                </SelectTrigger>
                <SelectContent>
                  {coaches.map((c) => (
                    <SelectItem key={c.uid} value={c.uid}>
                      {c.displayName}{c.email ? ` (${c.email})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl h-11 px-6 font-bold"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedCoach || submitting}
            className="bg-slate-900 text-white rounded-xl h-11 px-6 font-bold"
          >
            {submitting ? 'Transferring...' : 'Transfer Client'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
