import type { FormData } from '@/contexts/FormContext';
import { type ScoreSummary, buildRoadmap } from './scoring';
import { prioritizeExercises, type ExerciseGroup, type SessionGroup } from './exercisePrioritization';

export type CoachPlan = {
  keyIssues: string[];
  clientScript: {
    findings: string[];
    whyItMatters: string[];
    actionPlan: string[];
    threeMonthOutlook: string[];
    clientCommitment: string[];
  };
  internalNotes: {
    doingWell: string[];
    needsAttention: string[];
  };
  programmingStrategies: {
    title: string;
    exercises: string[];
    strategy: string;
  }[];
  movementBlocks: {
    title: string;
    objectives: string[];
    exercises: { name: string; setsReps?: string; notes?: string }[];
  }[];
  segmentalGuidance?: string[];
  prioritizedExercises?: {
    groups: ExerciseGroup[];
    bySession: SessionGroup[];
    criticalIssues: string[];
    goalExercises: string[];
    importantIssues: string[];
    minorIssues: string[];
  };
};

export type BodyCompInterpretation = {
  healthPriority: string[];
  trainingFocus: { primary: string; secondary?: string[]; corrective?: string[]; unilateralVolume?: string };
  nutrition: { calorieRange?: string; proteinTarget?: string; hydration?: string; carbTiming?: string };
  lifestyle: { sleep?: string; stress?: string; dailyMovement?: string; inflammationReduction?: string };
  timeframeWeeks: string; // e.g., "8–14 weeks"
};

const EXERCISES = {
  posture: [
    { name: 'Chin tucks', setsReps: '3 x 8-10', notes: 'Slow, controlled' },
    { name: 'Wall angels', setsReps: '3 x 8-10' },
    { name: 'Bruegger posture relief', setsReps: '3 x 60s' },
  ],
  kyphosis: [
    { name: 'Thoracic extensions over foam roller', setsReps: '3 x 8' },
    { name: 'Prone Y/T/W', setsReps: '3 x 8 each' },
  ],
  lordosis: [
    { name: 'Posterior pelvic tilts', setsReps: '3 x 10' },
    { name: 'Dead bug', setsReps: '3 x 8/side' },
  ],
  kneeValgus: [
    { name: 'Mini-band lateral walks', setsReps: '3 x 10 steps' },
    { name: 'Split squat with knee tracking cue', setsReps: '3 x 8/side' },
  ],
  mobilityHip: [
    { name: '90/90 hip switches', setsReps: '2-3 x 6/side' },
    { name: 'Hip flexor stretch', setsReps: '2-3 x 45s/side' },
  ],
  mobilityAnkle: [
    { name: 'Knee-to-wall ankle mobilizations', setsReps: '2-3 x 8/side' },
    { name: 'Calf stretch', setsReps: '2-3 x 45s/side' },
  ],
  mobilityShoulder: [
    { name: 'PVC shoulder dislocates (controlled)', setsReps: '2-3 x 8' },
    { name: 'Sleeper stretch', setsReps: '2-3 x 45s/side' },
  ],
  cardioBase: [
    { name: 'Zone 2 cardio', setsReps: '20-30 min', notes: '2-4x/week' },
    { name: 'Tempo intervals', setsReps: '6 x 2 min hard / 2 min easy' },
  ],
  coreEndurance: [
    { name: 'Front plank', setsReps: '3 x 30-60s' },
    { name: 'Side plank (knee or full)', setsReps: '3 x 20-40s/side' },
  ],
  strengthBase: [
    { name: 'Goblet squat', setsReps: '3 x 8-12' },
    { name: 'DB bench press', setsReps: '3 x 8-12' },
    { name: '1-arm row', setsReps: '3 x 8-12/side' },
  ],
};

export function generateCoachPlan(form: FormData, scores: ScoreSummary): CoachPlan {
  // Check if form has ANY data - if not, return empty plan
  const hasAnyData = !!(form.inbodyWeightKg && parseFloat(form.inbodyWeightKg || '0') > 0) ||
                     !!(form.pushupMaxReps && parseFloat(form.pushupMaxReps || '0') > 0) ||
                     !!(form.pushupsOneMinuteReps && parseFloat(form.pushupsOneMinuteReps || '0') > 0) ||
                     !!(form.cardioRestingHr && parseFloat(form.cardioRestingHr || '0') > 0) ||
                     !!(form.postureAiResults || form.postureHeadOverall || form.postureShouldersOverall) ||
                     !!(form.sleepQuality || form.stressLevel || form.hydrationHabits || form.nutritionHabits);
  
  if (!hasAnyData) {
    return {
      keyIssues: [],
      clientScript: { findings: [], whyItMatters: [], actionPlan: [], threeMonthOutlook: [], clientCommitment: [] },
      internalNotes: { doingWell: [], needsAttention: [] },
      programmingStrategies: [],
      movementBlocks: [],
      segmentalGuidance: []
    };
  }
  
  const issues: string[] = [];
  const blocks: CoachPlan['movementBlocks'] = [];
  const segmentalGuidance: string[] = [];
  
  const clientScript = {
    findings: [] as string[],
    whyItMatters: [] as string[],
    actionPlan: [] as string[],
    threeMonthOutlook: [] as string[],
    clientCommitment: [] as string[],
  };

  const internalNotes = {
    doingWell: [] as string[],
    needsAttention: [] as string[],
  };

  const goals = Array.isArray((form as any).clientGoals) ? (form as any).clientGoals as string[] : [];
  const primaryGoalRaw = goals[0] || 'general-health';
  
  // Format goal for natural language use
  const goalInSentence = primaryGoalRaw === 'weight-loss' ? 'weight loss'
    : primaryGoalRaw === 'build-muscle' ? 'muscle building'
    : primaryGoalRaw === 'build-strength' ? 'strength building'
    : primaryGoalRaw === 'improve-fitness' ? 'fitness'
    : 'health and longevity';

  const primaryGoal = primaryGoalRaw.replace('-', ' ');

  const programmingStrategies: CoachPlan['programmingStrategies'] = [];

  // Goal-based strategies
  if (primaryGoalRaw === 'weight-loss') {
    programmingStrategies.push({
      title: 'Metabolic Density',
      strategy: 'Use supersets and short rest periods to keep heart rate elevated and increase caloric burn during the session.',
      exercises: ['Goblet Squats', 'Kettlebell Swings', 'Push-ups', 'TRX Rows']
    });
  } else if (primaryGoalRaw === 'build-muscle' || primaryGoalRaw === 'build-strength') {
    programmingStrategies.push({
      title: 'Structural Hypertrophy',
      strategy: 'Prioritize compound lifts with moderate-to-high volume (3-4 sets of 8-12 reps) to drive muscular adaptations.',
      exercises: ['Back Squats', 'Bench Press', 'Deadlifts', 'Overhead Press']
    });
  } else if (primaryGoalRaw === 'improve-fitness') {
    programmingStrategies.push({
      title: 'Aerobic Power',
      strategy: 'Focus on improving VO2 max and recovery through a combination of Zone 2 steady-state and high-intensity intervals.',
      exercises: ['Interval Sprints', 'Tempo Runs', 'Rowing Intervals', 'Assault Bike']
    });
  } else if (primaryGoalRaw === 'general-health') {
    programmingStrategies.push({
      title: 'Functional Longevity',
      strategy: 'Focus on full-body strength, balanced movement, and cardiovascular health to improve daily quality of life.',
      exercises: ['Carry Variations', 'Bodyweight Squats', 'Bird-Dogs', 'Walking']
    });
  }

  // 1. Gather Findings and Internal Notes
  const gender = (form.gender || '').toLowerCase();
  const bf = parseFloat(form.inbodyBodyFatPct || '0');
  const visceral = parseFloat(form.visceralFatLevel || '0');
  const smm = parseFloat(form.skeletalMuscleMassKg || '0');
  const bodyCompScore = scores.categories.find(c => c.id === 'bodyComp')?.score || 0;
  const cardioScore = scores.categories.find(c => c.id === 'cardio')?.score || 0;
  const strengthScore = scores.categories.find(c => c.id === 'strength')?.score || 0;
  const movementScore = scores.categories.find(c => c.id === 'movementQuality')?.score || 0;
  const lifestyleScore = scores.categories.find(c => c.id === 'lifestyle')?.score || 0;

  const w = parseFloat(form.inbodyWeightKg || '0');
  const h = (parseFloat(form.heightCm || '0') || 0) / 100;
  const healthyMax = h > 0 ? 25 * h * h : 0;

  const roadmap = buildRoadmap(scores, form);
  const totalWeeks = roadmap.reduce((acc, p) => acc + p.weeks, 0);

  // Helper flags
  const hasBodyCompData = bf > 0 || visceral > 0 || w > 0;
  const hasMovementData = movementScore > 0 || form.postureAiResults || form.postureBackOverall;
  const hasStrengthData = strengthScore > 0;
  const hasCardioData = cardioScore > 0;

  // Body Composition framing - only if we have body comp data
  if ((bf > 0 || visceral > 0 || w > 0) && (bf > (gender === 'male' ? 22 : 30) || visceral >= 10)) {
    clientScript.findings.push(`Your body composition markers (BF: ${bf}%, Visceral Fat: ${visceral}) indicate some metabolic stress.`);
    clientScript.whyItMatters.push(`Lowering these markers will directly support your ${goalInSentence} results by improving your energy and recovery speed.`);
    clientScript.actionPlan.push(`We'll use specific cardio 'anchors' to improve your metabolic health, which clears the path for your ${goalInSentence} progress.`);
    internalNotes.needsAttention.push(`High metabolic risk (BF ${bf}%, VFL ${visceral}) - requires Zone 2 foundation.`);
  }

  // SMM Findings
  if (smm > 0) {
    const targetSmm = gender === 'male' ? 33 : 24;
    if (smm < targetSmm) {
      clientScript.findings.push(`Your skeletal muscle mass (${smm}kg) is currently below the recommended baseline for your frame.`);
      clientScript.whyItMatters.push(`Building this muscle foundation is essential to provide the 'engine' needed for ${goalInSentence} and long-term metabolic health.`);
      internalNotes.needsAttention.push(`Low SMM (${smm}kg) - hypertrophy focus required.`);
    }
  }

  // Posture/Movement findings
  if (form.postureAiResults) {
    const ai = form.postureAiResults;
    const views = ['front', 'back', 'side-left', 'side-right'] as const;
    let foundMovementIssue = false;

    for (const view of views) {
      const analysis = ai[view];
      if (!analysis) continue;

      if (analysis.forward_head && analysis.forward_head.status !== 'Neutral') {
        const deg = Math.round(analysis.forward_head.deviation_degrees || 0);
        clientScript.findings.push(`Our AI scan detected a ${deg}° forward head deviation in your ${view} view.`);
        foundMovementIssue = true;
      }
      if (analysis.head_alignment && analysis.head_alignment.status !== 'Neutral') {
        const tilt = analysis.head_alignment.tilt_degrees.toFixed(1);
        clientScript.findings.push(`We found a ${tilt}° head tilt to the ${analysis.head_alignment.status.toLowerCase()} in your ${view} view.`);
        foundMovementIssue = true;
      }
      if (analysis.spinal_curvature && analysis.spinal_curvature.status !== 'Normal') {
        const curve = analysis.spinal_curvature.curve_degrees.toFixed(1);
        clientScript.findings.push(`Your back scan shows a ${curve}° lateral spinal curvature.`);
        foundMovementIssue = true;
      }
    }

    if (foundMovementIssue) {
      clientScript.whyItMatters.push(`Addressing these movement restrictions will make your ${goalInSentence} training much safer and allow us to progress faster.`);
      clientScript.actionPlan.push(`We'll include 5-10 minutes of targeted 'pre-hab' in every session to unlock these areas so they don't hold back your ${goalInSentence} progress.`);
    }
  } else if (movementScore > 0 && movementScore < 60) {
    clientScript.findings.push("We found some movement restrictions that act like 'brakes' on your progress.");
    clientScript.whyItMatters.push(`Fixing these will make your ${goalInSentence} training much safer and allow us to load you up with heavier weights sooner.`);
    clientScript.actionPlan.push(`We'll include 5-10 minutes of 'pre-hab' in every session to unlock these areas so they don't hold back your ${goalInSentence} progress.`);
    internalNotes.needsAttention.push(`Movement quality (${movementScore}/100) is a bottleneck.`);
  }

  // Strength/Cardio framing - only if we have data
  if (strengthScore > 0 && strengthScore < 55) {
    clientScript.findings.push(`Your current strength baseline is below our foundational target.`);
    clientScript.whyItMatters.push(`As we increase this baseline, every part of your ${goalInSentence} journey will become easier and more sustainable.`);
    internalNotes.needsAttention.push(`Strength Mastery (${strengthScore}/100) requires foundational build.`);
  }

  if (cardioScore > 0 && cardioScore < 55) {
    const rhr = form.cardioRestingHr;
    clientScript.findings.push(`Your aerobic recovery is currently a limiting factor (Resting HR: ${rhr}bpm).`);
    clientScript.whyItMatters.push(`By improving this, you'll be able to work harder in your ${goalInSentence} sessions and recover much faster between them.`);
    internalNotes.needsAttention.push(`Low aerobic base (RHR ${rhr}bpm) - limits session density.`);
  }

  // 3-Month Outlook - Goal Centric (only if we have data)
  if (hasAnyData) {
    clientScript.threeMonthOutlook.push(`Over the next ${totalWeeks} weeks, the main thing you'll notice is a significant shift in your ${goalInSentence} capacity.`);
    clientScript.threeMonthOutlook.push("Beyond that, you'll feel 'tighter' in your movement, have more 'engine' in your workouts, and feel more confident under load.");
  }

  // Client Commitment (only if we have data)
  if (hasAnyData) {
    clientScript.clientCommitment.push("Consistency: Hit our agreed session frequency every week.");
    const hasLifestyleData = lifestyleScore > 0;
    if (hasLifestyleData && lifestyleScore < 70) {
      clientScript.clientCommitment.push("Recovery: Prioritize the sleep and hydration targets we discussed.");
    }
    clientScript.clientCommitment.push("Communication: Provide feedback on recovery and intensity after every session.");
    clientScript.clientCommitment.push("Focus: Trust the process during our foundational movement phase.");
  }

  // Internal Notes - Doing Well (only if we have data)
  if (hasBodyCompData && bodyCompScore > 75) internalNotes.doingWell.push("Excellent metabolic baseline.");
  if (hasMovementData && movementScore > 75) internalNotes.doingWell.push("Very high movement integrity.");
  const hasLifestyleData = lifestyleScore > 0;
  if (hasLifestyleData && lifestyleScore > 80) internalNotes.doingWell.push("Elite-level recovery habits.");
  if (hasStrengthData && strengthScore > 70) internalNotes.doingWell.push("Strong foundational strength base.");
  if (hasCardioData && cardioScore > 70) internalNotes.doingWell.push("Good cardiovascular recovery and capacity.");

  // Internal Notes - Needs Attention (only if we have data)
  if (hasLifestyleData && lifestyleScore < 60) internalNotes.needsAttention.push("Lifestyle habits (sleep/stress) are a major recovery bottleneck.");
  if (hasStrengthData && strengthScore < 40) internalNotes.needsAttention.push("Critical lack of foundational strength endurance.");
  if (hasCardioData && cardioScore < 40) internalNotes.needsAttention.push("Low cardiovascular base - will impact session density and recovery.");
  if (hasBodyCompData && ((gender === 'male' && bf > 25) || (gender === 'female' && bf > 32) || (healthyMax > 0 && w > healthyMax + 3) || visceral >= 12)) {
    issues.push('Body composition priority (health risk)');
    // Encourage aerobic base + strength base blocks
    blocks.unshift({
      title: 'Aerobic base for health',
      objectives: ['Improve HR recovery', 'Increase daily movement'],
      exercises: EXERCISES.cardioBase,
    });
  }

  // Helper to avoid duplicate blocks by title
  const addBlock = (title: string, objectives: string[], exercises: typeof EXERCISES[keyof typeof EXERCISES]) => {
    if (!blocks.find(b => b.title === title)) {
      blocks.push({ title, objectives, exercises });
    }
  };

  // Incorporate client goals
  goals.forEach((g) => {
    if (g === 'weight-loss') {
      issues.push('Primary goal: Weight loss');
      addBlock('Aerobic base for fat loss', ['Increase weekly calorie burn', 'Improve HR recovery'], EXERCISES.cardioBase);
    }
    if (g === 'build-muscle' || g === 'build-strength') {
      issues.push(g === 'build-muscle' ? 'Primary goal: Build muscle' : 'Primary goal: Build strength');
      addBlock('Strength & hypertrophy base', ['Progressive overload', 'Compound movement proficiency'], EXERCISES.strengthBase);
      addBlock('Core endurance', ['Increase stiffness & postural control'], EXERCISES.coreEndurance);
    }
    if (g === 'improve-fitness') {
      issues.push('Primary goal: Improve fitness');
      addBlock('Aerobic base', ['Build aerobic capacity', 'Improve HR recovery'], EXERCISES.cardioBase);
    }
    if (g === 'general-health') {
      issues.push('Primary goal: General health');
      addBlock('Daily posture hygiene', ['Reduce prolonged flexion', 'Reinforce neutral alignment'], EXERCISES.posture);
      addBlock('Aerobic base', ['2–3x/week cardio', 'Promote active lifestyle'], EXERCISES.cardioBase);
    }
  });

  // Posture/alignment issues
  if (form.postureBackOverall === 'increased-kyphosis') {
    issues.push('Increased thoracic kyphosis');
    addBlock('T-spine extension & scapular control', ['Improve thoracic extension', 'Reinforce scapular retraction'], EXERCISES.kyphosis);
  }
  if (form.postureBackOverall === 'increased-lordosis') {
    issues.push('Anterior pelvic tilt / lordosis');
    addBlock('Pelvic control & deep core activation', ['Improve posterior pelvic tilt control', 'Enhance core stiffness'], EXERCISES.lordosis);
  }
  if (form.postureKneesOverall === 'valgus-knee') {
    issues.push('Knee valgus tendency');
    addBlock('Hip abduction strength & knee tracking', ['Strengthen glute med', 'Improve knee-over-toes control'], EXERCISES.kneeValgus);
  }

  // Mobility issues
  const movementCategory = scores.categories.find(c => c.id === 'movementQuality');
  if ((movementCategory?.score || 0) < 65) {
    const mobIssues = movementCategory?.weaknesses || [];
    if (mobIssues.find(w => w.toLowerCase().includes('hip'))) {
      issues.push('Hip mobility limitations');
      addBlock('Hip mobility', ['Increase hip ER/IR and extension'], EXERCISES.mobilityHip);
    }
    if (mobIssues.find(w => w.toLowerCase().includes('shoulder'))) {
      issues.push('Shoulder mobility limitations');
      addBlock('Shoulder mobility', ['Improve shoulder flexion and ER'], EXERCISES.mobilityShoulder);
    }
    if (mobIssues.find(w => w.toLowerCase().includes('ankle'))) {
      issues.push('Ankle mobility limitations');
      addBlock('Ankle mobility', ['Increase dorsiflexion ROM'], EXERCISES.mobilityAnkle);
    }
  }

  // Segmental lean imbalance (arms/legs)
  const armR = parseFloat(form.segmentalArmRightKg || '0');
  const armL = parseFloat(form.segmentalArmLeftKg || '0');
  const legR = parseFloat(form.segmentalLegRightKg || '0');
  const legL = parseFloat(form.segmentalLegLeftKg || '0');
  const pct = (a: number, b: number) => {
    const hi = Math.max(a, b);
    const lo = Math.min(a, b);
    if (hi <= 0) return 0;
    return Math.abs(hi - lo) / hi * 100;
  };
  const armImb = pct(armL, armR);
  const legImb = pct(legL, legR);
  const msgFor = (region: string, diff: number) => {
    if (diff <= 5) return `${region}: Balanced. No special intervention needed.`;
    if (diff < 10) return `${region}: Light imbalance (~${diff.toFixed(1)}%). Add 1–2 unilateral movements/week or 1–2 extra sets on the weaker side.`;
    return `${region}: Significant imbalance (~${diff.toFixed(1)}%). Prioritise unilateral exercises and add 1–2 additional sets to the weaker side until balanced.`;
  };
  if (armL > 0 || armR > 0) {
    segmentalGuidance.push(msgFor('Arms', armImb));
    if (armImb >= 10) {
      blocks.push({
        title: 'Unilateral correction — arms',
        objectives: ['Reduce side-to-side asymmetry', 'Improve unilateral control'],
        exercises: [
          { name: '1‑arm row', setsReps: '3–4 x 8–12/side' },
          { name: 'Single‑arm DB press', setsReps: '3–4 x 8–12/side' },
        ],
      });
    }
  }
  if (legL > 0 || legR > 0) {
    segmentalGuidance.push(msgFor('Legs', legImb));
    if (legImb >= 10) {
      blocks.push({
        title: 'Unilateral correction — legs',
        objectives: ['Reduce asymmetry', 'Improve single‑leg stability'],
        exercises: [
          { name: 'Split squat', setsReps: '3–4 x 8–12/side' },
          { name: 'Step‑up', setsReps: '3–4 x 8–12/side' },
        ],
      });
    }
  }

  // Cardio base
  if ((scores.categories.find(c => c.id === 'cardio')?.score || 0) < 70) {
    issues.push('Cardiorespiratory capacity below target');
    addBlock('Aerobic base', ['Build aerobic capacity', 'Improve HR recovery'], EXERCISES.cardioBase);
  }

  // Core/strength (only if we have strength data)
  if (hasStrengthData && (scores.categories.find(c => c.id === 'strength')?.score || 0) < 70) {
    issues.push('Muscular Strength below target');
    addBlock('Strength & core', ['Improve core endurance', 'Build foundational strength'], [...EXERCISES.coreEndurance, ...EXERCISES.strengthBase]);
  }

  // General posture block if alignment OK but habitual posture poor (only if we have movement data)
  if (hasMovementData && (scores.categories.find(c => c.id === 'movementQuality')?.score || 0) < 70 && (scores.categories.find(c => c.id === 'movementQuality')?.score || 0) > 0) {
    blocks.unshift({ title: 'Daily posture hygiene', objectives: ['Reduce prolonged flexion', 'Reinforce neutral alignment'], exercises: EXERCISES.posture });
  }

  // Fallback if no blocks (only if we have data)
  if (hasAnyData && blocks.length === 0) {
    blocks.push({ title: 'Performance maintenance', objectives: ['Maintain strengths', 'Prevent regression'], exercises: EXERCISES.strengthBase });
  }

  // Generate prioritized exercise recommendations
  const prioritizedExercises = prioritizeExercises(form, scores, {
    keyIssues: issues,
    clientScript,
    internalNotes,
    programmingStrategies,
    movementBlocks: blocks,
    segmentalGuidance
  });

  return { 
    keyIssues: issues, 
    clientScript,
    internalNotes,
    programmingStrategies,
    movementBlocks: blocks, 
    segmentalGuidance,
    prioritizedExercises
  };
}

export function generateBodyCompInterpretation(form: FormData, scores?: ScoreSummary): BodyCompInterpretation | null {
  const gender = (form.gender || '').toLowerCase();
  const weight = parseFloat(form.inbodyWeightKg || '0');
  const bf = parseFloat(form.inbodyBodyFatPct || '0');
  const smm = parseFloat(form.skeletalMuscleMassKg || '0');
  const bfm = parseFloat(form.bodyFatMassKg || (weight > 0 && bf > 0 ? ((weight * bf) / 100).toFixed(1) : '0'));
  const visceral = parseFloat(form.visceralFatLevel || '0');
  const whr = parseFloat(form.waistHipRatio || '0');
  let bmr = parseFloat(form.bmrKcal || '0');
  const tbw = parseFloat(form.totalBodyWaterL || '0');
  
  // Check if we have any actual body composition data
  const hasBodyCompData = weight > 0 || bf > 0 || smm > 0 || visceral > 0 || whr > 0 || bmr > 0 || tbw > 0;
  
  if (!hasBodyCompData) {
    return null;
  }

  // Calculate weeks - simplified but aligned with buildRoadmap in scoring.ts
  const isHighBf = gender === 'male' ? bf > 22 : bf > 30;
  const fatLossTargetKg = isHighBf ? Math.max(0, bfm - (gender === 'male' ? weight * 0.18 : weight * 0.25)) : 0;
  const fatLossWeeks = Math.ceil(fatLossTargetKg / 0.5); // 0.5kg/week
  
  const targetSMM = gender === 'male' ? 33 : 24;
  const muscleGainKg = smm > 0 && smm < targetSMM ? targetSMM - smm : 0;
  const muscleWeeks = Math.ceil(muscleGainKg / 0.15); // 0.15kg/week
  
  // Posture/Movement weeks if scores are provided
  let movementWeeks = 0;
  if (form.postureAiResults) {
    movementWeeks = 8;
  } else if (scores) {
    const mScore = scores.categories.find(c => c.id === 'movementQuality')?.score || 0;
    if (mScore > 0 && mScore < 60) movementWeeks = 6;
  }

  const totalWeeks = Math.max(fatLossWeeks, muscleWeeks, movementWeeks, 8); // Minimum 8 week build
  const minWeeks = Math.max(4, totalWeeks - 2);
  const maxWeeks = totalWeeks + 4;

  // Segmental kg
  const armR = parseFloat(form.segmentalArmRightKg || '0');
  const armL = parseFloat(form.segmentalArmLeftKg || '0');
  const legR = parseFloat(form.segmentalLegRightKg || '0');
  const legL = parseFloat(form.segmentalLegLeftKg || '0');
  const trunkKg = parseFloat(form.segmentalTrunkKg || '0');

  // Flags
  const lowSmm = gender === 'male' ? smm > 0 && smm < 33 : gender === 'female' ? smm > 0 && smm < 24 : smm > 0 && smm < 28.5;
  const highBf = gender === 'male' ? bf > 25 : gender === 'female' ? bf > 32 : bf > 28.5;
  const highVisceral = visceral >= 12;
  const borderlineVisceral = visceral >= 10 && visceral <= 11;
  const whrHigh = (gender === 'male' && whr >= 1.0) || (gender === 'female' && whr >= 0.9);
  const whrModerate = (gender === 'male' && whr >= 0.9 && whr < 1.0) || (gender === 'female' && whr >= 0.8 && whr < 0.9);

  // Imbalance %s (kg)
  // |(Left – Right) ÷ Higher value| × 100
  const armHigher = Math.max(armR, armL);
  const legHigher = Math.max(legR, legL);
  const armImbPct = armR > 0 && armL > 0 ? Math.abs(armL - armR) / (armHigher || 1) * 100 : 0;
  const legImbPct = legR > 0 && legL > 0 ? Math.abs(legL - legR) / (legHigher || 1) * 100 : 0;
  const limbImbalanceSerious = armImbPct >= 10 || legImbPct >= 10;
  const limbImbalanceModerate = (!limbImbalanceSerious) && (armImbPct >= 6 || legImbPct >= 6);

  // Fatigue markers (from lifestyle inputs) to pair with VFL for recovery priority
  const poorSleep = ['poor', 'fair'].includes((form.sleepQuality || '').toLowerCase());
  const highStress = ['high', 'very-high'].includes((form.stressLevel || '').toLowerCase());
  const lowHydration = ['poor', 'fair'].includes((form.hydrationHabits || '').toLowerCase());
  const sedentary = parseFloat(form.sedentaryHours || '0') >= 8;
  const recoveryFlags = (highVisceral || borderlineVisceral) && (poorSleep || highStress || lowHydration || sedentary);

  const healthPriority: string[] = [];
  if (highBf || whrHigh || highVisceral) healthPriority.push('Fat-loss priority');
  if (lowSmm) healthPriority.push('Muscle-building priority');
  if (limbImbalanceSerious || limbImbalanceModerate) healthPriority.push('Stability & posture priority');
  if (recoveryFlags) healthPriority.push('Lifestyle recovery priority');

  const trainingFocusPrimary =
    highBf ? 'Fat-loss block (aerobic base + resistance training)'
      : lowSmm ? 'Hypertrophy base (full-body strength)'
      : limbImbalanceSerious ? 'Unilateral strength & corrective control'
      : 'Performance maintenance';

  const trainingSecondary: string[] = [];
  if (limbImbalanceSerious || limbImbalanceModerate) trainingSecondary.push('Additional unilateral volume (weak side first)');

  const corrective: string[] = [];
  if (whrHigh || highVisceral) corrective.push('Zone 2 cardio, breathing drills for recovery');

  const unilateralVolume =
    limbImbalanceSerious ? 'Serious imbalance: +20–30% unilateral volume on weaker limb'
      : limbImbalanceModerate ? 'Moderate imbalance: +10–15% unilateral volume on weaker limb'
      : undefined;

  // Nutrition suggestions (high-level)
  // Use InBody BMR if it looks reasonable; otherwise estimate via Mifflin-St Jeor
  if (bmr < 800 || bmr > 3500) {
    bmr = 0;
  }
  if (!bmr && weight > 0) {
    const heightCm = parseFloat((form as any).heightCm || '0');
    // Estimate age from DOB if available
    let age = 0;
    if ((form as any).dateOfBirth) {
      const dob = new Date((form as any).dateOfBirth);
      if (!Number.isNaN(dob.getTime())) {
        const today = new Date();
        age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      }
    }
    if (!age) age = 30;
    const h = heightCm || (tbw ? (tbw / 0.6) : 0); // very rough fallback if no height
    if (h > 0) {
      const s = gender === 'female' ? -161 : 5;
      bmr = 10 * weight + 6.25 * h - 5 * age + s;
    } else {
      // Last-resort estimate
      bmr = 22 * weight;
    }
  }

  let calorieRange: string | undefined;
  if (bmr) {
    const maintLow = bmr * 1.4;
    const maintHigh = bmr * 1.6;
    if (highBf) {
      const deficitLow = bmr * 1.2;
      const deficitHigh = bmr * 1.35;
      calorieRange = `${Math.round(deficitLow)}–${Math.round(deficitHigh)} kcal/day (fat-loss focus; est. maintenance ${Math.round(maintLow)}–${Math.round(maintHigh)} kcal)`;
    } else {
      const perfLow = bmr * 1.5;
      const perfHigh = bmr * 1.8;
      calorieRange = `${Math.round(perfLow)}–${Math.round(perfHigh)} kcal/day (performance / lean-gain range; est. maintenance ${Math.round(maintLow)}–${Math.round(maintHigh)} kcal)`;
    }
  }
  // Protein from SMM focus: 2.0–2.4 g/kg SMM (client-friendly)
  const proteinTarget = smm ? `${Math.round(smm * 2.0)}–${Math.round(smm * 2.4)} g protein/day (from SMM)` : weight ? `${Math.round(weight * 1.6)}–${Math.round(weight * 2.2)} g protein/day` : undefined;
  const hydration = '2–3 L/day baseline; match sweat losses; add electrolytes if needed';
  const carbTiming = (trainingFocusPrimary.includes('Hypertrophy') || trainingFocusPrimary.includes('Fat-loss'))
    ? 'Prioritize carbs around training; focus protein evenly across meals'
    : undefined;

  // Lifestyle suggestions
  const sleep = 'Aim 7–9h, consistent sleep/wake times';
  const stress = (highVisceral || highStress) ? 'Daily breathwork 5–10 min; walking breaks; reduce late caffeine' : 'Maintain current routines';
  const dailyMovement = '6–10k steps/day target (break up long sitting)';
  const inflammationReduction = (highVisceral || lowHydration) ? 'Reduce alcohol/ultra-processed foods; add omega-3s; emphasize whole foods' : undefined;

  return {
    healthPriority,
    trainingFocus: {
      primary: trainingFocusPrimary,
      secondary: trainingSecondary.length ? trainingSecondary : undefined,
      corrective: corrective.length ? corrective : undefined,
      unilateralVolume,
    },
    nutrition: { calorieRange, proteinTarget, hydration, carbTiming },
    lifestyle: { sleep, stress, dailyMovement, inflammationReduction },
    timeframeWeeks: `${minWeeks}–${maxWeeks} weeks`,
  };
}


