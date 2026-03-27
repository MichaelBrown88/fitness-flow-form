import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PhaseFocusContent } from '@/lib/roadmap/coachContext';
import { CheckCircle2 } from 'lucide-react';

interface PhaseFocusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: PhaseFocusContent | null;
}

export function PhaseFocusDialog({
  open,
  onOpenChange,
  content,
}: PhaseFocusDialogProps) {
  if (!content) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{content.title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">{content.subtitle}</p>
        <div className="pt-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Focus for this phase
          </h4>
          <ul className="space-y-2">
            {content.focusPoints.map((point, i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground-secondary">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
