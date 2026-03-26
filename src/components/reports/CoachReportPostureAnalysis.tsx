/**
 * CoachReport Posture Analysis — "Movement & Posture Red Flags"
 * Shows only posture deviations with coaching-language recommendations.
 */

import React, { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import type { FormData } from '@/contexts/FormContext';

const VIEW_LABELS: Record<string, string> = { front: 'Front view', back: 'Back view', 'side-left': 'Left side', 'side-right': 'Right side' };
const NORMAL_STATUSES = new Set(['Neutral', 'Normal', 'Centered', 'Straight', 'Good', 'Optimal']);
const BODY_META: Record<string, { label: string; note: string }> = {
  head_alignment: { label: 'Head Tilt', note: 'Consider including neck mobility and chin tucks in warm-up.' },
  lateral_head_position: { label: 'Lateral Head Position', note: 'Consider cervical mobility drills before training.' },
  head_updown: { label: 'Head Up/Down', note: 'Consider gentle neck stretches and awareness cues.' },
  forward_head: { label: 'Forward Head Posture', note: 'Consider including chin tucks and upper-back mobility in warm-up.' },
  shoulder_alignment: { label: 'Shoulder Alignment', note: 'Consider including shoulder mobility (wall angels, band work) in warm-up.' },
  kyphosis: { label: 'Thoracic Kyphosis', note: 'Consider thoracic extensions and foam rolling in warm-up.' },
  lordosis: { label: 'Lumbar Lordosis', note: 'Consider hip flexor stretches and core activation in warm-up.' },
  pelvic_tilt: { label: 'Pelvic Tilt', note: 'Consider hip mobility and glute activation in warm-up.' },
  hip_alignment: { label: 'Hip Alignment', note: 'Consider single-leg stability and hip mobility in warm-up.' },
  hip_shift: { label: 'Hip Shift', note: 'Consider glute activation and unilateral drills in warm-up.' },
  knee_alignment: { label: 'Knee Alignment', note: 'Consider hip and ankle mobility plus knee-over-toe drills.' },
  knee_position: { label: 'Knee Position', note: 'Consider quad/hamstring mobility and landing mechanics focus.' },
  spinal_curvature: { label: 'Spinal Curvature', note: 'Consider unilateral loading and rotational mobility in warm-up.' },
  left_leg_alignment: { label: 'Left Leg Alignment', note: 'Consider single-leg balance and mobility work.' },
  right_leg_alignment: { label: 'Right Leg Alignment', note: 'Consider single-leg balance and mobility work.' },
};

const ITEM_KEYS = ['head_alignment', 'lateral_head_position', 'head_updown', 'forward_head', 'shoulder_alignment', 'kyphosis', 'lordosis', 'pelvic_tilt', 'hip_alignment', 'hip_shift', 'knee_alignment', 'knee_position', 'spinal_curvature', 'left_leg_alignment', 'right_leg_alignment'] as const;

function isDeviation(s: string | undefined) { return s && !NORMAL_STATUSES.has(s); }
function badgeClass(s: string): string {
  const l = s.toLowerCase();
  if (l.includes('severe') || l.includes('significant')) return 'bg-red-100 text-red-800';
  if (l.includes('moderate')) return 'bg-amber-100 text-amber-800';
  if (l.includes('mild')) return 'bg-yellow-100 text-yellow-800';
  return 'bg-muted text-foreground';
}

interface Deviation { id: string; bodyKey: string; bodyArea: string; view: string; status: string; description: string; }

function collectDeviations(results: Record<string, PostureAnalysisResult>): Deviation[] {
  const items: Deviation[] = [];
  for (const [view, analysis] of Object.entries(results)) {
    if (!analysis) continue;
    for (const key of ITEM_KEYS) {
      const obj = analysis[key as keyof PostureAnalysisResult] as { status?: string; description?: string } | undefined;
      if (!obj?.status || !obj.description || !isDeviation(obj.status)) continue;
      const meta = BODY_META[key] || { label: key, note: 'Consider addressing in warm-up.' };
      items.push({ id: `${view}-${key}`, bodyKey: key, bodyArea: meta.label, view: VIEW_LABELS[view] || view, status: obj.status, description: obj.description });
    }
  }
  return items;
}

export function CoachReportPostureAnalysis({ formData }: { formData: FormData }) {
  const deviations = useMemo(() => formData?.postureAiResults ? collectDeviations(formData.postureAiResults) : [], [formData?.postureAiResults]);
  const grouped = useMemo(() => {
    const m = new Map<string, Deviation[]>();
    for (const d of deviations) { const list = m.get(d.bodyArea) ?? []; list.push(d); m.set(d.bodyArea, list); }
    return m;
  }, [deviations]);
  const images = useMemo(() => {
    const urls: { view: string; url: string }[] = [];
    for (const v of ['front', 'back', 'side-left', 'side-right'] as const) {
      const url = (formData?.postureImagesStorage || formData?.postureImages || {})[v];
      if (url && formData?.postureAiResults?.[v]) urls.push({ view: v, url });
    }
    return urls;
  }, [formData]);

  if (!formData?.postureAiResults) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
        <h3 className="text-lg font-bold text-foreground">Movement & Posture Red Flags</h3>
      </div>
      {deviations.length === 0 ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 text-sm">No significant posture deviations detected.</div>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([bodyArea, list]) => (
            <div key={bodyArea} className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground mb-2">{bodyArea}</p>
              {list.map((d) => (
                <div key={d.id} className="mb-3 last:mb-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground">{d.view}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${badgeClass(d.status)}`}>{d.status}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{d.description}</p>
                  <p className="text-xs italic text-muted-foreground">{BODY_META[d.bodyKey]?.note ?? 'Consider addressing in warm-up.'}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {images.map(({ view, url }) => (
            <div key={view} className="w-16 h-20 rounded-lg overflow-hidden border border-border shrink-0">
              <img src={url} alt={VIEW_LABELS[view] || view} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
