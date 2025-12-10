import React, { useMemo, useState } from 'react';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary, RoadmapPhase } from '@/lib/scoring';

type BodyCompInterp = { timeframeWeeks: string };

function circleColor(score: number): string {
  if (score >= 75) return 'border-green-500 text-green-700';
  if (score >= 45) return 'border-amber-500 text-amber-700';
  return 'border-red-500 text-red-700';
}

function niceLabel(id: string): string {
  switch (id) {
    case 'bodyComp': return 'Body comp';
    case 'strength': return 'Strength & endurance';
    case 'cardio': return 'Cardio fitness';
    case 'mobility': return 'Mobility';
    case 'posture': return 'Posture & alignment';
    default: return id;
  }
}

const CATEGORY_ORDER = ['bodyComp','strength','cardio','mobility','posture'];
const CATEGORY_COLOR: Record<string, string> = {
  bodyComp: 'bg-emerald-500',
  strength: 'bg-indigo-500',
  cardio: 'bg-sky-500',
  mobility: 'bg-amber-500',
  posture: 'bg-rose-500',
};

const CATEGORY_EXPLANATIONS: Record<string, string> = {
  bodyComp: "Your body's makeup—muscle, fat, and water. Think of it as the foundation for everything else.",
  strength: "How strong you are and how long you can sustain effort. This affects daily activities and injury prevention.",
  cardio: "Your heart and lung capacity. This determines how efficiently your body uses oxygen during activity.",
  mobility: "How well your joints move through their full range. Better mobility means better movement quality and fewer aches.",
  posture: "How your body holds itself. Good posture reduces pain, improves breathing, and makes movement more efficient.",
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
    () => scores?.categories ? CATEGORY_ORDER.map(id => scores.categories.find(c => c.id === (id as 'bodyComp' | 'strength' | 'cardio' | 'mobility' | 'posture'))).filter(Boolean) as ScoreSummary['categories'] : [],
    [scores?.categories]
  );
  const weeksByCategory: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {};
    if (!orderedCats.length) return map;
    // Goal-based baseline horizons (conservative)
    const weightKg = parseFloat(formData?.inbodyWeightKg || '0');
    const heightM = (parseFloat(formData?.heightCm || '0') || 0) / 100;
    const healthyMin = heightM > 0 ? 22 * heightM * heightM : 0;
    const healthyMax = heightM > 0 ? 25 * heightM * heightM : 0;
    // Weight loss level logic
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
      if (cat.id === 'mobility') base = mobilityWeeks;
      if (cat.id === 'posture') base = postureWeeks;
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

  // Calculate "What we'll do first" - immediate actionable steps
  const immediateActions = useMemo(() => {
    const actions: string[] = [];
    // Priority health risks first
    if (priorityFocus.length > 0) {
      if (priorityFocus.some(p => p.includes('urgent') || p.includes('health risk'))) {
        actions.push('Address body composition concerns with structured nutrition and safe training progression');
      }
      if (priorityFocus.some(p => p.includes('visceral fat'))) {
        actions.push('Reduce visceral fat through daily movement (walking) and nutrition adjustments');
      }
    }
    // Movement quality issues
    const mobilityIssues = focusAreas.filter(f => f.toLowerCase().includes('mobility'));
    if (mobilityIssues.length > 0) {
      actions.push(`Improve ${mobilityIssues[0].split(':')[0].toLowerCase()} with targeted mobility drills 3x/week`);
    }
    const postureIssues = focusAreas.filter(f => f.toLowerCase().includes('posture'));
    if (postureIssues.length > 0) {
      actions.push('Integrate daily posture correctives (5-10 min) to address alignment patterns');
    }
    // Strength/endurance gaps
    const strengthIssues = focusAreas.filter(f => f.toLowerCase().includes('strength') || f.toLowerCase().includes('endurance'));
    if (strengthIssues.length > 0 && actions.length < 5) {
      actions.push('Build foundational strength with compound movements 2-3x/week');
    }
    // Cardio if needed
    const cardioIssues = focusAreas.filter(f => f.toLowerCase().includes('cardio'));
    if (cardioIssues.length > 0 && actions.length < 5) {
      actions.push('Establish Zone 2 cardio base with 2-3 sessions per week');
    }
    // Default if nothing specific
    if (actions.length === 0) {
      actions.push('Focus on consistency: 3 training sessions per week with proper form');
      actions.push('Prioritise protein at each meal and stay hydrated throughout the day');
    }
    return actions.slice(0, 5);
  }, [priorityFocus, focusAreas]);

  // Calculate "Quick wins" - improvements in 2-4 weeks
  const quickWins = useMemo(() => {
    const wins: string[] = [];
    if (orderedCats.some(c => c.id === 'mobility' && c.score < 70)) {
      wins.push('Mobility: Noticeable improvement in joint range within 2-4 weeks');
    }
    if (orderedCats.some(c => c.id === 'posture' && c.score < 70)) {
      wins.push('Posture: Better alignment and reduced tension within 2-3 weeks');
    }
    if (lifestyleRecs.some(l => l.toLowerCase().includes('sleep'))) {
      wins.push('Energy: Better sleep quality leads to improved recovery and mood');
    }
    if (lifestyleRecs.some(l => l.toLowerCase().includes('movement') || l.toLowerCase().includes('steps'))) {
      wins.push('Daily movement: Increased steps improve energy and recovery');
    }
    if (wins.length === 0) {
      wins.push('Movement quality: Sessions will feel smoother and more controlled');
      wins.push('Recovery: Better sleep and hydration improve how you feel day-to-day');
    }
    return wins.slice(0, 4);
  }, [orderedCats, lifestyleRecs]);

  if (!scores || !scores.categories || scores.categories.length === 0) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Results are not available yet. Please complete the assessment steps and try again.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-1">
        <h2 className="text-xl font-semibold text-slate-900">
          {clientName ? `${clientName}, your report is ready` : 'Your report is ready'}
        </h2>
        <p className="text-sm text-slate-600">
          Here’s a clear overview of where you are now, what we’ll focus on first, and how we’ll move you toward your goals.
        </p>
      </section>
      {/* 1. Here's where you are */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-900 text-center">Here's where you are</h2>
        <div className="flex flex-col items-center gap-5">
          {/* Overall score centered and prominent */}
          <div className="flex flex-col items-center">
            <div className={`flex h-28 w-28 items-center justify-center rounded-full border-4 ${circleColor(scores.overall)}`}>
              <span className="text-3xl font-bold">{scores.overall}</span>
            </div>
            <span className="mt-2 text-sm font-medium text-slate-700">Overall score</span>
          </div>
          {/* Category circles centered under overall */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            {orderedCats.map((cat) => (
              <div key={cat.id} className="flex flex-col items-center">
                <div className={`flex h-14 w-14 items-center justify-center rounded-full border-4 ${circleColor(cat.score)}`}>
                  <span className="text-sm font-semibold">{cat.score}</span>
                </div>
                <span className="mt-2 w-28 text-center text-xs text-slate-600 leading-tight" style={{ wordBreak: 'break-word', hyphens: 'auto' }}>{niceLabel(cat.id)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. What this means */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">What this means</h2>
        <p className="text-sm text-slate-600">Each category measures a different aspect of your fitness. Here's what they mean:</p>
        <div className="grid gap-3 md:grid-cols-2">
          {orderedCats.map((cat) => (
            <div key={cat.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className={`h-10 w-10 rounded-full border-2 ${circleColor(cat.score)} flex items-center justify-center`}>
                  <span className="text-sm font-semibold">{cat.score}</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{niceLabel(cat.id)}</h3>
              </div>
              <p className="text-sm text-slate-700">{CATEGORY_EXPLANATIONS[cat.id]}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. What needs attention */}
      {priorityFocus.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-bold text-slate-900">What needs attention</h2>
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-rose-800 mb-3">Priority focus</h3>
            <ul className="list-disc pl-5 text-sm text-rose-900 space-y-2">
              {priorityFocus.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        </section>
      )}

      {/* 4. What's working well */}
      {strengths.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-bold text-slate-900">What's working well</h2>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <p className="text-sm text-emerald-900 mb-3">These are areas where you're already strong. We'll maintain and build on these:</p>
            <ul className="list-disc pl-5 text-sm text-emerald-900 space-y-2">
              {strengths.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        </section>
      )}

      {/* 5. Your goals */}
      {goals && goals.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-bold text-slate-900">Your goals</h2>
          <div className="flex flex-wrap gap-2">
            {goals.map((g, i) => (
              <span
                key={`${g}-${i}`}
                className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
              >
                {g.replace('-', ' ')}
              </span>
            ))}
          </div>
          {/* Recommended targets based on your data */}
          {formData && formData.inbodyWeightKg && formData.heightCm && (
            <div className="mt-2 rounded border border-slate-200 bg-white p-3 text-xs text-slate-700">
              {(() => {
                const weight = parseFloat(formData.inbodyWeightKg || '0');
                const h = (parseFloat(formData.heightCm || '0') || 0) / 100;
                const minW = h > 0 ? 22 * h * h : 0;
                const maxW = h > 0 ? 25 * h * h : 0;
                const needLoss = maxW > 0 && weight > maxW ? weight - maxW : 0;
                return (
                  <div className="space-y-1.5">
                    <div>
                      <span className="font-medium">Healthy weight range: </span>
                      {minW && maxW ? `${minW.toFixed(1)}–${maxW.toFixed(1)} kg` : 'n/a'}
                      {needLoss > 0 && ` (≈${needLoss.toFixed(1)} kg above range)`}
                    </div>
                    {goals?.includes('build-muscle') && (
                      <div>
                        <span className="font-medium">Muscle gain pace: </span>
                        ~0.1–0.25 kg/week with consistent training and nutrition.
                      </div>
                    )}
                    {goals?.includes('build-strength') && (
                      <div>
                        <span className="font-medium">Strength progression: </span>
                        ~5–10% in 10 weeks; ~10–20% in 20 weeks (lift-dependent).
                      </div>
                    )}
                    {goals?.includes('improve-fitness') && (
                      <div>
                        <span className="font-medium">Cardio improvements: </span>
                        VO₂max typically improves ~3–7 ml/kg/min over 12–20 weeks.
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </section>
      )}

      {/* 6. What we'll do first */}
      {immediateActions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-bold text-slate-900">What we'll do first</h2>
          <p className="text-sm text-slate-600">These are the immediate steps we'll take to get you moving in the right direction:</p>
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
            <ol className="list-decimal pl-5 text-sm text-indigo-900 space-y-2">
              {immediateActions.map((action, i) => <li key={i}>{action}</li>)}
            </ol>
          </div>
        </section>
      )}

      {/* 7. Quick wins */}
      {quickWins.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-bold text-slate-900">Quick wins</h2>
          <p className="text-sm text-slate-600">You'll notice improvements in these areas within 2-4 weeks:</p>
          <div className="grid gap-3 md:grid-cols-2">
            {quickWins.map((win, i) => (
              <div key={i} className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
                <p className="text-sm text-amber-900">{win}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 8. Your roadmap */}


      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-slate-900">Your roadmap</h2>
        <p className="text-sm text-slate-600">Adjust the sessions per week to see how it affects your timeline:</p>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600">Sessions/week:</span>
          <input type="range" min={3} max={5} step={1} value={sessionsPerWeek} onChange={(e) => setSessionsPerWeek(parseInt(e.target.value))} />
          <span className="text-sm font-medium text-slate-800">{sessionsPerWeek}</span>
        </div>
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          {orderedCats.map(cat => {
            const weeks = weeksByCategory[cat.id] ?? 3;
            const color = CATEGORY_COLOR[cat.id] || 'bg-slate-500';
            return (
              <div key={cat.id}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-800">{niceLabel(cat.id)}</span>
                  <span className="text-xs text-slate-500">~{weeks} weeks</span>
                </div>
                <div className="h-3 w-full rounded bg-slate-100">
                  <div className={`h-3 rounded ${color}`} style={{ width: `${Math.min(100, (weeks / 26) * 100)}%` }} />
                </div>
              </div>
            );
          })}
          <div className="mt-2 flex justify-between text-[10px] text-slate-500">
            <span>0</span><span>5</span><span>10</span><span>20</span><span>26+w</span>
          </div>
          <div className="mt-3 text-xs text-slate-600">
            By ~{maxWeeks} weeks you’re well on your way toward your primary goals. Timelines adjust with your weekly sessions and consistency.
          </div>
        </div>
      </section>

      {/* 9. How we'll address it */}
      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-slate-900">How we'll address it</h2>
        <p className="text-sm text-slate-600">These are the phases we'll move through. The exact timing adapts to your progress and session cadence.</p>
        <div className="flex gap-3 overflow-x-auto py-1">
          {PROGRAM_PHASES.map(phase => (
            <div key={phase.key} className="flex min-w-64 shrink-0 items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className={`mt-0.5 h-3 w-3 shrink-0 rounded ${phase.color}`} />
              <div>
                <h4 className="text-sm font-semibold text-slate-900">{phase.title}</h4>
                <p className="mt-1 text-xs text-slate-700">{phase.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 10. What to expect */}
      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-slate-900">What to expect</h2>
        {(() => {
          const primaryGoal = (goals && goals[0]) || '';
          const goalLabel =
            primaryGoal === 'weight-loss' ? 'weight-loss'
            : primaryGoal === 'build-muscle' ? 'muscle gain'
            : primaryGoal === 'build-strength' ? 'strength'
            : primaryGoal === 'improve-fitness' ? 'fitness'
            : 'goals';
          const headlineIssues = focusAreas.slice(0, 3);
          return (
            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
              <p className="text-sm text-slate-700">
                From day one we’ll start addressing {headlineIssues.length ? headlineIssues.join(', ') : 'key limiters'} that could be holding you back.
                At the same time we’ll build a plan that moves you steadily toward your {goalLabel}.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Weeks 1–4</div>
                  <div className="mt-1 text-sm text-slate-800">
                    You’ll move better and feel more stable. Sessions feel “right” as posture and mobility improve; energy and recovery lift.
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Weeks 5–10</div>
                  <div className="mt-1 text-sm text-slate-800">
                    Noticeable change: early strength increases, better HR recovery, and visible momentum toward your {goalLabel}.
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Weeks 11–20</div>
                  <div className="mt-1 text-sm text-slate-800">
                    Significant shift: stronger lifts, better pace, or visible body composition changes others begin to notice.
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">~{Math.max(20, maxWeeks)} weeks</div>
                  <div className="mt-1 text-sm text-slate-800">
                    You’re well on your way—clearly resembling the person you set out to become, with momentum to keep elevating.
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </section>

      {/* 11. Lifestyle support */}
      {(lifestyleRecs.length > 0 || nutritionAdvice.length > 0) && (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">Lifestyle support</h2>
          {lifestyleRecs.length > 0 && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-emerald-800 mb-3">Daily habits</h3>
              <ul className="list-disc pl-5 text-sm text-emerald-900 space-y-2">
                {lifestyleRecs.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}
          {nutritionAdvice.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Nutrition focus</h3>
              <ul className="list-disc pl-5 text-sm text-slate-700 space-y-2">
                {nutritionAdvice.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Sample Workout - last section, with brackets to show purpose and step target */}
      {(() => {
        const g0 = (goals && goals[0]) || '';
        const warmup: string[] = [];
        const activation: string[] = [];
        const main: string[] = [];
        const accessories: string[] = [];
        const finisher: string[] = [];
        // Flags for bracket tags
        const add = (arr: string[], text: string, tag?: string) => arr.push(tag ? `${text} (${tag})` : text);
        // Correctives
        if (formData?.mobilityHip && formData.mobilityHip !== 'good' || focusAreas.find(f => f.toLowerCase().includes('hip mobility'))) {
          add(warmup, '90/90 hip switches 2 x 6/side', 'hip mobility');
          add(warmup, 'Hip flexor stretch 2 x 45s/side', 'hip mobility');
        }
        if (formData?.mobilityShoulder && formData.mobilityShoulder !== 'good' || focusAreas.find(f => f.toLowerCase().includes('shoulder mobility'))) {
          add(warmup, 'PVC shoulder dislocates 2 x 8', 'shoulder mobility');
          add(warmup, 'Wall slides 2 x 8', 'shoulder mobility');
        }
        if (formData?.mobilityAnkle && formData.mobilityAnkle !== 'good' || focusAreas.find(f => f.toLowerCase().includes('ankle mobility'))) {
          add(warmup, 'Knee-to-wall ankle mobilisations 2 x 8/side', 'ankle mobility');
        }
        if ((formData?.postureBackOverall && formData.postureBackOverall !== 'neutral') || focusAreas.find(f => f.toLowerCase().includes('spinal'))) {
          add(warmup, 'T‑spine extensions over foam roller 2 x 8', 'posture');
        }
        if (focusAreas.find(f => f.toLowerCase().includes('knee alignment'))) {
          add(activation, 'Mini‑band lateral walks 2 x 10 steps/side', 'knee tracking');
          add(activation, 'Split squat knee tracking drill 2 x 8/side', 'knee tracking');
        }
        if (focusAreas.find(f => f.toLowerCase().includes('core endurance'))) {
          add(activation, 'Dead bug 2 x 8/side', 'core stability');
          add(activation, 'Front plank 2 x 30–45s', 'core stability');
        }
        // Goal-driven main
        if (g0 === 'weight-loss') {
          add(main, 'Goblet squat 3–4 x 8–12', 'strength base');
          add(main, 'DB bench press 3–4 x 8–12', 'strength base');
          add(main, '1‑arm row 3–4 x 8–12/side', 'strength base');
          add(accessories, 'Hip hinge (RDL) 3 x 8–10', 'posterior chain');
          add(accessories, 'Walking lunge 2–3 x 8/side', 'single‑leg stability');
          add(finisher, 'Zone 2 cardio 15–20 min (bike/row/treadmill)', 'body comp');
        } else if (g0 === 'build-muscle') {
          add(main, 'Back squat 4 x 6–8', 'hypertrophy');
          add(main, 'Bench press 4 x 6–8', 'hypertrophy');
          add(main, 'Chest‑supported row 4 x 8–10', 'hypertrophy');
          add(accessories, 'Romanian deadlift 3 x 8–10', 'posterior chain');
          add(accessories, 'Lateral raise 3 x 12–15', 'deltoids');
          add(accessories, 'Face pulls 3 x 12–15', 'scapular control');
          add(finisher, 'Optional: easy 10–15 min Zone 2', 'recovery');
        } else if (g0 === 'build-strength') {
          add(main, 'Back squat 5 x 3 @ RPE 7–8', 'strength');
          add(main, 'Bench press 5 x 3 @ RPE 7–8', 'strength');
          add(main, 'Deadlift 3 x 3 @ RPE 7–8', 'strength');
          add(accessories, 'Paused squat 3 x 3–5', 'technique');
          add(accessories, 'Row variation 3 x 6–8', 'upper back');
          add(finisher, 'Breathing/box‑breathing 5 min', 'recovery');
        } else if (g0 === 'improve-fitness') {
          add(main, 'Tempo intervals: 6 x 2 min hard / 2 min easy', 'cardio fitness');
          add(main, 'Zone 2 steady 20–30 min (alt days)', 'cardio base');
          add(accessories, 'Split squat 3 x 8/side', 'single‑leg strength');
          add(accessories, 'Pushups 3 x 8–12', 'upper body endurance');
          add(accessories, 'Row 3 x 8–12', 'upper back');
          add(finisher, 'Optional strides / hill repeats', 'form & turnover');
        } else {
          add(main, 'Circuit: Goblet squat 10, Pushups 8–12, 1‑arm row 10/side, Hip hinge 10', 'general conditioning');
          add(finisher, 'Walk 10–15 min cooldown', 'recovery');
        }
        // Heading for primary goal block
        const goalBlockTitle =
          g0 === 'weight-loss' ? 'Primary block — Fat‑loss training'
          : g0 === 'build-muscle' ? 'Primary block — Hypertrophy'
          : g0 === 'build-strength' ? 'Primary block — Strength'
          : g0 === 'improve-fitness' ? 'Primary block — Cardio fitness'
          : 'Primary block';
        // Daily step target
        const stepsNow = parseFloat(formData?.stepsPerDay || '0');
        let stepTarget = '7000–9000';
        if (!isNaN(stepsNow)) {
          if (stepsNow < 4000) stepTarget = '5000–7000';
          else if (stepsNow < 7000) stepTarget = '7000–9000';
          else stepTarget = '8000–10000';
        }
        return (
          <section className="space-y-3">
            <h2 className="text-2xl font-bold text-slate-900">Sample workout</h2>
            <p className="text-sm text-slate-600">Here's an example of what a typical session might look like, tailored to your needs:</p>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Correctives — addressing your main concerns</h4>
                  <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
                    {warmup.length === 0 && <li>Dynamic mobility targeting hips/shoulders/ankles as needed</li>}
                    {warmup.map((w, i) => <li key={`wu-${i}`}>{w}</li>)}
                    {activation.map((a, i) => <li key={`act-${i}`}>{a}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">{goalBlockTitle}</h4>
                  <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
                    {main.map((m, i) => <li key={`main-${i}`}>{m}</li>)}
                    {accessories.length > 0 && <li className="mt-2 font-medium text-slate-800">Accessories</li>}
                    {accessories.map((a, i) => <li key={`acc-${i}`}>{a}</li>)}
                    {finisher.length > 0 && <li className="mt-2 font-medium text-slate-800">Finisher</li>}
                    {finisher.map((f, i) => <li key={`fin-${i}`}>{f}</li>)}
                  </ul>
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <h5 className="text-xs font-semibold text-slate-800">Daily movement</h5>
                  <p className="mt-1 text-xs text-slate-700">Daily steps target: {stepTarget} per day. Short walk breaks between sessions boost recovery and fat‑loss.</p>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <h5 className="text-xs font-semibold text-slate-800">Progression</h5>
                  <p className="mt-1 text-xs text-slate-700">We’ll increase volume/intensity as movement improves—technique first, load follows.</p>
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* Removed explicit expected timeframe to keep end date obscure */}
    </div>
  );
}


