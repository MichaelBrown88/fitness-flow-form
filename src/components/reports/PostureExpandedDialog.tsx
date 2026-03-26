import React, { useCallback, useEffect, useState } from 'react';
import { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import {
  calculateDeviationsFromLandmarks,
  getAverageYPercent,
  getRawLandmarkYPercent,
  getSideViewPlumbSeverity,
  getHeadPitchSeverity,
  getAiStatusSeverity,
  type RawLandmarks,
  type Severity,
} from '@/lib/utils/postureDeviation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import useEmblaCarousel from 'embla-carousel-react';
import { cn } from '@/lib/utils';

type PostureView = 'front' | 'back' | 'side-left' | 'side-right';

interface PostureExpandedDialogProps {
  views: PostureView[];
  postureResults: Partial<Record<PostureView, PostureAnalysisResult>>;
  getImageUrl: (view: PostureView) => string;
  expandedIndex: number | null;
  onClose: () => void;
}

/* ── severity helpers (shared with PostureAnalysisViewer) ── */
function getSeverityTone(severity: Severity) {
  if (severity === 'mild') return { dot: 'bg-score-amber', text: 'text-score-amber' };
  return { dot: 'bg-score-red', text: 'text-score-red' };
}

/* ── inline PositionedLabels for mobile (all-side flat layout) ── */
function MobileLabels({ analysis, view }: { analysis: PostureAnalysisResult; view: PostureView }) {
  const items = getDialogDeviations(analysis, view);
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap justify-center gap-2.5">
      {items.map((item, i) => {
        const tone = getSeverityTone(item.severity);
        return (
          <div key={i} className="flex items-center gap-1">
            <div className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
            <span className={`text-[10px] font-medium uppercase tracking-[0.15em] ${tone.text}`}>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── deviation logic (duplicated minimally) ── */
interface DeviationItem { key: string; label: string; recommendation: string; side: 'left' | 'right' | 'center'; severity: Severity; }
function getDialogDeviations(analysis: PostureAnalysisResult, view: PostureView): DeviationItem[] {
  const items: DeviationItem[] = [];
  const isSideView = view === 'side-left' || view === 'side-right';
  const isFrontBackView = view === 'front' || view === 'back';
  const isBad = (s?: string) => { if (!s) return false; const n = s.toLowerCase(); return !['neutral','normal','good','level','centered','straight'].includes(n); };
  const calc = calculateDeviationsFromLandmarks(analysis.landmarks?.raw, view);
  if (isSideView) {
    if (calc.forwardHead !== 'good') items.push({ key: 'forward_head', label: 'Forward Head', recommendation: analysis.forward_head?.recommendation || '', side: 'left', severity: calc.forwardHead });
    if (calc.pelvicTilt !== 'good') items.push({ key: 'pelvic_tilt', label: 'Pelvic Tilt', recommendation: analysis.pelvic_tilt?.recommendation || '', side: 'right', severity: calc.pelvicTilt });
    if (analysis.head_updown?.status && analysis.head_updown.status !== 'Neutral') {
      const sev = getHeadPitchSeverity(analysis.landmarks?.raw, view);
      items.push({ key: 'head_pitch', label: analysis.head_updown.status === 'Looking Down' ? 'Head Pitch Down' : 'Head Pitch Up', recommendation: '', side: 'left', severity: sev });
    }
    const ss = getSideViewPlumbSeverity(analysis.landmarks?.raw, view, view === 'side-left' ? 11 : 12);
    if (ss !== 'good' || analysis.shoulder_alignment?.rounded_forward) items.push({ key: 'rounded_shoulders', label: 'Rounded Shoulders', recommendation: '', side: 'left', severity: ss !== 'good' ? ss : 'mild' });
    if (isBad(analysis.kyphosis?.status)) items.push({ key: 'upper_back', label: 'Upper Back', recommendation: '', side: 'right', severity: getAiStatusSeverity(analysis.kyphosis?.status) });
    if (isBad(analysis.lordosis?.status)) items.push({ key: 'lower_back', label: 'Lower Back', recommendation: '', side: 'left', severity: getAiStatusSeverity(analysis.lordosis?.status) });
  }
  if (isFrontBackView) {
    if (calc.headTilt !== 'good') items.push({ key: 'head_tilt', label: 'Head Tilt', recommendation: '', side: 'left', severity: calc.headTilt });
    if (calc.shoulder !== 'good') items.push({ key: 'shoulders', label: 'Shoulders', recommendation: '', side: 'right', severity: calc.shoulder });
    if (calc.hipShift !== 'good') items.push({ key: 'hip_shift', label: 'Hip Shift', recommendation: '', side: 'left', severity: calc.hipShift });
    if (isBad(analysis.spinal_curvature?.status)) items.push({ key: 'spine', label: 'Spine', recommendation: '', side: 'right', severity: getAiStatusSeverity(analysis.spinal_curvature?.status) });
    if (calc.leftLeg !== 'good') items.push({ key: 'left_knee', label: `Left Knee ${calc.leftKneeDirection === 'valgus' ? 'Valgus' : 'Varus'}`, recommendation: '', side: 'left', severity: calc.leftLeg });
    if (calc.rightLeg !== 'good') items.push({ key: 'right_knee', label: `Right Knee ${calc.rightKneeDirection === 'valgus' ? 'Valgus' : 'Varus'}`, recommendation: '', side: 'right', severity: calc.rightLeg });
  }
  return items;
}

export function PostureExpandedDialog({ views, postureResults, getImageUrl, expandedIndex, onClose }: PostureExpandedDialogProps) {
  const isOpen = expandedIndex !== null;
  const [emblaRef, emblaApi] = useEmblaCarousel({ startIndex: expandedIndex ?? 0 });
  const [activeSlide, setActiveSlide] = useState(expandedIndex ?? 0);

  useEffect(() => {
    if (!emblaApi) return;
    if (expandedIndex !== null) emblaApi.scrollTo(expandedIndex, true);
  }, [emblaApi, expandedIndex]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setActiveSlide(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect);
    onSelect();
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="!bg-black !border-0 !p-0 !shadow-none !fixed !inset-0 !w-full !h-full !max-w-none !max-h-none !rounded-none !translate-x-0 !translate-y-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Posture Analysis</DialogTitle>
          <DialogDescription>Expanded posture view with swipeable images</DialogDescription>
        </DialogHeader>

        {/* View badge */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40">
          <span className="text-white/30 text-[10px] uppercase font-medium tracking-[0.15em]">
            {views[activeSlide]?.replace('-', ' ')}
          </span>
        </div>

        {/* Close */}
        <button
          className="absolute top-4 right-4 z-50 h-9 w-9 rounded-full bg-card/10 hover:bg-card/20 flex items-center justify-center transition-colors"
          onClick={onClose}
        >
          <span className="text-white text-xl leading-none">&times;</span>
        </button>

        {/* Embla carousel of expanded views */}
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {views.map((view) => {
              const analysis = postureResults[view];
              if (!analysis) return null;
              return (
                <div key={view} className="flex-[0_0_100%] min-w-0">
                  <div className="flex items-center justify-center bg-black py-8 sm:py-12">
                    <img
                      src={getImageUrl(view)}
                      alt={view}
                      className="max-h-[80vh] sm:max-h-[85vh] max-w-[90vw] md:max-w-[55vw] block"
                    />
                  </div>
                  <div className="px-4 pb-2">
                    <MobileLabels analysis={analysis} view={view} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dots */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {views.map((_, i) => (
            <button
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === activeSlide ? "w-4 bg-card" : "w-1.5 bg-card/30",
              )}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/80 px-3 py-1 rounded-full">
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-score-green" />
            <span className="text-[10px] uppercase text-white/40">Aligned</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-score-amber" />
            <span className="text-[10px] uppercase text-white/40">Minor</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-score-red" />
            <span className="text-[10px] uppercase text-white/40">Deviation</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
