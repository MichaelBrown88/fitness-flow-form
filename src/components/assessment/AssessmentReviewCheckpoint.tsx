/**
 * Pre-results checkpoint: explicit save + generate vs keep editing vs save and exit.
 */

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ASSESSMENT_SETUP_COPY } from '@/constants/assessmentSetupCopy';

export type AssessmentReviewCheckpointProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientDisplayName: string;
  /** 0–100 */
  progressPercent: number;
  isCompleteForReport: boolean;
  primaryActionLabel: string;
  primaryDisabled: boolean;
  onGenerate: () => void;
  onKeepEditing: () => void;
  onSaveAndExit: () => void;
};

export function AssessmentReviewCheckpoint({
  open,
  onOpenChange,
  clientDisplayName,
  progressPercent,
  isCompleteForReport,
  primaryActionLabel,
  primaryDisabled,
  onGenerate,
  onKeepEditing,
  onSaveAndExit,
}: AssessmentReviewCheckpointProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{ASSESSMENT_SETUP_COPY.REVIEW_TITLE}</DialogTitle>
          <DialogDescription>{ASSESSMENT_SETUP_COPY.REVIEW_SUBTITLE}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {ASSESSMENT_SETUP_COPY.REVIEW_CLIENT}
            </p>
            <p className="text-sm font-medium text-foreground">{clientDisplayName}</p>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {ASSESSMENT_SETUP_COPY.REVIEW_PROGRESS}
              </p>
              <span className="text-xs tabular-nums text-muted-foreground">{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
          <p className="text-sm text-muted-foreground">
            {isCompleteForReport
              ? ASSESSMENT_SETUP_COPY.REVIEW_COMPLETE_YES
              : ASSESSMENT_SETUP_COPY.REVIEW_COMPLETE_NO}
          </p>
          {!isCompleteForReport ? (
            <p className="text-xs text-muted-foreground">{ASSESSMENT_SETUP_COPY.REVIEW_MISSING_HINT}</p>
          ) : null}
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button
            type="button"
            className="w-full sm:w-full"
            disabled={primaryDisabled}
            onClick={() => {
              onOpenChange(false);
              onGenerate();
            }}
          >
            {primaryActionLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-full"
            onClick={() => {
              onOpenChange(false);
              onKeepEditing();
            }}
          >
            {ASSESSMENT_SETUP_COPY.KEEP_EDITING}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full sm:w-full text-muted-foreground"
            onClick={() => {
              onOpenChange(false);
              onSaveAndExit();
            }}
          >
            {ASSESSMENT_SETUP_COPY.SAVE_AND_EXIT}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
