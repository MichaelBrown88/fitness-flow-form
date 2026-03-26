import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { CoachBrief } from '@/lib/roadmap/coachContext';
import { Target, AlertCircle, Lightbulb } from 'lucide-react';

interface CoachContextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  brief: CoachBrief | null;
}

export function CoachContextDialog({
  open,
  onOpenChange,
  clientName,
  brief,
}: CoachContextDialogProps) {
  if (!brief) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Coach brief: {clientName}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">
          Use this when populating the roadmap. Goals and main issues are from the latest assessment.
        </p>

        <div className="space-y-5 pt-2">
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
              <Target className="h-4 w-4 text-indigo-500" />
              Client goals
            </h3>
            {brief.goalLabels.length > 0 ? (
              <ul className="list-disc list-inside text-sm text-foreground-secondary space-y-0.5">
                {brief.goalLabels.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No goals recorded in assessment.</p>
            )}
          </section>

          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Main issues to consider
            </h3>
            {brief.mainIssues.length > 0 ? (
              <ul className="list-disc list-inside text-sm text-foreground-secondary space-y-1">
                {brief.mainIssues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No high-priority issues from assessment.</p>
            )}
          </section>

          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
              <Lightbulb className="h-4 w-4 text-emerald-500" />
              What to consider when building the roadmap
            </h3>
            <ul className="list-disc list-inside text-sm text-foreground-secondary space-y-1">
              {brief.considerations.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
