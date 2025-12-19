import React, { useMemo, useState } from 'react';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary, RoadmapPhase } from '@/lib/scoring';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, CheckCircle2, AlertCircle, Info } from 'lucide-react';
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
    case 'movementQuality': return 'Movement quality';
    case 'lifestyle': return 'Lifestyle';
    default: return id;
  }
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

export default function ClientReport({ scores, roadmap, goals, bodyComp, formData }: { scores: ScoreSummary; roadmap: RoadmapPhase[]; goals?: string[]; bodyComp?: BodyCompInterp; formData?: FormData }) {
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
    const pctPerBlock = sessionsPerWeek >= 5 ? 4 : sessionsPerWeek === 4 ? 3 : 2.5;
    let strengthWeeks = Math.ceil(strengthPct / pctPerBlock) * 5;
    
    // Low score penalty for Strength
    const strengthScore = orderedCats.find(c => c.id === 'strength')?.score || 50;
    if (strengthScore < 45) strengthWeeks += 10; // Extra blocks for neurological/joint prep
    else if (strengthScore < 65) strengthWeeks += 5;
    
    // Fitness level logic (VO2 Max / Cardio)
    const levelFT = formData?.goalLevelFitness || '';
    let cardioBaseWeeks = levelFT === 'elite' ? 24 : levelFT === 'above-average' ? 20 : 16;
    
    // Low score penalty for Cardio
    const cardioScore = orderedCats.find(c => c.id === 'cardio')?.score || 50;
    if (cardioScore < 45) cardioBaseWeeks += 12; // Massive aerobic base work needed
    else if (cardioScore < 65) cardioBaseWeeks += 6;

    // Body Comp penalty logic
    const bodyCompScore = orderedCats.find(c => c.id === 'bodyComp')?.score || 50;
    let bodyCompBaseAdj = 0;
    if (bodyCompScore < 45) bodyCompBaseAdj = 12; // Significant metabolic/habit work
    else if (bodyCompScore < 65) bodyCompBaseAdj = 6;

    const mobilityWeeks = 8;
    const postureWeeks = 8;

    for (const cat of orderedCats) {
      let base = 12;
      let scoreAdj = 1.0;
      
      // Score-based multiplier (Lower score = longer time)
      // This compounds with the additions above for a very realistic conservative estimate
      if (cat.score < 45) scoreAdj = 1.6;
      else if (cat.score < 65) scoreAdj = 1.3;

      if (cat.id === 'bodyComp') base = Math.max(12, Math.max(fatLossWeeks, muscleWeeks)) + bodyCompBaseAdj;
      else if (cat.id === 'strength') base = Math.max(12, strengthWeeks);
      else if (cat.id === 'cardio') base = cardioBaseWeeks;
      else if (cat.id === 'movementQuality') base = Math.max(mobilityWeeks, postureWeeks);
      else if (cat.id === 'lifestyle') base = 8; // Habit formation takes ~66 days (9 weeks)

      // Frequency factor: sessions don't perfectly slash time for physiological adaptation
      // 5 sessions is only 15% faster than 3, not 40% faster.
      const freqFactor = sessionsPerWeek === 5 ? 0.85 : sessionsPerWeek === 4 ? 0.92 : 1.0;
      map[cat.id] = Math.round(base * scoreAdj * freqFactor);
    }
    return map;
  }, [orderedCats, formData, sessionsPerWeek]);
  const strengths = useMemo(() => orderedCats.flatMap(c => c.strengths.map(s => `${niceLabel(c.id)}: ${s}`)), [orderedCats]);
  const focusAreas = useMemo(() => orderedCats.flatMap(c => c.weaknesses.map(w => `${niceLabel(c.id)}: ${w}`)), [orderedCats]);
  
  // Calculate if the client is in "reasonable shape"
  const isReasonableShape = useMemo(() => scores.overall >= 70, [scores.overall]);
  
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
    if (actions.length < 5) {
      const defaults = [
        'Establish consistent training routine (3 sessions/week) to build momentum toward your goals',
        'Optimize lifestyle habits (sleep, nutrition, hydration) to maximize training results',
        'Focus on foundational movement mastery before increasing training intensity',
        'Track progress through regular strength and body composition re-assessments',
        'Build work capacity to ensure you can sustain higher intensity training sessions'
      ];
      for (const d of defaults) {
        if (actions.length < 5 && !actions.includes(d)) actions.push(d);
      }
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

  if (!scores || !scores.categories || scores.categories.length === 0) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Results are not available yet. Please complete the assessment steps and try again.
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
        <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1.5 text-xs font-medium text-indigo-800 border border-indigo-200">
          <span>🎯</span>
          <span>Primary goal: {goalLabel}</span>
        </div>
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
          <div className="space-y-4 max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Your Fitness Score</h2>
            {(() => {
              const overall = scores.overall;
              const hasRed = orderedCats.some(c => c.score < 45);
              const hasLowAmber = orderedCats.some(c => c.score < 60);
              
              if (overall >= 75 && !hasRed) {
                return (
                  <p className="text-slate-600 font-medium leading-relaxed text-lg">
                    Excellent foundation! You're in <span className="text-green-600 font-bold">great shape</span> on paper, which means we can bypass standard conditioning and get <span className="text-indigo-600 font-bold">straight to work</span> on your specific performance goals of {goals?.map(g => g.replace('-', ' ')).join(', ')}.
                  </p>
                );
              } else if (overall >= 60 && !hasRed) {
                return (
                  <p className="text-slate-600 font-medium leading-relaxed text-lg">
                    Good news: you have a <span className="text-indigo-600 font-bold">solid physical foundation</span> to build upon. While there are clear areas to tighten up, we have a clear path to start making progress on your goals of {goals?.map(g => g.replace('-', ' ')).join(', ')} immediately.
                  </p>
                );
              } else if (hasRed || overall < 60) {
                return (
                  <p className="text-slate-600 font-medium leading-relaxed text-lg">
                    Assessment complete. We've identified some <span className="text-red-600 font-bold">critical bottlenecks</span> in your physical foundation. While your overall score shows potential, addressing these urgent areas first is mandatory to make your progress toward {goals?.map(g => g.replace('-', ' ')).join(', ')} safe and effective.
                  </p>
                );
              } else {
                return (
                  <p className="text-slate-600 font-medium leading-relaxed text-lg">
                    Your assessment highlights a mix of strengths and areas for development. We will focus on <span className="text-amber-600 font-bold">balancing your profile</span> to ensure you have the durability needed for your goals of {goals?.map(g => g.replace('-', ' ')).join(', ')}.
                  </p>
                );
              }
            })()}
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
                <TabsTrigger key={cat.id} value={cat.id} className="text-xs sm:text-sm capitalize py-3">
                  <span className="text-center leading-tight font-bold">{niceLabel(cat.id)}</span>
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
                        <div>
                          <h3 className="text-xl font-semibold text-slate-900">{niceLabel(cat.id)}</h3>
                          <p className="text-sm text-slate-600 mt-1">{jargon}</p>
                        </div>
                        <div className={`h-14 w-14 rounded-full border-4 ${circleColor(cat.score)} flex items-center justify-center shrink-0`}>
                          <span className="text-lg font-bold">{cat.score}</span>
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
                      <TooltipProvider>
                        <CategoryRadarChart details={cat.details} categoryName={niceLabel(cat.id)} />
                      </TooltipProvider>
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
                        {cat.weaknesses.length > 0 && (
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
                
                // Assessment-based context for this goal
                const lowCardio = orderedCats.find(c => c.id === 'cardio' && c.score < 60);
                const lowStrength = orderedCats.find(c => c.id === 'strength' && c.score < 60);
                const lowMovement = orderedCats.find(c => c.id === 'movementQuality' && c.score < 65);
                const lowBodyComp = orderedCats.find(c => c.id === 'bodyComp' && c.score < 60);

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
                
                // Goal-specific contextual actions
                const goalActions: string[] = [];
                const goalNextSteps: string[] = [];

                if (goal === 'weight-loss') {
                  if (lowBodyComp) goalActions.push('Fix metabolic baseline with consistent protein intake and daily movement targets');
                  if (lowCardio) goalActions.push('Build aerobic capacity to increase your "burn rate" and improve recovery between sets');
                  if (lowStrength) goalActions.push('Establish foundational strength to protect your muscle mass during fat loss');
                  goalNextSteps.push('Gradually increase training volume to maximize caloric expenditure');
                  goalNextSteps.push('Introduce higher-intensity interval work once your aerobic base is established');
                } else if (goal === 'build-muscle') {
                  if (lowStrength) goalActions.push('Master compound lifting technique to ensure we can safely add weight for muscle growth');
                  if (lowMovement) goalActions.push('Unlock movement restrictions to allow for full range of motion—critical for muscle fiber recruitment');
                  if (lowBodyComp) goalActions.push('Optimize nutritional timing to fuel growth while keeping body fat in a healthy range');
                  goalNextSteps.push('Shift toward hypertrophy-specific loading schemes (8-12 reps)');
                  goalNextSteps.push('Focus on progressive overload and eccentric control for maximum growth');
                } else if (goal === 'build-strength') {
                  if (lowMovement) goalActions.push('Fix joint restrictions first—strength cannot be built on top of poor movement quality');
                  if (lowStrength) goalActions.push('Build base-level muscular endurance before moving to maximal strength work');
                  goalActions.push('Refine technique on the Big 3 (Squat, Bench, Hinge) to ensure long-term progress');
                  goalNextSteps.push('Introduce heavier loading protocols (3-5 reps) once stability is confirmed');
                  goalNextSteps.push('Focus on "stiffness" and core-bracing techniques under load');
                } else if (goal === 'improve-fitness') {
                  if (lowCardio) goalActions.push('Establish a Zone 2 aerobic base—the "foundation" for all high-intensity work');
                  if (lowMovement) goalActions.push('Optimize joint mechanics to make your movement more energy-efficient');
                  goalActions.push('Track HR recovery times to monitor your internal engine\'s efficiency');
                  goalNextSteps.push('Layer in threshold intervals to push your VO2 max ceiling');
                  goalNextSteps.push('Incorporate sport-specific conditioning tailored to your activity of choice');
                } else {
                  goalActions.push('Build a balanced routine across all 5 physical pillars');
                  goalActions.push('Master the fundamentals of strength and aerobic recovery');
                  goalNextSteps.push('Focus on long-term sustainability and lifestyle integration');
                  goalNextSteps.push('Iteratively improve your lowest assessment scores');
                }

                // Fill defaults if needed
                while (goalActions.length < 3) {
                  const d = immediateActions.find(a => !goalActions.includes(a));
                  if (d) goalActions.push(d); else break;
                }
                while (goalNextSteps.length < 2) {
                  const d = immediateActions.find(a => !goalActions.includes(a) && !goalNextSteps.includes(a));
                  if (d) goalNextSteps.push(d); else break;
                }
                
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
                          {goalActions.slice(0, 3).map((action, j) => (
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
                          {goalNextSteps.slice(0, 2).map((action, j) => (
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
              <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-indigo-600 p-2 rounded-lg">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Foundational Priorities</h3>
                </div>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                  While we work toward your primary goals, your assessment highlighted these critical areas. Addressing these "discovered goals" first will unlock your body's ability to progress much faster:
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {discoveredGoals.map((dg, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-white/60 rounded-xl border border-white">
                      <div className="mt-1 h-2 w-2 rounded-full bg-indigo-400 shrink-0" />
                      <span className="text-sm font-medium text-slate-700">{dg}</span>
                    </div>
                  ))}
                </div>
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
          sleepDesc = "Your sleep quality and consistency are top-tier, which will accelerate your recovery and results.";
        } else if (sleepQ === 'good' && (sleepC === 'consistent' || sleepC === 'very-consistent')) {
          sleepStatus = 'good';
          sleepDesc = "Good sleep quality and consistent timing. This provides a stable foundation for your training energy.";
        } else if (sleepQ === 'poor' || sleepC === 'very-inconsistent') {
          sleepStatus = 'poor';
          sleepDesc = "Sleep is currently a bottleneck. Improving your sleep schedule will unlock significant progress in strength and body comp.";
        } else {
          sleepStatus = 'needs-work';
          sleepDesc = "There is room to tighten up your sleep consistency or quality to better support your training goals.";
        }
        lifestyleFactors.push({ name: 'Sleep & Recovery', status: sleepStatus, description: sleepDesc });
        
        // Stress Management
        let stressStatus: 'good' | 'needs-work' | 'poor' = 'good';
        let stressDesc = '';
        if (stress === 'very-low' || stress === 'low') {
          stressStatus = 'good';
          stressDesc = "Low stress levels mean your body is in a 'prime' state to adapt to training loads.";
        } else if (stress === 'very-high' || stress === 'high') {
          stressStatus = 'poor';
          stressDesc = "Elevated stress will limit your recovery. We should prioritize stress-management techniques alongside your program.";
        } else {
          stressStatus = 'needs-work';
          stressDesc = "Moderate stress levels are manageable, but we should keep an eye on total life-load during heavy training weeks.";
        }
        lifestyleFactors.push({ name: 'Stress Management', status: stressStatus, description: stressDesc });
        
        // Nutrition
        let nutritionStatus: 'good' | 'needs-work' | 'poor' = 'good';
        let nutritionDesc = '';
        if (nutrition === 'excellent' || nutrition === 'good') {
          nutritionStatus = 'good';
          nutritionDesc = "Your current nutrition habits are supporting your goals well. We'll refine these further for maximum performance.";
        } else if (nutrition === 'poor') {
          nutritionStatus = 'poor';
          nutritionDesc = "Nutritional consistency needs attention. Fueling your body correctly will be the key to reaching your target physique.";
        } else {
          nutritionStatus = 'needs-work';
          nutritionDesc = "Your nutrition is decent, but optimizing your food quality and timing will give you a significant edge.";
        }
        lifestyleFactors.push({ name: 'Nutrition', status: nutritionStatus, description: nutritionDesc });
        
        // Hydration
        let hydrationStatus: 'good' | 'needs-work' | 'poor' = 'good';
        let hydrationDesc = '';
        if (hydration === 'excellent' || hydration === 'good') {
          hydrationStatus = 'good';
          hydrationDesc = "Solid hydration. This keeps your joints healthy and your energy levels stable during workouts.";
        } else if (hydration === 'poor') {
          hydrationStatus = 'poor';
          hydrationDesc = "Chronic dehydration will lead to fatigue and poor workout quality. Increasing water intake is an easy win.";
        } else {
          hydrationStatus = 'needs-work';
          hydrationDesc = "Occasional dehydration might be dampening your energy. Consistency here will improve your mental focus.";
        }
        lifestyleFactors.push({ name: 'Hydration', status: hydrationStatus, description: hydrationDesc });
        
        // Daily Movement
        let movementStatus: 'good' | 'needs-work' | 'poor' = 'good';
        let movementDesc = '';
        if (steps >= 10000) {
          movementStatus = 'good';
          movementDesc = "Fantastic non-exercise activity. This high baseline burn makes weight management much easier.";
        } else if (steps >= 8000) {
          movementStatus = 'good';
          movementDesc = "Good daily movement level. You're staying active enough to support metabolic health.";
        } else if (steps >= 6000) {
          movementStatus = 'needs-work';
          movementDesc = "You're somewhat active, but bumping this up to 8-10k steps will significantly improve your recovery rate.";
        } else if (steps > 0) {
          movementStatus = 'poor';
          movementDesc = "Relatively low activity levels. Increasing daily steps is the simplest way to accelerate your progress.";
        } else {
          movementStatus = 'needs-work';
          movementDesc = "We need to establish a baseline for your daily movement to better calibrate your program.";
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

      {/* 6. Your roadmap */}
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
                <div className="h-3 w-full rounded bg-slate-100 overflow-hidden">
                  <div className={`h-3 rounded ${color}`} style={{ width: `${Math.max(0, Math.min(100, ((weeks || 0) / 26) * 100))}%` }} />
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

      {/* 8. Sample Workout - restructured format */}
      {(() => {
        const g0 = (goals && goals[0]) || '';
        
        // Collect assessment findings for warmup
        const warmupMovements: string[] = [];
        const warmupAddresses: string[] = [];
        
        if (formData?.mobilityHip && formData.mobilityHip !== 'good' || focusAreas.find(f => f.toLowerCase().includes('hip mobility'))) {
          warmupMovements.push('hip mobility drills (90/90 switches, hip flexor stretches)');
          warmupAddresses.push('hip mobility limitations');
        }
        if (formData?.mobilityShoulder && formData.mobilityShoulder !== 'good' || focusAreas.find(f => f.toLowerCase().includes('shoulder mobility'))) {
          warmupMovements.push('shoulder mobility work (dislocates, wall slides)');
          warmupAddresses.push('shoulder mobility restrictions');
        }
        if (formData?.mobilityAnkle && formData.mobilityAnkle !== 'good' || focusAreas.find(f => f.toLowerCase().includes('ankle mobility'))) {
          warmupMovements.push('ankle mobility exercises');
          warmupAddresses.push('ankle mobility issues');
        }
        if ((formData?.postureBackOverall && formData.postureBackOverall !== 'neutral') || focusAreas.find(f => f.toLowerCase().includes('spinal') || f.toLowerCase().includes('posture'))) {
          warmupMovements.push('posture correctives (T-spine extensions, thoracic mobility)');
          warmupAddresses.push('posture and spinal alignment concerns');
        }
        if (focusAreas.find(f => f.toLowerCase().includes('knee alignment'))) {
          warmupMovements.push('knee tracking drills (mini-band work, split squat patterns)');
          warmupAddresses.push('knee alignment issues');
        }
        if (focusAreas.find(f => f.toLowerCase().includes('core endurance') || f.toLowerCase().includes('core'))) {
          warmupMovements.push('core activation (dead bug, plank variations)');
          warmupAddresses.push('core stability needs');
        }
        
        // Default warmup if nothing specific
        if (warmupMovements.length === 0) {
          warmupMovements.push('dynamic mobility work targeting hips, shoulders, and ankles');
          warmupAddresses.push('general movement preparation');
        }
        
        // Goal-specific workout structure
        let workoutStructure: string[] = [];
        let workoutAddresses: string[] = [];
        
        if (g0 === 'weight-loss') {
          workoutStructure = [
            'Compound movements (squats, presses, rows) to build strength while burning calories',
            'Single-leg work (lunges, step-ups) to improve stability and increase metabolic demand',
            'Posterior chain exercises (hip hinges, RDLs) to strengthen the back of your body',
            'Cardiovascular finisher to boost calorie burn and improve fitness'
          ];
          workoutAddresses = [
            'Building strength to preserve muscle during fat loss',
            'Improving daily movement capacity',
            'Addressing any movement quality issues found in your assessment'
          ];
        } else if (g0 === 'build-muscle') {
          workoutStructure = [
            'Primary compound lifts (squats, presses, rows) with progressive loading',
            'Accessory work targeting specific muscle groups for balanced development',
            'Volume-focused training to stimulate muscle growth',
            'Optional light cardio for recovery and cardiovascular health'
          ];
          workoutAddresses = [
            'Progressive muscle building (hypertrophy)',
            'Addressing any strength imbalances from your assessment',
            'Building overall muscle mass while improving movement quality'
          ];
        } else if (g0 === 'build-strength') {
          workoutStructure = [
            'Heavy compound lifts (squat, bench, deadlift) with focus on technique and progressive overload',
            'Technique work (paused reps, tempo work) to refine movement patterns',
            'Supporting exercises for muscle groups that assist the main lifts',
            'Recovery practices (breathing, mobility) between sets'
          ];
          workoutAddresses = [
            'Building maximum strength safely',
            'Ensuring movement quality supports heavier loads',
            'Addressing any limitations that could limit strength gains'
          ];
        } else if (g0 === 'improve-fitness') {
          workoutStructure = [
            'Cardiovascular intervals to improve heart and lung capacity',
            'Zone 2 steady-state work to build aerobic base',
            'Strength work to support cardiovascular performance',
            'Form drills and technique work for efficient movement'
          ];
          workoutAddresses = [
            'Improving cardiovascular fitness (VO₂ max)',
            'Building endurance capacity',
            'Supporting cardio gains with strength and movement quality'
          ];
        } else {
          workoutStructure = [
            'Balanced mix of strength, cardio, and movement quality work',
            'Circuit-style training for general conditioning',
            'Movement patterns that improve daily function'
          ];
          workoutAddresses = [
            'Overall health and fitness improvements',
            'Addressing assessment findings',
            'Building sustainable movement habits'
          ];
        }
        
        return (
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">Sample workout</h2>
            <p className="text-sm text-slate-600">Here's how we'll structure your sessions based on your goals and assessment findings:</p>
            
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">Warm-up</h3>
                <p className="text-sm text-slate-700 mb-2">
                  We'll warm up with movements such as <strong>{warmupMovements.join(', ')}</strong>.
                </p>
                <p className="text-xs text-slate-600 italic">
                  This will address: {warmupAddresses.join(', ')}.
                </p>
              </div>
              
              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">Main workout</h3>
                <p className="text-sm text-slate-700 mb-2">
                  Your workout will be structured like this:
                </p>
                <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1 mb-2">
                  {workoutStructure.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
                <p className="text-xs text-slate-600 italic">
                  These exercises address: {workoutAddresses.join(', ')}.
                </p>
              </div>
              
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
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


