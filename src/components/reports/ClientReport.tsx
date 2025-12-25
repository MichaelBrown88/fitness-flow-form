import React, { useMemo, useState } from 'react';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary, RoadmapPhase } from '@/lib/scoring';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import LifestyleRadarChart from './LifestyleRadarChart';
import CategoryRadarChart from './CategoryRadarChart';
import OverallRadarChart from './OverallRadarChart';

type BodyCompInterp = { timeframeWeeks: string };

function circleColor(score: number): string {
  if (score >= 75) return 'border-green-500 text-green-700';
  if (score >= 45) return 'border-amber-500 text-amber-700';
  return 'border-red-500 text-red-700';
}

function niceLabel(id: string): string {
  switch (id) {
    case 'bodyComp': return 'Body composition';
    case 'strength': return 'Strength & endurance';
    case 'cardio': return 'Cardio fitness';
    case 'movementQuality': return 'Posture & Mobility';
    case 'lifestyle': return 'Lifestyle';
    default: return id;
  }
}

// Generate client-friendly summary if overall_assessment is missing
function generateClientFriendlySummary(analysis: any, view: string): string {
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
      const diff = analysis.shoulder_alignment?.height_difference_cm || 0;
      parts.push(`Your shoulders are uneven (${diff.toFixed(1)}cm difference). This means one shoulder sits higher than the other, which can create tension and affect your movement patterns.`);
    }
    
    if (hipStatus === 'Asymmetric') {
      const diff = analysis.hip_alignment?.height_difference_cm || 0;
      parts.push(`Your hips are uneven (${diff.toFixed(1)}cm difference). This creates an imbalance that can lead to lower back pain and affect how you walk or stand.`);
    }
    
    if (pelvicStatus && pelvicStatus !== 'Neutral') {
      const tilt = analysis.pelvic_tilt?.lateral_tilt_degrees || 0;
      const shift = analysis.pelvic_tilt?.lateral_shift_cm || 0;
      const direction = shift > 0 ? 'right' : shift < 0 ? 'left' : '';
      if (direction) {
        parts.push(`Your pelvis is tilted (${Math.abs(tilt).toFixed(1)}°) and shifted ${direction} (${Math.abs(shift).toFixed(1)}cm). This is like having your foundation slightly off-center, which can cause compensation patterns throughout your body.`);
      } else {
        parts.push(`Your pelvis is tilted (${Math.abs(tilt).toFixed(1)}°). This affects how your spine and legs align, potentially causing discomfort.`);
      }
    }
    
    if (spineStatus && spineStatus !== 'Normal') {
      const curve = analysis.spinal_curvature?.curve_degrees || 0;
      parts.push(`Your spine shows a lateral curve (${curve.toFixed(1)}°). This is a sideways curve that can affect your overall alignment and may cause one side of your body to work harder than the other.`);
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
      const dev = analysis.forward_head?.deviation_degrees || 0;
      const cm = analysis.forward_head?.deviation_cm || 0;
      parts.push(`Your head is positioned forward (${dev.toFixed(1)}° or ${cm.toFixed(1)}cm ahead of ideal). Think of it like your head is leaning ahead of your shoulders - this puts extra strain on your neck and upper back muscles.`);
    }
    
    if (shoulderStatus === 'Rounded') {
      const forward = analysis.shoulder_alignment?.forward_position_cm || 0;
      parts.push(`Your shoulders are rounded forward (${forward.toFixed(1)}cm ahead). This is like your shoulders are rolling inward, which can compress your chest and create tension in your upper back.`);
    }
    
    if (kyphosisStatus && kyphosisStatus !== 'Normal') {
      const curve = analysis.kyphosis?.curve_degrees || 0;
      parts.push(`Your upper back has an increased forward curve (${curve.toFixed(1)}°). This is called kyphosis - imagine your upper back rounding forward more than it should, which can make you appear hunched and create neck and shoulder tension.`);
    }
    
    if (lordosisStatus && lordosisStatus !== 'Normal') {
      const curve = analysis.lordosis?.curve_degrees || 0;
      parts.push(`Your lower back has an increased inward curve (${curve.toFixed(1)}°). This is called lordosis - it's like your lower back is arching too much, which can create compression and affect how your pelvis and hips function.`);
    }
    
    if (pelvicStatus && pelvicStatus !== 'Neutral') {
      const tilt = analysis.pelvic_tilt?.anterior_tilt_degrees || 0;
      const isAnterior = tilt > 0;
      if (isAnterior) {
        parts.push(`Your pelvis is tilted forward (${Math.abs(tilt).toFixed(1)}° anterior tilt). This means your pelvis is rotated so the front drops down - like you're sticking your tailbone out. This can increase the curve in your lower back and affect your hip function.`);
      } else {
        parts.push(`Your pelvis is tilted backward (${Math.abs(tilt).toFixed(1)}° posterior tilt). This means your pelvis is rotated so the front lifts up - like you're tucking your tailbone. This can flatten your lower back and affect your hip mobility.`);
      }
    }
  }
  
  if (parts.length === 0) {
    return "Your posture appears well-aligned from this view. Keep up the good work with your movement patterns!";
  }
  
  return parts.join(' ');
}

// Posture Analysis Viewer - shows one view at a time with navigation
function PostureAnalysisViewer({ 
  postureResults, 
  postureImages 
}: { 
  postureResults: Record<string, any>; 
  postureImages: Record<string, string> | undefined;
}) {
  const views = ['front', 'back', 'side-left', 'side-right'] as const;
  const [currentIndex, setCurrentIndex] = useState(0);
  const availableViews = views.filter(v => postureResults[v]);
  
  if (availableViews.length === 0) return null;
  
  const currentView = availableViews[currentIndex];
  const analysis = postureResults[currentView];
  // Try multiple image sources: Storage URL first (full-size with deviation lines), then compressed
  const imageUrl = postureImages?.[currentView] || 
                   (postureImages as any)?.[`postureImagesStorage_${currentView}`] ||
                   (postureImages as any)?.[`postureImagesFull_${currentView}`];
  
  const nextView = () => {
    setCurrentIndex((prev) => (prev + 1) % availableViews.length);
  };
  
  const prevView = () => {
    setCurrentIndex((prev) => (prev - 1 + availableViews.length) % availableViews.length);
  };
  
  const getFindings = () => {
    const findings: Array<{ label: string; status: string; description: string }> = [];
    
    if (analysis.forward_head && analysis.forward_head.status !== 'Neutral') {
      findings.push({
        label: 'Head Position',
        status: analysis.forward_head.status,
        description: analysis.forward_head.description
      });
    }
    
    if (analysis.shoulder_alignment && analysis.shoulder_alignment.status !== 'Neutral') {
      findings.push({
        label: 'Shoulders',
        status: analysis.shoulder_alignment.status,
        description: analysis.shoulder_alignment.description
      });
    }
    
    if (analysis.kyphosis && analysis.kyphosis.status !== 'Normal') {
      findings.push({
        label: 'Upper Back',
        status: analysis.kyphosis.status,
        description: analysis.kyphosis.description
      });
    }
    
    if (analysis.lordosis && analysis.lordosis.status !== 'Normal') {
      findings.push({
        label: 'Lower Back',
        status: analysis.lordosis.status,
        description: analysis.lordosis.description
      });
    }
    
    if (analysis.pelvic_tilt && analysis.pelvic_tilt.status !== 'Neutral') {
      findings.push({
        label: 'Pelvis',
        status: analysis.pelvic_tilt.status,
        description: analysis.pelvic_tilt.description
      });
    }
    
    if (analysis.hip_alignment && analysis.hip_alignment.status !== 'Neutral') {
      findings.push({
        label: 'Hips',
        status: analysis.hip_alignment.status,
        description: analysis.hip_alignment.description
      });
    }
    
    if (analysis.knee_position && analysis.knee_position.status !== 'Neutral') {
      findings.push({
        label: 'Knees',
        status: analysis.knee_position.status,
        description: analysis.knee_position.description
      });
    }
    
    if (analysis.spinal_curvature && analysis.spinal_curvature.status !== 'Normal') {
      findings.push({
        label: 'Spine',
        status: analysis.spinal_curvature.status,
        description: analysis.spinal_curvature.description
      });
    }
    
    return findings;
  };
  
  const findings = getFindings();
  
  // Get areas for improvement specific to this view
  const getAreasForImprovement = (): string[] => {
    const areas: string[] = [];
    if (analysis.forward_head && analysis.forward_head.status !== 'Neutral') {
      areas.push('Head posture');
    }
    if (analysis.shoulder_alignment && analysis.shoulder_alignment.status !== 'Neutral') {
      areas.push('Shoulder alignment');
    }
    if (analysis.kyphosis && analysis.kyphosis.status !== 'Normal') {
      areas.push('Upper back posture');
    }
    if (analysis.lordosis && analysis.lordosis.status !== 'Normal') {
      areas.push('Lower back posture');
    }
    if (analysis.pelvic_tilt && analysis.pelvic_tilt.status !== 'Neutral') {
      areas.push('Pelvic alignment');
    }
    if (analysis.hip_alignment && analysis.hip_alignment.status !== 'Neutral') {
      areas.push('Hip alignment');
    }
    if (analysis.knee_position && analysis.knee_position.status !== 'Neutral') {
      areas.push('Knee alignment');
    }
    if (analysis.spinal_curvature && analysis.spinal_curvature.status !== 'Normal') {
      areas.push('Spinal alignment');
    }
    return areas;
  };
  
  const areasForImprovement = getAreasForImprovement();
  
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h5 className="text-sm font-bold uppercase text-indigo-600">{currentView.replace('-', ' ')} View</h5>
          <div className="flex items-center gap-2">
            <button
              onClick={prevView}
              disabled={availableViews.length <= 1}
              className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-slate-500">
              {currentIndex + 1} / {availableViews.length}
            </span>
            <button
              onClick={nextView}
              disabled={availableViews.length <= 1}
              className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Image */}
          {imageUrl ? (
            <div className="relative aspect-[3/4] rounded-lg overflow-hidden border-2 border-slate-300 bg-white">
              <img 
                src={imageUrl} 
                alt={currentView} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error('[POSTURE] Image failed to load:', imageUrl, 'Trying alternative sources...');
                  // Try alternative image sources
                  const altImage = (postureImages as any)?.[`postureImagesStorage_${currentView}`] || 
                                  (postureImages as any)?.[`postureImagesFull_${currentView}`];
                  if (altImage && altImage !== imageUrl) {
                    (e.target as HTMLImageElement).src = altImage;
                  } else {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }
                }}
              />
              <div className="absolute bottom-1 left-1 right-1 bg-black/60 text-white text-[7px] px-1.5 py-0.5 rounded">
                Green: Reference lines | Red: Deviations
              </div>
            </div>
          ) : (
            <div className="relative aspect-[3/4] rounded-lg overflow-hidden border-2 border-slate-300 bg-slate-100 flex items-center justify-center">
              <p className="text-xs text-slate-400">Image not available</p>
            </div>
          )}
          
          {/* Findings */}
          <div className="space-y-3">
            {findings.length > 0 ? (
              findings.map((finding, idx) => (
                <div key={idx} className="border-l-2 border-indigo-500 pl-3 py-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-700">{finding.label}</span>
                    <span className="text-xs font-black text-slate-900">{finding.status}</span>
                  </div>
                  <p className="text-[10px] text-slate-600 leading-tight">{finding.description}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                <p className="text-sm font-semibold">No significant deviations found</p>
                <p className="text-xs mt-1">Posture appears neutral for this view</p>
              </div>
            )}
            
            {/* Always show summary - generate one if missing */}
            <div className="pt-3 border-t border-slate-200 mt-3">
              <p className="text-xs font-semibold text-slate-700 mb-1">Summary:</p>
              {analysis.overall_assessment ? (
                <p className="text-[10px] text-slate-600 leading-relaxed">{analysis.overall_assessment}</p>
              ) : (
                <p className="text-[10px] text-slate-600 leading-relaxed">
                  {generateClientFriendlySummary(analysis, currentView)}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Areas for improvement - dynamic per view */}
        {areasForImprovement.length > 0 && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3">
            <h4 className="text-xs font-semibold text-rose-800 mb-2">Areas for improvement</h4>
            <ul className="list-disc pl-5 text-[10px] text-rose-900 space-y-1">
              {areasForImprovement.map((area, i) => (
                <li key={i}>{area}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

const CATEGORY_ORDER = ['bodyComp','strength','cardio','movementQuality','lifestyle'];
const CATEGORY_COLOR: Record<string, string> = {
  bodyComp: 'bg-emerald-500',
  strength: 'bg-indigo-500',
  cardio: 'bg-sky-500',
  movementQuality: 'bg-amber-500',
  lifestyle: 'bg-purple-500',
};
const CATEGORY_HEX: Record<string, string> = {
  bodyComp: '#10b981',
  strength: '#6366f1',
  cardio: '#0ea5e9',
  movementQuality: '#f59e0b',
  lifestyle: '#a855f7',
};

const CATEGORY_EXPLANATIONS: Record<string, string> = {
  bodyComp: "Your body's makeup—muscle, fat, and water. Think of it as the foundation for everything else.",
  strength: "How strong you are and how long you can sustain effort. This affects daily activities and injury prevention.",
  cardio: "Your heart and lung capacity. This determines how efficiently your body uses oxygen during activity.",
  movementQuality: "How well your joints move and how your body holds itself. Better movement quality means fewer aches and more efficient movement.",
  lifestyle: "Your daily habits—sleep, stress, nutrition, hydration, and activity. These are the foundation that makes everything else work better.",
};

const PROGRAM_PHASES = [
  {
    key: 'foundation',
    title: 'Building the Foundation',
    color: 'bg-slate-800',
    text: 'Movement quality, posture, breathing, and consistency. Install habits that make progress inevitable.',
  },
  {
    key: 'overload',
    title: 'Progressive Overload',
    color: 'bg-indigo-600',
    text: 'Gradually increase volume, intensity, or density with excellent technique to drive adaptations.',
  },
  {
    key: 'performance',
    title: 'Performance Development',
    color: 'bg-sky-600',
    text: 'Translate base capacity into performance—better pace, higher outputs, stronger lifts.',
  },
  {
    key: 'specialisation',
    title: 'Specialisation',
    color: 'bg-emerald-600',
    text: 'Emphasise your primary goal block (fat loss, hypertrophy, strength, or endurance) based on response.',
  },
  {
    key: 'mastery',
    title: 'Mastery',
    color: 'bg-amber-600',
    text: 'Refine strengths, shore up weak links, and consolidate results for long-term sustainability.',
  },
];

export default function ClientReport({ scores, roadmap, goals, bodyComp, formData, plan }: { scores: ScoreSummary; roadmap: RoadmapPhase[]; goals?: string[]; bodyComp?: BodyCompInterp; formData?: FormData; plan?: any }) {
  const [sessionsPerWeek, setSessionsPerWeek] = useState<number>(3);
  const sessionFactor = useMemo(() => (sessionsPerWeek === 5 ? 0.75 : sessionsPerWeek === 4 ? 0.85 : 1.0), [sessionsPerWeek]);
  const orderedCats = useMemo(
    () => scores?.categories ? CATEGORY_ORDER.map(id => scores.categories.find(c => c.id === (id as 'bodyComp' | 'strength' | 'cardio' | 'movementQuality' | 'lifestyle'))).filter(Boolean) as ScoreSummary['categories'] : [],
    [scores?.categories]
  );
  
  // Sort by score (best first) for "What this means" section
  const sortedCatsByScore = useMemo(
    () => [...orderedCats].sort((a, b) => b.score - a.score),
    [orderedCats]
  );
  const weeksByCategory: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {};
    if (!orderedCats.length) return map;
    // Goal-based baseline horizons (conservative)
    const weightKg = parseFloat(formData?.inbodyWeightKg || '0');
    const heightM = (parseFloat(formData?.heightCm || '0') || 0) / 100;
    const healthyMin = heightM > 0 ? 22 * heightM * heightM : 0;
    const healthyMax = heightM > 0 ? 25 * heightM * heightM : 0;

    // Weight loss target calculation
    const levelWL = formData?.goalLevelWeightLoss || '';
    let wlTarget = 0;
    if (healthyMax > 0 && weightKg > healthyMax) {
      if (levelWL === 'health-minimum') wlTarget = weightKg - healthyMax;
      else if (levelWL === 'average') wlTarget = weightKg - ((healthyMax + healthyMin) / 2 || healthyMax);
      else if (levelWL === 'above-average' || levelWL === 'elite') wlTarget = weightKg - healthyMin;
      else wlTarget = weightKg - healthyMax;
      if (wlTarget < 0) wlTarget = 0;
    }

    const fatLossRate = 0.5;
    const fatLossWeeks = wlTarget > 0 ? Math.ceil(wlTarget / fatLossRate) : 16;
    // Muscle gain level logic
    const levelMG = formData?.goalLevelMuscle || '';
    const muscleTargetKg =
      levelMG === 'health-minimum' ? 1.5 :
      levelMG === 'average' ? 2.0 :
      levelMG === 'above-average' ? 3.0 :
      levelMG === 'elite' ? 4.0 : 2.0;
    const muscleRate = sessionsPerWeek >= 5 ? 0.22 : sessionsPerWeek === 4 ? 0.18 : 0.15;
    const muscleWeeks = Math.ceil(muscleTargetKg / muscleRate);
    // Strength level logic
    const levelST = formData?.goalLevelStrength || '';
    const strengthPct =
      levelST === 'health-minimum' ? 10 :
      levelST === 'average' ? 15 :
      levelST === 'above-average' ? 20 :
      levelST === 'elite' ? 30 : 15;
    const pctPerBlock = sessionsPerWeek >= 5 ? 4 : sessionsPerWeek === 4 ? 3 : 2.5; // % per ~5 weeks
    const strengthWeeks = Math.ceil(strengthPct / pctPerBlock) * 5;
    // Fitness level logic
    const levelFT = formData?.goalLevelFitness || '';
    const cardioWeeks = levelFT === 'elite' ? 20 : levelFT === 'above-average' ? 16 : 12;
    const mobilityWeeks = 6; // quicker wins
    const postureWeeks = 6; // quicker wins

    for (const cat of orderedCats) {
      let base = 12;
      if (cat.id === 'bodyComp') base = Math.max(12, Math.max(fatLossWeeks, muscleWeeks));
      if (cat.id === 'strength') base = Math.max(12, strengthWeeks);
      if (cat.id === 'cardio') base = Math.max(12, cardioWeeks);
      if (cat.id === 'movementQuality') base = Math.max(mobilityWeeks, postureWeeks);
      if (cat.id === 'lifestyle') base = 4; // Lifestyle is foundational, quick wins
      map[cat.id] = Math.round(base * sessionFactor);
    }
    return map;
  }, [orderedCats, sessionFactor, formData?.goalLevelFitness, formData?.goalLevelMuscle, formData?.goalLevelStrength, formData?.goalLevelWeightLoss, formData?.heightCm, formData?.inbodyWeightKg, sessionsPerWeek]);
  const strengths = useMemo(() => orderedCats.flatMap(c => c.strengths.map(s => `${niceLabel(c.id)}: ${s}`)), [orderedCats]);
  const focusAreas = useMemo(() => orderedCats.flatMap(c => c.weaknesses.map(w => `${niceLabel(c.id)}: ${w}`)), [orderedCats]);
  const maxWeeks = useMemo(() => Math.max(...orderedCats.map(c => weeksByCategory[c.id] ?? 0), 0), [orderedCats, weeksByCategory]);
  // Priority focus (e.g., obesity risk) derived from inputs
  const priorityFocus: string[] = useMemo(() => {
    const list: string[] = [];
    const gender = (formData?.gender || '').toLowerCase();
    const bf = parseFloat(formData?.inbodyBodyFatPct || '0');
    const visceral = parseFloat(formData?.visceralFatLevel || '0');
    const h = (parseFloat(formData?.heightCm || '0') || 0) / 100;
    const w = parseFloat(formData?.inbodyWeightKg || '0');
    const healthyMax = h > 0 ? 25 * h * h : 0;
    if (healthyMax > 0 && w > healthyMax + 3) {
      list.push('Body composition (urgent): reduce health risk safely');
    }
    if ((gender === 'male' && bf > 25) || (gender === 'female' && bf > 32)) {
      list.push('Elevated body fat %: prioritise fat-loss behaviours');
    }
    if (visceral >= 12) {
      list.push('High visceral fat: cardiometabolic risk—lifestyle focus needed');
    }
    // Limb imbalance notice for client
    const armR = parseFloat(formData?.segmentalArmRightKg || '0');
    const armL = parseFloat(formData?.segmentalArmLeftKg || '0');
    const legR = parseFloat(formData?.segmentalLegRightKg || '0');
    const legL = parseFloat(formData?.segmentalLegLeftKg || '0');
    const pct = (a: number, b: number) => {
      const hi = Math.max(a, b);
      const lo = Math.min(a, b);
      if (hi <= 0) return 0;
      return Math.abs(hi - lo) / hi * 100;
    };
    const armImb = pct(armL, armR);
    const legImb = pct(legL, legR);
    if (armImb >= 6 || legImb >= 6) {
      list.push('Limb imbalance identified: addressed with unilateral work to reduce injury risk.');
    }
    return list;
  }, [formData]);
  // Lifestyle recommendations from inputs
  const lifestyleRecs: string[] = useMemo(() => {
    const items: string[] = [];
    const sleepQ = (formData?.sleepQuality || '').toLowerCase();
    const sleepC = (formData?.sleepConsistency || '').toLowerCase();
    const stress = (formData?.stressLevel || '').toLowerCase();
    const hydration = (formData?.hydrationHabits || '').toLowerCase();
    const caffeine = String(formData?.lastCaffeineIntake || '');
    const steps = parseFloat(formData?.stepsPerDay || '0');
    const sedentary = parseFloat(formData?.sedentaryHours || '0');
    if (sleepQ && (sleepQ === 'poor' || sleepQ === 'fair' || sleepC === 'inconsistent' || sleepC === 'very-inconsistent')) {
      items.push('Sleep: 7–9h target; set a consistent wind‑down and wake time; dark, cool room.');
    }
    if (caffeine) {
      items.push('Caffeine: shift last intake earlier in the day to protect sleep.');
    }
    if (stress && (stress === 'high' || stress === 'very-high')) {
      items.push('Stress: daily 5–10 min breathwork or quiet walk; micro‑breaks in long sittings.');
    }
    if (hydration && (hydration === 'poor' || hydration === 'fair')) {
      items.push('Hydration: 2–3 L/day baseline, more with heat/training; consider electrolytes.');
    }
    if (!isNaN(steps) && steps > 0 && steps < 7000) {
      items.push('Movement: build toward 6–10k steps/day with short walk breaks.');
    }
    if (!isNaN(sedentary) && sedentary >= 8) {
      items.push('Sedentary time: stand and move 2–3 min every 30–45 min.');
    }
    const nutrition = (formData?.nutritionHabits || '').toLowerCase();
    if (nutrition && (nutrition === 'poor' || nutrition === 'fair')) {
      items.push('Nutrition: protein at each meal, mostly whole foods, regular mealtimes.');
    }
    return items;
  }, [formData]);
  const clientName = (formData?.fullName || '').trim();
  const overallRadarData = useMemo(() => {
    return orderedCats.map(cat => ({
      name: niceLabel(cat.id).split(' ')[0], // Short name for axis
      fullLabel: niceLabel(cat.id),
      value: cat.score,
      color: CATEGORY_HEX[cat.id] || '#3b82f6',
    }));
  }, [orderedCats, orderedCats.map(c => c.score)]);
  // High-level nutrition advice (goal + body-comp contextual, non-granular)
  const nutritionAdvice: string[] = useMemo(() => {
    const advice: string[] = [];
    const g = new Set(goals ?? []);
    const gender = (formData?.gender || '').toLowerCase();
    const weight = parseFloat(formData?.inbodyWeightKg || '0');
    const bf = parseFloat(formData?.inbodyBodyFatPct || '0');
    const highBf =
      (gender === 'male' && bf > 25) ||
      (gender === 'female' && bf > 32) ||
      (!gender && bf > 28.5);
    const wantsWeightLoss = g.has('weight-loss') || highBf;
    const wantsMuscle = g.has('build-muscle');

    if (wantsWeightLoss) {
      advice.push(
        'Create a gentle calorie deficit with portion control: mostly whole foods, half the plate veg/salad, the rest lean protein and smart carbs.',
        'Prioritise protein at each meal (palm-sized serving) to stay full while losing fat and protecting muscle.',
        'Keep most carbs (rice, bread, sweets) around training or earlier in the day; evenings bias more toward protein, fibre, and fluids.',
        'Use simple food swaps most days (soft drinks → water/zero-cal, fried foods → grilled/baked, sweets → fruit or yoghurt).',
      );
    }

    if (wantsMuscle && !highBf) {
      advice.push(
        'Aim for a small calorie surplus, not “bulking”: roughly one extra snack or ~150–300 kcal/day on training days.',
        'Distribute protein evenly across the day (3–4 meals) and include carbs before and after workouts to support performance and recovery.',
        'Keep most extra calories coming from quality carbs and lean protein rather than heavy fats or desserts.',
      );
    } else if (wantsMuscle && highBf) {
      advice.push(
        'Because body fat is already elevated, focus first on lean recomposition: high protein, mostly whole foods, and a slight deficit/maintenance instead of a big surplus.',
      );
    }

    if (!wantsWeightLoss && !wantsMuscle) {
      advice.push(
        'Base most meals on whole foods: lean proteins, colourful veg/fruit, whole grains, and healthy fats.',
        'Keep a simple structure: 2–3 main meals and 1–2 planned snacks rather than constant grazing.',
      );
    }

    // Fallback if nothing was added but weight is known
    if (advice.length === 0 && weight > 0) {
      advice.push(
        'Focus on consistency: mostly whole foods, protein at each meal, and avoid large swings in daily intake.',
      );
    }

    return advice;
  }, [goals, formData]);

  // Build comprehensive lifestyle profile
  const lifestyleProfile = useMemo(() => {
    const profile: { category: string; status: string; value: string; recommendation?: string }[] = [];
    const sleepQ = (formData?.sleepQuality || '').toLowerCase();
    const sleepC = (formData?.sleepConsistency || '').toLowerCase();
    const sleepD = parseFloat(formData?.sleepDuration || '0');
    const stress = (formData?.stressLevel || '').toLowerCase();
    const hydration = (formData?.hydrationHabits || '').toLowerCase();
    const caffeine = String(formData?.lastCaffeineIntake || '');
    const caffeineCups = parseFloat(formData?.caffeineCupsPerDay || '0');
    const steps = parseFloat(formData?.stepsPerDay || '0');
    const sedentary = parseFloat(formData?.sedentaryHours || '0');
    const nutrition = (formData?.nutritionHabits || '').toLowerCase();
    const workHours = parseFloat(formData?.workHoursPerDay || '0');
    
    // Sleep
    if (sleepQ || sleepC || sleepD > 0) {
      let sleepStatus = 'Good';
      let sleepRec = '';
      if (sleepQ === 'poor' || sleepQ === 'fair' || sleepC === 'inconsistent' || sleepC === 'very-inconsistent') {
        sleepStatus = 'Needs attention';
        sleepRec = '7–9h target; consistent wind‑down and wake time; dark, cool room';
      } else if (sleepD < 7 || sleepD > 9) {
        sleepStatus = 'Needs adjustment';
        sleepRec = 'Aim for 7–9 hours consistently';
      }
      profile.push({
        category: 'Sleep',
        status: sleepStatus,
        value: sleepD > 0 ? `${sleepD}h, ${sleepQ || 'N/A'}, ${sleepC || 'N/A'}` : `${sleepQ || 'N/A'}, ${sleepC || 'N/A'}`,
        recommendation: sleepRec || undefined,
      });
    }
    
    // Stress
    if (stress) {
      const stressStatus = (stress === 'high' || stress === 'very-high') ? 'High' : stress === 'moderate' ? 'Moderate' : 'Low';
      profile.push({
        category: 'Stress',
        status: stressStatus,
        value: stress.charAt(0).toUpperCase() + stress.slice(1),
        recommendation: (stress === 'high' || stress === 'very-high') ? 'Daily 5–10 min breathwork or quiet walk; micro‑breaks in long sittings' : undefined,
      });
    }
    
    // Hydration
    if (hydration) {
      const hydrationStatus = (hydration === 'poor' || hydration === 'fair') ? 'Needs improvement' : 'Good';
      profile.push({
        category: 'Hydration',
        status: hydrationStatus,
        value: hydration.charAt(0).toUpperCase() + hydration.slice(1),
        recommendation: (hydration === 'poor' || hydration === 'fair') ? '2–3 L/day baseline, more with heat/training; consider electrolytes' : undefined,
      });
    }
    
    // Caffeine
    if (caffeine || caffeineCups > 0) {
      let caffeineStatus = 'Good';
      let caffeineRec = '';
      if (caffeine) {
        const hour = parseInt(caffeine.split(':')[0] || '0');
        if (hour >= 14) {
          caffeineStatus = 'Too late';
          caffeineRec = 'Shift last intake earlier (before 2pm) to protect sleep';
        }
      }
      if (caffeineCups > 4) {
        caffeineStatus = 'High consumption';
        caffeineRec = caffeineRec ? `${caffeineRec}; consider reducing to 2–3 cups/day` : 'Consider reducing to 2–3 cups/day';
      }
      profile.push({
        category: 'Caffeine',
        status: caffeineStatus,
        value: caffeineCups > 0 ? `${caffeineCups} cups/day, last at ${caffeine || 'N/A'}` : `Last at ${caffeine || 'N/A'}`,
        recommendation: caffeineRec || undefined,
      });
    }
    
    // Movement
    if (steps > 0 || sedentary > 0) {
      let movementStatus = 'Good';
      let movementRec = '';
      if (steps > 0 && steps < 7000) {
        movementStatus = 'Needs improvement';
        movementRec = 'Build toward 6–10k steps/day with short walk breaks';
      }
      if (sedentary >= 8) {
        movementStatus = 'Too sedentary';
        movementRec = movementRec ? `${movementRec}; stand and move 2–3 min every 30–45 min` : 'Stand and move 2–3 min every 30–45 min';
      }
      profile.push({
        category: 'Daily Movement',
        status: movementStatus,
        value: steps > 0 ? `${Math.round(steps).toLocaleString()} steps/day, ${sedentary}h sedentary` : `${sedentary}h sedentary`,
        recommendation: movementRec || undefined,
      });
    }
    
    // Nutrition
    if (nutrition) {
      const nutritionStatus = (nutrition === 'poor' || nutrition === 'fair') ? 'Needs improvement' : 'Good';
      profile.push({
        category: 'Nutrition',
        status: nutritionStatus,
        value: nutrition.charAt(0).toUpperCase() + nutrition.slice(1),
        recommendation: (nutrition === 'poor' || nutrition === 'fair') ? 'Protein at each meal, mostly whole foods, regular mealtimes' : undefined,
      });
    }
    
    // Work-life balance
    if (workHours > 0) {
      const workStatus = workHours > 10 ? 'High workload' : workHours > 8 ? 'Moderate' : 'Balanced';
      profile.push({
        category: 'Work-Life Balance',
        status: workStatus,
        value: `${workHours}h/day`,
        recommendation: workHours > 10 ? 'Prioritise recovery; schedule training during lower-stress periods' : undefined,
      });
    }
    
    return profile;
  }, [formData]);

  // Calculate "What we'll do first" - relate to goals and main factors
  const immediateActions = useMemo(() => {
    const actions: string[] = [];
    const sleepQ = (formData?.sleepQuality || '').toLowerCase();
    const sleepC = (formData?.sleepConsistency || '').toLowerCase();
    const stress = (formData?.stressLevel || '').toLowerCase();
    const hydration = (formData?.hydrationHabits || '').toLowerCase();
    const nutrition = (formData?.nutritionHabits || '').toLowerCase();
    const steps = parseFloat(formData?.stepsPerDay || '0');
    
    // Connect to goals: Lifestyle foundation first (supports all goals)
    if (sleepQ === 'poor' || sleepQ === 'fair' || sleepC === 'inconsistent' || sleepC === 'very-inconsistent') {
      actions.push('Establish consistent sleep (7–9h, same bedtime/wake time) to support recovery and progress toward your goals');
    }
    if (nutrition === 'poor' || nutrition === 'fair') {
      actions.push('Optimize nutrition (protein at each meal, mostly whole foods) to fuel training and support your goals');
    }
    if (hydration === 'poor' || hydration === 'fair') {
      actions.push('Improve hydration (2–3L/day) to boost energy and recovery, making every workout more effective');
    }
    if (steps > 0 && steps < 7000) {
      actions.push('Increase daily movement (build to 6–10k steps) to enhance metabolism and support your goals');
    }
    if (stress === 'high' || stress === 'very-high') {
      actions.push('Implement stress management (5–10 min daily breathwork/walks) to improve recovery and training quality');
    }
    
    // Connect to goals: Address main factors that block goal achievement
    const lowestCat = orderedCats.sort((a, b) => a.score - b.score)[0];
    if (lowestCat) {
      if (lowestCat.id === 'bodyComp' && (goals?.includes('weight-loss') || goals?.includes('build-muscle'))) {
        actions.push('Address body composition through structured nutrition and training to unlock your goal progress');
      } else if (lowestCat.id === 'movementQuality') {
        actions.push('Improve movement quality first to ensure you can train safely and effectively toward your goals');
      } else if (lowestCat.id === 'strength' && goals?.includes('build-strength')) {
        actions.push('Build foundational strength with progressive training to directly support your strength goals');
      } else if (lowestCat.id === 'cardio' && goals?.includes('improve-fitness')) {
        actions.push('Establish cardiovascular base to directly improve your fitness and energy levels');
      }
    }
    
    // Priority health risks (must address for safety)
    if (priorityFocus.some(p => p.includes('urgent') || p.includes('health risk'))) {
      actions.push('Address health concerns first to ensure safe and effective progress toward your goals');
    }
    
    // Default if nothing specific
    if (actions.length === 0) {
      actions.push('Establish consistent training routine (3 sessions/week) to build momentum toward your goals');
      actions.push('Optimize lifestyle habits (sleep, nutrition, hydration) to maximize training results');
    }
    return actions.slice(0, 5);
  }, [priorityFocus, orderedCats, goals, formData]);

  // Calculate "Quick wins" - expanded with general wins and client-specific highlights
  const quickWins = useMemo(() => {
    const wins: string[] = [];
    const sleepQ = (formData?.sleepQuality || '').toLowerCase();
    const sleepC = (formData?.sleepConsistency || '').toLowerCase();
    const stress = (formData?.stressLevel || '').toLowerCase();
    const hydration = (formData?.hydrationHabits || '').toLowerCase();
    const nutrition = (formData?.nutritionHabits || '').toLowerCase();
    const steps = parseFloat(formData?.stepsPerDay || '0');
    
    // General quick wins that work for everyone
    wins.push('Sleep consistency: Better sleep (7-9h, same bedtime/wake time) improves energy, recovery, and training results within 1-2 weeks');
    wins.push('Daily movement: Increasing steps to 7-10k/day boosts metabolism, improves recovery, and makes training more effective within 2 weeks');
    wins.push('Hydration: Drinking 2-3L water daily improves energy, focus, and workout performance within a week');
    wins.push('Protein at meals: Adding protein to each meal supports muscle maintenance, recovery, and satiety within days');
    wins.push('Stress management: Daily 5-10 min breathwork, walks, or quiet time reduces tension and improves recovery within days');
    
    // Client-specific highlights (what they're doing right)
    if (sleepQ === 'good' || sleepQ === 'excellent') {
      wins.push('✓ You\'re already doing well with sleep quality—we\'ll maintain this strength');
    }
    if (sleepC === 'consistent' || sleepC === 'very-consistent') {
      wins.push('✓ Your consistent sleep schedule is supporting recovery—keep this up');
    }
    if (stress === 'low' || stress === 'moderate') {
      wins.push('✓ Well-managed stress levels allow your body to recover effectively—this is working');
    }
    if (hydration === 'good' || hydration === 'excellent') {
      wins.push('✓ Good hydration habits are supporting your energy and performance');
    }
    if (nutrition === 'good' || nutrition === 'excellent') {
      wins.push('✓ Your nutrition habits are solid—we\'ll build on this foundation');
    }
    if (steps >= 8000) {
      wins.push('✓ Your daily movement is already strong—this supports all your training goals');
    }
    
    // Areas that need attention (if not already covered)
    if (sleepQ === 'poor' || sleepQ === 'fair' || sleepC === 'inconsistent' || sleepC === 'very-inconsistent') {
      if (!wins.some(w => w.includes('sleep'))) {
        wins.push('Sleep improvement: Establishing consistent sleep will be one of your biggest game-changers');
      }
    }
    if (stress === 'high' || stress === 'very-high') {
      if (!wins.some(w => w.includes('stress'))) {
        wins.push('Stress reduction: Managing high stress will unlock better recovery and training results');
      }
    }
    if (steps > 0 && steps < 6000) {
      if (!wins.some(w => w.includes('steps') || w.includes('movement'))) {
        wins.push('Step increase: Building daily movement will accelerate your progress');
      }
    }
    
    return wins;
  }, [formData]);

  // Check for PAR-Q medical clearance requirement
  const needsMedicalClearance = useMemo(() => {
    if (!formData) return false;
    const parqFields = ['parq1', 'parq2', 'parq3', 'parq4', 'parq5', 'parq6', 'parq7', 'parq8', 'parq9', 'parq10', 'parq11', 'parq12', 'parq13'];
    return parqFields.some(field => formData[field as keyof FormData] === 'yes');
  }, [formData]);

  // Determine primary goal for status badge
  const primaryGoal = goals && goals.length > 0 ? goals[0] : 'general-health';
  const goalLabel = primaryGoal === 'weight-loss' ? 'Weight Loss' : 
                    primaryGoal === 'build-muscle' ? 'Muscle Gain' :
                    primaryGoal === 'build-strength' ? 'Strength' :
                    primaryGoal === 'improve-fitness' ? 'Fitness' : 'General Health';

  // Lifestyle focus areas
  const lifestyleFocus = useMemo(() => {
    const focus: string[] = [];
    const sleepQ = (formData?.sleepQuality || '').toLowerCase();
    const sleepC = (formData?.sleepConsistency || '').toLowerCase();
    const stress = (formData?.stressLevel || '').toLowerCase();
    const hydration = (formData?.hydrationHabits || '').toLowerCase();
    if (sleepQ === 'poor' || sleepQ === 'fair' || sleepC === 'inconsistent' || sleepC === 'very-inconsistent') focus.push('Sleep');
    if (stress === 'high' || stress === 'very-high') focus.push('Stress');
    if (hydration === 'poor' || hydration === 'fair') focus.push('Hydration');
    return focus;
  }, [formData]);

  // Check if form has ANY data at all
  const hasAnyData = useMemo(() => {
    if (!formData) return false;
    
    // Check for any filled fields across all categories
    const hasBodyComp = !!(formData.inbodyWeightKg && parseFloat(formData.inbodyWeightKg || '0') > 0);
    const hasStrength = !!(formData.maxPushups && parseFloat(formData.maxPushups || '0') > 0) ||
                        !!(formData.pushupsOneMinuteReps && parseFloat(formData.pushupsOneMinuteReps || '0') > 0);
    const hasCardio = !!(formData.cardioMinutes && parseFloat(formData.cardioMinutes || '0') > 0);
    const hasPosture = !!(formData.postureAiResults || formData.postureHeadOverall || formData.postureShouldersOverall);
    const hasLifestyle = !!(formData.sleepQuality || formData.stressLevel || formData.hydrationHabits || 
                           formData.nutritionHabits || (formData.stepsPerDay && parseFloat(formData.stepsPerDay || '0') > 0));
    
    return hasBodyComp || hasStrength || hasCardio || hasPosture || hasLifestyle;
  }, [formData]);

  if (!scores || !scores.categories || scores.categories.length === 0 || !hasAnyData) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-semibold mb-2">No assessment data available</p>
        <p>Please complete at least one section of the assessment to generate a report.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Status badges at top */}
      <section className="flex flex-wrap items-center gap-2 mb-4">
        {needsMedicalClearance && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5 text-xs font-medium text-red-800 border border-red-200">
            <span>⚠️</span>
            <span>Medical clearance recommended</span>
          </div>
        )}
        {goals && goals.length > 0 && (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1.5 text-xs font-medium text-indigo-800 border border-indigo-200">
          <span>🎯</span>
          <span>Primary goal: {goalLabel}</span>
        </div>
        )}
        {lifestyleFocus.length > 0 && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800 border border-amber-200">
            <span>💪</span>
            <span>Lifestyle focus: {lifestyleFocus.join(', ')}</span>
          </div>
        )}
      </section>

      <section className="space-y-1">
        <h2 className="text-xl font-semibold text-slate-900">
          {clientName ? `${clientName}, your report is ready` : 'Your report is ready'}
        </h2>
        <p className="text-sm text-slate-600">
          Here's a clear overview of where you are now, what we'll focus on first, and how we'll move you toward your goals.
        </p>
      </section>

      {/* Medical clearance warning */}
      {needsMedicalClearance && (
        <section className="rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <h3 className="text-sm font-semibold text-red-800 mb-1">Medical Clearance Required</h3>
              <p className="text-sm text-red-700">
                Based on your PAR-Q responses, please consult with a healthcare professional before starting your training program. 
                You can still review your assessment results and plan, but obtain medical clearance before beginning exercise.
              </p>
            </div>
          </div>
        </section>
      )}
      {/* 1. Here's where you are */}
      <section className="space-y-10 py-4">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Your Fitness Score</h2>
            <p className="text-slate-500 font-medium">A comprehensive snapshot of your current physical condition.</p>
          </div>
          
          {/* Overall score centered and prominent */}
          <div className={`flex h-40 w-40 items-center justify-center rounded-full border-8 bg-white shadow-xl ${circleColor(scores.overall)} transition-transform hover:scale-105 duration-500`}>
            <div className="flex flex-col items-center">
              <span className="text-5xl font-black">{scores.overall}</span>
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-70">Overall</span>
            </div>
          </div>
        </div>

        {/* Category circles in a row */}
        <div className="flex flex-wrap items-start justify-center gap-6 md:gap-10">
          {orderedCats.map((cat) => (
            <div key={cat.id} className="flex flex-col items-center group">
              <div className={`flex h-16 w-16 items-center justify-center rounded-full border-4 bg-white shadow-sm transition-all group-hover:shadow-md group-hover:-translate-y-1 ${circleColor(cat.score)}`}>
                <span className="text-lg font-bold">{cat.score}</span>
              </div>
              <span className="mt-3 w-24 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider leading-tight">
                {niceLabel(cat.id)}
              </span>
            </div>
          ))}
        </div>

        {/* Overall Profile Radar - Presented as a summary insight */}
        <div className="max-w-2xl mx-auto mt-12 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
          <div className="text-center mb-6">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Profile Balance</h3>
          </div>
          <OverallRadarChart data={overallRadarData} />
          <p className="text-center text-xs text-slate-400 mt-4 italic">
            This graph shows how balanced your fitness is across all categories.
          </p>
        </div>
      </section>

      {/* 2. Category tabs with radar charts - Each fitness section gets its own tab */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Your fitness assessment</h2>
        <p className="text-sm text-slate-600">Explore each area of your assessment. Each category shows a detailed breakdown of your performance:</p>
        {orderedCats.length > 0 && (
          <Tabs defaultValue={orderedCats[0].id} className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5 h-auto">
              {orderedCats.map((cat) => (
                <TabsTrigger key={cat.id} value={cat.id} className="text-xs sm:text-sm capitalize">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`h-8 w-8 rounded-full border-2 ${circleColor(cat.score)} flex items-center justify-center`}>
                      <span className="text-xs font-semibold">{cat.score}</span>
                    </div>
                    <span className="text-center leading-tight">{niceLabel(cat.id)}</span>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>
            {orderedCats.map((cat) => {
              const scorePercent = Math.min(100, (cat.score / 100) * 100);
              const bgColor = cat.score >= 75 ? 'bg-green-500' : cat.score >= 45 ? 'bg-amber-500' : 'bg-red-500';
              const jargon = CATEGORY_EXPLANATIONS[cat.id] || '';
              
              return (
                <TabsContent key={cat.id} value={cat.id} className="mt-4">
                  <div className="space-y-4">
                    {/* Category header with score */}
                    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-16 w-16 rounded-full border-4 ${circleColor(cat.score)} flex items-center justify-center`}>
                            <span className="text-xl font-bold">{cat.score}</span>
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-slate-900">{niceLabel(cat.id)}</h3>
                            <p className="text-sm text-slate-600 mt-1">{jargon}</p>
                          </div>
                        </div>
                      </div>
                      <div className="mb-3">
                        <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div 
                            className={`h-full ${bgColor} transition-all`}
                            style={{ width: `${scorePercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Radar chart */}
                    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                      <h4 className="text-base font-semibold text-slate-900 mb-4">Detailed breakdown</h4>
                      {cat.id === 'movementQuality' && formData?.postureAiResults ? (
                        <PostureAnalysisViewer 
                          postureResults={formData.postureAiResults} 
                          postureImages={(formData.postureImagesStorage || formData.postureImages || {}) as Record<string, string>} 
                        />
                      ) : (
                        <TooltipProvider>
                          <CategoryRadarChart details={cat.details} categoryName={niceLabel(cat.id)} />
                        </TooltipProvider>
                      )}
                    </div>
                    
                    {/* Strengths and weaknesses for this category */}
                    {(cat.strengths.length > 0 || cat.weaknesses.length > 0) && (
                      <div className="grid gap-4 md:grid-cols-2">
                        {cat.strengths.length > 0 && (
                          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                            <h4 className="text-base font-semibold text-emerald-800 mb-2">What's working well</h4>
                            <ul className="list-disc pl-5 text-sm text-emerald-900 space-y-1">
                              {cat.strengths.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                        {cat.weaknesses.length > 0 && cat.score > 0 && (
                          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 shadow-sm">
                            <h4 className="text-base font-semibold text-rose-800 mb-2">Areas for improvement</h4>
                            <ul className="list-disc pl-5 text-sm text-rose-900 space-y-1">
                              {cat.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </section>

      {/* 4. Your goals - Tabbed if multiple, expanded with explanations and discovered goals */}
      {goals && goals.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">Your goals</h2>
          
          {goals.length > 1 ? (
            <Tabs defaultValue={goals[0]} className="w-full">
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
                {goals.map((goal) => (
                  <TabsTrigger key={goal} value={goal} className="text-xs sm:text-sm">
                    {goal === 'weight-loss' ? 'Weight Loss' :
                     goal === 'build-muscle' ? 'Muscle Gain' :
                     goal === 'build-strength' ? 'Strength' :
                     goal === 'improve-fitness' ? 'Fitness' : 'General Health'}
                  </TabsTrigger>
                ))}
              </TabsList>
              {goals.map((goal) => {
                const goalIndex = goals.indexOf(goal);
                return (
                  <TabsContent key={goal} value={goal} className="mt-4">
                    {(() => {
                      let explanation = '';
                      let whatItEntails: string[] = [];
                      
                      if (goal === 'weight-loss') {
                        explanation = 'Weight loss means reducing body fat while preserving muscle. This improves health, energy, and how you feel day-to-day.';
                        whatItEntails = [
                          'Creating a sustainable calorie deficit through better food choices and portion control',
                          'Protecting muscle mass with strength training and adequate protein',
                          'Improving daily movement to boost metabolism and recovery',
                          'Establishing habits that make fat loss feel natural, not restrictive'
                        ];
                      } else if (goal === 'build-muscle') {
                        explanation = 'Building muscle (hypertrophy) means increasing your muscle size and strength. This improves metabolism, body composition, and functional strength.';
                        whatItEntails = [
                          'Progressive strength training that challenges your muscles',
                          'Adequate protein and nutrition to support muscle growth',
                          'Recovery practices (sleep, stress management) that allow muscles to repair and grow',
                          'Consistent training that gradually increases volume and intensity'
                        ];
                      } else if (goal === 'build-strength') {
                        explanation = 'Building strength means increasing how much weight you can lift and how efficiently you move. This improves daily function and reduces injury risk.';
                        whatItEntails = [
                          'Focused strength training with proper technique',
                          'Progressive overload—gradually increasing weight or difficulty',
                          'Recovery between sessions to allow strength adaptations',
                          'Movement quality work to ensure you can handle heavier loads safely'
                        ];
                      } else if (goal === 'improve-fitness') {
                        explanation = 'Improving fitness means increasing your cardiovascular capacity (VO₂ max) and endurance. This improves energy, recovery, and overall health.';
                        whatItEntails = [
                          'Cardiovascular training that challenges your heart and lungs',
                          'Building a base of consistent activity before increasing intensity',
                          'Recovery practices that support cardiovascular adaptations',
                          'Gradual progression to avoid burnout and injury'
                        ];
                      } else if (goal === 'general-health') {
                        explanation = 'General health means improving overall wellbeing, energy, and quality of life through balanced training and lifestyle habits.';
                        whatItEntails = [
                          'A mix of strength, cardio, and movement quality work',
                          'Lifestyle habits that support recovery and energy',
                          'Sustainable routines that fit your life',
                          'Focus on feeling better day-to-day'
                        ];
                      }
                      
                      // Get goal-specific actions and quick wins
                      const goalActions = immediateActions.filter((_, i) => i < 3); // First 3 actions
                      const goalQuickWins = quickWins.filter((_, i) => i < 3); // First 3 quick wins
                      
                      return (
                        <div className="space-y-4">
                          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
                            <p className="text-sm text-indigo-900 mb-3">{explanation}</p>
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-indigo-800 uppercase tracking-wide">What this entails:</p>
                              <ul className="list-disc pl-5 text-sm text-indigo-900 space-y-1">
                                {whatItEntails.map((item, j) => <li key={j}>{item}</li>)}
                              </ul>
                            </div>
                          </div>
                          
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
                              <h3 className="text-base font-semibold text-indigo-800 mb-3">What we'll do first</h3>
                              <ul className="space-y-2 text-sm text-indigo-900">
                                {goalActions.map((action, j) => (
                                  <li key={j} className="flex items-start gap-2">
                                    <span className="text-indigo-600 mt-1">•</span>
                                    <span>{action}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
                              <h3 className="text-base font-semibold text-indigo-800 mb-3">What we'll do next</h3>
                              <ul className="space-y-2 text-sm text-indigo-900">
                                {immediateActions.slice(3, 5).map((action, j) => (
                                  <li key={j} className="flex items-start gap-2">
                                    <span className="text-indigo-600 mt-1">•</span>
                                    <span>{action}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </TabsContent>
                );
              })}
            </Tabs>
          ) : (
            <div className="space-y-4">
              {goals.map((goal, i) => {
                let explanation = '';
                let whatItEntails: string[] = [];
                
                if (goal === 'weight-loss') {
                  explanation = 'Weight loss means reducing body fat while preserving muscle. This improves health, energy, and how you feel day-to-day.';
                  whatItEntails = [
                    'Creating a sustainable calorie deficit through better food choices and portion control',
                    'Protecting muscle mass with strength training and adequate protein',
                    'Improving daily movement to boost metabolism and recovery',
                    'Establishing habits that make fat loss feel natural, not restrictive'
                  ];
                } else if (goal === 'build-muscle') {
                  explanation = 'Building muscle (hypertrophy) means increasing your muscle size and strength. This improves metabolism, body composition, and functional strength.';
                  whatItEntails = [
                    'Progressive strength training that challenges your muscles',
                    'Adequate protein and nutrition to support muscle growth',
                    'Recovery practices (sleep, stress management) that allow muscles to repair and grow',
                    'Consistent training that gradually increases volume and intensity'
                  ];
                } else if (goal === 'build-strength') {
                  explanation = 'Building strength means increasing how much weight you can lift and how efficiently you move. This improves daily function and reduces injury risk.';
                  whatItEntails = [
                    'Focused strength training with proper technique',
                    'Progressive overload—gradually increasing weight or difficulty',
                    'Recovery between sessions to allow strength adaptations',
                    'Movement quality work to ensure you can handle heavier loads safely'
                  ];
                } else if (goal === 'improve-fitness') {
                  explanation = 'Improving fitness means increasing your cardiovascular capacity (VO₂ max) and endurance. This improves energy, recovery, and overall health.';
                  whatItEntails = [
                    'Cardiovascular training that challenges your heart and lungs',
                    'Building a base of consistent activity before increasing intensity',
                    'Recovery practices that support cardiovascular adaptations',
                    'Gradual progression to avoid burnout and injury'
                  ];
                } else if (goal === 'general-health') {
                  explanation = 'General health means improving overall wellbeing, energy, and quality of life through balanced training and lifestyle habits.';
                  whatItEntails = [
                    'A mix of strength, cardio, and movement quality work',
                    'Lifestyle habits that support recovery and energy',
                    'Sustainable routines that fit your life',
                    'Focus on feeling better day-to-day'
                  ];
                }
                
                const goalActions = immediateActions.slice(0, 3);
                const goalQuickWins = quickWins.slice(0, 5);
                
                return (
                  <div key={i} className="space-y-4">
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="inline-flex items-center rounded-full bg-indigo-600 px-3 py-1 text-sm font-medium text-white">
                          {goal === 'weight-loss' ? 'Weight Loss' :
                           goal === 'build-muscle' ? 'Muscle Gain' :
                           goal === 'build-strength' ? 'Strength' :
                           goal === 'improve-fitness' ? 'Fitness' : 'General Health'}
                        </span>
                      </div>
                      <p className="text-sm text-indigo-900 mb-3">{explanation}</p>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-indigo-800 uppercase tracking-wide">What this entails:</p>
                        <ul className="list-disc pl-5 text-sm text-indigo-900 space-y-1">
                          {whatItEntails.map((item, j) => <li key={j}>{item}</li>)}
                        </ul>
                      </div>
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
                        <h3 className="text-base font-semibold text-indigo-800 mb-3">What we'll do first</h3>
                        <ul className="space-y-2 text-sm text-indigo-900">
                          {goalActions.map((action, j) => (
                            <li key={j} className="flex items-start gap-2">
                              <span className="text-indigo-600 mt-1">•</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
                        <h3 className="text-base font-semibold text-indigo-800 mb-3">What we'll do next</h3>
                        <ul className="space-y-2 text-sm text-indigo-900">
                          {immediateActions.slice(3, 5).map((action, j) => (
                            <li key={j} className="flex items-start gap-2">
                              <span className="text-indigo-600 mt-1">•</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Discovered goals from assessment */}
          {(() => {
            const discoveredGoals: string[] = [];
            const gender = (formData?.gender || '').toLowerCase();
            const bf = parseFloat(formData?.inbodyBodyFatPct || '0');
            const visceral = parseFloat(formData?.visceralFatLevel || '0');
            const h = (parseFloat(formData?.heightCm || '0') || 0) / 100;
            const w = parseFloat(formData?.inbodyWeightKg || '0');
            const healthyMax = h > 0 ? 25 * h * h : 0;
            
            // Body composition goals
            if (healthyMax > 0 && w > healthyMax + 3) {
              discoveredGoals.push('Improve body composition to reduce health risk');
            }
            if ((gender === 'male' && bf > 25) || (gender === 'female' && bf > 32)) {
              discoveredGoals.push('Reduce body fat percentage for better health');
            }
            if (visceral >= 12) {
              discoveredGoals.push('Reduce visceral fat through lifestyle and training');
            }
            
            // Movement quality goals
            const movementCat = orderedCats.find(c => c.id === 'movementQuality');
            if (movementCat && movementCat.score < 60) {
              discoveredGoals.push('Improve movement quality to reduce injury risk and enhance performance');
            }
            
            // Lifestyle goals
            const lifestyleCat = orderedCats.find(c => c.id === 'lifestyle');
            if (lifestyleCat && lifestyleCat.score < 60) {
              discoveredGoals.push('Optimize lifestyle habits to support training and recovery');
            }
            
            if (discoveredGoals.length === 0) return null;
            
            return (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-amber-800 mb-3">Goals we discovered from your assessment</h3>
                <p className="text-sm text-amber-900 mb-3">Based on your assessment results, we also need to address these areas to put your body in the right state to reach your goals safely:</p>
                <ul className="list-disc pl-5 text-sm text-amber-900 space-y-2">
                  {discoveredGoals.map((dg, i) => <li key={i}>{dg}</li>)}
                </ul>
              </div>
            );
          })()}
        </section>
      )}

      {/* 5. Your lifestyle status - All factors with color coding */}
      {(() => {
        const sleepQ = (formData?.sleepQuality || '').toLowerCase();
        const sleepC = (formData?.sleepConsistency || '').toLowerCase();
        const sleepD = parseFloat(formData?.sleepDuration || '0');
        const stress = (formData?.stressLevel || '').toLowerCase();
        const hydration = (formData?.hydrationHabits || '').toLowerCase();
        const nutrition = (formData?.nutritionHabits || '').toLowerCase();
        const steps = parseFloat(formData?.stepsPerDay || '0');
        const sedentary = parseFloat(formData?.sedentaryHours || '0');
        const caffeine = parseFloat(formData?.caffeineCupsPerDay || '0');
        const lastCaffeine = formData?.lastCaffeineIntake || '';
        
        // Build lifestyle factors with status
        const lifestyleFactors: Array<{ name: string; status: 'good' | 'needs-work' | 'poor'; description: string }> = [];
        
        // Sleep & Recovery
        let sleepStatus: 'good' | 'needs-work' | 'poor' = 'good';
        let sleepDesc = '';
        if (sleepQ === 'excellent' && (sleepC === 'consistent' || sleepC === 'very-consistent')) {
          sleepStatus = 'good';
          sleepDesc = `Excellent sleep quality (${sleepQ}) with consistent schedule (${sleepC})`;
        } else if (sleepQ === 'good' && sleepC === 'consistent') {
          sleepStatus = 'good';
          sleepDesc = `Good sleep quality (${sleepQ}) with consistent schedule`;
        } else if (sleepQ === 'poor' || sleepC === 'very-inconsistent') {
          sleepStatus = 'poor';
          sleepDesc = `Sleep needs attention: ${sleepQ} quality, ${sleepC} schedule`;
        } else {
          sleepStatus = 'needs-work';
          sleepDesc = `Sleep can improve: ${sleepQ} quality, ${sleepC} schedule`;
        }
        lifestyleFactors.push({ name: 'Sleep & Recovery', status: sleepStatus, description: sleepDesc });
        
        // Stress Management
        let stressStatus: 'good' | 'needs-work' | 'poor' = 'good';
        let stressDesc = '';
        if (stress === 'very-low' || stress === 'low') {
          stressStatus = 'good';
          stressDesc = `Well-managed stress (${stress})`;
        } else if (stress === 'very-high') {
          stressStatus = 'poor';
          stressDesc = `Very high stress (${stress}) needs immediate attention`;
        } else {
          stressStatus = 'needs-work';
          stressDesc = `Moderate to high stress (${stress}) can be improved`;
        }
        lifestyleFactors.push({ name: 'Stress Management', status: stressStatus, description: stressDesc });
        
        // Nutrition
        let nutritionStatus: 'good' | 'needs-work' | 'poor' = 'good';
        let nutritionDesc = '';
        if (nutrition === 'excellent' || nutrition === 'good') {
          nutritionStatus = 'good';
          nutritionDesc = `${nutrition.charAt(0).toUpperCase() + nutrition.slice(1)} nutrition habits`;
        } else if (nutrition === 'poor') {
          nutritionStatus = 'poor';
          nutritionDesc = `Poor nutrition habits need improvement`;
        } else {
          nutritionStatus = 'needs-work';
          nutritionDesc = `Fair nutrition habits can be enhanced`;
        }
        lifestyleFactors.push({ name: 'Nutrition', status: nutritionStatus, description: nutritionDesc });
        
        // Hydration
        let hydrationStatus: 'good' | 'needs-work' | 'poor' = 'good';
        let hydrationDesc = '';
        if (hydration === 'excellent' || hydration === 'good') {
          hydrationStatus = 'good';
          hydrationDesc = `${hydration.charAt(0).toUpperCase() + hydration.slice(1)} hydration habits`;
        } else if (hydration === 'poor') {
          hydrationStatus = 'poor';
          hydrationDesc = `Poor hydration needs improvement`;
        } else {
          hydrationStatus = 'needs-work';
          hydrationDesc = `Fair hydration can be enhanced`;
        }
        lifestyleFactors.push({ name: 'Hydration', status: hydrationStatus, description: hydrationDesc });
        
        // Daily Movement
        let movementStatus: 'good' | 'needs-work' | 'poor' = 'good';
        let movementDesc = '';
        if (steps >= 10000) {
          movementStatus = 'good';
          movementDesc = `Excellent daily movement (${Math.round(steps).toLocaleString()} steps/day)`;
        } else if (steps >= 8000) {
          movementStatus = 'good';
          movementDesc = `Good daily movement (${Math.round(steps).toLocaleString()} steps/day)`;
        } else if (steps >= 6000) {
          movementStatus = 'needs-work';
          movementDesc = `Daily movement can increase (${Math.round(steps).toLocaleString()} steps/day, target 8-10k)`;
        } else if (steps > 0) {
          movementStatus = 'poor';
          movementDesc = `Low daily movement (${Math.round(steps).toLocaleString()} steps/day) needs improvement`;
        } else {
          movementStatus = 'needs-work';
          movementDesc = `Daily movement tracking needed`;
        }
        if (sedentary >= 10) {
          movementStatus = 'poor';
          movementDesc += `, too sedentary (${sedentary}h/day)`;
        } else if (sedentary >= 8 && movementStatus === 'good') {
          movementStatus = 'needs-work';
          movementDesc += `, high sedentary time (${sedentary}h/day)`;
        }
        lifestyleFactors.push({ name: 'Daily Movement', status: movementStatus, description: movementDesc });
        
        // Caffeine Timing (if applicable)
        if (caffeine > 0) {
          let caffeineStatus: 'good' | 'needs-work' | 'poor' = 'good';
          let caffeineDesc = '';
          if (lastCaffeine) {
            const hour = parseInt(lastCaffeine.split(':')[0] || '0');
            if (hour < 14) {
              caffeineStatus = 'good';
              caffeineDesc = `Good caffeine timing (last at ${lastCaffeine}, ${caffeine} cups/day)`;
            } else if (hour < 16) {
              caffeineStatus = 'needs-work';
              caffeineDesc = `Caffeine timing can improve (last at ${lastCaffeine}, aim for before 2pm)`;
            } else {
              caffeineStatus = 'poor';
              caffeineDesc = `Caffeine too late (last at ${lastCaffeine}) affecting sleep, ${caffeine} cups/day`;
            }
          } else {
            caffeineStatus = 'needs-work';
            caffeineDesc = `${caffeine} cups/day - track timing to protect sleep`;
          }
          lifestyleFactors.push({ name: 'Caffeine Timing', status: caffeineStatus, description: caffeineDesc });
        }
        
        return (
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">Your lifestyle status</h2>
            <p className="text-sm text-slate-600">Here's how you're doing across all lifestyle factors. These are the foundation for your training results:</p>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {lifestyleFactors.map((factor, i) => {
                const bgColor = factor.status === 'good' 
                  ? 'border-emerald-200 bg-emerald-50' 
                  : factor.status === 'poor'
                  ? 'border-red-200 bg-red-50'
                  : 'border-amber-200 bg-amber-50';
                const textColor = factor.status === 'good'
                  ? 'text-emerald-900'
                  : factor.status === 'poor'
                  ? 'text-red-900'
                  : 'text-amber-900';
                const statusColor = factor.status === 'good'
                  ? 'bg-emerald-100 text-emerald-700'
                  : factor.status === 'poor'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-700';
                const statusLabel = factor.status === 'good' ? 'Doing well' : factor.status === 'poor' ? 'Needs attention' : 'Needs work';
                
                return (
                  <div key={i} className={`rounded-lg border p-4 shadow-sm ${bgColor}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`text-base font-semibold ${textColor}`}>{factor.name}</h3>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <p className={`text-sm ${textColor}`}>{factor.description}</p>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })()}

      {/* 6. Your roadmap - Only show if form has sufficient data */}
      {(() => {
        // Check if form has enough data to show meaningful roadmap
        // Need at least 2 categories with scores > 0 (not just posture)
        const categoriesWithData = scores.categories.filter(c => c.score > 0).length;
        const hasBodyComp = formData?.inbodyWeightKg && parseFloat(formData.inbodyWeightKg) > 0;
        const hasStrength = formData?.maxPushups && parseFloat(formData.maxPushups) > 0;
        const hasCardio = formData?.cardioMinutes && parseFloat(formData.cardioMinutes) > 0;
        const hasLifestyle = formData?.sleepQuality || formData?.stressLevel;
        const isFormComplete = categoriesWithData >= 2 || (hasBodyComp && hasStrength) || (hasStrength && hasCardio) || (hasCardio && hasLifestyle);
        
        if (!isFormComplete) {
          return (
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900">Your roadmap</h2>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-800">
                  Complete more sections of your assessment to see your personalized roadmap and timeline.
                </p>
              </div>
            </section>
          );
        }
        
        return (
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Your roadmap</h2>
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
          <p className="text-sm text-indigo-900 mb-3">
            <strong>This timeline shows when you can expect to start seeing results.</strong> More sessions per week means faster progress—adjust the slider below to see how training frequency affects your timeline.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600">Sessions per week:</span>
          <input type="range" min={3} max={5} step={1} value={sessionsPerWeek} onChange={(e) => setSessionsPerWeek(parseInt(e.target.value))} className="flex-1" />
          <span className="text-sm font-medium text-slate-800 min-w-[60px]">{sessionsPerWeek} sessions</span>
        </div>
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          {orderedCats.map(cat => {
            const weeks = weeksByCategory[cat.id] ?? 3;
            const color = CATEGORY_COLOR[cat.id] || 'bg-slate-500';
            return (
              <div key={cat.id}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-800">{niceLabel(cat.id)}</span>
                  <span className="text-xs text-slate-500">~{weeks} weeks to see improvements</span>
                </div>
                <div className="h-3 w-full rounded bg-slate-100">
                  <div className={`h-3 rounded ${color}`} style={{ width: `${Math.min(100, (weeks / 26) * 100)}%` }} />
                </div>
              </div>
            );
          })}
          <div className="mt-4 pt-3 border-t border-slate-200">
            <p className="text-sm text-slate-700">
              <strong>Total timeline: ~{maxWeeks} weeks with {sessionsPerWeek} sessions/week.</strong> More sessions = faster results. 
              {sessionsPerWeek === 3 && ' Training 4-5 times per week can reduce this timeline by 15-25%.'}
              {sessionsPerWeek === 4 && ' Training 5 times per week can reduce this timeline by an additional 10-15%.'}
              {sessionsPerWeek === 5 && ' You\'re maximizing your training frequency for the fastest results.'}
            </p>
          </div>
        </div>
      </section>
        );
      })()}

      {/* 7. What to expect */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">What to expect</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Weeks 1–4</div>
            <p className="text-sm text-slate-700">Better movement, more energy, improved sleep and recovery.</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Weeks 5–10</div>
            <p className="text-sm text-slate-700">Noticeable strength gains, better fitness, visible progress toward your goals.</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Weeks 11–20</div>
            <p className="text-sm text-slate-700">Significant changes others notice. Stronger, fitter, healthier habits are automatic.</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">~{Math.max(20, maxWeeks)} weeks</div>
            <p className="text-sm text-slate-700">You're well on your way with sustainable momentum and clear progress.</p>
          </div>
        </div>
      </section>

      {/* 8. What We'll Focus On - Prioritized */}
      {plan?.prioritizedExercises && (
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-900">What We'll Focus On</h2>
          <p className="text-sm text-slate-600">
            Based on your assessment, here's what we'll prioritize and why. This helps you understand what's urgent, 
            what directly supports your goals, and what we'll refine along the way.
          </p>
          
          <div className="space-y-4">
            {/* Critical/Urgent Issues */}
            {plan.prioritizedExercises.criticalIssues.length > 0 && (
              <div className="rounded-xl border-2 border-red-300 bg-red-50 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🚨</span>
                  <h3 className="text-lg font-black text-slate-900">URGENT: Critical Health & Safety</h3>
                </div>
                <p className="text-sm text-slate-700 mb-3">
                  These issues need immediate attention to protect your health and prevent injury. We'll address these first.
                </p>
                <ul className="space-y-2">
                  {plan.prioritizedExercises.criticalIssues.map((issue, i) => (
                    <li key={i} className="text-sm text-slate-800 flex gap-2">
                      <span className="text-red-600 font-bold">•</span>
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Goal-Focused */}
            {plan.prioritizedExercises.goalExercises.length > 0 && (
              <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🎯</span>
                  <h3 className="text-lg font-black text-slate-900">Your Goals: Direct Path Forward</h3>
                </div>
                <p className="text-sm text-slate-700 mb-3">
                  These exercises directly support your primary goals. This is how we'll make progress toward what you want to achieve.
                </p>
                <ul className="space-y-2">
                  {plan.prioritizedExercises.goalExercises.map((goal, i) => (
                    <li key={i} className="text-sm text-slate-800 flex gap-2">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>{goal}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Important Issues */}
            {plan.prioritizedExercises.importantIssues.length > 0 && (
              <div className="rounded-xl border-2 border-blue-300 bg-blue-50 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">⚡</span>
                  <h3 className="text-lg font-black text-slate-900">Important: Issues That Could Hinder Progress</h3>
                </div>
                <p className="text-sm text-slate-700 mb-3">
                  These aren't urgent, but addressing them will help you progress faster and avoid setbacks.
                </p>
                <ul className="space-y-2">
                  {plan.prioritizedExercises.importantIssues.map((issue, i) => (
                    <li key={i} className="text-sm text-slate-800 flex gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Minor Issues */}
            {plan.prioritizedExercises.minorIssues.length > 0 && (
              <div className="rounded-xl border-2 border-slate-300 bg-slate-50 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">✨</span>
                  <h3 className="text-lg font-black text-slate-900">Minor: Optimizations We'll Address</h3>
                </div>
                <p className="text-sm text-slate-700 mb-3">
                  Small refinements we'll work on along the way to fine-tune your movement and performance.
                </p>
                <ul className="space-y-2">
                  {plan.prioritizedExercises.minorIssues.map((issue, i) => (
                    <li key={i} className="text-sm text-slate-800 flex gap-2">
                      <span className="text-slate-600 font-bold">•</span>
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 9. Sample Workout - Enhanced with Priority Context */}
      {(() => {
        const g0 = (goals && goals[0]) || '';
        
        // Get exercises from prioritized system if available
        const criticalExercises = plan?.prioritizedExercises?.groups.find(g => g.priority === 'critical')?.exercises || [];
        const goalExercises = plan?.prioritizedExercises?.groups.find(g => g.priority === 'goal-focused')?.exercises || [];
        const importantExercises = plan?.prioritizedExercises?.groups.find(g => g.priority === 'important')?.exercises || [];
        
        // Build workout structure showing how each part addresses priorities
        const workoutParts: Array<{ section: string; exercises: string[]; addresses: string[] }> = [];
        
        // Warm-up: Addresses urgent and important issues
        const warmupExercises: string[] = [];
        const warmupAddresses: string[] = [];
        if (criticalExercises.length > 0) {
          criticalExercises.slice(0, 2).forEach(ex => {
            warmupExercises.push(ex.name);
            warmupAddresses.push(...ex.addresses);
          });
        }
        if (importantExercises.length > 0 && warmupExercises.length < 3) {
          importantExercises.slice(0, 2).forEach(ex => {
            if (!warmupExercises.includes(ex.name)) {
              warmupExercises.push(ex.name);
              warmupAddresses.push(...ex.addresses);
            }
          });
        }
        if (warmupExercises.length > 0) {
          workoutParts.push({
            section: 'Warm-up & Movement Prep',
            exercises: warmupExercises,
            addresses: [...new Set(warmupAddresses)]
          });
        }
        
        // Main workout: Goal-focused exercises
        const mainExercises: string[] = [];
        const mainAddresses: string[] = [];
        if (goalExercises.length > 0) {
          goalExercises.slice(0, 4).forEach(ex => {
            mainExercises.push(ex.name);
            mainAddresses.push(...ex.addresses);
          });
        }
        if (mainExercises.length > 0) {
          workoutParts.push({
            section: 'Main Workout',
            exercises: mainExercises,
            addresses: [...new Set(mainAddresses)]
          });
        }
        
        // Fallback to goal-based structure if no prioritized exercises
        if (workoutParts.length === 0) {
        if (g0 === 'weight-loss') {
            workoutParts.push({
              section: 'Main Workout',
              exercises: ['Metabolic Circuit Training', 'Zone 2 Cardio'],
              addresses: ['weight loss', 'calorie burn', 'fat loss']
            });
          } else if (g0 === 'build-muscle' || g0 === 'build-strength') {
            workoutParts.push({
              section: 'Main Workout',
              exercises: ['Compound Lifts', 'Progressive Overload'],
              addresses: [g0 === 'build-muscle' ? 'muscle growth' : 'strength']
            });
        } else if (g0 === 'improve-fitness') {
            workoutParts.push({
              section: 'Main Workout',
              exercises: ['Interval Training', 'Zone 2 Cardio'],
              addresses: ['fitness', 'cardio capacity']
            });
          }
        }
        
        return (
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">Sample Workout Structure</h2>
            <p className="text-sm text-slate-600">
              Here's how a typical workout will look and how each part serves your urgent needs, goals, and improvements:
            </p>
            
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              {workoutParts.map((part, idx) => (
                <div key={idx} className="border-b border-slate-200 pb-4 last:border-b-0 last:pb-0">
                  <h3 className="text-base font-semibold text-slate-900 mb-2">{part.section}</h3>
                <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1 mb-2">
                    {part.exercises.map((ex, i) => (
                      <li key={i}>{ex}</li>
                  ))}
                </ul>
                <p className="text-xs text-slate-600 italic">
                    Addresses: {part.addresses.join(', ')}
                </p>
              </div>
              ))}
              
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 mt-4">
                <p className="text-xs text-slate-700">
                  <strong>Note:</strong> Specific reps, sets, and weights will be tailored to your current ability and progress. 
                  We'll start with technique-focused work and gradually increase intensity as your movement quality and strength improve.
                </p>
              </div>
            </div>
          </section>
        );
      })()}

      {/* Removed explicit expected timeframe to keep end date obscure */}
    </div>
  );
}


