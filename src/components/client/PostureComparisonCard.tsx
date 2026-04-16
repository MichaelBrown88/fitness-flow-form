/**
 * PostureComparisonCard
 *
 * Shows side-by-side posture photos from two assessment sessions.
 * Images are sourced from formData.postureImagesStorage on each snapshot.
 * Falls back to base64 formData.postureImages if storage URLs are absent.
 */

import { useState, useMemo } from 'react';
import type { AssessmentSnapshot } from '@/services/assessmentHistory';

type PostureView = 'front' | 'side-left' | 'back' | 'side-right';

const VIEW_LABELS: Record<PostureView, string> = {
  front: 'Front',
  'side-left': 'Side (L)',
  back: 'Back',
  'side-right': 'Side (R)',
};

interface SessionWithImages {
  snapshotId: string;
  date: Date;
  overallScore: number;
  images: Partial<Record<PostureView, string>>;
}

function extractImages(snapshot: AssessmentSnapshot): Partial<Record<PostureView, string>> {
  const storage = snapshot.formData?.postureImagesStorage as Record<string, string> | undefined;
  const base64 = snapshot.formData?.postureImages as Record<string, string> | undefined;
  const views: PostureView[] = ['front', 'side-left', 'back', 'side-right'];
  const result: Partial<Record<PostureView, string>> = {};
  for (const view of views) {
    const url = storage?.[view] || base64?.[view];
    if (url) result[view] = url;
  }
  return result;
}

interface PostureComparisonCardProps {
  snapshots: AssessmentSnapshot[];
}

export function PostureComparisonCard({ snapshots }: PostureComparisonCardProps) {
  const sessionsWithImages = useMemo<SessionWithImages[]>(() => {
    return snapshots
      .filter((s) => {
        const images = extractImages(s);
        return Object.keys(images).length > 0;
      })
      .map((s) => ({
        snapshotId: s.id ?? '',
        date: s.timestamp?.toDate?.() ?? new Date(0),
        overallScore: s.overallScore ?? 0,
        images: extractImages(s),
      }));
  }, [snapshots]);

  const [leftIdx, setLeftIdx] = useState(0);
  const [rightIdx, setRightIdx] = useState(1);
  const [activeView, setActiveView] = useState<PostureView>('front');

  const leftSession = sessionsWithImages[leftIdx];
  const rightSession = sessionsWithImages[rightIdx];

  const availableViews = useMemo<PostureView[]>(() => {
    const views: PostureView[] = ['front', 'side-left', 'back', 'side-right'];
    return views.filter((v) => leftSession?.images[v] || rightSession?.images[v]);
  }, [leftSession, rightSession]);

  if (sessionsWithImages.length < 2) {
    return (
      <div className="rounded-xl bg-muted/50 px-5 py-8 text-center space-y-1">
        <p className="text-sm font-semibold text-foreground-secondary">Posture comparison available after 2 sessions</p>
        <p className="text-xs text-muted-foreground">
          {sessionsWithImages.length === 0
            ? 'No posture photos captured yet. Use Companion Mode during an assessment.'
            : 'One session captured. Complete another assessment with posture to compare.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Session selectors */}
      <div className="grid grid-cols-2 gap-3">
        {([{ idx: leftIdx, setIdx: setLeftIdx, other: rightIdx, label: 'Previous' },
           { idx: rightIdx, setIdx: setRightIdx, other: leftIdx, label: 'Current' }] as const).map(({ idx, setIdx, other, label }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">{label}</span>
            <select
              value={idx}
              onChange={(e) => {
                const newIdx = Number(e.target.value);
                if (newIdx === other) return;
                setIdx(newIdx);
              }}
              className="flex-1 text-xs font-medium border border-border rounded-lg px-2 py-1.5 bg-background text-foreground-secondary focus:outline-none focus:ring-1 focus:ring-muted-foreground"
            >
              {sessionsWithImages.map((s, sIdx) => (
                <option key={s.snapshotId} value={sIdx} disabled={sIdx === other}>
                  {s.date.toLocaleDateString()} — {s.overallScore}pts
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* All views in a grid — 4 columns on desktop, 2 on mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {availableViews.map((view) => {
          const leftUrl = leftSession?.images[view];
          const rightUrl = rightSession?.images[view];
          return (
            <div key={view} className="space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground text-center uppercase tracking-wider">{VIEW_LABELS[view]}</p>
              <div className="grid grid-cols-2 gap-1">
                <div className="relative rounded-lg overflow-hidden bg-muted aspect-[3/4]">
                  {leftUrl ? (
                    <img src={leftUrl} alt={`${VIEW_LABELS[view]} — ${leftSession.date.toLocaleDateString()}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[9px] text-muted-foreground">—</span>
                    </div>
                  )}
                </div>
                <div className="relative rounded-lg overflow-hidden bg-muted aspect-[3/4]">
                  {rightUrl ? (
                    <img src={rightUrl} alt={`${VIEW_LABELS[view]} — ${rightSession.date.toLocaleDateString()}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[9px] text-muted-foreground">—</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {sessionsWithImages.length > 2 && (
        <p className="text-[10px] text-muted-foreground text-center">
          {sessionsWithImages.length} sessions with posture photos — use selectors above to compare any two.
        </p>
      )}
    </div>
  );
}
