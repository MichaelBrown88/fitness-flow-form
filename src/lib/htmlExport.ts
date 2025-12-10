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
  const orderedCats = ['bodyComp','strength','cardio','mobility','posture']
    .map(id => scores.categories.find(c => c.id === id))
    .filter(Boolean);
  
  // Calculate focus areas and strengths
  const focusAreas = orderedCats.flatMap(cat => 
    (cat?.weaknesses || []).map(w => {
      const label = cat?.id === 'bodyComp' ? 'Body comp' :
                   cat?.id === 'strength' ? 'Strength & endurance' :
                   cat?.id === 'cardio' ? 'Cardio fitness' :
                   cat?.id === 'mobility' ? 'Mobility' :
                   cat?.id === 'posture' ? 'Posture & alignment' : cat?.id || '';
      return `${label}: ${w}`;
    })
  );
  const strengths = orderedCats.flatMap(cat => 
    (cat?.strengths || []).map(s => {
      const label = cat?.id === 'bodyComp' ? 'Body comp' :
                   cat?.id === 'strength' ? 'Strength & endurance' :
                   cat?.id === 'cardio' ? 'Cardio fitness' :
                   cat?.id === 'mobility' ? 'Mobility' :
                   cat?.id === 'posture' ? 'Posture & alignment' : cat?.id || '';
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
        bodyComp: 'Body comp',
        strength: 'Strength & endurance',
        cardio: 'Cardio fitness',
        mobility: 'Mobility',
        posture: 'Posture & alignment'
      };
      return labels[id] || id;
    }
    
    function circleColor(score) {
      if (score >= 70) return 'border-green-500 bg-green-50 text-green-700';
      if (score >= 50) return 'border-amber-500 bg-amber-50 text-amber-700';
      return 'border-red-500 bg-red-50 text-red-700';
    }
    
    const CATEGORY_ORDER = ['bodyComp','strength','cardio','mobility','posture'];
    const CATEGORY_COLOR = {
      bodyComp: 'bg-emerald-500',
      strength: 'bg-indigo-500',
      cardio: 'bg-sky-500',
      mobility: 'bg-amber-500',
      posture: 'bg-rose-500',
    };
    
    const PROGRAM_PHASES = [
      { key: 'foundation', title: 'Building the Foundation', color: 'bg-slate-800', text: 'Movement quality, posture, breathing, and consistency. Install habits that make progress inevitable.' },
      { key: 'overload', title: 'Progressive Overload', color: 'bg-indigo-600', text: 'Gradually increase volume, intensity, or density with excellent technique to drive adaptations.' },
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
        orderedCats.forEach(cat => {
          const baseWeeks = cat.score < 50 ? 12 : cat.score < 70 ? 8 : 4;
          result[cat.id] = Math.round(baseWeeks * sessionFactor);
        });
        return result;
      }, [orderedCats, sessionFactor]);
      
      const maxWeeks = useMemo(() => 
        Math.max(...Object.values(weeksByCategory), 0),
        [weeksByCategory]
      );
      
      return (
        <div className="container">
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
              {formData.fullName || 'Client'}, your report is ready
            </h1>
            <p style={{ color: '#64748b', fontSize: '14px' }}>
              Here's a clear overview of where you are now, what we'll focus on first, and how we'll move you toward your goals.
            </p>
          </div>
          
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', textAlign: 'center', marginBottom: '20px' }}>
              Your Fitness Summary
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
          </section>
          
          {goals.length > 0 && (
            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Your goals & targets</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                {goals.map((goal, i) => (
                  <span key={i} style={{ 
                    padding: '4px 12px', 
                    borderRadius: '6px', 
                    backgroundColor: '#f1f5f9', 
                    fontSize: '14px',
                    color: '#1e293b'
                  }}>
                    {goal.replace('-', ' ')}
                  </span>
                ))}
              </div>
            </section>
          )}
          
          <section style={{ marginBottom: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>Areas for Improvement</h4>
              {focusAreas.length === 0 ? (
                <p style={{ fontSize: '14px', color: '#64748b' }}>None flagged.</p>
              ) : (
                <ul style={{ marginTop: '8px', paddingLeft: '20px', fontSize: '14px', color: '#475569', listStyle: 'disc' }}>
                  {focusAreas.map((f, i) => <li key={i} style={{ marginBottom: '4px' }}>{f}</li>)}
                </ul>
              )}
            </div>
            <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>Areas of Strength</h4>
              {strengths.length === 0 ? (
                <p style={{ fontSize: '14px', color: '#64748b' }}>Will be updated as you progress.</p>
              ) : (
                <ul style={{ marginTop: '8px', paddingLeft: '20px', fontSize: '14px', color: '#475569', listStyle: 'disc' }}>
                  {strengths.map((s, i) => <li key={i} style={{ marginBottom: '4px' }}>{s}</li>)}
                </ul>
              )}
            </div>
          </section>
          
          {(priorityFocus.length > 0 || lifestyleRecs.length > 0) && (
            <section style={{ marginBottom: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              {priorityFocus.length > 0 && (
                <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#991b1b', marginBottom: '8px' }}>Priority Focus</h4>
                  <ul style={{ marginTop: '8px', paddingLeft: '20px', fontSize: '14px', color: '#7f1d1d', listStyle: 'disc' }}>
                    {priorityFocus.map((p, i) => <li key={i} style={{ marginBottom: '4px' }}>{p}</li>)}
                  </ul>
                </div>
              )}
              {lifestyleRecs.length > 0 && (
                <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#166534', marginBottom: '8px' }}>Lifestyle Recommendations</h4>
                  <ul style={{ marginTop: '8px', paddingLeft: '20px', fontSize: '14px', color: '#14532d', listStyle: 'disc' }}>
                    {lifestyleRecs.map((p, i) => <li key={i} style={{ marginBottom: '4px' }}>{p}</li>)}
                  </ul>
                </div>
              )}
            </section>
          )}
          
          {nutritionAdvice.length > 0 && (
            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Nutrition focus</h3>
              <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <ul style={{ paddingLeft: '20px', fontSize: '14px', color: '#475569', listStyle: 'disc' }}>
                  {nutritionAdvice.map((n, i) => (
                    <li key={i} style={{ marginBottom: '6px' }}>{n}</li>
                  ))}
                </ul>
              </div>
            </section>
          )}
          
          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Your Roadmap</h3>
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
          
          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Program Phases</h3>
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
          
          {bodyComp && bodyComp.timeframeWeeks && (
            <section style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px' }}>Body Composition Timeline</h3>
              <div style={{ 
                padding: '16px', 
                borderRadius: '8px', 
                border: '1px solid #e2e8f0', 
                backgroundColor: 'white'
              }}>
                <p style={{ fontSize: '14px', color: '#475569' }}>{bodyComp.timeframeWeeks}</p>
              </div>
            </section>
          )}
          
          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>How we'll address it</h3>
            <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <ul style={{ paddingLeft: '20px', fontSize: '14px', color: '#475569', listStyle: 'disc' }}>
                <li style={{ marginBottom: '6px' }}>Body comp: nutrition structure (protein at each meal), aerobic base, progressive resistance training.</li>
                <li style={{ marginBottom: '6px' }}>Strength & endurance: compound lifts at appropriate loads, consistent progression, core stability.</li>
                <li style={{ marginBottom: '6px' }}>Cardio fitness: Zone 2 sessions, optional tempo/intervals as recovery allows.</li>
                <li style={{ marginBottom: '6px' }}>Mobility: targeted hip/shoulder/ankle drills in warm-ups; reinforce new range under light load.</li>
                <li style={{ marginBottom: '6px' }}>Posture & alignment: daily posture hygiene, correctives for flagged patterns, ergonomic cues.</li>
              </ul>
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
