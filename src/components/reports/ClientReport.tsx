import React, { useMemo, useState } from 'react';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary, RoadmapPhase } from '@/lib/scoring';
import { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import { CoachPlan } from '@/lib/recommendations';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Maximize2,
  Target as TargetIcon
} from 'lucide-react';
import LifestyleRadarChart from './LifestyleRadarChart';
import CategoryRadarChart from './CategoryRadarChart';
import OverallRadarChart from './OverallRadarChart';
import { PostureAnalysisViewer } from './PostureAnalysisViewer';
import { ClientReportHeader } from './ClientReportHeader';
import { ClientReportScoreOverview } from './ClientReportScoreOverview';
import { ClientReportCategoryTabs } from './ClientReportCategoryTabs';
import {
  CATEGORY_ORDER,
  CATEGORY_COLOR,
  CATEGORY_HEX,
  CATEGORY_EXPLANATIONS,
  PROGRAM_PHASES,
  circleColor,
  niceLabel,
} from './ClientReportConstants';

type BodyCompInterp = { timeframeWeeks: string };

export default function ClientReport({ 
  scores, 
  roadmap, 
  goals, 
  bodyComp, 
  formData, 
  plan,
  highlightCategory 
}: { 
  scores: ScoreSummary; 
  roadmap: RoadmapPhase[]; 
  goals?: string[]; 
  bodyComp?: BodyCompInterp; 
  formData?: FormData; 
  plan?: CoachPlan;
  highlightCategory?: string;
}) {
  const [sessionsPerWeek, setSessionsPerWeek] = useState<number>(3);
  // Clear highlight after some time
  const [tempHighlight, setTempHighlight] = useState<string | undefined>(highlightCategory);
  React.useEffect(() => {
    if (tempHighlight) {
      const timer = setTimeout(() => {
        setTempHighlight(undefined);
        sessionStorage.removeItem('highlightCategory');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [tempHighlight]);

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
      if (cat.id === 'lifestyle') base = 4; // Lifestyle Factors is foundational, quick wins
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

  // Calculate "What we'll do first" and "What we'll do next"
  const programmingNarrative = useMemo(() => {
    const first: string[] = [];
    const next: string[] = [];
    
    const primaryGoal = goals && goals.length > 0 ? goals[0] : 'general-health';
    const movementScore = scores.categories.find(c => c.id === 'movementQuality')?.score || 0;
    const bodyCompScore = scores.categories.find(c => c.id === 'bodyComp')?.score || 0;
    const lifestyleScore = scores.categories.find(c => c.id === 'lifestyle')?.score || 0;

    // --- PHASE 1: WHAT WE'LL DO FIRST (Base & Alignment) ---
    
    // 1. Movement/Mobility (The Pre-requisite)
    if (movementScore < 70) {
      first.push('Establish movement integrity: Dial in technique and correct identified imbalances to ensure you can train under load safely.');
    } else {
      first.push('Refine movement efficiency: Fine-tune your already strong patterns to maximize power output and prevent future plateaus.');
    }

    // 2. Lifestyle/Recovery (The Foundation)
    if (lifestyleScore < 70) {
      first.push('Optimize the recovery engine: Focus on sleep consistency and hydration to provide the energy needed for your new training volume.');
    }

    // 3. Goal-Specific Base
    if (primaryGoal === 'weight-loss' || bodyCompScore < 60) {
      first.push('Build the metabolic base: Utilize Zone 2 activity and nutritional "anchors" to improve fat oxidation and insulin sensitivity.');
    } else if (primaryGoal === 'build-muscle' || primaryGoal === 'build-strength') {
      first.push('Master compound movement: Establish perfect form on "The Big Rocks" (Squat, Press, Pull) to set the stage for heavy loading.');
    }

    // --- PHASE 2: WHAT WE'LL DO NEXT (Overload & Optimization) ---

    // 1. Progressive Overload
    next.push('Implement progressive overload: Systematically increase training intensity and volume as your technique becomes automatic.');

    // 2. Goal-Specific Optimization
    if (primaryGoal === 'build-muscle') {
      next.push('Structural hypertrophy focus: Shift toward higher-volume accessory work to target specific muscle groups and maximize growth.');
    } else if (primaryGoal === 'build-strength') {
      next.push('Central Nervous System (CNS) adaptation: Transition to lower-rep, higher-intensity work to maximize absolute strength.');
    } else if (primaryGoal === 'improve-fitness') {
      next.push('VO2 Max development: Introduce high-intensity interval training (HIIT) to push your cardiovascular ceiling.');
    }

    // 3. Weak Point Targeting
    next.push('Target relative weaknesses: Address the secondary areas identified in your assessment to ensure a balanced, resilient profile.');

    return { 
      first: first.slice(0, 3), 
      next: next.slice(0, 3) 
    };
  }, [scores, goals, formData]);

  const immediateActions = programmingNarrative.first;
  const secondaryActions = programmingNarrative.next;

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
    const hasStrength = !!(formData.pushupMaxReps && parseFloat(formData.pushupMaxReps || '0') > 0) ||
                        !!(formData.pushupsOneMinuteReps && parseFloat(formData.pushupsOneMinuteReps || '0') > 0);
    const hasCardio = !!(formData.cardioRestingHr && parseFloat(formData.cardioRestingHr || '0') > 0);
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
        <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-light px-3 py-1.5 text-xs font-medium text-primary border border-primary/20">
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

        {/* Synthesis Section - Cross-Pillar Insights */}
        {scores.synthesis && scores.synthesis.length > 0 && (
          <div className="max-w-2xl mx-auto mt-12 space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Expert Synthesis</h3>
              <p className="text-xs text-slate-500 mt-1">How your different results interact</p>
            </div>
            {scores.synthesis.map((item, idx) => (
              <div 
                key={idx} 
                className={`rounded-2xl border p-5 shadow-sm ${
                  item.severity === 'high' ? 'border-rose-200 bg-rose-50' : 
                  item.severity === 'medium' ? 'border-amber-200 bg-amber-50' : 
                  'border-blue-200 bg-blue-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">
                    {item.severity === 'high' ? '🚨' : item.severity === 'medium' ? '⚠️' : 'ℹ️'}
                  </span>
                  <h4 className={`font-bold ${
                    item.severity === 'high' ? 'text-rose-900' : 
                    item.severity === 'medium' ? 'text-amber-900' : 
                    'text-blue-900'
                  }`}>
                    {item.title}
                  </h4>
                </div>
                <p className={`text-sm leading-relaxed ${
                  item.severity === 'high' ? 'text-rose-800' : 
                  item.severity === 'medium' ? 'text-amber-800' : 
                  'text-blue-800'
                }`}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. Category tabs with radar charts */}
      <ClientReportCategoryTabs
        orderedCats={orderedCats}
        tempHighlight={tempHighlight}
        formData={formData}
      />

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
                        const level = formData?.goalLevelWeightLoss || 'average';
                        const rate = level === 'elite' ? '1%' : level === 'above-average' ? '0.7%' : '0.5%';
                        explanation = `Your ${level.replace('-', ' ')} weight loss goal targets a sustainable reduction of ~${rate} body weight per week. This approach preserves muscle mass while optimizing metabolic health.`;
                        whatItEntails = [
                          'A controlled caloric deficit (dialing in nutrition at every meal)',
                          `Training at least ${sessionsPerWeek} sessions per week (more is recommended for faster progress)`,
                          'Prioritizing high-protein intake to protect your skeletal muscle',
                          'Utilizing progressive overload to ensure you lose fat, not strength'
                        ];
                      } else if (goal === 'build-muscle') {
                        const level = formData?.goalLevelMuscle || 'average';
                        explanation = `Building ${level.replace('-', ' ')} muscle mass requires a dedicated hypertrophy block. We will focus on increasing your skeletal muscle "engine" to boost metabolism and functional power.`;
                        whatItEntails = [
                          'A slight caloric surplus with high-quality protein distribution',
                          `Consistent resistance training (${sessionsPerWeek}+ times per week recommended)`,
                          'Focusing on mechanical tension and metabolic stress in your lifts',
                          'Prioritizing 7-9 hours of sleep to allow for tissue repair and growth'
                        ];
                      } else if (goal === 'build-strength') {
                        const level = formData?.goalLevelStrength || 'average';
                        explanation = `Your ${level.replace('-', ' ')} strength goal focuses on increasing absolute force production. We will prioritize neural adaptations and movement efficiency to help you lift heavier, safer.`;
                        whatItEntails = [
                          'Low-rep, high-intensity compound lifting sets',
                          'Mastering technique on "The Big Rocks" (Squats, Deadlifts, Presses)',
                          'Adequate rest between sets to maximize Central Nervous System recovery',
                          'Strategic use of accessory work to eliminate weak links'
                        ];
                      } else if (goal === 'improve-fitness') {
                        const level = formData?.goalLevelFitness || 'average';
                        explanation = `Improving to an ${level.replace('-', ' ')} fitness level means pushing your cardiovascular ceiling. We will build a robust aerobic base to support higher intensity work and faster recovery.`;
                        whatItEntails = [
                          'Mix of Zone 2 steady-state and high-intensity intervals (HIIT)',
                          'Consistent conditioning work at least 3 times per week',
                          'Monitoring Heart Rate Recovery (HRR) to track progress',
                          'Focusing on breathwork and aerobic efficiency'
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
                          <div className="rounded-lg border border-primary/20 bg-brand-light p-5 shadow-sm">
                            <p className="text-sm text-slate-900 mb-3">{explanation}</p>
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-primary uppercase tracking-wide">What this entails:</p>
                              <ul className="list-disc pl-5 text-sm text-slate-900 space-y-1">
                                {whatItEntails.map((item, j) => <li key={j}>{item}</li>)}
                              </ul>
                            </div>
                          </div>
                          
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-lg border border-primary/20 bg-brand-light p-4 shadow-sm">
                              <h3 className="text-base font-semibold text-primary mb-3">What we'll do first</h3>
                              <ul className="space-y-2 text-sm text-slate-900">
                                {goalActions.map((action, j) => (
                                  <li key={j} className="flex items-start gap-2">
                                    <span className="text-primary mt-1">•</span>
                                    <span>{action}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="rounded-lg border border-primary/20 bg-brand-light p-4 shadow-sm">
                              <h3 className="text-base font-semibold text-primary mb-3">What we'll do next</h3>
                              <ul className="space-y-2 text-sm text-slate-900">
                                {secondaryActions.map((action, j) => (
                                  <li key={j} className="flex items-start gap-2">
                                    <span className="text-primary mt-1">•</span>
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
                    <div className="rounded-lg border border-primary/20 bg-brand-light p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-sm font-medium text-white">
                          {goal === 'weight-loss' ? 'Weight Loss' :
                           goal === 'build-muscle' ? 'Muscle Gain' :
                           goal === 'build-strength' ? 'Strength' :
                           goal === 'improve-fitness' ? 'Fitness' : 'General Health'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-900 mb-3">{explanation}</p>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-primary uppercase tracking-wide">What this entails:</p>
                        <ul className="list-disc pl-5 text-sm text-slate-900 space-y-1">
                          {whatItEntails.map((item, j) => <li key={j}>{item}</li>)}
                        </ul>
                      </div>
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-lg border border-primary/20 bg-brand-light p-4 shadow-sm">
                        <h3 className="text-base font-semibold text-primary mb-3">What we'll do first</h3>
                        <ul className="space-y-2 text-sm text-slate-900">
                          {goalActions.map((action, j) => (
                            <li key={j} className="flex items-start gap-2">
                              <span className="text-primary mt-1">•</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-lg border border-primary/20 bg-brand-light p-4 shadow-sm">
                        <h3 className="text-base font-semibold text-primary mb-3">What we'll do next</h3>
                        <ul className="space-y-2 text-sm text-slate-900">
                          {secondaryActions.map((action, j) => (
                            <li key={j} className="flex items-start gap-2">
                              <span className="text-primary mt-1">•</span>
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
        const hasStrength = formData?.pushupMaxReps && parseFloat(formData.pushupMaxReps) > 0;
        const hasCardio = formData?.cardioRestingHr && parseFloat(formData.cardioRestingHr) > 0;
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
        <div className="rounded-lg border border-primary/20 bg-brand-light p-4 shadow-sm">
          <p className="text-sm text-slate-900 mb-3">
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

      {/* 8. What We'll Focus On - Enhanced Personalization */}
      {plan?.clientScript && (
        <section className="space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">What We'll Focus On</h2>
            <p className="text-sm text-slate-600 italic">"Removing the brakes to put the pedal to the metal on your goals."</p>
          </div>
          
          <div className="grid gap-6">
            {/* The Plot: Findings */}
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-brand-light flex items-center justify-center">
                  <TargetIcon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">1. Your Starting Point</h3>
              </div>
              <ul className="space-y-4">
                {plan.clientScript.findings.map((finding: string, i: number) => (
                  <li key={i} className="flex gap-4 items-start">
                    <span className="h-6 w-6 rounded-full bg-brand-light text-primary flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">{i+1}</span>
                    <p className="text-slate-700 leading-relaxed font-medium">{finding}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* The Stakes: Why it Matters */}
            <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <TargetIcon className="h-32 w-32" />
              </div>
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-primary/60" />
                  </div>
                  <h3 className="text-xl font-bold">2. Why This Matters</h3>
                </div>
                <div className="space-y-4">
                  {plan.clientScript.whyItMatters.map((stake: string, i: number) => (
                    <p key={i} className="text-white/80/90 leading-relaxed italic border-l-2 border-primary/50 pl-4">{stake}</p>
                  ))}
                </div>
              </div>
            </div>

            {/* The Strategy: Action Plan */}
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">3. Our Strategy</h3>
              </div>
              <div className="grid gap-4">
                {plan.clientScript.actionPlan.map((action: string, i: number) => (
                  <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex gap-4 items-center">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                    <p className="text-slate-700 font-bold">{action}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 9. Sample Workout */}
      {plan?.clientWorkout ? (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Your Sample Workout</h2>
          
          <div className="space-y-4">
            {/* Warm-up */}
            {plan.clientWorkout.warmUp.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Warm-up</h3>
                <div className="space-y-3">
                  {plan.clientWorkout.warmUp.map((ex, i) => (
                    <div key={i} className="text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700 font-medium">{ex.name}</span>
                        <span className="text-slate-500 text-xs">
                          {ex.setsReps || ex.time || ''}
                        </span>
                      </div>
                      {ex.addresses && (
                        <p className="text-xs text-slate-500 italic mt-1">{ex.addresses}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Main Exercises */}
            {plan.clientWorkout.exercises.length > 0 && (
              <div className="bg-white rounded-xl border-2 border-primary p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Main Workout</h3>
                <div className="space-y-3">
                  {plan.clientWorkout.exercises.map((ex, i) => (
                    <div key={i} className="text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700 font-medium">{ex.name}</span>
                        <span className="text-primary font-semibold text-xs">
                          {ex.setsReps || ''}
                        </span>
                      </div>
                      {ex.addresses && (
                        <p className="text-xs text-slate-500 italic mt-1">{ex.addresses}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Finisher */}
            {plan.clientWorkout.finisher && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Finisher</h3>
                <div className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700 font-medium">{plan.clientWorkout.finisher.name}</span>
                    <span className="text-slate-500 text-xs">
                      {plan.clientWorkout.finisher.setsReps || plan.clientWorkout.finisher.time || ''}
                    </span>
                  </div>
                  {plan.clientWorkout.finisher.addresses && (
                    <p className="text-xs text-slate-500 italic mt-1">{plan.clientWorkout.finisher.addresses}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      ) : plan?.prioritizedExercises ? (
        // Fallback to old format if new format not available
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-900">Your Sample Workout Structure</h2>
          <p className="text-sm text-slate-600">
            This is how we'll blend your immediate needs with your long-term goals in a typical session.
          </p>
          
          <div className="grid gap-6">
            {/* Warm-up / Prep */}
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold italic">A</div>
                  <h3 className="text-lg font-bold text-slate-900">Performance Tuning (Warm-up)</h3>
                </div>
                <Badge variant="outline" className="border-blue-200 text-blue-600 bg-blue-50 font-bold">5-10 MIN</Badge>
              </div>
              <p className="text-sm text-slate-500">We start every session by "unlocking" your restricted patterns to prepare for load.</p>
              <div className="grid gap-3">
                {plan.prioritizedExercises.groups.filter(g => g.priority === 'critical' || g.priority === 'important').flatMap(g => g.exercises.slice(0, 3)).map((ex, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{ex.name}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">{ex.addresses.join(' • ')}</p>
                    </div>
                    <span className="text-xs font-medium text-slate-400">{ex.setsReps || '2 x 30s'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Main Block */}
            <div className="bg-white rounded-3xl border-2 border-primary p-8 shadow-md space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-primary text-white text-[10px] font-black px-4 py-2 rotate-12 shadow-lg">GOAL BLOCK</div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center text-white font-bold italic">B</div>
                <h3 className="text-lg font-bold text-slate-900">Main Training Block (The Work)</h3>
              </div>
              <p className="text-sm text-slate-500">The "heavy lifting" focused entirely on your primary goal of {goalLabel}.</p>
              <div className="grid gap-3">
                {plan.prioritizedExercises.goalExercises.slice(0, 3).map((goal: string, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-brand-light/50 border border-primary/10">
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <TargetIcon className="h-4 w-4 text-white" />
                    </div>
                    <p className="text-sm font-bold text-slate-900">{goal}</p>
                  </div>
                ))}
                {/* Specific exercises for the main block */}
                {plan.prioritizedExercises.groups.find(g => g.priority === 'goal-focused')?.exercises.map((ex, i) => (
                  <div key={`ex-${i}`} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{ex.name}</p>
                      <p className="text-xs text-slate-500 italic mt-0.5">{ex.reason}</p>
                    </div>
                    <Badge className="bg-primary text-white border-none text-[10px] font-black">{ex.setsReps || '3-4 Sets'}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Removed explicit expected timeframe to keep end date obscure */}
    </div>
  );
}



