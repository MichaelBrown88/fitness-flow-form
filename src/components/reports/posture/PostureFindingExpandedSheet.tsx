import React from 'react';
import type { PostureFindingRecord, PostureFindingSeverity } from '@/lib/types/postureFindings';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { viewLabelUpper } from '@/lib/posture/aggregatePostureInsights';

function severityPillClass(sev: PostureFindingSeverity): string {
  if (sev === 'mild') return 'bg-score-amber-muted text-score-amber-fg border-score-amber/30';
  if (sev === 'moderate') return 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30';
  if (sev === 'significant') return 'bg-score-red-muted text-score-red-fg border-score-red/30';
  return 'bg-muted text-muted-foreground';
}

function severityLabel(sev: PostureFindingSeverity): string {
  if (sev === 'mild') return 'Mild';
  if (sev === 'moderate') return 'Moderate';
  if (sev === 'significant') return 'Significant';
  return '';
}

interface PostureFindingExpandedSheetProps {
  finding: PostureFindingRecord | null;
  imageUrl: string;
  legendSeverities: PostureFindingSeverity[];
  onClose: () => void;
}

export function PostureFindingExpandedSheet({
  finding,
  imageUrl,
  legendSeverities,
  onClose,
}: PostureFindingExpandedSheetProps) {
  const open = finding !== null;
  const showAligned = legendSeverities.includes('aligned');
  const showMild = legendSeverities.includes('mild');
  const showMod = legendSeverities.includes('moderate');
  const showSig = legendSeverities.includes('significant');

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="!fixed !inset-0 !h-full !w-full !max-w-none !max-h-none !translate-x-0 !translate-y-0 !rounded-none border-0 bg-background p-0 gap-0 flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>{finding?.name ?? 'Posture finding'}</DialogTitle>
        </DialogHeader>
        {finding && (
          <>
            <button
              type="button"
              className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-50 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="h-[65vh] min-h-[240px] w-full shrink-0 overflow-hidden bg-black">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt=""
                  className="h-full w-full object-contain object-top"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No image</div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                  {viewLabelUpper(finding.view)}
                </span>
                <span
                  className={cn(
                    'rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize',
                    severityPillClass(finding.severity)
                  )}
                >
                  {severityLabel(finding.severity)}
                </span>
              </div>
              <h2 className="text-xl font-semibold leading-tight text-foreground">{finding.name}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{finding.whatItMeans}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-border px-3 py-2">
              {showAligned && (
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-score-green" />
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Aligned</span>
                </div>
              )}
              {showMild && (
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-score-amber" />
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Minor</span>
                </div>
              )}
              {showMod && (
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Moderate</span>
                </div>
              )}
              {showSig && (
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-score-red" />
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Deviation</span>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
