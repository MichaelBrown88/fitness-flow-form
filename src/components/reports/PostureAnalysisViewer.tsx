import React, { useState } from 'react';
import { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import { PostureHolisticSummary } from './PostureHolisticSummary';
import { PostureExpandedDialog } from './PostureExpandedDialog';
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
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselDots } from '@/components/ui/carousel';
import { 
  CheckCircle2, 
  AlertCircle, 
  ImageOff,
  Maximize2
} from 'lucide-react';

type PostureView = 'front' | 'back' | 'side-left' | 'side-right';


/**
 * Consolidated deviation labels - no repetition, brief text
 * Groups related issues (e.g., both knees = "Knees")
 */
interface DeviationItem {
  key: string;
  label: string;
  recommendation: string;
  side: 'left' | 'right' | 'center';
  severity: Severity;
}

function getAnchorForItem(
  item: DeviationItem,
  landmarks: RawLandmarks | undefined,
  view: PostureView
): number | null {
  if (!landmarks) return null;
  const isSideView = view === 'side-left' || view === 'side-right';
  switch (item.key) {
    case 'head_tilt':
      return getAverageYPercent(landmarks, 7, 8);
    case 'head_pitch':
    case 'forward_head':
      return getRawLandmarkYPercent(landmarks, view === 'side-left' ? 7 : 8);
    case 'shoulders':
    case 'rounded_shoulders':
      return getAverageYPercent(landmarks, 11, 12);
    case 'upper_back':
      return getAverageYPercent(landmarks, 11, 12);
    case 'spine': {
      const shoulder = getAverageYPercent(landmarks, 11, 12);
      const hip = getAverageYPercent(landmarks, 23, 24);
      if (shoulder === null || hip === null) return null;
      return Math.max(5, Math.min(95, (shoulder + hip) / 2));
    }
    case 'hip_shift':
    case 'pelvic_tilt':
    case 'forward_hips':
    case 'lower_back':
      return getAverageYPercent(landmarks, 23, 24);
    case 'left_knee':
      return getRawLandmarkYPercent(landmarks, 25);
    case 'right_knee':
      return getRawLandmarkYPercent(landmarks, 26);
    default:
      return isSideView ? getAverageYPercent(landmarks, 23, 24) : null;
  }
}

function getScreenSide(
  side: 'left' | 'right' | 'center',
  view: PostureView
): 'left' | 'right' | 'center' {
  if (side === 'center') return 'center';
  if (view === 'front') return side === 'left' ? 'right' : 'left';
  return side;
}

function getSeverityTone(severity: Severity) {
  if (severity === 'mild') {
    return { dot: 'bg-score-amber', text: 'text-score-amber' };
  }
  return { dot: 'bg-score-red', text: 'text-score-red' };
}

/**
 * Get deviations that can actually be detected from the given view
 * Uses MediaPipe-calculated severities (same as wireframe) - NOT AI descriptions
 * This ensures labels match what's shown as red lines on the skeleton
 */
function getConsolidatedDeviations(
  analysis: PostureAnalysisResult, 
  view: PostureView = 'front'
): DeviationItem[] {
  const items: DeviationItem[] = [];
  const isSideView = view === 'side-left' || view === 'side-right';
  const isFrontBackView = view === 'front' || view === 'back';
  const isBadStatus = (status?: string) => {
    if (!status) return false;
    const normalized = status.toLowerCase();
    return !['neutral', 'normal', 'good', 'level', 'centered', 'straight'].includes(normalized);
  };
  
  // Calculate deviations from raw landmarks (same thresholds as wireframe)
  const calc = calculateDeviationsFromLandmarks(analysis.landmarks?.raw, view);
  
  // === SIDE VIEW: Forward head, pelvic tilt (kyphosis/lordosis need visual AI) ===
  if (isSideView) {
    // Forward Head Posture - calculated from landmarks
    if (calc.forwardHead !== 'good') {
      items.push({
        key: 'forward_head',
        label: 'Forward Head',
        recommendation: analysis.forward_head?.recommendation || 'Chin tucks and neck stretches',
        side: 'left',
        severity: calc.forwardHead
      });
    }
    
    // Pelvic Tilt - calculated from landmarks
    if (calc.pelvicTilt !== 'good') {
      const forwardDir = view === 'side-left' ? -1 : 1;
      const hip = analysis.landmarks?.raw?.[view === 'side-left' ? 23 : 24];
      const ankle = analysis.landmarks?.raw?.[view === 'side-left' ? 27 : 28];
      const hipForward = hip && ankle ? (hip.x - ankle.x) * forwardDir > 0 : undefined;
      const pelvicLabel = hipForward ? 'Anterior Pelvic Tilt' : 'Posterior Pelvic Tilt';
      items.push({
        key: 'pelvic_tilt',
        label: pelvicLabel,
        recommendation: analysis.pelvic_tilt?.recommendation || 'Hip flexor stretches and glute activation',
        side: 'right',
        severity: calc.pelvicTilt
      });
    }

    // Head pitch - use MediaPipe ear/eye relationship
    if (analysis.head_updown?.status && analysis.head_updown.status !== 'Neutral') {
      const pitchSeverity = getHeadPitchSeverity(analysis.landmarks?.raw, view);
      items.push({
        key: 'head_pitch',
        label: analysis.head_updown.status === 'Looking Down' ? 'Head Pitch Down' : 'Head Pitch Up',
        recommendation: analysis.head_updown?.recommendation || 'Reset gaze to neutral and relax the neck',
        side: 'left',
        severity: pitchSeverity
      });
    }

    // Rounded shoulders / forward shoulders (plumb-line based)
    const shoulderSeverity = getSideViewPlumbSeverity(analysis.landmarks?.raw, view, view === 'side-left' ? 11 : 12);
    const hasRoundedShoulders = analysis.shoulder_alignment?.rounded_forward || analysis.shoulder_alignment?.status === 'Rounded';
    if (shoulderSeverity !== 'good' || hasRoundedShoulders) {
      items.push({
        key: 'rounded_shoulders',
        label: hasRoundedShoulders ? 'Rounded Shoulders' : 'Shoulders Forward',
        recommendation: analysis.shoulder_alignment?.recommendation || 'Open the chest and strengthen upper back',
        side: 'left',
        severity: shoulderSeverity !== 'good' ? shoulderSeverity : 'mild'
      });
    }

    // Forward hips (plumb-line based)
    const hipSeverity = getSideViewPlumbSeverity(analysis.landmarks?.raw, view, view === 'side-left' ? 23 : 24);
    if (hipSeverity !== 'good') {
      items.push({
        key: 'forward_hips',
        label: 'Forward Hips',
        recommendation: analysis.hip_alignment?.recommendation || 'Stack ribs over hips; focus on core control',
        side: 'right',
        severity: hipSeverity
      });
    }
    
    // Kyphosis/Lordosis still need AI (can't calculate from landmarks alone)
    if (isBadStatus(analysis.kyphosis?.status)) {
      items.push({
        key: 'upper_back',
        label: 'Upper Back',
        recommendation: analysis.kyphosis?.recommendation || 'Thoracic extensions and chest stretches',
        side: 'right',
        severity: getAiStatusSeverity(analysis.kyphosis?.status)
      });
    }
    
    if (isBadStatus(analysis.lordosis?.status)) {
      items.push({
        key: 'lower_back',
        label: 'Lower Back',
        recommendation: analysis.lordosis?.recommendation || 'Core strengthening and hip flexor stretches',
        side: 'left',
        severity: getAiStatusSeverity(analysis.lordosis?.status)
      });
    }
  }
  
  // === FRONT/BACK VIEW: All calculated from landmarks ===
  if (isFrontBackView) {
    // Head Tilt - calculated
    if (calc.headTilt !== 'good') {
      items.push({
        key: 'head_tilt',
        label: 'Head Tilt',
        recommendation: analysis.head_alignment?.recommendation || 'Neck mobility and stretches',
        side: 'left',
        severity: calc.headTilt
      });
    }
    
    // Shoulder asymmetry - calculated
    if (calc.shoulder !== 'good') {
      items.push({
        key: 'shoulders',
        label: 'Shoulders',
        recommendation: analysis.shoulder_alignment?.recommendation || 'Release upper trap on high side',
        side: 'right',
        severity: calc.shoulder
      });
    }
    
    // Hip Shift - calculated
    if (calc.hipShift !== 'good') {
      items.push({
        key: 'hip_shift',
        label: 'Hip Shift',
        recommendation: analysis.hip_shift?.recommendation || 'Strengthen gluteus medius',
        side: 'left',
        severity: calc.hipShift
      });
    }
    
    // Scoliosis - still needs AI (visual assessment)
    if (isBadStatus(analysis.spinal_curvature?.status)) {
      items.push({
        key: 'spine',
        label: 'Spine',
        recommendation: analysis.spinal_curvature?.recommendation || 'Core stability exercises',
        side: 'right',
        severity: getAiStatusSeverity(analysis.spinal_curvature?.status)
      });
    }
    
    // Knee alignment - calculated from landmarks
    if (calc.leftLeg !== 'good') {
      items.push({
        key: 'left_knee',
        label: `Left Knee ${calc.leftKneeDirection === 'valgus' ? 'Valgus' : 'Varus'}`,
        recommendation: analysis.left_leg_alignment?.recommendation || 'Hip abductor and glute strengthening',
        side: 'left',
        severity: calc.leftLeg
      });
    }

    if (calc.rightLeg !== 'good') {
      items.push({
        key: 'right_knee',
        label: `Right Knee ${calc.rightKneeDirection === 'valgus' ? 'Valgus' : 'Varus'}`,
        recommendation: analysis.right_leg_alignment?.recommendation || 'Hip abductor and glute strengthening',
        side: 'right',
        severity: calc.rightLeg
      });
    }
  }
  
  return items;
}

/**
 * Positioned labels - vertically aligned to match body regions
 * Head issues at top, hip issues in middle, knee issues at bottom
 */
function PositionedLabels({ 
  analysis, 
  side,
  view
}: { 
  analysis: PostureAnalysisResult; 
  side: 'left' | 'right' | 'all';
  view: PostureView;
}) {
  // Get deviations filtered by what's detectable from this view
  const allDeviations = getConsolidatedDeviations(analysis, view);
  
  const withScreenSide = allDeviations.map((item) => ({
    item,
    screenSide: getScreenSide(item.side, view),
  }));

  // Filter by side (or show all for mobile)
  const deviations = side === 'all'
    ? withScreenSide
    : withScreenSide.filter(d => d.screenSide === side || d.screenSide === 'center');
  
  if (deviations.length === 0) {
    return null;
  }
  
  // For mobile - simple horizontal layout
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
  
  // Desktop - positioned vertically by body region
  // Returns absolutely positioned items within the flex column
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
          <div 
            key={i}
            className="absolute w-full"
            style={{ top: `${position}%`, transform: 'translateY(-50%)' }}
          >
            <div className={`${screenSide === 'left' ? 'text-left' : 'text-right'} max-w-[180px]`}>
              <div className={`inline-flex items-center gap-1.5 mb-0.5 ${screenSide === 'right' ? 'flex-row-reverse' : ''}`}>
                <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${tone.dot}`} />
                <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${tone.text}`}>
                  {item.label}
                </span>
              </div>
              <p className={`text-xs text-white/60 leading-snug whitespace-normal break-words line-clamp-2 ${screenSide === 'left' ? 'pl-3' : 'pr-3'}`}>
                {item.recommendation}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Get vertical position (%) based on body region
 */
function getVerticalPosition(label: string): number {
  // Positions as % of container height, accounting for py-12 padding (~10% top/bottom)
  // Body regions mapped to where they appear in a full-body photo
  const positions: Record<string, number> = {
    // Head region (~10-18% of visible area)
    'Forward Head': 12,
    'Head Tilt': 12,
    'Head': 12,
    'Head Pitch Up': 12,
    'Head Pitch Down': 12,
    
    // Shoulder/upper torso region (~20-30%)
    'Shoulders': 24,
    'Rounded Shoulders': 24,
    'Upper Back': 28,  // Kyphosis - upper thoracic
    
    // Mid/lower torso (~35-50%)
    'Spine': 38,
    'Thoracic': 32,
    'Lower Back': 42,  // Lordosis - lumbar region
    
    // Hip/pelvis region (~48-56%)
    'Hip Shift': 50,
    'Pelvis': 52,
    'Pelvic Tilt': 52,
    'Forward Hips': 52,
    
    // Knee region (~68-75%)
    'Knee Valgus': 70,
    'Knee Varus': 70,
    'Knee Alignment': 70,
    'Knees': 70,
    'Left Knee Valgus': 70,
    'Left Knee Varus': 70,
    'Right Knee Valgus': 70,
    'Right Knee Varus': 70,
    
    // Ankle region (~82-88%)
    'Ankles': 84,
  };
  return positions[label] ?? 50;
}

/**
 * Get brief findings for the preview card
 * Any deviation that shows a red line on the wireframe should be listed here
 */
function getBriefFindings(analysis: PostureAnalysisResult, view: PostureView): string[] {
  const brief: string[] = [];
  const calc = calculateDeviationsFromLandmarks(analysis.landmarks?.raw, view);
  
  // Side view deviations (math-driven)
  if (calc.forwardHead !== 'good') {
    brief.push('Forward Head');
  }
  if (analysis.head_updown?.status && analysis.head_updown.status !== 'Neutral') {
    brief.push(analysis.head_updown.status === 'Looking Down' ? 'Head Pitch Down' : 'Head Pitch Up');
  }
  if (analysis.shoulder_alignment?.rounded_forward || analysis.shoulder_alignment?.status === 'Rounded') {
    brief.push('Rounded Shoulders');
  }
  if (analysis.kyphosis && analysis.kyphosis.status !== 'Normal') {
    brief.push('Kyphosis');
  }
  if (analysis.lordosis && analysis.lordosis.status !== 'Normal') {
    brief.push('Lordosis');
  }
  if (calc.pelvicTilt !== 'good') {
    brief.push('Pelvic Tilt');
  }
  
  // Front/Back view deviations
  if (calc.headTilt !== 'good') {
    brief.push('Head Tilt');
  }
  if (calc.shoulder !== 'good') {
    brief.push('Shoulder Asymmetry');
  }
  if (calc.hipShift !== 'good') {
    brief.push('Hip Shift');
  }
  if (analysis.spinal_curvature && analysis.spinal_curvature.status !== 'Normal') {
      brief.push('Spinal Curvature');
  }
  
  // Leg alignment (valgus/varus) - KEY for knee issues
  if (calc.leftKneeDirection !== 'straight') {
    brief.push(`Left Knee ${calc.leftKneeDirection === 'valgus' ? 'Valgus' : 'Varus'}`);
  }
  if (calc.rightKneeDirection !== 'straight') {
    brief.push(`Right Knee ${calc.rightKneeDirection === 'valgus' ? 'Valgus' : 'Varus'}`);
  }
  
    return brief.length > 0 ? brief : ['Neutral Alignment'];
}

/**
 * Individual posture view card (no dialog -- dialog is lifted to parent)
 */
export function PostureViewCard({ 
  view, 
  analysis, 
  imageUrl,
  onClick,
  delta,
}: { 
  view: PostureView; 
  analysis: PostureAnalysisResult; 
  imageUrl: string;
  onClick?: () => void;
  delta?: 'improved' | 'new' | 'resolved' | null;
}) {
  const [imgError, setImgError] = useState(false);
  const briefFindings = getBriefFindings(analysis, view);
  const isNeutral = briefFindings[0] === 'Neutral Alignment';

  return (
    <div 
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-md active:scale-[0.98]"
      onClick={onClick}
    >
      {/* View Label */}
      <div className="absolute top-2 left-2 z-10">
        <Badge variant="secondary" className="bg-card/90 backdrop-blur-sm text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground border-none h-5">
          {view.replace('-', ' ')}
        </Badge>
      </div>

      {/* Status Icon */}
      <div className="absolute top-2 right-2 z-10">
        {isNeutral ? (
          <CheckCircle2 className="h-4 w-4 text-gradient-dark fill-white" />
        ) : (
          <AlertCircle className="h-4 w-4 text-score-amber fill-white" />
        )}
      </div>

      {/* Delta Badge */}
      {delta && (
        <div className="absolute top-8 right-2 z-10">
          <Badge variant="secondary" className={`text-[9px] font-bold uppercase tracking-wider border-none h-4 ${
            delta === 'improved' ? 'bg-score-green-light text-score-green-fg' :
            delta === 'resolved' ? 'bg-score-green-light text-score-green-fg' :
            'bg-blue-50 text-blue-600'
          }`}>
            {delta === 'improved' ? 'Improved' : delta === 'resolved' ? 'Resolved' : 'New'}
          </Badge>
        </div>
      )}

      {/* Image */}
      <div className="aspect-[4/5] w-full overflow-hidden bg-muted">
        {imgError || !imageUrl ? (
          <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground/60 gap-2">
            <ImageOff className="h-8 w-8" />
            <span className="text-[10px] uppercase tracking-wider font-medium">Image unavailable</span>
          </div>
        ) : (
          <img 
            src={imageUrl} 
            alt={view}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            style={{ objectPosition: 'center 10%' }}
            onError={() => setImgError(true)}
          />
        )}
      </div>

      {/* Feedback Overlay -- subtler on mobile */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-10 text-center">
        <div className="flex flex-col gap-0.5">
          {briefFindings.slice(0, 1).map((finding, i) => (
            <span key={i} className="text-[10px] font-black uppercase tracking-[0.15em] leading-none text-white drop-shadow-md">
              {finding}
            </span>
          ))}
          <span className="text-[10px] font-black text-white/50 sm:text-white/80 uppercase tracking-[0.15em] mt-1">
            Tap to expand
          </span>
        </div>
      </div>

      {/* Hover Action Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-primary/10 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="rounded-full bg-card/90 p-2 shadow-lg scale-75 group-hover:scale-100 transition-transform">
          <Maximize2 className="h-4 w-4 text-primary" />
        </div>
      </div>
    </div>
  );
}

/**
 * Main posture analysis viewer component
 * Displays 4 posture view cards in a grid (desktop) or swipeable carousel (mobile)
 * with a holistic summary below
 */
export function PostureAnalysisViewer({ 
  postureResults, 
  postureImages,
  previousPostureResults,
}: { 
  postureResults: Partial<Record<PostureView, PostureAnalysisResult>>; 
  postureImages: Record<string, string> | undefined;
  previousPostureResults?: Partial<Record<PostureView, PostureAnalysisResult>>;
}) {
  const views = ['front', 'back', 'side-left', 'side-right'] as const;
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const getImageUrl = (view: PostureView): string => {
    return postureImages?.[view] || 
           postureImages?.[`postureImagesStorage_${view}`] ||
           postureImages?.[`postureImagesFull_${view}`] ||
           postureImages?.[`postureImages_${view}`] ||
           '';
  };

  // Only show views that have both AI results AND a valid image URL
  const availableViews = views.filter(v => postureResults[v] && getImageUrl(v));
  
  if (availableViews.length === 0) return null;

  const getViewDelta = (view: PostureView): 'improved' | 'new' | 'resolved' | null => {
    if (!previousPostureResults) return null;
    const current = postureResults[view];
    const previous = previousPostureResults[view];
    if (current && !previous) return 'new';
    if (!current && previous) return 'resolved';
    if (!current || !previous) return null;
    const currentDeviations = getConsolidatedDeviations(current, view);
    const previousDeviations = getConsolidatedDeviations(previous, view);
    if (currentDeviations.length < previousDeviations.length) return 'improved';
    return null;
  };

  const handleCardClick = (index: number) => setExpandedIndex(index);

  return (
    <div className="space-y-3">
      {/* Desktop: 4 Image Cards Grid */}
      <div className="hidden md:grid md:grid-cols-4 gap-3 md:gap-4">
        {availableViews.map((view, idx) => (
          <PostureViewCard 
            key={view}
            view={view}
            analysis={postureResults[view]}
            imageUrl={getImageUrl(view)}
            onClick={() => handleCardClick(idx)}
            delta={getViewDelta(view)}
          />
        ))}
      </div>

      {/* Mobile: Swipeable carousel */}
      <div className="md:hidden">
        <Carousel opts={{ align: 'start', containScroll: 'trimSnaps' }} className="w-full">
          <CarouselContent className="-ml-3">
            {availableViews.map((view, idx) => (
              <CarouselItem key={view} className="basis-[75%] pl-3">
                <PostureViewCard
                  view={view}
                  analysis={postureResults[view]}
                  imageUrl={getImageUrl(view)}
                  onClick={() => handleCardClick(idx)}
                  delta={getViewDelta(view)}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselDots count={availableViews.length} />
        </Carousel>
      </div>

      {/* Swipeable expanded dialog */}
      <PostureExpandedDialog
        views={[...availableViews]}
        postureResults={postureResults}
        getImageUrl={getImageUrl}
        expandedIndex={expandedIndex}
        onClose={() => setExpandedIndex(null)}
      />

      {/* Holistic Summary */}
      {availableViews.length >= 2 && (
        <PostureHolisticSummary results={postureResults} />
      )}
    </div>
  );
}
