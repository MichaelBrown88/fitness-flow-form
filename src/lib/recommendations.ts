import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from './scoring';

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
  // --- Initialization ---
  const issues: string[] = [];
  const blocks: CoachPlan['movementBlocks'] = [];
  const segmentalGuidance: string[] = [];
  const programmingStrategies: CoachPlan['programmingStrategies'] = [];
  
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

  // Pre-fetch all category data to avoid TDZ (Temporal Dead Zone) issues
  const bodyCompCategory = scores.categories.find(c => c.id === 'bodyComp');
  const cardioCategory = scores.categories.find(c => c.id === 'cardio');
  const strengthCategory = scores.categories.find(c => c.id === 'strength');
  const movementCategory = scores.categories.find(c => c.id === 'movementQuality');
  const lifestyleCategory = scores.categories.find(c => c.id === 'lifestyle');
  const postureCategory = scores.categories.find(c => c.id === 'posture');

  const bodyCompScore = bodyCompCategory?.score || 0;
  const cardioScore = cardioCategory?.score || 0;
  const strengthScore = strengthCategory?.score || 0;
  const movementScore = movementCategory?.score || 0;
  const lifestyleScore = lifestyleCategory?.score || 0;
  const postureScore = postureCategory?.score || 0;

  // --- Goal Processing ---
  const clientGoals = Array.isArray(form.clientGoals) ? form.clientGoals : [];
  const primaryGoalRaw = (clientGoals.length > 0) ? clientGoals[0] : 'general-health';
  const primaryGoalLabel = primaryGoalRaw.replace('-', ' ');
  
  const ambitionLevel = primaryGoalRaw === 'weight-loss' ? form.goalLevelWeightLoss :
                        primaryGoalRaw === 'build-muscle' ? form.goalLevelMuscle :
                        primaryGoalRaw === 'build-strength' ? form.goalLevelStrength :
                        primaryGoalRaw === 'improve-fitness' ? form.goalLevelFitness : 
                        primaryGoalRaw === 'general-health' ? form.goalLevelHealth : '';
  
  const ambitionLabel = ambitionLevel === 'health-minimum' ? 'foundational' :
                        ambitionLevel === 'average' ? 'moderate' :
                        ambitionLevel === 'above-average' ? 'aggressive' :
                        ambitionLevel === 'elite' ? 'elite' : 'standard';

  // --- 1. Gather Metrics ---
  const gender = (form.gender || '').toLowerCase();
  const bf = parseFloat(form.inbodyBodyFatPct || '0');
  const visceral = parseFloat(form.visceralFatLevel || '0');
  const smm = parseFloat(form.skeletalMuscleMassKg || '0');

  // --- 2. Build Programming Strategies ---
  if (primaryGoalRaw === 'weight-loss') {
    programmingStrategies.push({
      title: 'Metabolic Density & EPOC',
      strategy: `Since your body fat is at ${bf}%, we'll focus on high-density circuits. This increases your 'afterburn' (EPOC), keeping your metabolic rate elevated for hours after you leave the studio.`,
      exercises: ['Goblet Squats', 'Kettlebell Swings', 'Push-ups', 'TRX Rows']
    });
  } else if (primaryGoalRaw === 'build-muscle' || primaryGoalRaw === 'build-strength') {
    const smmTarget = gender === 'male' ? 35 : 26;
    const smmDiff = Math.max(0, smmTarget - smm);
    programmingStrategies.push({
      title: 'Mechanical Tension & Hypertrophy',
      strategy: `To reach your target of adding ~${smmDiff.toFixed(1)}kg of lean mass, we will focus on maximizing mechanical tension through compound lifts in the 8-12 rep range with 2-minute rest periods.`,
      exercises: ['Back Squats', 'Bench Press', 'Deadlifts', 'Overhead Press']
    });
  } else if (primaryGoalRaw === 'improve-fitness') {
    programmingStrategies.push({
      title: 'V02 Max & Aerobic Power',
      strategy: `With a recovery heart rate of ${form.cardioPost1MinHr}bpm, we'll use a mix of Zone 2 steady-state to build the base and high-intensity intervals to push your aerobic ceiling.`,
      exercises: ['Interval Sprints', 'Tempo Runs', 'Rowing Intervals', 'Assault Bike']
    });
  } else if (primaryGoalRaw === 'general-health') {
    programmingStrategies.push({
      title: 'Functional Longevity & Movement',
      strategy: `Your assessment scores suggest a focus on balancing all 5 physical pillars. We'll use multi-planar movements to ensure you're strong and capable for anything life throws at you.`,
      exercises: ['Carry Variations', 'Bodyweight Squats', 'Bird-Dogs', 'Walking']
    });
  }

  // --- 3. Findings & Why It Matters ---
  if (bodyCompScore > 75) internalNotes.doingWell.push("Healthy metabolic foundation and body composition markers.");
  if (movementScore > 75) internalNotes.doingWell.push("Excellent movement integrity and joint mobility baseline.");
  if (lifestyleScore > 80) internalNotes.doingWell.push("Highly supportive recovery habits (sleep/hydration).");
  if (strengthScore > 70) internalNotes.doingWell.push("Solid foundational strength base—ready for performance loading.");
  if (cardioScore > 70) internalNotes.doingWell.push("Strong cardiovascular base for recovery and session density.");
  if (internalNotes.doingWell.length === 0) internalNotes.doingWell.push("Willingness to undergo a comprehensive assessment.");

  if (bodyCompScore < 60) {
    const bfDiff = bf - (gender === 'male' ? 20 : 28);
    clientScript.findings.push(`Your body composition markers (Score: ${bodyCompScore}) indicate your metabolic 'engine' is working harder than it needs to. With body fat at ${bf}%, we have a clear opportunity to improve efficiency.`);
    clientScript.whyItMatters.push(`By bringing this into a healthier range, you'll see a massive increase in day-to-day energy and your ${primaryGoalLabel} results will become visible much sooner.`);
    internalNotes.needsAttention.push(`Body fat (${bf}%) is a metabolic bottleneck for ${primaryGoalLabel}. Target reduction: ~${bfDiff.toFixed(1)}% for initial phase.`);
  }

  if (cardioScore < 55) {
    clientScript.findings.push(`Your cardiovascular recovery (Score: ${cardioScore}) is currently a limiting factor for your training density.`);
    clientScript.whyItMatters.push(`Building this aerobic base is like 'upgrading your battery'—your heart rate recovery (${form.cardioPost1MinHr}bpm) shows we can make you recover faster between sets.`);
    internalNotes.needsAttention.push(`Low aerobic base (${cardioScore}/100) limits recovery between sessions and sets. Resting HR: ${form.cardioRestingHr}bpm.`);
  }

  if (movementScore < 65) {
    const weaknesses = movementCategory?.weaknesses?.join(', ') || 'joint restrictions';
    clientScript.findings.push(`We found some movement 'brakes'—specifically in ${weaknesses}—that are currently restricting your power output.`);
    clientScript.whyItMatters.push(`Unlocking these areas will make your ${primaryGoalLabel} training feel smoother and significantly reduce your injury risk as we start adding more weight to the bar.`);
    internalNotes.needsAttention.push(`Movement restrictions (${weaknesses}) will hinder loading in ${primaryGoalLabel} movements.`);
  }

  if (strengthScore < 50) {
    clientScript.findings.push(`Your foundational strength endurance (Score: ${strengthScore}) is the priority for our first block.`);
    clientScript.whyItMatters.push(`This is the literal 'support structure' for your ${primaryGoalLabel}. We need to build this stability first to ensure your long-term progress has a high ceiling.`);
    internalNotes.needsAttention.push(`Low foundational strength (${strengthScore}/100) requires a stability-first approach before maximal loading.`);
  }

  if (lifestyleScore < 65) {
    const sleepDur = parseFloat(form.sleepDuration || '0') || 0;
    const lIssues = [];
    if (sleepDur < 7) lIssues.push(`short sleep (${form.sleepDuration}h)`);
    if (lifestyleScore < 50) lIssues.push('recovery habits');
    clientScript.findings.push(`Your lifestyle recovery markers (Score: ${lifestyleScore}) are currently out of sync with your training goals.`);
    clientScript.whyItMatters.push(`Training is just the stimulus—results actually happen while you sleep. Tightening up these habits will effectively double the results you get from our sessions.`);
    internalNotes.needsAttention.push(`Lifestyle factors (${lIssues.join(', ') || 'general recovery'}) are limiting total adaptation capacity.`);
  }

  // --- 4. Action Plan & Outlook ---
  clientScript.actionPlan.push(`To directly support your ${ambitionLabel} goal of ${primaryGoalLabel}, we're going to build your program around three main pillars.`);

  if (movementScore < 65 || form.postureBackOverall !== 'neutral') {
    clientScript.actionPlan.push(`We'll include 5-10 minutes of 'pre-hab' in every session to unlock movement 'brakes' so they don't hold back your ${primaryGoalLabel} progress.`);
  }

  clientScript.threeMonthOutlook.push(`In 90 days, the main thing you'll notice is a significant shift in your ${primaryGoalLabel}.`);
  if (ambitionLevel === 'above-average' || ambitionLevel === 'elite') {
    clientScript.threeMonthOutlook.push(`Given your ambitious target, we will maintain high training density to ensure you're on track for your 90-day milestone.`);
  }
  clientScript.threeMonthOutlook.push("Beyond that, you'll feel 'tighter' in your movement, have more 'engine' in your workouts, and feel more confident under load.");
  
  clientScript.clientCommitment.push("Consistency: Hit our agreed session frequency every week.");
  if (lifestyleScore < 75) clientScript.clientCommitment.push("Recovery: Prioritize the sleep and hydration targets we discussed to support training adaptation.");
  if (bodyCompScore < 65) clientScript.clientCommitment.push("Nutrition: Maintain the nutritional consistency required to shift your metabolic baseline.");
  clientScript.clientCommitment.push("Communication: Provide honest feedback on recovery and session intensity.");

  if (lifestyleScore < 65) internalNotes.needsAttention.push("Lifestyle habits (sleep/stress) are a major recovery bottleneck.");
  if (strengthScore < 55) internalNotes.needsAttention.push("Lack of foundational strength—prioritize stability and control over absolute load.");
  if (cardioScore < 55) internalNotes.needsAttention.push("Low cardiovascular base—will limit session density and total work capacity.");
  if (movementScore < 65) internalNotes.needsAttention.push("Joint mobility/movement restrictions—require consistent 'pre-hab' integration.");
  if (bodyCompScore < 65) internalNotes.needsAttention.push("Elevated metabolic markers—nutritional consistency is as important as the training.");
  
  if (internalNotes.needsAttention.length === 0) internalNotes.needsAttention.push("No major foundational bottlenecks identified; focus on performance progression.");

  // --- 5. Movement Blocks ---
  const w = parseFloat(form.inbodyWeightKg || '0');
  const h = (parseFloat(form.heightCm || '0') || 0) / 100;
  const healthyMax = h > 0 ? 25 * h * h : 0;

  if (movementScore < 65) {
    programmingStrategies.push({
      title: 'Movement Integration',
      strategy: 'Incorporate corrective drills as "fillers" between main sets to address restrictions without extending session length.',
      exercises: ['90/90 Hip Switches', 'Thoracic Extensions', 'Ankle Mobilizations']
    });
  }

  if (cardioScore < 50) {
    programmingStrategies.push({
      title: 'Aerobic Anchors',
      strategy: 'Low-intensity steady state work at the end of sessions to build recovery capacity without adding significant systemic fatigue.',
      exercises: ['Walking (Incline)', 'Assault Bike (Easy)', 'Rowing (Zone 2)']
    });
  }

  if ((gender === 'male' && bf > 25) || (gender === 'female' && bf > 32) || (healthyMax > 0 && w > healthyMax + 3) || visceral >= 12) {
    issues.push('Metabolic health priority');
    blocks.push({ title: 'Aerobic base for metabolic health', objectives: ['Improve HR recovery', 'Increase daily metabolic demand'], exercises: EXERCISES.cardioBase });
  }

  const addBlock = (title: string, objectives: string[], exercises: typeof EXERCISES[keyof typeof EXERCISES]) => {
    if (!blocks.find(b => b.title === title)) {
      blocks.push({ title, objectives, exercises });
    }
  };

  clientGoals.forEach((g) => {
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

  if (movementScore < 65) {
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
        exercises: [{ name: '1‑arm row', setsReps: '3–4 x 8–12/side' }, { name: 'Single‑arm DB press', setsReps: '3–4 x 8–12/side' }],
      });
    }
  }
  if (legL > 0 || legR > 0) {
    segmentalGuidance.push(msgFor('Legs', legImb));
    if (legImb >= 10) {
      blocks.push({
        title: 'Unilateral correction — legs',
        objectives: ['Reduce asymmetry', 'Improve single‑leg stability'],
        exercises: [{ name: 'Split squat', setsReps: '3–4 x 8–12/side' }, { name: 'Step‑up', setsReps: '3–4 x 8–12/side' }],
      });
    }
  }

  if (cardioScore < 70) {
    issues.push('Cardiorespiratory capacity below target');
    addBlock('Aerobic base', ['Build aerobic capacity', 'Improve HR recovery'], EXERCISES.cardioBase);
  }
  if (strengthScore < 70) {
    issues.push('Strength & endurance below target');
    addBlock('Strength & core', ['Improve core endurance', 'Build foundational strength'], [...EXERCISES.coreEndurance, ...EXERCISES.strengthBase]);
  }
  if (postureScore < 70) {
    blocks.unshift({ title: 'Daily posture hygiene', objectives: ['Reduce prolonged flexion', 'Reinforce neutral alignment'], exercises: EXERCISES.posture });
  }
  if (blocks.length === 0) {
    blocks.push({ title: 'Performance maintenance', objectives: ['Maintain strengths', 'Prevent regression'], exercises: EXERCISES.strengthBase });
  }

  return { keyIssues: issues, clientScript, internalNotes, programmingStrategies, movementBlocks: blocks, segmentalGuidance };
}

export function generateBodyCompInterpretation(form: FormData): BodyCompInterpretation {
  const gender = (form.gender || '').toLowerCase();
  const weight = parseFloat(form.inbodyWeightKg || '0');
  const bf = parseFloat(form.inbodyBodyFatPct || '0');
  const smm = parseFloat(form.skeletalMuscleMassKg || '0');
  const bfm = parseFloat(form.bodyFatMassKg || (weight > 0 && bf > 0 ? ((weight * bf) / 100).toFixed(1) : '0'));
  const visceral = parseFloat(form.visceralFatLevel || '0');
  const whr = parseFloat(form.waistHipRatio || '0');
  let bmr = parseFloat(form.bmrKcal || '0');
  const tbw = parseFloat(form.totalBodyWaterL || '0');

  const armR = parseFloat(form.segmentalArmRightKg || '0');
  const armL = parseFloat(form.segmentalArmLeftKg || '0');
  const legR = parseFloat(form.segmentalLegRightKg || '0');
  const legL = parseFloat(form.segmentalLegLeftKg || '0');

  const lowSmm = gender === 'male' ? smm > 0 && smm < 33 : gender === 'female' ? smm > 0 && smm < 24 : smm > 0 && smm < 28.5;
  const highBf = gender === 'male' ? bf > 25 : gender === 'female' ? bf > 32 : bf > 28.5;
  const highVisceral = visceral >= 12;
  const borderlineVisceral = visceral >= 10 && visceral <= 11;
  const whrHigh = (gender === 'male' && whr >= 1.0) || (gender === 'female' && whr >= 0.9);

  const armHigher = Math.max(armR, armL);
  const legHigher = Math.max(legR, legL);
  const armImbPct = armR > 0 && armL > 0 ? Math.abs(armL - armR) / (armHigher || 1) * 100 : 0;
  const legImbPct = legR > 0 && legL > 0 ? Math.abs(legL - legR) / (legHigher || 1) * 100 : 0;
  const limbImbalanceSerious = armImbPct >= 10 || legImbPct >= 10;
  const limbImbalanceModerate = (!limbImbalanceSerious) && (armImbPct >= 6 || legImbPct >= 6);

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

  const trainingFocusPrimary = highBf ? 'Fat-loss block (aerobic base + resistance training)' : lowSmm ? 'Hypertrophy base (full-body strength)' : limbImbalanceSerious ? 'Unilateral strength & corrective control' : 'Performance maintenance';
  const trainingSecondary: string[] = [];
  if (limbImbalanceSerious || limbImbalanceModerate) trainingSecondary.push('Additional unilateral volume (weak side first)');
  const corrective: string[] = [];
  if (whrHigh || highVisceral) corrective.push('Zone 2 cardio, breathing drills for recovery');
  const unilateralVolume = limbImbalanceSerious ? 'Serious imbalance: +20–30% unilateral volume on weaker limb' : limbImbalanceModerate ? 'Moderate imbalance: +10–15% unilateral volume on weaker limb' : undefined;

  if (bmr < 800 || bmr > 3500) bmr = 0;
  if (!bmr && weight > 0) {
    const heightCm = parseFloat((form as any).heightCm || '0');
    let age = 30;
    if ((form as any).dateOfBirth) {
      const dob = new Date((form as any).dateOfBirth);
      if (!Number.isNaN(dob.getTime())) {
        const today = new Date();
        age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      }
    }
    const hVal = heightCm || (tbw ? (tbw / 0.6) : 0);
    if (hVal > 0) bmr = 10 * weight + 6.25 * hVal - 5 * age + (gender === 'female' ? -161 : 5);
    else bmr = 22 * weight;
  }

  let calorieRange: string | undefined;
  if (bmr) {
    const activityLevel = (form.activityLevel || 'moderately-active').toLowerCase();
    const factor = activityLevel === 'sedentary' ? 1.2 : activityLevel === 'lightly-active' ? 1.375 : activityLevel === 'moderately-active' ? 1.55 : activityLevel === 'very-active' ? 1.725 : 1.9;
    const maint = bmr * factor;
    const clientGoals = Array.isArray(form.clientGoals) ? form.clientGoals : [];
    const pGoal = clientGoals[0] || 'general-health';
    if (highBf || pGoal === 'weight-loss') {
      const deficit = maint * 0.8;
      calorieRange = `${Math.round(deficit - 100)}–${Math.round(deficit + 100)} kcal/day (fat-loss focus; est. maintenance ${Math.round(maint)} kcal)`;
    } else if (pGoal === 'build-muscle') {
      const surplus = maint * 1.1;
      calorieRange = `${Math.round(surplus - 100)}–${Math.round(surplus + 100)} kcal/day (muscle-gain focus; est. maintenance ${Math.round(maint)} kcal)`;
    } else calorieRange = `${Math.round(maint - 100)}–${Math.round(maint + 100)} kcal/day (performance / maintenance range)`;
  }
  const proteinTarget = weight ? `${Math.round(weight * 1.8)}–${Math.round(weight * 2.2)} g protein/day` : undefined;
  const hydration = '2–3 L/day baseline; match sweat losses; add electrolytes if needed';
  const carbTiming = (trainingFocusPrimary.includes('Hypertrophy') || trainingFocusPrimary.includes('Fat-loss')) ? 'Prioritize carbs around training; focus protein evenly across meals' : undefined;
  const sleep = 'Aim 7–9h, consistent sleep/wake times';
  const stress = (highVisceral || highStress) ? 'Daily breathwork 5–10 min; walking breaks; reduce late caffeine' : 'Maintain current routines';
  const dailyMovement = '6–10k steps/day target (break up long sitting)';
  const inflammationReduction = (highVisceral || lowHydration) ? 'Reduce alcohol/ultra-processed foods; add omega-3s; emphasize whole foods' : undefined;

  const fatLossTargetKg = highBf ? Math.max(0, bfm - (gender === 'male' ? weight * 0.18 : weight * 0.25)) : 0;
  const fatWeeks = fatLossTargetKg > 0 ? fatLossTargetKg / 0.4 : 0;
  const muscleGainNeedKg = lowSmm ? ((gender === 'male' ? 33 : 24) - smm) : 0;
  const muscleWeeks = muscleGainNeedKg > 0 ? muscleGainNeedKg / 0.15 : 0;
  const riskAdd = highVisceral ? 3 : whrHigh ? 2 : borderlineVisceral ? 1 : 0;
  const minWeeks = Math.round(Math.max(4, Math.min(12, Math.max(fatWeeks, muscleWeeks) * 0.6)) + riskAdd);
  const maxWeeks = Math.round(Math.max(8, Math.min(28, Math.max(fatWeeks, muscleWeeks) * 1.2)) + riskAdd);

  return { healthPriority, trainingFocus: { primary: trainingFocusPrimary, secondary: trainingSecondary.length ? trainingSecondary : undefined, corrective: corrective.length ? corrective : undefined, unilateralVolume }, nutrition: { calorieRange, proteinTarget, hydration, carbTiming }, lifestyle: { sleep, stress, dailyMovement, inflammationReduction }, timeframeWeeks: `${minWeeks}–${maxWeeks} weeks` };
}
