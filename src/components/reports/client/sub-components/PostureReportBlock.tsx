import React from 'react';
import type { PostureFindingRecord, PostureFindingSeverity } from '@/lib/types/postureFindings';
import { cn } from '@/lib/utils';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { PostureClientPostureSection } from '@/components/reports/posture/PostureClientPostureSection';
import type { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import type { PostureFindingViewId } from '@/lib/types/postureFindings';

const SEV_ORDER: Record<PostureFindingSeverity, number> = {
  aligned: 0,
  mild: 1,
  moderate: 2,
  significant: 3,
};

function worstSeverity(findings: PostureFindingRecord[]): PostureFindingSeverity | undefined {
  if (findings.length === 0) return undefined;
  const sorted = [...findings].sort((a, b) => SEV_ORDER[b.severity] - SEV_ORDER[a.severity]);
  return sorted[0]?.severity;
}

function severityLabel(sev: PostureFindingSeverity): string {
  if (sev === 'significant') return 'significant';
  if (sev === 'moderate') return 'moderate';
  if (sev === 'mild') return 'mild';
  return 'aligned';
}

interface PostureReportBlockProps {
  findings: PostureFindingRecord[];
  postureResults: Partial<Record<PostureFindingViewId, PostureAnalysisResult>>;
  postureImages: Record<string, string>;
}

export function PostureReportBlock({
  findings,
  postureResults,
  postureImages,
}: PostureReportBlockProps) {
  const count = findings.length;
  const worst = worstSeverity(findings);
  const headline =
    count === 0
      ? null
      : count === 1
        ? `1 finding noted${worst && worst !== 'aligned' ? ` (${severityLabel(worst)})` : ''}.`
        : `${count} findings noted${worst && worst !== 'aligned' ? ` — most notable: ${severityLabel(worst)}` : ''}.`;

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-bold text-foreground">{CLIENT_REPORT_COPY.posture}</h4>
        {headline ? (
          <p className="mt-1 text-sm text-foreground-secondary">{headline}</p>
        ) : null}
        <p className="mt-1 text-[12px] text-muted-foreground">{CLIENT_REPORT_COPY.postureTapHint}</p>
      </div>
      <PostureSeverityLegend />
      <PostureClientPostureSection
        postureResults={postureResults}
        postureImages={postureImages}
      />
    </div>
  );
}

function PostureSeverityLegend() {
  const items: { label: string; className: string }[] = [
    { label: 'Mild', className: 'bg-score-amber' },
    { label: 'Moderate', className: 'bg-orange-500' },
    { label: 'Significant', className: 'bg-score-red' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span className={cn('h-2 w-2 rounded-full', item.className)} aria-hidden />
          {item.label}
        </span>
      ))}
    </div>
  );
}
