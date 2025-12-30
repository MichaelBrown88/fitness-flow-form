import type { FormData } from '@/contexts/FormContext';
import { type ScoreSummary, buildRoadmap } from './scoring';
import { prioritizeExercises, type ExerciseGroup, type SessionGroup } from './exercisePrioritization';
import { MOVEMENT_LOGIC_DB } from './clinical-data';
import { generateClientWorkout, generateCoachExerciseLists } from './recommendationGenerator';

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
  // New unified workout structure for client
  clientWorkout?: {
    warmUp: Array<{ name: string; setsReps?: string; time?: string; addresses?: string }>;
    exercises: Array<{ name: string; setsReps?: string; notes?: string; addresses?: string; type: string }>;
    finisher?: { name: string; time?: string; setsReps?: string; addresses?: string };
  };
  // New comprehensive exercise guidance for coach
  coachExerciseLists?: {
    priorities: {
      equipment: string;
      focus: string;
      keyIssues: string[];
    };
    byMovementPattern: {
      squat: Array<{ name: string; setsReps?: string; notes?: string; addresses?: string }>;
      hinge: Array<{ name: string; setsReps?: string; notes?: string; addresses?: string }>;
      push: Array<{ name: string; setsReps?: string; notes?: string; addresses?: string }>;
      pull: Array<{ name: string; setsReps?: string; notes?: string; addresses?: string }>;
      lunge: Array<{ name: string; setsReps?: string; notes?: string; addresses?: string }>;
      core: Array<{ name: string; setsReps?: string; notes?: string; addresses?: string }>;
    };
    issueSpecific: {
      postural: Array<{ name: string; setsReps?: string; notes?: string; addresses: string }>;
      mobility: Array<{ name: string; setsReps?: string; notes?: string; addresses: string }>;
      asymmetry: Array<{ name: string; setsReps?: string; notes?: string; addresses: string }>;
    };
    warmUp: Array<{ name: string; setsReps?: string; time?: string; notes?: string; addresses?: string }>;
    cardio: Array<{ name: string; time?: string; notes?: string; addresses?: string }>;
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

export async function generateCoachPlan(form: FormData, scores: ScoreSummary): Promise<CoachPlan> {
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

  const goals = Array.isArray(form.clientGoals) ? form.clientGoals : [];
  const primaryGoalRaw = goals[0] || 'general-health';
  
  // Derive goal ambition level from primary goal's specific level field
  let goalAmbition = 'average';
  if (primaryGoalRaw === 'weight-loss') goalAmbition = form.goalLevelWeightLoss || 'average';
  else if (primaryGoalRaw === 'build-muscle') goalAmbition = form.goalLevelMuscle || 'average';
  else if (primaryGoalRaw === 'build-strength') goalAmbition = form.goalLevelStrength || 'average';
  else if (primaryGoalRaw === 'improve-fitness') goalAmbition = form.goalLevelFitness || 'average';

  const levelText = goalAmbition === 'elite' ? 'elite-level' : goalAmbition === 'above-average' ? 'above-average' : 'foundational';
  
  // Data Extraction for Narrative
  const weight = parseFloat(form.inbodyWeightKg || '0');
  const gender = (form.gender || '').toLowerCase();
  const bf = parseFloat(form.inbodyBodyFatPct || '0');
  const visceral = parseFloat(form.visceralFatLevel || '0');
  const smm = parseFloat(form.skeletalMuscleMassKg || '0');
  const ra = parseFloat(form.segmentalArmRightKg || '0');
  const la = parseFloat(form.segmentalArmLeftKg || '0');
  const rl = parseFloat(form.segmentalLegRightKg || '0');
  const ll = parseFloat(form.segmentalLegLeftKg || '0');
  const trunk = parseFloat(form.segmentalTrunkKg || '0');

  // Posture Findings - consolidated at top to avoid redeclaration
  const headPos = Array.isArray(form.postureHeadOverall) ? form.postureHeadOverall : [form.postureHeadOverall];
  const shoulderPos = Array.isArray(form.postureShouldersOverall) ? form.postureShouldersOverall : [form.postureShouldersOverall];
  const backPos = Array.isArray(form.postureBackOverall) ? form.postureBackOverall : [form.postureBackOverall];
  const hipPos = Array.isArray(form.postureHipsOverall) ? form.postureHipsOverall : [form.postureHipsOverall];
  const kneePos = Array.isArray(form.postureKneesOverall) ? form.postureKneesOverall : [form.postureKneesOverall];

  // Asymmetry detection
  const armDiff = (ra > 0 && la > 0) ? Math.abs(ra - la) / Math.max(ra, la) : 0;
  const legDiff = (rl > 0 && ll > 0) ? Math.abs(rl - ll) / Math.max(rl, la) : 0;

  // Format goal for natural language use
  const goalInSentence = goals.length > 0 
    ? goals.map(g => g.replace('-', ' ')).join(' and ')
    : 'health and longevity';

  // --- 1. FINDINGS (The "What") ---
  
  // Body Comp Findings
  if (bf > (gender === 'male' ? 25 : 32)) {
    clientScript.findings.push(`Your current body fat percentage is above the optimal range for health, which acts as a "metabolic drag" on your energy.`);
  } else if (bf > 0) {
    clientScript.findings.push(`Your body composition is in a healthy range, giving us a great "clean slate" to focus on performance.`);
  }

  if (armDiff > 0.1 || legDiff > 0.1) {
    const limb = armDiff > 0.1 ? 'arms' : 'legs';
    clientScript.findings.push(`The InBody scan identified a noticeable muscle imbalance between your ${limb} (${(Math.max(armDiff, legDiff) * 100).toFixed(0)}% difference).`);
  }

  if (smm > 0 && smm < (gender === 'male' ? 30 : 22)) {
    clientScript.findings.push(`Your total skeletal muscle mass is currently lower than ideal, which means your "engine" isn't as powerful as it could be yet.`);
  }

  // Movement Findings
  if (headPos.includes('forward-head') || shoulderPos.includes('rounded')) {
    clientScript.findings.push(`We've identified some "Upper Crossed" patterns—meaning tight chest/neck muscles are pulling your alignment out of its power position.`);
  }

  if (form.ohsKneeAlignment === 'valgus' || form.lungeLeftKneeAlignment === 'valgus' || form.lungeRightKneeAlignment === 'valgus') {
    clientScript.findings.push(`Your knees show a tendency to "cave in" during movement, which is a common "energy leak" that can lead to joint strain over time.`);
  }

  // --- 2. WHY IT MATTERS (The "So What") ---
  
  if (armDiff > 0.1 || legDiff > 0.1) {
    clientScript.whyItMatters.push(`Limb imbalances mean one side is doing more work than the other. This eventually causes "overuse" issues on the strong side and "underuse" issues on the weak side.`);
  }

  if (goals.includes('build-muscle') || goals.includes('build-strength')) {
    clientScript.whyItMatters.push(`Fixing your alignment isn't just about posture—it's about "lever efficiency." Better alignment means you can lift more weight with less risk.`);
  }

  if (visceral >= 12) {
    clientScript.whyItMatters.push(`Your internal (visceral) fat level is high enough that it's likely impacting your recovery and systemic inflammation levels.`);
  }

  // --- 3. ACTION PLAN (The "How") ---
  
  if (armDiff > 0.1 || legDiff > 0.1) {
    clientScript.actionPlan.push(`Swap some barbell work for dumbbells: This forces your weaker side to carry its own weight and catch up to the strong side.`);
  }

  if (goals.includes('weight-loss')) {
    clientScript.actionPlan.push(`Prioritize "Metabolic Resistance": We'll use compound movements with shorter rest periods to keep your heart rate elevated while building muscle.`);
  }

  if (headPos.includes('forward-head') || shoulderPos.includes('rounded')) {
    clientScript.actionPlan.push(`"Open the chest": Every session will start with specific stretches to release the tight muscles pulling you forward.`);
  }

  clientScript.actionPlan.push(`Progressive Overload: We'll systematically increase your training volume as your movement quality earns the right to more weight.`);

  // --- 4. 3-MONTH OUTLOOK ---
  clientScript.threeMonthOutlook.push(`Weeks 1-4: You'll feel "tighter" and more controlled in your movement, and your energy levels will stabilize.`);
  clientScript.threeMonthOutlook.push(`Weeks 5-12: This is where we see the "compounding effect"—visible changes in body shape and a significant jump in your strength numbers.`);

  // --- 5. CLIENT COMMITMENT ---
  clientScript.clientCommitment.push(`Training Consistency: Hit your target session frequency week-in, week-out.`);
  clientScript.clientCommitment.push(`Habit Anchors: Focus on 7-9 hours of sleep to ensure the work we do in the gym actually sticks.`);
  clientScript.clientCommitment.push(`Open Feedback: Tell me when something feels "off" or "too easy"—it's how we fine-tune your path.`);

  const programmingStrategies: CoachPlan['programmingStrategies'] = [];

  // Goal-based strategies - enhanced with narrative and goal levels
  if (primaryGoalRaw === 'weight-loss') {
    programmingStrategies.push({
      title: 'Metabolic Resilience & Fat Loss',
      strategy: `To achieve your ${levelText} weight loss goal, we will utilize metabolic density training. This means keeping your heart rate elevated while focusing on fat-burning "anchors" like Zone 2 steady-state and high-intensity circuits.`,
      exercises: ['Goblet Squats', 'Kettlebell Swings', 'Push-ups', 'TRX Rows']
    });
  } else if (primaryGoalRaw === 'build-muscle' || primaryGoalRaw === 'build-strength') {
    programmingStrategies.push({
      title: 'Structural Hypertrophy & Power',
      strategy: `Your ${levelText} ambition for ${primaryGoalRaw.replace('-', ' ')} requires a focus on structural hypertrophy. We will prioritize compound lifts with progressive overload, ensuring every session moves you closer to your target lean mass distribution.`,
      exercises: ['Back Squats', 'Bench Press', 'Deadlifts', 'Overhead Press']
    });
  } else if (primaryGoalRaw === 'improve-fitness') {
    programmingStrategies.push({
      title: 'Aerobic Power & Cardiovascular Capacity',
      strategy: `Reaching your ${levelText} fitness threshold means building a robust aerobic engine. We'll combine Zone 2 base building with targeted VO2 max intervals to ensure you recover faster and can handle higher training densities.`,
      exercises: ['Interval Sprints', 'Tempo Runs', 'Rowing Intervals', 'Assault Bike']
    });
  } else if (primaryGoalRaw === 'general-health') {
    programmingStrategies.push({
      title: 'Functional Longevity & Vitality',
      strategy: `Our strategy for your ${levelText} health goal is focused on full-body vitality. We'll blend strength, cardiovascular capacity, and movement quality to ensure you feel as good as you look, supporting a high quality of life.`,
      exercises: ['Carry Variations', 'Bodyweight Squats', 'Bird-Dogs', 'Walking']
    });
  }

  // 1. Gather Findings and Internal Notes
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

  // --- STORYTELLING ENGINE: CLIENT SCRIPT ---
  
  // 1. Findings (The Plot)
  if (hasBodyCompData && (bf > (gender === 'male' ? 22 : 30) || visceral >= 10)) {
    clientScript.findings.push(`Your body composition analysis reveals that while you have a solid foundation, your current metabolic markers are creating a "resistance" to your ${goalInSentence} progress.`);
  }
  
  if (smm > 0 && smm < (gender === 'male' ? 33 : 24)) {
    clientScript.findings.push(`We've identified that your skeletal muscle mass is currently a limiting factor for your ${goalInSentence} goals—we need to build the "engine" to support your ambitions.`);
  }

  if (hasMovementData && movementScore < 70) {
    clientScript.findings.push(`Our movement screen found some specific restrictions that act like "speed bumps" on your journey, potentially leading to plateaus or discomfort if not addressed.`);
  } else if (hasMovementData && movementScore >= 70) {
    clientScript.findings.push(`You have strong movement integrity, which gives us a massive "green light" to pursue your ${goalInSentence} goals with higher intensity sooner.`);
  }

  // 2. Why It Matters (The Stakes)
  clientScript.whyItMatters.push(`By addressing these foundational pillars simultaneously with your ${goalInSentence} work, we aren't just getting you results—we're making sure they are permanent and that you stay injury-free.`);
  clientScript.whyItMatters.push(`Think of it this way: fixing your movement and metabolic health is like tuning the engine and aligning the tires so you can finally put the pedal down on your ${goalInSentence} training.`);

  // 3. Action Plan (The Strategy)
  clientScript.actionPlan.push(`Our immediate priority is to "clear the path" by integrating 5-10 minutes of targeted movement prep into every session. This isn't "physio"—it's performance tuning.`);
  clientScript.actionPlan.push(`Your main training blocks will be 100% focused on your goal of ${primaryGoalRaw.replace('-', ' ')}, but we'll choose specific exercise variations (like unilateral work) that solve your issues while you build muscle and strength.`);

  // 4. Outlook (The Future)
  if (hasAnyData) {
    clientScript.threeMonthOutlook.push(`Over the next ${totalWeeks} weeks, we expect to see a profound transformation in how your body moves and how much energy you have.`);
    clientScript.threeMonthOutlook.push(`By month 3, the movement patterns that feel challenging now will be automatic, allowing us to utilize progressive overload to truly drive your ${goalInSentence} results.`);
  }

  // 5. Commitment
  clientScript.clientCommitment.push(`Trust the foundation: the small "pre-hab" wins in the first 4 weeks are what unlock the massive ${goalInSentence} wins in months 2 and 3.`);
  clientScript.clientCommitment.push("Consistency: hitting your session targets is the single biggest predictor of our success.");


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

  // Posture/alignment issues - Using deterministic Movement Logic DB
  const movementFindings = new Set<string>();
  
  // 1. Head/Neck -> Upper Crossed
  if (headPos.includes('forward-head')) movementFindings.add('upper_crossed');
  
  // 2. Shoulders -> Upper Crossed
  if (shoulderPos.includes('rounded')) movementFindings.add('upper_crossed');
  
  // 3. Back -> Kyphosis (Upper) or Lordosis (Lower)
  if (backPos.includes('increased-kyphosis')) movementFindings.add('upper_crossed');
  if (backPos.includes('increased-lordosis')) movementFindings.add('lower_crossed');
  if (backPos.includes('flat-back')) movementFindings.add('posterior_pelvic_tilt');
  
  // 4. Hips -> APT (Lower) or PPT (Flat)
  if (hipPos.includes('anterior-tilt')) movementFindings.add('lower_crossed');
  if (hipPos.includes('posterior-tilt')) movementFindings.add('posterior_pelvic_tilt');
  
  // 5. Knees -> Valgus
  if (kneePos.includes('valgus-knee') || form.ohsKneeAlignment === 'valgus' || form.lungeLeftKneeAlignment === 'valgus' || form.lungeRightKneeAlignment === 'valgus') {
    movementFindings.add('knee_valgus');
  }
  
  // 6. Feet -> Pronation
  if (form.ohsFeetPosition === 'pronation') movementFindings.add('feet_pronation');

  // Map findings to clinical blocks
  movementFindings.forEach(id => {
    const deviation = MOVEMENT_LOGIC_DB[id];
    if (deviation) {
      issues.push(deviation.name);
      addBlock(
        `Correction: ${deviation.name}`, 
        [`Stretch: ${deviation.primaryStretch}`, `Activate: ${deviation.primaryActivation}`], 
        [
          { name: deviation.primaryStretch, setsReps: '2-3 x 30-45s', notes: `Target: ${deviation.overactiveMuscles.join(', ')}` },
          { name: deviation.primaryActivation, setsReps: '2-3 x 12-15', notes: `Target: ${deviation.underactiveMuscles.join(', ')}` }
        ]
      );
      
      // Add contraindications to internal notes
      deviation.contraindications.forEach(c => {
        internalNotes.needsAttention.push(`Contraindication: Avoid ${c} due to ${deviation.name}.`);
      });
    }
  });

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
  
  // Safety check: Abnormal Heart Rate Recovery (HRR < 12bpm)
  const peakHr = parseFloat(form.cardioPeakHr || '0');
  const recoveryHr = parseFloat(form.cardioPost1MinHr || '0');
  if (peakHr > 0 && recoveryHr > 0) {
    const hrr = peakHr - recoveryHr;
    if (hrr < 12) {
      issues.push('Abnormal Heart Rate Recovery (<12bpm drop)');
      clientScript.findings.push(`Heart rate recovery is slow (${Math.round(hrr)}bpm drop). This may indicate cardiovascular concerns.`);
      clientScript.whyItMatters.push('Slow heart rate recovery can be a sign of poor cardiovascular fitness or underlying health issues. It\'s important to address this with medical guidance.');
      clientScript.actionPlan.push('Consult physician if recovery consistently remains below 12bpm. Focus on low-intensity aerobic base building under medical supervision.');
    }
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

  // Generate prioritized exercise recommendations (legacy system for backward compatibility)
  const prioritizedExercises = prioritizeExercises(form, scores, {
    keyIssues: issues,
    clientScript,
    internalNotes,
    programmingStrategies,
    movementBlocks: blocks,
    segmentalGuidance
  });

  // Generate new unified workout for client (dynamic import happens inside)
  const [clientWorkout, coachExerciseLists] = await Promise.all([
    generateClientWorkout(form, scores),
    generateCoachExerciseLists(form, scores)
  ]);

  return { 
    keyIssues: issues, 
    clientScript,
    internalNotes,
    programmingStrategies,
    movementBlocks: blocks, 
    segmentalGuidance,
    prioritizedExercises,
    clientWorkout,
    coachExerciseLists
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
    const heightCm = parseFloat(form.heightCm || '0');
    // Estimate age from DOB if available
    let age = 0;
    if (form.dateOfBirth) {
      const dob = new Date(form.dateOfBirth);
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


