import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary, RoadmapPhase } from '@/lib/scoring';
import type { BodyCompInterpretation } from '@/lib/recommendations';

/**
 * Generates a standalone HTML file with all interactivity preserved
 * This can be downloaded and opened in any browser offline
 * Includes the ENTIRE report with all sections
 */
export async function generateInteractiveHtml(params: {
  formData: FormData;
  scores: ScoreSummary;
  roadmap: RoadmapPhase[];
  bodyComp?: BodyCompInterpretation;
  view: 'client' | 'coach';
}): Promise<Blob> {
  const { formData, scores, roadmap, bodyComp, view } = params;
  
  // Pre-calculate all derived values that the report needs
  const goals = Array.isArray(formData.clientGoals) ? formData.clientGoals : [];
  const orderedCats = ['bodyComp','strength','cardio','movementQuality','lifestyle']
    .map(id => scores.categories.find(c => c.id === id))
    .filter(Boolean);
  
  // Calculate focus areas and strengths
  const focusAreas = orderedCats.flatMap(cat => 
    (cat?.weaknesses || []).map(w => {
      const label = cat?.id === 'bodyComp' ? 'Body Composition' :
                   cat?.id === 'strength' ? 'Muscular Strength' :
                   cat?.id === 'cardio' ? 'Metabolic Fitness' :
                   cat?.id === 'movementQuality' ? 'Movement Quality' :
                   cat?.id === 'lifestyle' ? 'Lifestyle Factors' : cat?.id || '';
      return `${label}: ${w}`;
    })
  );
  const strengths = orderedCats.flatMap(cat => 
    (cat?.strengths || []).map(s => {
      const label = cat?.id === 'bodyComp' ? 'Body Composition' :
                   cat?.id === 'strength' ? 'Muscular Strength' :
                   cat?.id === 'cardio' ? 'Metabolic Fitness' :
                   cat?.id === 'movementQuality' ? 'Movement Quality' :
                   cat?.id === 'lifestyle' ? 'Lifestyle Factors' : cat?.id || '';
      return `${label}: ${s}`;
    })
  );
  
  // Calculate priority focus
  const priorityFocus: string[] = [];
  const gender = (formData?.gender || '').toLowerCase();
  const bf = parseFloat(formData?.inbodyBodyFatPct || '0');
  const visceral = parseFloat(formData?.visceralFatLevel || '0');
  const h = (parseFloat(formData?.heightCm || '0') || 0) / 100;
  const w = parseFloat(formData?.inbodyWeightKg || '0');
  const healthyMax = h > 0 ? 25 * h * h : 0;
  if (healthyMax > 0 && w > healthyMax + 3) {
    priorityFocus.push('Body composition (urgent): reduce health risk safely');
  }
  if ((gender === 'male' && bf > 25) || (gender === 'female' && bf > 32)) {
    priorityFocus.push('Elevated body fat %: prioritise fat-loss behaviours');
  }
  if (visceral >= 12) {
    priorityFocus.push('High visceral fat: cardiometabolic risk—lifestyle focus needed');
  }
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
    priorityFocus.push('Limb imbalance identified: addressed with unilateral work to reduce injury risk.');
  }
  
  // Calculate lifestyle recommendations
  const lifestyleRecs: string[] = [];
  const sleepQ = (formData?.sleepQuality || '').toLowerCase();
  const sleepC = (formData?.sleepConsistency || '').toLowerCase();
  const stress = (formData?.stressLevel || '').toLowerCase();
  const hydration = (formData?.hydrationHabits || '').toLowerCase();
  const caffeine = String(formData?.lastCaffeineIntake || '');
  const steps = parseFloat(formData?.stepsPerDay || '0');
  const sedentary = parseFloat(formData?.sedentaryHours || '0');
  if (sleepQ && (sleepQ === 'poor' || sleepQ === 'fair' || sleepC === 'inconsistent' || sleepC === 'very-inconsistent')) {
    lifestyleRecs.push('Sleep: 7–9h target; set a consistent wind‑down and wake time; dark, cool room.');
  }
  if (caffeine) {
    lifestyleRecs.push('Caffeine: shift last intake earlier in the day to protect sleep.');
  }
  if (stress && (stress === 'high' || stress === 'very-high')) {
    lifestyleRecs.push('Stress: daily 5–10 min breathwork or quiet walk; micro‑breaks in long sittings.');
  }
  if (hydration && (hydration === 'poor' || hydration === 'fair')) {
    lifestyleRecs.push('Hydration: 2–3 L/day baseline, more with heat/training; consider electrolytes.');
  }
  if (!isNaN(steps) && steps > 0 && steps < 7000) {
    lifestyleRecs.push('Movement: build toward 6–10k steps/day with short walk breaks.');
  }
  if (!isNaN(sedentary) && sedentary >= 8) {
    lifestyleRecs.push('Sedentary time: stand and move 2–3 min every 30–45 min.');
  }
  const nutrition = (formData?.nutritionHabits || '').toLowerCase();
  if (nutrition && (nutrition === 'poor' || nutrition === 'fair')) {
    lifestyleRecs.push('Nutrition: protein at each meal, mostly whole foods, regular mealtimes.');
  }
  
  // Calculate nutrition advice
  const nutritionAdvice: string[] = [];
  const g = new Set(goals);
  const weight = parseFloat(formData?.inbodyWeightKg || '0');
  const highBf = (gender === 'male' && bf > 25) || (gender === 'female' && bf > 32) || (!gender && bf > 28.5);
  const wantsWeightLoss = g.has('weight-loss') || highBf;
  const wantsMuscle = g.has('build-muscle');
  
  if (wantsWeightLoss) {
    nutritionAdvice.push(
      'Create a gentle calorie deficit with portion control: mostly whole foods, half the plate veg/salad, the rest lean protein and smart carbs.',
      'Prioritise protein at each meal (palm-sized serving) to stay full while losing fat and protecting muscle.',
      'Keep most carbs (rice, bread, sweets) around training or earlier in the day; evenings bias more toward protein, fibre, and fluids.',
      'Use simple food swaps most days (soft drinks → water/zero-cal, fried foods → grilled/baked, sweets → fruit or yoghurt).',
    );
  }
  if (wantsMuscle && !highBf) {
    nutritionAdvice.push(
      'Aim for a small calorie surplus, not "bulking": roughly one extra snack or ~150–300 kcal/day on training days.',
      'Distribute protein evenly across the day (3–4 meals) and include carbs before and after workouts to support performance and recovery.',
      'Keep most extra calories coming from quality carbs and lean protein rather than heavy fats or desserts.',
    );
  } else if (wantsMuscle && highBf) {
    nutritionAdvice.push(
      'Because body fat is already elevated, focus first on lean recomposition: high protein, mostly whole foods, and a slight deficit/maintenance instead of a big surplus.',
    );
  }
  if (!wantsWeightLoss && !wantsMuscle) {
    nutritionAdvice.push(
      'Base most meals on whole foods: lean proteins, colourful veg/fruit, whole grains, and healthy fats.',
      'Keep a simple structure: 2–3 main meals and 1–2 planned snacks rather than constant grazing.',
    );
  }
  if (nutritionAdvice.length === 0 && weight > 0) {
    nutritionAdvice.push(
      'Focus on consistency: mostly whole foods, protein at each meal, and avoid large swings in daily intake.',
    );
  }
  
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${formData.fullName || 'Client'} - Fitness Assessment Report</title>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f8fafc;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 32px;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    input[type="range"] {
      width: 200px;
      height: 6px;
      border-radius: 3px;
      background: #e2e8f0;
      outline: none;
      -webkit-appearance: none;
    }
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #1e293b;
      cursor: pointer;
    }
    input[type="range"]::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #1e293b;
      cursor: pointer;
      border: none;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useMemo } = React;
    
    const formData = ${JSON.stringify(formData)};
    const scores = ${JSON.stringify(scores)};
    const roadmap = ${JSON.stringify(roadmap)};
    const bodyComp = ${JSON.stringify(bodyComp || null)};
    const goals = ${JSON.stringify(goals)};
    const focusAreas = ${JSON.stringify(focusAreas)};
    const strengths = ${JSON.stringify(strengths)};
    const priorityFocus = ${JSON.stringify(priorityFocus)};
    const lifestyleRecs = ${JSON.stringify(lifestyleRecs)};
    const nutritionAdvice = ${JSON.stringify(nutritionAdvice)};
    
    function niceLabel(id) {
      const labels = {
        bodyComp: 'Body Composition',
        strength: 'Muscular Strength',
        cardio: 'Metabolic Fitness',
        movementQuality: 'Movement Quality',
        lifestyle: 'Lifestyle Factors'
      };
      return labels[id] || id;
    }
    
    function circleColor(score) {
      if (score >= 70) return 'border-green-500 bg-green-50 text-green-700';
      if (score >= 50) return 'border-amber-500 bg-amber-50 text-amber-700';
      return 'border-red-500 bg-red-50 text-red-700';
    }
    
    const CATEGORY_ORDER = ['bodyComp','strength','cardio','movementQuality','lifestyle'];
    const CATEGORY_COLOR = {
      bodyComp: 'bg-emerald-500',
      strength: 'bg-brand-light0',
      cardio: 'bg-sky-500',
      movementQuality: 'bg-amber-500',
      lifestyle: 'bg-fuchsia-500',
    };
    
    const CATEGORY_EXPLANATIONS = {
      bodyComp: "Your body's makeup—muscle, fat, and water. Think of it as the foundation for everything else.",
      strength: "How strong you are and how long you can sustain effort. This affects daily activities and injury prevention.",
      cardio: "Your heart and lung capacity. This determines how efficiently your body uses oxygen during activity.",
      movementQuality: "How well your joints move and how your body holds itself. Better movement quality means fewer aches and more efficient movement.",
      lifestyle: "Your daily habits—sleep, stress, nutrition, hydration, and activity. These are the foundation that makes everything else work better.",
    };
    
    const PROGRAM_PHASES = [
      { key: 'foundation', title: 'Building the Foundation', color: 'bg-slate-800', text: 'Movement quality, posture, breathing, and consistency. Install habits that make progress inevitable.' },
      { key: 'overload', title: 'Progressive Overload', color: 'bg-primary', text: 'Gradually increase volume, intensity, or density with excellent technique to drive adaptations.' },
      { key: 'performance', title: 'Performance Development', color: 'bg-sky-600', text: 'Translate base capacity into performance—better pace, higher outputs, stronger lifts.' },
      { key: 'specialisation', title: 'Specialisation', color: 'bg-emerald-600', text: 'Emphasise your primary goal block (fat loss, hypertrophy, strength, or endurance) based on response.' },
      { key: 'mastery', title: 'Mastery', color: 'bg-amber-600', text: 'Refine strengths, shore up weak links, and consolidate results for long-term sustainability.' },
    ];
    
    function InteractiveReport() {
      const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
      
      const sessionFactor = useMemo(() => 
        sessionsPerWeek === 5 ? 0.75 : sessionsPerWeek === 4 ? 0.85 : 1.0, 
        [sessionsPerWeek]
      );
      
      const orderedCats = useMemo(() => 
        CATEGORY_ORDER.map(id => scores.categories.find(c => c.id === id)).filter(Boolean),
        []
      );
      
      const weeksByCategory = useMemo(() => {
        const result = {};
        // Goal-based baseline horizons (matching ClientReport logic)
        const weightKg = parseFloat(formData?.inbodyWeightKg || '0');
        const heightM = (parseFloat(formData?.heightCm || '0') || 0) / 100;
        const healthyMin = heightM > 0 ? 22 * heightM * heightM : 0;
        const healthyMax = heightM > 0 ? 25 * heightM * heightM : 0;
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
        const levelMG = formData?.goalLevelMuscle || '';
        const muscleTargetKg = levelMG === 'health-minimum' ? 1.5 : levelMG === 'average' ? 2.0 : levelMG === 'above-average' ? 3.0 : levelMG === 'elite' ? 4.0 : 2.0;
        const muscleRate = sessionsPerWeek >= 5 ? 0.22 : sessionsPerWeek === 4 ? 0.18 : 0.15;
        const muscleWeeks = Math.ceil(muscleTargetKg / muscleRate);
        const levelST = formData?.goalLevelStrength || '';
        const strengthPct = levelST === 'health-minimum' ? 10 : levelST === 'average' ? 15 : levelST === 'above-average' ? 20 : levelST === 'elite' ? 30 : 15;
        const pctPerBlock = sessionsPerWeek >= 5 ? 4 : sessionsPerWeek === 4 ? 3 : 2.5;
        const strengthWeeks = Math.ceil(strengthPct / pctPerBlock) * 5;
        const levelFT = formData?.goalLevelFitness || '';
        const cardioWeeks = levelFT === 'elite' ? 20 : levelFT === 'above-average' ? 16 : 12;
        const movementQualityWeeks = 6;
        
        orderedCats.forEach(cat => {
          let base = 12;
          if (cat.id === 'bodyComp') base = Math.max(12, Math.max(fatLossWeeks, muscleWeeks));
          if (cat.id === 'strength') base = Math.max(12, strengthWeeks);
          if (cat.id === 'cardio') base = Math.max(12, cardioWeeks);
          if (cat.id === 'movementQuality') base = movementQualityWeeks;
          if (cat.id === 'lifestyle') base = 4; // Lifestyle is foundational, quick wins
          result[cat.id] = Math.round(base / sessionFactor); // FIXED: divide by sessionFactor
        });
        return result;
      }, [orderedCats, sessionFactor, formData, sessionsPerWeek]);
      
      const maxWeeks = useMemo(() => 
        Math.max(...Object.values(weeksByCategory), 0),
        [weeksByCategory]
      );
      
      // Build comprehensive lifestyle profile
      const lifestyleProfile = useMemo(() => {
        const profile = [];
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
            value: sleepD > 0 ? sleepD + 'h, ' + (sleepQ || 'N/A') + ', ' + (sleepC || 'N/A') : (sleepQ || 'N/A') + ', ' + (sleepC || 'N/A'),
            recommendation: sleepRec || undefined,
          });
        }
        if (stress) {
          const stressStatus = (stress === 'high' || stress === 'very-high') ? 'High' : stress === 'moderate' ? 'Moderate' : 'Low';
          profile.push({
            category: 'Stress',
            status: stressStatus,
            value: stress.charAt(0).toUpperCase() + stress.slice(1),
            recommendation: (stress === 'high' || stress === 'very-high') ? 'Daily 5–10 min breathwork or quiet walk; micro‑breaks in long sittings' : undefined,
          });
        }
        if (hydration) {
          const hydrationStatus = (hydration === 'poor' || hydration === 'fair') ? 'Needs improvement' : 'Good';
          profile.push({
            category: 'Hydration',
            status: hydrationStatus,
            value: hydration.charAt(0).toUpperCase() + hydration.slice(1),
            recommendation: (hydration === 'poor' || hydration === 'fair') ? '2–3 L/day baseline, more with heat/training; consider electrolytes' : undefined,
          });
        }
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
            caffeineRec = caffeineRec ? caffeineRec + '; consider reducing to 2–3 cups/day' : 'Consider reducing to 2–3 cups/day';
          }
          profile.push({
            category: 'Caffeine',
            status: caffeineStatus,
            value: caffeineCups > 0 ? caffeineCups + ' cups/day, last at ' + (caffeine || 'N/A') : 'Last at ' + (caffeine || 'N/A'),
            recommendation: caffeineRec || undefined,
          });
        }
        if (steps > 0 || sedentary > 0) {
          let movementStatus = 'Good';
          let movementRec = '';
          if (steps > 0 && steps < 7000) {
            movementStatus = 'Needs improvement';
            movementRec = 'Build toward 6–10k steps/day with short walk breaks';
          }
          if (sedentary >= 8) {
            movementStatus = 'Too sedentary';
            movementRec = movementRec ? movementRec + '; stand and move 2–3 min every 30–45 min' : 'Stand and move 2–3 min every 30–45 min';
          }
          profile.push({
            category: 'Daily Movement',
            status: movementStatus,
            value: steps > 0 ? Math.round(steps).toLocaleString() + ' steps/day, ' + sedentary + 'h sedentary' : sedentary + 'h sedentary',
            recommendation: movementRec || undefined,
          });
        }
        if (nutrition) {
          const nutritionStatus = (nutrition === 'poor' || nutrition === 'fair') ? 'Needs improvement' : 'Good';
          profile.push({
            category: 'Nutrition',
            status: nutritionStatus,
            value: nutrition.charAt(0).toUpperCase() + nutrition.slice(1),
            recommendation: (nutrition === 'poor' || nutrition === 'fair') ? 'Protein at each meal, mostly whole foods, regular mealtimes' : undefined,
          });
        }
        if (workHours > 0) {
          const workStatus = workHours > 10 ? 'High workload' : workHours > 8 ? 'Moderate' : 'Balanced';
          profile.push({
            category: 'Work-Life Balance',
            status: workStatus,
            value: workHours + 'h/day',
            recommendation: workHours > 10 ? 'Prioritise recovery; schedule training during lower-stress periods' : undefined,
          });
        }
        return profile;
      }, [formData]);

      // Calculate immediate actions (enhanced with lifestyle)
      const immediateActions = useMemo(() => {
        const actions = [];
        const sleepQ = (formData?.sleepQuality || '').toLowerCase();
        const sleepC = (formData?.sleepConsistency || '').toLowerCase();
        const stress = (formData?.stressLevel || '').toLowerCase();
        const steps = parseFloat(formData?.stepsPerDay || '0');
        
        // Lifestyle factors first (they're the foundation)
        if (sleepQ === 'poor' || sleepQ === 'fair' || sleepC === 'inconsistent' || sleepC === 'very-inconsistent') {
          actions.push('Establish consistent sleep routine: 7–9h target, same bedtime/wake time, dark cool room');
        }
        if (stress === 'high' || stress === 'very-high') {
          actions.push('Implement daily stress management: 5–10 min breathwork or quiet walk, micro‑breaks every 30–45 min');
        }
        if (steps > 0 && steps < 7000) {
          actions.push('Increase daily movement: build toward 6–10k steps/day with short walk breaks');
        }
        
        // Priority health risks
        if (priorityFocus.length > 0) {
          if (priorityFocus.some(p => p.includes('urgent') || p.includes('health risk'))) {
            actions.push('Address body composition concerns with structured nutrition and safe training progression');
          }
          if (priorityFocus.some(p => p.includes('visceral fat'))) {
            actions.push('Reduce visceral fat through daily movement (walking) and nutrition adjustments');
          }
        }
        const movementQualityIssues = focusAreas.filter(f => f.toLowerCase().includes('movement quality') || f.toLowerCase().includes('mobility') || f.toLowerCase().includes('posture'));
        if (movementQualityIssues.length > 0 && actions.length < 5) {
          actions.push('Improve movement quality with targeted mobility and posture drills 3x/week');
        }
        const strengthIssues = focusAreas.filter(f => f.toLowerCase().includes('strength') || f.toLowerCase().includes('endurance'));
        if (strengthIssues.length > 0 && actions.length < 5) {
          actions.push('Build foundational strength with compound movements 2-3x/week');
        }
        const cardioIssues = focusAreas.filter(f => f.toLowerCase().includes('cardio'));
        if (cardioIssues.length > 0 && actions.length < 5) {
          actions.push('Establish Zone 2 cardio base with 2-3 sessions per week');
        }
        if (actions.length === 0) {
          actions.push('Focus on consistency: 3 training sessions per week with proper form');
          actions.push('Prioritise protein at each meal and stay hydrated throughout the day');
        }
        return actions.slice(0, 5);
      }, [priorityFocus, focusAreas, formData]);
      
      // Calculate quick wins (enhanced with lifestyle)
      const quickWins = useMemo(() => {
        const wins = [];
        const sleepQ = (formData?.sleepQuality || '').toLowerCase();
        const sleepC = (formData?.sleepConsistency || '').toLowerCase();
        const stress = (formData?.stressLevel || '').toLowerCase();
        const hydration = (formData?.hydrationHabits || '').toLowerCase();
        const steps = parseFloat(formData?.stepsPerDay || '0');
        
        // Lifestyle quick wins first (they're immediate and impactful)
        if (sleepQ === 'poor' || sleepQ === 'fair' || sleepC === 'inconsistent' || sleepC === 'very-inconsistent') {
          wins.push('Sleep: Within 1-2 weeks of consistent sleep, you will notice better energy, mood, and recovery');
        }
        if (stress === 'high' || stress === 'very-high') {
          wins.push('Stress management: Daily 5-10 min breathwork or walks reduce tension and improve focus within days');
        }
        if (hydration === 'poor' || hydration === 'fair') {
          wins.push('Hydration: Better hydration improves energy, recovery, and workout performance within a week');
        }
        if (steps > 0 && steps < 7000) {
          wins.push('Daily movement: Increasing steps to 7-8k/day improves energy and recovery within 2 weeks');
        }
        
        // Movement quality quick wins
        const movementCat = orderedCats.find(c => c.id === 'movementQuality');
        if (movementCat && movementCat.score < 70 && wins.length < 4) {
          wins.push('Movement quality: Better joint mobility and posture reduce aches and improve training quality within 2–3 weeks');
        }
        
        // Default if nothing specific
        if (wins.length === 0) {
          wins.push('Movement quality: Sessions will feel smoother and more controlled');
          wins.push('Recovery: Better sleep and hydration improve how you feel day-to-day');
        }
        return wins.slice(0, 4);
      }, [orderedCats, formData]);
      
      // Check for PAR-Q medical clearance requirement
      const needsMedicalClearance = (() => {
        const parqFields = ['parq1', 'parq2', 'parq3', 'parq4', 'parq5', 'parq6', 'parq7', 'parq8', 'parq9', 'parq10', 'parq11', 'parq12', 'parq13'];
        return parqFields.some(field => formData[field] === 'yes');
      })();
      
      // Determine primary goal and lifestyle focus
      const primaryGoal = goals && goals.length > 0 ? goals[0] : 'general-health';
      const goalLabel = primaryGoal === 'weight-loss' ? 'Weight Loss' : 
                        primaryGoal === 'build-muscle' ? 'Muscle Gain' :
                        primaryGoal === 'build-strength' ? 'Strength' :
                        primaryGoal === 'improve-fitness' ? 'Fitness' : 'General Health';
      
      const lifestyleFocus = (() => {
        const focus = [];
        const sleepQ = (formData?.sleepQuality || '').toLowerCase();
        const sleepC = (formData?.sleepConsistency || '').toLowerCase();
        const stress = (formData?.stressLevel || '').toLowerCase();
        const hydration = (formData?.hydrationHabits || '').toLowerCase();
        if (sleepQ === 'poor' || sleepQ === 'fair' || sleepC === 'inconsistent' || sleepC === 'very-inconsistent') focus.push('Sleep');
        if (stress === 'high' || stress === 'very-high') focus.push('Stress');
        if (hydration === 'poor' || hydration === 'fair') focus.push('Hydration');
        return focus;
      })();
      
      return (
        <div className="container">
          {/* Status badges at top */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            {needsMedicalClearance && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '9999px', backgroundColor: '#fee2e2', color: '#991b1b', fontSize: '12px', fontWeight: '500', border: '1px solid #fecaca' }}>
                <span>⚠️</span>
                <span>Medical clearance recommended</span>
              </div>
            )}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '9999px', backgroundColor: '#e0e7ff', color: '#3730a3', fontSize: '12px', fontWeight: '500', border: '1px solid #c7d2fe' }}>
              <span>🎯</span>
              <span>Primary goal: {goalLabel}</span>
            </div>
            {lifestyleFocus.length > 0 && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '9999px', backgroundColor: '#fef3c7', color: '#92400e', fontSize: '12px', fontWeight: '500', border: '1px solid #fde68a' }}>
                <span>💪</span>
                <span>Lifestyle focus: {lifestyleFocus.join(', ')}</span>
              </div>
            )}
          </div>
          
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
              {formData.fullName || 'Client'}, your report is ready
            </h1>
            <p style={{ color: '#64748b', fontSize: '14px' }}>
              Here's a clear overview of where you are now, what we'll focus on first, and how we'll move you toward your goals.
            </p>
          </div>
          
          {/* Medical clearance warning */}
          {needsMedicalClearance && (
            <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>⚠️</span>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#991b1b', marginBottom: '4px' }}>Medical Clearance Required</h3>
                  <p style={{ fontSize: '14px', color: '#b91c1c' }}>
                    Based on your PAR-Q responses, please consult with a healthcare professional before starting your training program. 
                    You can still review your assessment results and plan, but obtain medical clearance before beginning exercise.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* 1. Here's where you are */}
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', textAlign: 'center', marginBottom: '24px' }}>
              Here's where you are
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className={circleColor(scores.overall)} style={{ 
                  display: 'flex', 
                  height: '112px', 
                  width: '112px', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  borderRadius: '50%', 
                  borderWidth: '4px',
                  fontSize: '32px',
                  fontWeight: 'bold'
                }}>
                  {scores.overall}
                </div>
                <span style={{ marginTop: '8px', fontSize: '14px', fontWeight: '500', color: '#475569' }}>
                  Overall score
                </span>
              </div>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                {orderedCats.map(cat => (
                  <div key={cat.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className={circleColor(cat.score)} style={{ 
                      display: 'flex', 
                      height: '56px', 
                      width: '56px', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      borderRadius: '50%', 
                      borderWidth: '4px',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      {cat.score}
                    </div>
                    <span style={{ marginTop: '8px', width: '112px', textAlign: 'center', fontSize: '12px', color: '#64748b', wordBreak: 'break-word' }}>
                      {niceLabel(cat.id)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Synthesis Section - Cross-Pillar Insights */}
            {scores.synthesis && scores.synthesis.length > 0 && (
              <div style={{ maxWidth: '600px', margin: '32px auto 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }}>Expert Synthesis</h3>
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>How your different results interact</p>
                </div>
                {scores.synthesis.map((item, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      padding: '20px', 
                      borderRadius: '16px', 
                      border: '1px solid ' + (
                        item.severity === 'high' ? '#fecaca' : 
                        item.severity === 'medium' ? '#fde68a' : 
                        '#bfdbfe'
                      ),
                      backgroundColor: (
                        item.severity === 'high' ? '#fef2f2' : 
                        item.severity === 'medium' ? '#fffbeb' : 
                        '#eff6ff'
                      ),
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '18px' }}>
                        {item.severity === 'high' ? '🚨' : item.severity === 'medium' ? '⚠️' : 'ℹ️'}
                      </span>
                      <h4 style={{ 
                        margin: 0,
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: (
                          item.severity === 'high' ? '#991b1b' : 
                          item.severity === 'medium' ? '#92400e' : 
                          '#1e40af'
                        )
                      }}>
                        {item.title}
                      </h4>
                    </div>
                    <p style={{ 
                      margin: 0,
                      fontSize: '14px', 
                      lineHeight: '1.5',
                      color: (
                        item.severity === 'high' ? '#b91c1c' : 
                        item.severity === 'medium' ? '#b45309' : 
                        '#1d4ed8'
                      )
                    }}>
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 2. What this means - with visual progress bars */}
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>What this means</h2>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>Each category measures a different aspect of your fitness:</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
              {orderedCats.map(cat => {
                const scorePercent = Math.min(100, (cat.score / 100) * 100);
                const colorClass = circleColor(cat.score);
                const bgColor = cat.score >= 70 ? '#dcfce7' : cat.score >= 50 ? '#fef3c7' : '#fee2e2';
                const barColor = cat.score >= 70 ? '#22c55e' : cat.score >= 50 ? '#f59e0b' : '#ef4444';
                return (
                  <div key={cat.id} style={{ padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className={colorClass} style={{ 
                          display: 'flex', 
                          height: '40px', 
                          width: '40px', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          borderRadius: '50%', 
                          borderWidth: '2px',
                          fontSize: '14px',
                          fontWeight: '600'
                        }}>
                          {cat.score}
                        </div>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>{niceLabel(cat.id)}</h3>
                      </div>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ height: '8px', width: '100%', borderRadius: '9999px', backgroundColor: '#f1f5f9', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: scorePercent + '%', backgroundColor: barColor, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>{CATEGORY_EXPLANATIONS[cat.id]}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 2.5. Your lifestyle foundation */}
          {lifestyleProfile.length > 0 && (
            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Your lifestyle foundation</h2>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>These daily habits are the foundation for everything else. Small improvements here amplify your training results:</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
                {lifestyleProfile.map((item, i) => (
                  <div key={i} style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid ' + (
                      item.status === 'Good' || item.status === 'Balanced' || item.status === 'Low' || item.status === 'Moderate'
                        ? '#bbf7d0'
                        : item.status === 'Needs attention' || item.status === 'Too late' || item.status === 'High' || item.status === 'High workload' || item.status === 'Too sedentary'
                        ? '#fecaca'
                        : '#fde68a'
                    ),
                    backgroundColor: (
                      item.status === 'Good' || item.status === 'Balanced' || item.status === 'Low' || item.status === 'Moderate'
                        ? '#f0fdf4'
                        : item.status === 'Needs attention' || item.status === 'Too late' || item.status === 'High' || item.status === 'High workload' || item.status === 'Too sedentary'
                        ? '#fef2f2'
                        : '#fffbeb'
                    ),
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>{item.category}</h3>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: '500',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: (
                          item.status === 'Good' || item.status === 'Balanced' || item.status === 'Low' || item.status === 'Moderate'
                            ? '#d1fae5'
                            : item.status === 'Needs attention' || item.status === 'Too late' || item.status === 'High' || item.status === 'High workload' || item.status === 'Too sedentary'
                            ? '#fee2e2'
                            : '#fef3c7'
                        ),
                        color: (
                          item.status === 'Good' || item.status === 'Balanced' || item.status === 'Low' || item.status === 'Moderate'
                            ? '#065f46'
                            : item.status === 'Needs attention' || item.status === 'Too late' || item.status === 'High' || item.status === 'High workload' || item.status === 'Too sedentary'
                            ? '#991b1b'
                            : '#92400e'
                        )
                      }}>
                        {item.status}
                      </span>
                    </div>
                    <p style={{ fontSize: '14px', color: '#475569', marginBottom: '8px' }}>{item.value}</p>
                    {item.recommendation && (
                      <p style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                        💡 {item.recommendation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '16px', padding: '16px', borderRadius: '8px', border: '1px solid #c7d2fe', backgroundColor: '#eef2ff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <p style={{ fontSize: '14px', color: '#312e81' }}>
                  <strong>Why this matters:</strong> Sleep, stress, hydration, and daily movement directly impact recovery, energy, and how your body responds to training. Optimizing these habits makes every workout more effective and accelerates progress toward your goals.
                </p>
              </div>
            </section>
          )}

          {/* 3. What needs attention */}
          {priorityFocus.length > 0 && (
            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>What needs attention</h2>
              <div style={{ padding: '20px', borderRadius: '8px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#991b1b', marginBottom: '12px' }}>Priority focus</h3>
                <ul style={{ paddingLeft: '20px', fontSize: '14px', color: '#7f1d1d', listStyle: 'disc' }}>
                  {priorityFocus.map((p, i) => <li key={i} style={{ marginBottom: '8px' }}>{p}</li>)}
                </ul>
              </div>
            </section>
          )}

          {/* 4. What's working well */}
          {strengths.length > 0 && (
            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>What's working well</h2>
              <div style={{ padding: '20px', borderRadius: '8px', border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <p style={{ fontSize: '14px', color: '#14532d', marginBottom: '12px' }}>These are areas where you're already strong. We'll maintain and build on these:</p>
                <ul style={{ paddingLeft: '20px', fontSize: '14px', color: '#14532d', listStyle: 'disc' }}>
                  {strengths.map((s, i) => <li key={i} style={{ marginBottom: '8px' }}>{s}</li>)}
                </ul>
              </div>
            </section>
          )}

          {/* 5. Your goals */}
          {goals.length > 0 && (
            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>Your goals</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {goals.map((goal, i) => (
                  <span key={i} style={{ 
                    padding: '4px 12px', 
                    borderRadius: '9999px', 
                    backgroundColor: '#f1f5f9', 
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#1e293b'
                  }}>
                    {goal.replace('-', ' ')}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* 6. What we'll do first */}
          {immediateActions.length > 0 && (
            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>What we'll do first</h2>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>These are the immediate steps we'll take to get you moving in the right direction:</p>
              <div style={{ padding: '20px', borderRadius: '8px', border: '1px solid #c7d2fe', backgroundColor: '#eef2ff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <ol style={{ paddingLeft: '20px', fontSize: '14px', color: '#312e81', listStyle: 'decimal' }}>
                  {immediateActions.map((action, i) => <li key={i} style={{ marginBottom: '8px' }}>{action}</li>)}
                </ol>
              </div>
            </section>
          )}

          {/* 7. Quick wins */}
          {quickWins.length > 0 && (
            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>Quick wins</h2>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>You'll notice improvements in these areas within 2-4 weeks:</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
                {quickWins.map((win, i) => (
                  <div key={i} style={{ padding: '16px', borderRadius: '8px', border: '1px solid #fde68a', backgroundColor: '#fffbeb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <p style={{ fontSize: '14px', color: '#92400e' }}>{win}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 8. Your roadmap */}
          <section style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Your roadmap</h2>
              <div style={{ fontSize: '14px', color: '#64748b' }}>
                <span style={{ fontWeight: '500' }}>Total: ~{maxWeeks} weeks</span> with {sessionsPerWeek} sessions/week
              </div>
            </div>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>Adjust sessions per week to see how it affects your timeline:</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '14px', color: '#64748b' }}>Sessions/week:</span>
              <input 
                type="range" 
                min={3} 
                max={5} 
                step={1} 
                value={sessionsPerWeek} 
                onChange={(e) => setSessionsPerWeek(parseInt(e.target.value))}
              />
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>{sessionsPerWeek}</span>
            </div>
            <div style={{ 
              padding: '16px', 
              borderRadius: '8px', 
              border: '1px solid #e2e8f0', 
              backgroundColor: 'white',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
              {orderedCats.map(cat => {
                const weeks = weeksByCategory[cat.id] ?? 3;
                const color = CATEGORY_COLOR[cat.id] || 'bg-slate-500';
                const widthPercent = Math.min(100, (weeks / 26) * 100);
                return (
                  <div key={cat.id} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>{niceLabel(cat.id)}</span>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>~{weeks} weeks</span>
                    </div>
                    <div style={{ height: '12px', width: '100%', borderRadius: '6px', backgroundColor: '#f1f5f9' }}>
                      <div className={color} style={{ 
                        height: '12px', 
                        borderRadius: '6px', 
                        width: widthPercent + '%',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b' }}>
                <span>0</span><span>5</span><span>10</span><span>20</span><span>26+w</span>
              </div>
              <div style={{ marginTop: '12px', fontSize: '12px', color: '#64748b' }}>
                By ~{maxWeeks} weeks you're well on your way toward your primary goals. Timelines adjust with your weekly sessions and consistency.
              </div>
            </div>
          </section>
          
          {/* 9. How we'll address it */}
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>How we'll address it</h2>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>These are the phases we'll move through. The exact timing adapts to your progress and session cadence.</p>
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
              {PROGRAM_PHASES.map(phase => (
                <div key={phase.key} style={{ 
                  minWidth: '256px', 
                  flexShrink: 0, 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '12px', 
                  padding: '16px', 
                  borderRadius: '8px', 
                  border: '1px solid #e2e8f0', 
                  backgroundColor: 'white',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                  <div className={phase.color} style={{ marginTop: '2px', height: '12px', width: '12px', flexShrink: 0, borderRadius: '50%' }} />
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>{phase.title}</h4>
                    <p style={{ fontSize: '12px', color: '#475569' }}>{phase.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          
          {/* 10. What to expect */}
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>What to expect</h2>
            {(() => {
              const primaryGoal = (goals && goals[0]) || '';
              const goalLabel = primaryGoal === 'weight-loss' ? 'weight-loss' : primaryGoal === 'build-muscle' ? 'muscle gain' : primaryGoal === 'build-strength' ? 'strength' : primaryGoal === 'improve-fitness' ? 'fitness' : 'goals';
              const headlineIssues = focusAreas.slice(0, 3);
              return (
                <div style={{ padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'linear-gradient(to bottom right, #f8fafc, #ffffff)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <p style={{ fontSize: '14px', color: '#475569', marginBottom: '16px' }}>
                    From day one we'll start addressing {headlineIssues.length ? headlineIssues.join(', ') : 'key limiters'} that could be holding you back.
                    At the same time we'll build a plan that moves you steadily toward your {goalLabel}.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                    <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '4px' }}>Weeks 1–4</div>
                      <div style={{ fontSize: '14px', color: '#1e293b', marginTop: '4px' }}>
                        You'll move better and feel more stable. Sessions feel "right" as posture and mobility improve; energy and recovery lift.
                      </div>
                    </div>
                    <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '4px' }}>Weeks 5–10</div>
                      <div style={{ fontSize: '14px', color: '#1e293b', marginTop: '4px' }}>
                        Noticeable change: early strength increases, better HR recovery, and visible momentum toward your {goalLabel}.
                      </div>
                    </div>
                    <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '4px' }}>Weeks 11–20</div>
                      <div style={{ fontSize: '14px', color: '#1e293b', marginTop: '4px' }}>
                        Significant shift: stronger lifts, better pace, or visible body composition changes others begin to notice.
                      </div>
                    </div>
                    <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '4px' }}>~{Math.max(20, maxWeeks)} weeks</div>
                      <div style={{ fontSize: '14px', color: '#1e293b', marginTop: '4px' }}>
                        You're well on your way—clearly resembling the person you set out to become, with momentum to keep elevating.
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </section>

          {/* 11. Lifestyle support */}
          {(lifestyleRecs.length > 0 || nutritionAdvice.length > 0) && (
            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Lifestyle support</h2>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>These daily habits are the foundation that makes your training effective. Small, consistent improvements here amplify every workout:</p>
              {lifestyleRecs.length > 0 && (
                <div style={{ padding: '20px', borderRadius: '8px', border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#166534', marginBottom: '12px' }}>Daily habits</h3>
                  <ul style={{ paddingLeft: '20px', fontSize: '14px', color: '#14532d', listStyle: 'disc' }}>
                    {lifestyleRecs.map((p, i) => <li key={i} style={{ marginBottom: '8px' }}>{p}</li>)}
                  </ul>
                </div>
              )}
              {nutritionAdvice.length > 0 && (
                <div style={{ padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '12px' }}>Nutrition focus</h3>
                  <ul style={{ paddingLeft: '20px', fontSize: '14px', color: '#475569', listStyle: 'disc' }}>
                    {nutritionAdvice.map((n, i) => <li key={i} style={{ marginBottom: '8px' }}>{n}</li>)}
                  </ul>
                </div>
              )}
              <div style={{ marginTop: '16px', padding: '16px', borderRadius: '8px', border: '1px solid #c7d2fe', backgroundColor: '#eef2ff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <p style={{ fontSize: '14px', color: '#312e81' }}>
                  <strong>Remember:</strong> Training provides the stimulus, but lifestyle habits (sleep, stress management, hydration, nutrition, daily movement) determine how well your body adapts and recovers. These aren't separate from your fitness goals—they're the glue that ties everything together.
                </p>
              </div>
            </section>
          )}

          {/* 12. Sample workout */}
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>Sample workout</h2>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>Here's an example of what a typical session might look like, tailored to your needs:</p>
            <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>Correctives — addressing your main concerns</h4>
                  <ul style={{ marginTop: '8px', paddingLeft: '20px', fontSize: '14px', color: '#475569', listStyle: 'disc' }}>
                    <li style={{ marginBottom: '4px' }}>Dynamic mobility targeting hips/shoulders/ankles as needed</li>
                    {focusAreas.filter(f => f.toLowerCase().includes('mobility') || f.toLowerCase().includes('posture')).slice(0, 3).map((f, i) => (
                      <li key={i} style={{ marginBottom: '4px' }}>Targeted drills for {f.split(':')[0]}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
                    {goals && goals[0] === 'weight-loss' ? 'Primary block — Fat‑loss training' :
                     goals && goals[0] === 'build-muscle' ? 'Primary block — Hypertrophy' :
                     goals && goals[0] === 'build-strength' ? 'Primary block — Strength' :
                     goals && goals[0] === 'improve-fitness' ? 'Primary block — Metabolic Fitness' : 'Primary block'}
                  </h4>
                  <ul style={{ marginTop: '8px', paddingLeft: '20px', fontSize: '14px', color: '#475569', listStyle: 'disc' }}>
                    {goals && goals[0] === 'weight-loss' ? (
                      <>
                        <li style={{ marginBottom: '4px' }}>Goblet squat 3–4 x 8–12 (strength base)</li>
                        <li style={{ marginBottom: '4px' }}>DB bench press 3–4 x 8–12 (strength base)</li>
                        <li style={{ marginBottom: '4px' }}>1‑arm row 3–4 x 8–12/side (strength base)</li>
                        <li style={{ marginBottom: '4px' }}>Zone 2 cardio 15–20 min (body comp)</li>
                      </>
                    ) : goals && goals[0] === 'build-muscle' ? (
                      <>
                        <li style={{ marginBottom: '4px' }}>Back squat 4 x 6–8 (hypertrophy)</li>
                        <li style={{ marginBottom: '4px' }}>Bench press 4 x 6–8 (hypertrophy)</li>
                        <li style={{ marginBottom: '4px' }}>Chest‑supported row 4 x 8–10 (hypertrophy)</li>
                        <li style={{ marginBottom: '4px' }}>Romanian deadlift 3 x 8–10 (posterior chain)</li>
                      </>
                    ) : goals && goals[0] === 'build-strength' ? (
                      <>
                        <li style={{ marginBottom: '4px' }}>Back squat 5 x 3 @ RPE 7–8 (strength)</li>
                        <li style={{ marginBottom: '4px' }}>Bench press 5 x 3 @ RPE 7–8 (strength)</li>
                        <li style={{ marginBottom: '4px' }}>Deadlift 3 x 3 @ RPE 7–8 (strength)</li>
                      </>
                    ) : goals && goals[0] === 'improve-fitness' ? (
                      <>
                        <li style={{ marginBottom: '4px' }}>Tempo intervals: 6 x 2 min hard / 2 min easy (Metabolic Fitness)</li>
                        <li style={{ marginBottom: '4px' }}>Zone 2 steady 20–30 min (cardio base)</li>
                        <li style={{ marginBottom: '4px' }}>Split squat 3 x 8/side (single‑leg strength)</li>
                      </>
                    ) : (
                      <>
                        <li style={{ marginBottom: '4px' }}>Circuit: Goblet squat 10, Pushups 8–12, 1‑arm row 10/side, Hip hinge 10 (general conditioning)</li>
                        <li style={{ marginBottom: '4px' }}>Walk 10–15 min cooldown (recovery)</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
              <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                <div style={{ padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                  <h5 style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>Daily movement</h5>
                  <p style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>Daily steps target: 7000–9000 per day. Short walk breaks between sessions boost recovery and fat‑loss.</p>
                </div>
                <div style={{ padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                  <h5 style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>Progression</h5>
                  <p style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>We'll increase volume/intensity as movement improves—technique first, load follows.</p>
                </div>
              </div>
            </div>
          </section>
          
          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
            Generated by One Fitness Assessment Engine
          </div>
        </div>
      );
    }
    
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<InteractiveReport />);
  </script>
</body>
</html>`;

  return new Blob([htmlContent], { type: 'text/html' });
}
