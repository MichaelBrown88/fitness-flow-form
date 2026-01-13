import React from 'react';
import { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';

// Type guard to check if a value is a posture analysis detail (has status property)
type PostureAnalysisDetail = {
  status: string;
  description: string;
  recommendation?: string;
  [key: string]: unknown;
};

function isPostureDetail(value: unknown): value is PostureAnalysisDetail {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'status' in value &&
    'description' in value &&
    typeof (value as { status: unknown }).status === 'string'
  );
}
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Maximize2
} from 'lucide-react';

// Generate client-friendly summary if overall_assessment is missing
function generateClientFriendlySummary(analysis: PostureAnalysisResult, view: string): string {
  const parts: string[] = [];
  
  // Front/Back view summaries
  if (view === 'front' || view === 'back') {
    const shoulderStatus = analysis.shoulder_alignment?.status;
    const hipStatus = analysis.hip_alignment?.status;
    const pelvicStatus = analysis.pelvic_tilt?.status;
    const kneeStatus = analysis.knee_position?.status;
    const spineStatus = analysis.spinal_curvature?.status;
    
    if (shoulderStatus === 'Neutral' && hipStatus === 'Neutral' && pelvicStatus === 'Neutral' && kneeStatus === 'Neutral' && (spineStatus === 'Normal' || !spineStatus)) {
      return "Your posture looks well-balanced from this view. Your shoulders, hips, and knees are aligned evenly, which is great for movement efficiency and injury prevention.";
    }
    
    if (shoulderStatus === 'Asymmetric') {
      parts.push(`Your shoulders are uneven, with one sitting higher than the other. This can create tension and affect your movement patterns.`);
    }
    
    if (hipStatus === 'Asymmetric') {
      parts.push(`Your hips are uneven, creating an imbalance that can lead to lower back pain and affect how you walk or stand.`);
    }
    
    if (pelvicStatus && pelvicStatus !== 'Neutral') {
      const shift = analysis.pelvic_tilt?.lateral_shift_cm || 0;
      const direction = shift > 0 ? 'right' : shift < 0 ? 'left' : '';
      if (direction) {
        parts.push(`Your pelvis is tilted and shifted to the ${direction}. This is like having your foundation slightly off-center (lateral tilt), which can cause compensation patterns throughout your body.`);
      } else {
        parts.push(`Your pelvis is tilted to the side. This affects how your spine and legs align, potentially causing discomfort.`);
      }
    }
    
    if (spineStatus && (spineStatus.includes('Scoliosis') || spineStatus !== 'Normal')) {
      const curve = analysis.spinal_curvature?.curve_degrees || 0;
      const direction = curve > 0 ? 'right' : 'left';
      parts.push(`Your spine shows a lateral curve to the ${direction}. This is a sideways curve known as scoliosis, which can affect your overall alignment and may cause one side of your body to work harder than the other.`);
    }
    
    if (kneeStatus && kneeStatus !== 'Neutral') {
      parts.push(`Your knees show some misalignment. This can affect how force travels through your legs and may contribute to joint stress over time.`);
    }
  }
  
  // Side view summaries
  if (view === 'side-right' || view === 'side-left') {
    const headStatus = analysis.forward_head?.status;
    const shoulderStatus = analysis.shoulder_alignment?.status;
    const kyphosisStatus = analysis.kyphosis?.status;
    const lordosisStatus = analysis.lordosis?.status;
    const pelvicStatus = analysis.pelvic_tilt?.status;
    
    if (headStatus === 'Neutral' && shoulderStatus === 'Neutral' && kyphosisStatus === 'Normal' && lordosisStatus === 'Normal' && pelvicStatus === 'Neutral') {
      return "Your side profile shows good alignment. Your head, shoulders, and hips stack nicely, which means your body is efficiently supporting itself without extra strain.";
    }
    
    if (headStatus && headStatus !== 'Neutral') {
      parts.push(`Your head is positioned forward. Think of it like your head is leaning ahead of your shoulders - this puts extra strain on your neck and upper back muscles.`);
    }
    
    if (shoulderStatus === 'Rounded') {
      parts.push(`Your shoulders are rounded forward. This is like your shoulders are rolling inward, which can compress your chest and create tension in your upper back.`);
    }
    
    if (kyphosisStatus && kyphosisStatus !== 'Normal') {
      parts.push(`Your upper back has an increased forward curve. This is called kyphosis (upper back rounding) - imagine your upper back rounding forward more than it should, which can make you appear hunched and create neck and shoulder tension.`);
    }
    
    if (lordosisStatus && lordosisStatus !== 'Normal') {
      parts.push(`Your lower back has an increased inward curve. This is called lordosis (lower back arch) - it's like your lower back is arching too much, which can create compression and affect how your pelvis and hips function.`);
    }
    
    if (pelvicStatus && pelvicStatus !== 'Neutral') {
      const tilt = analysis.pelvic_tilt?.anterior_tilt_degrees || 0;
      const isAnterior = tilt > 0;
      if (isAnterior) {
        parts.push(`Your pelvis is tilted forward (anterior tilt). This means your pelvis is rotated forward, which often makes the tailbone stick out and increases the curve in your lower back.`);
      } else {
        parts.push(`Your pelvis is tilted backward (posterior tilt). This means your pelvis is rotated backward, which can flatten your lower back and limit your hip range of motion.`);
      }
    }
  }
  
  if (parts.length === 0) {
    return "Your posture appears well-aligned from this view. Keep up the good work with your movement patterns!";
  }
  
  return parts.join(' ');
}

export function PostureViewCard({ view, analysis, imageUrl }: { view: string, analysis: PostureAnalysisResult, imageUrl: string }) {
  // High-level summary of findings for the preview
  const getBriefFindings = () => {
    const brief: string[] = [];
    if (analysis.forward_head && analysis.forward_head.status !== 'Neutral') {
      brief.push(`${analysis.forward_head.status} FHP`);
    }
    if (analysis.head_alignment && analysis.head_alignment.status !== 'Neutral') {
      brief.push(`Head Tilt`);
    }
    if (analysis.shoulder_alignment && analysis.shoulder_alignment.status !== 'Neutral') {
      brief.push('Shoulder Asymmetry');
    }
    if (analysis.spinal_curvature && analysis.spinal_curvature.status !== 'Normal') {
      brief.push('Spinal Curvature');
    }
    if (analysis.pelvic_tilt && analysis.pelvic_tilt.status !== 'Neutral') {
      brief.push('Pelvic Tilt');
    }
    return brief.length > 0 ? brief : ['Neutral Alignment'];
  };

  const briefFindings = getBriefFindings();
  const isNeutral = briefFindings[0] === 'Neutral Alignment';

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div 
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:shadow-md active:scale-[0.98]"
        >
          {/* View Label */}
          <div className="absolute top-2 left-2 z-10">
            <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-[8px] font-black uppercase tracking-widest text-slate-600 border-none shadow-sm h-5">
              {view.replace('-', ' ')}
            </Badge>
          </div>

          {/* Status Icon */}
          <div className="absolute top-2 right-2 z-10">
            {isNeutral ? (
              <CheckCircle2 className="h-4 w-4 text-gradient-dark fill-white" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-500 fill-white" />
            )}
          </div>

          {/* Image Portal (Cropped to head/shoulders) */}
          <div className="aspect-[4/5] w-full overflow-hidden bg-slate-50">
            <img 
              src={imageUrl} 
              alt={view}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              style={{ objectPosition: 'center 10%' }} // Focus on head/neck area
            />
          </div>

          {/* Feedback Overlay */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-3 pt-10 text-center">
            <div className="flex flex-col gap-0.5">
              {briefFindings.slice(0, 1).map((finding, i) => (
                <span key={i} className="text-[10px] font-black uppercase tracking-tight leading-none text-white drop-shadow-md">
                  {finding}
                </span>
              ))}
              <span className="text-[7px] sm:text-[8px] font-bold text-white/80 uppercase tracking-widest mt-1">Click to expand analysis</span>
            </div>
          </div>

          {/* Action Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-primary/10 opacity-0 transition-opacity group-hover:opacity-100">
            <div className="rounded-full bg-white/90 p-2 shadow-lg scale-75 group-hover:scale-100 transition-transform">
              <Maximize2 className="h-4 w-4 text-primary" />
            </div>
          </div>
        </div>
      </DialogTrigger>

      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0 border-none sm:rounded-[32px] shadow-2xl bg-white flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>Posture Analysis Details - {view.replace('-', ' ')} View</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col md:flex-row h-full min-h-[600px]">
          {/* Left: Image - Same height as feedback */}
          <div className="w-full md:w-1/2 bg-[#0a0d14] relative overflow-hidden flex-shrink-0">
            <div className="absolute inset-0 flex items-center justify-center">
              <img 
                src={imageUrl} 
                alt={view} 
                className="w-full h-full object-cover" 
                style={{ objectPosition: 'center' }} 
              />
            </div>
            
            {/* Overlay Label */}
            <div className="absolute top-6 left-6 flex flex-col gap-2 z-10">
              <Badge className="bg-primary/90 hover:bg-primary text-white border-none text-[10px] uppercase font-black tracking-[0.2em] px-4 py-2 rounded-full shadow-lg backdrop-blur-sm">
                {view.replace('-', ' ')} View
              </Badge>
              {analysis.spinal_curvature && analysis.spinal_curvature.status !== 'Normal' && (
                <Badge className="bg-red-600/90 text-white border-none text-[9px] uppercase font-black tracking-widest px-3 py-1.5 rounded-full shadow-lg animate-pulse backdrop-blur-sm">
                  Scoliosis Flag
                </Badge>
              )}
            </div>

            {/* Bottom Legend */}
            <div className="absolute bottom-4 left-6 right-6 flex items-center justify-center gap-6 z-10">
              <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                <div className="h-1.5 w-1.5 rounded-full bg-[#00ff00]" />
                <span className="text-[8px] font-black uppercase tracking-widest text-white/80">Target</span>
              </div>
              <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                <div className="h-1.5 w-1.5 rounded-full bg-[#ff0000]" />
                <span className="text-[8px] font-black uppercase tracking-widest text-white/80">Deviations</span>
              </div>
            </div>
          </div>

          {/* Right: Feedback Section - Same height as image, scrollable */}
          <div className="w-full md:w-1/2 p-6 md:p-8 bg-white overflow-y-auto flex-shrink-0">
            <div className="space-y-8">
              {/* Deviations Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <div className="h-8 w-8 rounded-xl bg-red-50 flex items-center justify-center">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">Identified Deviations</h4>
                </div>
                
                <div className="space-y-4">
                  {Object.entries(analysis)
                    .filter(([key, value]) => {
                      if (key === 'landmarks' || key === 'overall_assessment' || key === 'deviations' || key === 'risk_flags') return false;
                      return isPostureDetail(value);
                    })
                    .sort(([keyA], [keyB]) => {
                      const order = [
                        'head_alignment',
                        'forward_head',
                        'shoulder_alignment',
                        'kyphosis',
                        'spinal_curvature',
                        'spine',
                        'lordosis',
                        'hip_alignment',
                        'pelvic_tilt',
                        'knee_alignment',
                        'knee_position'
                      ];
                      const indexA = order.indexOf(keyA);
                      const indexB = order.indexOf(keyB);
                      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
                    })
                    .map(([key, value]) => {
                      if (!isPostureDetail(value)) return null;
                      if (value.status === 'Neutral' || value.status === 'Normal') return null;
                      
                      return (
                        <div key={key} className="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">{key.replace(/_/g, ' ')}</span>
                            <span className="text-[9px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded uppercase">{value.status}</span>
                          </div>
                          <p className="text-sm font-medium text-slate-700 leading-relaxed">{value.description}</p>
                          {value.recommendation && (
                            <div className="mt-2 pt-2 border-t border-slate-200">
                              <p className="text-xs font-semibold text-gradient-dark mb-1">Recommendation:</p>
                              <p className="text-xs text-slate-600 leading-relaxed italic">"{value.recommendation}"</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  {isNeutral && (
                    <div className="py-8 text-center bg-gradient-light/30 rounded-2xl border border-dashed border-gradient-medium">
                      <CheckCircle2 className="h-8 w-8 text-gradient-dark mx-auto mb-2" />
                      <p className="text-sm font-bold text-gradient-dark uppercase tracking-widest">Ideal Functional Range</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary Assessment */}
              <div className="pt-6 border-t border-slate-100">
                <div className="bg-slate-900 rounded-2xl p-6 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Info className="h-16 w-16 text-white" />
                  </div>
                  <h5 className="text-xs font-black uppercase tracking-[0.2em] text-primary/60 mb-3">Summary Assessment</h5>
                  <p className="text-sm font-medium leading-relaxed text-slate-300 italic relative z-10">
                    "{analysis.overall_assessment || generateClientFriendlySummary(analysis, view)}"
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PostureAnalysisViewer({ 
  postureResults, 
  postureImages 
}: { 
  postureResults: Record<string, PostureAnalysisResult>; 
  postureImages: Record<string, string> | undefined;
}) {
  const views = ['front', 'back', 'side-left', 'side-right'] as const;
  const availableViews = views.filter(v => postureResults[v]);
  
  if (availableViews.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
      {availableViews.map((view) => (
        <PostureViewCard 
          key={view}
          view={view}
          analysis={postureResults[view]}
          imageUrl={
            postureImages?.[view] || 
            postureImages?.[`postureImagesStorage_${view}`] ||
            postureImages?.[`postureImagesFull_${view}`] ||
            postureImages?.[`postureImages_${view}`] ||
            ''
          }
        />
      ))}
    </div>
  );
}

