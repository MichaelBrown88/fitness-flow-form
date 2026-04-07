import React, { useMemo } from 'react';
import type { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import type { PostureFindingViewId } from '@/lib/types/postureFindings';
import { Card } from '@/components/ui/card';
import {
  aggregatePostureFindings,
  buildFocusBullets,
  sortFindingsForDisplay,
  viewLabelUpper,
} from '@/lib/posture/aggregatePostureInsights';
import { calculateFrontViewMetrics, calculateSideViewMetrics } from '@/lib/utils/postureMath';
import { getPostureFeedbackDefinition } from '@/constants/postureFeedbackLibrary';

const VIEWS: PostureFindingViewId[] = ['front', 'side-left', 'back', 'side-right'];

function getImageUrl(postureImages: Record<string, string> | undefined, view: PostureFindingViewId): string {
  if (!postureImages) return '';
  return (
    postureImages[view] ||
    postureImages[`postureImagesStorage_${view}`] ||
    postureImages[`postureImagesFull_${view}`] ||
    ''
  );
}

interface PostureTrainerPostureSectionProps {
  postureResults: Partial<Record<PostureFindingViewId, PostureAnalysisResult>>;
  postureImages: Record<string, string>;
}

export function PostureTrainerPostureSection({ postureResults, postureImages }: PostureTrainerPostureSectionProps) {
  const tableRows = useMemo(() => {
    const merged = sortFindingsForDisplay(aggregatePostureFindings(postureResults));
    return merged.map((f) => {
      const def = getPostureFeedbackDefinition(f.id);
      const th = def?.thresholds;
      const thresholdStr = th ? `${th.mild} / ${th.moderate} / ${th.significant}` : '—';
      return {
        name: f.name,
        view: viewLabelUpper(f.view),
        measured: `${f.measuredValue.toFixed(1)} ${f.unit === 'degrees' ? '°' : '(norm.)'}`,
        threshold: thresholdStr,
        severity: f.severity,
      };
    });
  }, [postureResults]);

  const focusBullets = useMemo(() => buildFocusBullets(aggregatePostureFindings(postureResults), 4), [postureResults]);

  const metricsLines = (view: PostureFindingViewId, analysis: PostureAnalysisResult): string[] => {
    const raw = analysis.landmarks?.raw;
    if (!raw?.length) return [];
    const lines: string[] = [];
    if (view === 'front' || view === 'back') {
      const m = calculateFrontViewMetrics(raw, view);
      if (m.headTiltDegrees != null) lines.push(`Head tilt: ${m.headTiltDegrees.toFixed(1)}°`);
      if (m.shoulderSymmetryCm != null) lines.push(`Shoulder Δ: ${m.shoulderSymmetryCm.toFixed(2)} cm`);
      if (m.hipSymmetryCm != null) lines.push(`Hip Δ: ${m.hipSymmetryCm.toFixed(2)} cm`);
      if (m.hipShiftPercent != null) lines.push(`Hip shift: ${m.hipShiftPercent.toFixed(1)}%`);
      if (m.leftKneeDeviationPercent != null) lines.push(`L knee dev: ${m.leftKneeDeviationPercent.toFixed(1)}%`);
      if (m.rightKneeDeviationPercent != null) lines.push(`R knee dev: ${m.rightKneeDeviationPercent.toFixed(1)}%`);
    } else {
      const m = calculateSideViewMetrics(raw, view);
      if (m.forwardHeadCm != null) lines.push(`Forward head: ${m.forwardHeadCm.toFixed(2)} cm`);
      if (m.headPitchDegrees != null) lines.push(`Head pitch: ${m.headPitchDegrees.toFixed(1)}°`);
      if (m.pelvicTiltDegrees != null) lines.push(`Pelvic angle: ${m.pelvicTiltDegrees.toFixed(1)}°`);
    }
    return lines;
  };

  const availableViews = VIEWS.filter((v) => postureResults[v] && getImageUrl(postureImages, v));
  if (availableViews.length === 0) return null;

  return (
    <div className="mt-6 space-y-4 border-t border-border pt-6">
      <h5 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Trainer view</h5>

      <div className="grid grid-cols-2 gap-3">
        {availableViews.map((view) => {
          const analysis = postureResults[view]!;
          const url = getImageUrl(postureImages, view);
          const metrics = metricsLines(view, analysis);
          return (
            <Card key={view} className="overflow-hidden border-border p-0">
              <div className="border-b border-border bg-muted/40 px-2 py-1 text-[10px] font-black uppercase tracking-[0.15em]">
                {viewLabelUpper(view)}
              </div>
              <div className="aspect-[3/5] w-full bg-black">
                <img src={url} alt="" className="h-full w-full object-contain object-top" />
              </div>
              <ul className="space-y-0.5 p-2 font-mono text-[10px] leading-tight text-muted-foreground">
                {metrics.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>

      {tableRows.length > 0 && (
        <Card className="overflow-x-auto border-border p-0">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="p-2 font-semibold">Finding</th>
                <th className="p-2 font-semibold">View</th>
                <th className="p-2 font-semibold">Measured</th>
                <th className="p-2 font-semibold">Threshold</th>
                <th className="p-2 font-semibold">Severity</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="p-2">{row.name}</td>
                  <td className="p-2">{row.view}</td>
                  <td className="p-2 font-mono">{row.measured}</td>
                  <td className="p-2 text-muted-foreground">{row.threshold}</td>
                  <td className="p-2 capitalize">{row.severity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {focusBullets.length > 0 && (
        <Card className="border-border p-4">
          <h6 className="text-sm font-semibold text-foreground mb-2">What We&apos;ll Focus On (client copy)</h6>
          <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
            {focusBullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
