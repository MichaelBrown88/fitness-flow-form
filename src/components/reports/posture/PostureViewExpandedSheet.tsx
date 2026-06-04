import React from 'react';
import type { PostureFindingRecord, PostureFindingSeverity, PostureFindingViewId } from '@/lib/types/postureFindings';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { viewLabelUpper } from '@/lib/posture/aggregatePostureInsights';
import { MuscleMap } from '@/components/reports/MuscleMap';
import { combineMuscleImplications } from '@/lib/posture/findingMuscleMap';

const SEV_ORDER: Record<PostureFindingSeverity, number> = {
  aligned: 0,
  mild: 1,
  moderate: 2,
  significant: 3,
};

const VIEW_DISPLAY: Record<PostureFindingViewId, string> = {
  front: 'Front view',
  'side-left': 'Side-left view',
  back: 'Back view',
  'side-right': 'Side-right view',
};

function severityPillClass(sev: PostureFindingSeverity): string {
  if (sev === 'mild') return 'bg-score-amber-light text-score-amber-fg';
  if (sev === 'moderate') return 'bg-orange-500/15 text-orange-700 dark:text-orange-300';
  if (sev === 'significant') return 'bg-score-red-light text-score-red-fg';
  return 'bg-muted text-muted-foreground';
}

function formatMeasure(value: number | null | undefined, unit: string | undefined): string {
  if (value == null || !Number.isFinite(value)) return '';
  const abs = Math.abs(value);
  const precision = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return `${value.toFixed(precision)}${unit ? ` ${unit}` : ''}`;
}

interface PostureViewExpandedSheetProps {
  view: PostureFindingViewId | null;
  findings: PostureFindingRecord[];
  imageUrl: string;
  onClose: () => void;
}

export function PostureViewExpandedSheet({
  view,
  findings,
  imageUrl,
  onClose,
}: PostureViewExpandedSheetProps) {
  const open = view !== null;
  const sorted = [...findings].sort((a, b) => SEV_ORDER[b.severity] - SEV_ORDER[a.severity]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="!fixed !inset-0 !h-full !w-full !max-w-none !max-h-none !translate-x-0 !translate-y-0 !rounded-none border-0 bg-background p-0 gap-0 flex flex-col md:flex-row">
        <DialogHeader className="sr-only">
          <DialogTitle>{view ? VIEW_DISPLAY[view] : 'Posture view'}</DialogTitle>
        </DialogHeader>
        {view && (
          <>
            <button
              type="button"
              className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-50 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            {/* ─── Feedback panel (LEFT on desktop, BOTTOM on mobile) ─── */}
            <div className="order-2 md:order-1 flex flex-1 flex-col gap-4 overflow-y-auto px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:max-w-[55%] md:p-8 md:pt-10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                  {viewLabelUpper(view)}
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                  {VIEW_DISPLAY[view]}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {sorted.length === 0
                    ? 'No notable deviations in this view.'
                    : `${sorted.length} finding${sorted.length === 1 ? '' : 's'} from this angle.`}
                </p>
              </div>

              {sorted.length > 0 && (() => {
                const { tight, weak } = combineMuscleImplications(sorted.map((f) => f.id));
                if (tight.length === 0 && weak.length === 0) return null;
                return (
                  <div className="border-t border-border pt-5">
                    <MuscleMap tight={tight} weak={weak} title="Muscles implicated" />
                  </div>
                );
              })()}

              <div className="flex flex-col gap-6 border-t border-border pt-5">
                {sorted.map((f) => (
                  <div key={`${f.id}-${f.view}`}>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h3 className="text-base font-semibold text-foreground">{f.name}</h3>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize',
                          severityPillClass(f.severity),
                        )}
                      >
                        {f.severity}
                      </span>
                      {f.measuredValue != null && (
                        <span className="ml-auto shrink-0 tabular-nums text-[11px] text-muted-foreground">
                          {formatMeasure(f.measuredValue, f.unit)}
                        </span>
                      )}
                    </div>
                    {f.whatItMeans && (
                      <p className="mt-2 text-sm text-foreground-secondary leading-relaxed">
                        <span className="font-semibold text-foreground">What it means · </span>
                        {f.whatItMeans}
                      </p>
                    )}
                    {f.whatWellDo && (
                      <p className="mt-1.5 text-sm text-foreground-secondary leading-relaxed">
                        <span className="font-semibold text-foreground">How we&apos;ll address it · </span>
                        {f.whatWellDo}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ─── Image panel (RIGHT on desktop, TOP on mobile) ─── */}
            <div className="order-1 md:order-2 h-[55vh] w-full shrink-0 overflow-hidden bg-white md:h-full md:w-auto md:flex-1">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt=""
                  className="h-full w-full object-contain object-top md:object-center"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                  No image
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
