import React from 'react';
import type { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import type { PostureView } from './postureViewerTypes';
import {
  getConsolidatedDeviations,
  getScreenSide,
  getSeverityTone,
  getAnchorForItem,
} from './postureViewerDeviationHelpers';

/**
 * Vertical position (%) based on body region for label placement.
 */
function getVerticalPosition(label: string): number {
  const positions: Record<string, number> = {
    'Forward Head': 12,
    'Head Tilt': 12,
    Head: 12,
    'Head Pitch Up': 12,
    'Head Pitch Down': 12,
    Shoulders: 24,
    'Rounded Shoulders': 24,
    'Upper Back': 28,
    Spine: 38,
    Thoracic: 32,
    'Lower Back': 42,
    'Hip Shift': 50,
    Pelvis: 52,
    'Pelvic Tilt': 52,
    'Forward Hips': 52,
    'Knee Valgus': 70,
    'Knee Varus': 70,
    'Knee Alignment': 70,
    Knees: 70,
    'Left Knee Valgus': 70,
    'Left Knee Varus': 70,
    'Right Knee Valgus': 70,
    'Right Knee Varus': 70,
    Ankles: 84,
  };
  return positions[label] ?? 50;
}

/**
 * Positioned labels — vertically aligned to body regions (desktop side columns).
 * Not currently used in the carousel viewer; kept for expanded dialog / future layouts.
 */
export function PosturePositionedLabels({
  analysis,
  side,
  view,
}: {
  analysis: PostureAnalysisResult;
  side: 'left' | 'right' | 'all';
  view: PostureView;
}) {
  const allDeviations = getConsolidatedDeviations(analysis, view);

  const withScreenSide = allDeviations.map((item) => ({
    item,
    screenSide: getScreenSide(item.side, view),
  }));

  const deviations =
    side === 'all'
      ? withScreenSide
      : withScreenSide.filter((d) => d.screenSide === side || d.screenSide === 'center');

  if (deviations.length === 0) {
    return null;
  }

  if (side === 'all') {
    return (
      <div className="flex flex-wrap justify-center gap-3">
        {deviations.map(({ item }, i) => {
          const tone = getSeverityTone(item.severity);
          return (
            <div key={i} className="flex items-center gap-1.5">
              <div className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
              <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${tone.text}`}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  const positioned = deviations
    .map(({ item, screenSide }) => {
      const anchorPosition = getAnchorForItem(item, analysis.landmarks?.raw, view);
      const position = anchorPosition ?? getVerticalPosition(item.label);
      return { item, screenSide, position };
    })
    .sort((a, b) => a.position - b.position)
    .map((entry, index, list) => {
      if (index === 0) return entry;
      const prev = list[index - 1];
      if (entry.position - prev.position < 6) {
        return { ...entry, position: Math.min(95, prev.position + 6) };
      }
      return entry;
    });

  return (
    <div className="relative h-full">
      {positioned.map(({ item, screenSide, position }, i) => {
        const tone = getSeverityTone(item.severity);

        return (
          <div key={i} className="absolute w-full" style={{ top: `${position}%`, transform: 'translateY(-50%)' }}>
            <div className={`${screenSide === 'left' ? 'text-left' : 'text-right'} max-w-[180px]`}>
              <div
                className={`inline-flex items-center gap-1.5 mb-0.5 ${screenSide === 'right' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${tone.dot}`} />
                <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${tone.text}`}>
                  {item.label}
                </span>
              </div>
              <p
                className={`text-xs text-white/60 leading-snug whitespace-normal break-words line-clamp-2 ${screenSide === 'left' ? 'pl-3' : 'pr-3'}`}
              >
                {item.recommendation}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
