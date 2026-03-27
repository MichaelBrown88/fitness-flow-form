import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ASSESSMENT_COPY } from '@/constants/assessmentCopy';
import type { CheckinHint } from '@/lib/clientCheckinHints';

type ClientCheckinStripProps = {
  hints: CheckinHint[];
  onRun: (id: CheckinHint['id']) => void;
};

const LABEL: Record<CheckinHint['id'], string> = {
  lifestyle: ASSESSMENT_COPY.REMOTE_CHECKIN_LIFESTYLE_CTA,
  posture: ASSESSMENT_COPY.REMOTE_CHECKIN_POSTURE_CTA,
};

export function ClientCheckinStrip({ hints, onRun }: ClientCheckinStripProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || hints.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-start justify-between gap-2 sm:contents">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
          {ASSESSMENT_COPY.REMOTE_CHECKIN_STRIP_TITLE}
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="sm:order-last text-muted-foreground hover:text-foreground p-1 rounded-md"
          aria-label="Dismiss suggestions"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {hints.map((h) => (
          <Button
            key={h.id}
            type="button"
            size="sm"
            variant="secondary"
            className="min-h-9 rounded-lg"
            onClick={() => onRun(h.id)}
          >
            {LABEL[h.id]}
          </Button>
        ))}
      </div>
    </div>
  );
}
