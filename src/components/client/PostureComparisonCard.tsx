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
      <div className="rounded-xl bg-slate-50 px-5 py-8 text-center space-y-1">
        <p className="text-sm font-semibold text-slate-600">Posture comparison available after 2 sessions</p>
        <p className="text-xs text-slate-400">
          {sessionsWithImages.length === 0
            ? 'No posture photos captured yet. Use Companion Mode during an assessment.'
            : 'One session captured. Complete another assessment with posture to compare.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* View tabs */}
      {availableViews.length > 1 && (
        <div className="flex gap-1">
          {availableViews.map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => setActiveView(view)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeView === view
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {VIEW_LABELS[view]}
            </button>
          ))}
        </div>
      )}

      {/* Side-by-side images */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {([leftSession, rightSession] as SessionWithImages[]).map((session, i) => {
          const imageUrl = session.images[activeView];
          const isLeft = i === 0;
          const idx = isLeft ? leftIdx : rightIdx;
          const setIdx = isLeft ? setLeftIdx : setRightIdx;
          const otherIdx = isLeft ? rightIdx : leftIdx;

          return (
            <div key={session.snapshotId} className="space-y-2">
              {/* Session selector */}
              <select
                value={idx}
                onChange={(e) => {
                  const newIdx = Number(e.target.value);
                  if (newIdx === otherIdx) return;
                  setIdx(newIdx);
                }}
                className="w-full text-xs font-medium border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                {sessionsWithImages.map((s, sIdx) => (
                  <option key={s.snapshotId} value={sIdx} disabled={sIdx === otherIdx}>
                    {s.date.toLocaleDateString()} — {s.overallScore}pts
                  </option>
                ))}
              </select>

              {/* Image */}
              <div className="relative rounded-xl overflow-hidden bg-slate-100 aspect-[3/4]">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={`Posture ${VIEW_LABELS[activeView]} — ${session.date.toLocaleDateString()}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-xs text-slate-400 text-center px-3">No {VIEW_LABELS[activeView].toLowerCase()} photo for this session</p>
                  </div>
                )}
              </div>

              {/* Score badge */}
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-slate-500 font-medium">
                  {session.date.toLocaleDateString()}
                </span>
                <span className="text-xs font-bold text-slate-900">
                  {session.overallScore}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {sessionsWithImages.length > 2 && (
        <p className="text-[10px] text-slate-400 text-center">
          {sessionsWithImages.length} sessions with posture photos available — use selectors above to compare any two.
        </p>
      )}
    </div>
  );
}
