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
    () => CATEGORY_ORDER.map(id => scores.categories.find(c => c.id === (id as any))).filter(Boolean) as ScoreSummary['categories'],
    [scores.categories]
  );
  const weeksByCategory: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {};
    // Goal-based baseline horizons (conservative)
    const weightKg = parseFloat(formData?.inbodyWeightKg || '0');
    const heightM = (parseFloat(formData?.heightCm || '0') || 0) / 100;
    const healthyMin = heightM > 0 ? 22 * heightM * heightM : 0;
    const healthyMax = heightM > 0 ? 25 * heightM * heightM : 0;
    const fatLossTarget = healthyMax > 0 && weightKg > healthyMax ? (weightKg - healthyMax) : 0;
    const fatLossWeeks = fatLossTarget > 0 ? Math.ceil(fatLossTarget / 0.5) : 16; // 0.5 kg/wk
    const muscleWeeks = 16; // recommend multi-block horizon
    const cardioWeeks = 12; // aerobic base build
    const mobilityWeeks = 6; // quicker wins
    const postureWeeks = 6; // quicker wins

    for (const cat of orderedCats) {
      let base = 12;
      if (cat.id === 'bodyComp') base = Math.max(12, Math.max(fatLossWeeks, muscleWeeks));
      if (cat.id === 'strength') base = muscleWeeks;
      if (cat.id === 'cardio') base = cardioWeeks;
      if (cat.id === 'mobility') base = mobilityWeeks;
      if (cat.id === 'posture') base = postureWeeks;
      map[cat.id] = Math.round(base * sessionFactor);
    }
    return map;
  }, [orderedCats, roadmap, sessionFactor]);
  const strengths = useMemo(() => orderedCats.flatMap(c => c.strengths.map(s => `${niceLabel(c.id)}: ${s}`)), [orderedCats]);
  const focusAreas = useMemo(() => orderedCats.flatMap(c => c.weaknesses.map(w => `${niceLabel(c.id)}: ${w}`)), [orderedCats]);
  const maxWeeks = useMemo(() => Math.max(...orderedCats.map(c => weeksByCategory[c.id] ?? 0), 0), [orderedCats, weeksByCategory]);
  return (
    <div className="space-y-8">
      {goals && goals.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xl font-semibold text-slate-900">Your Goals</h3>
          <div className="flex flex-wrap gap-2">
            {goals.map((g, i) => (
              <span key={`${g}-${i}`} className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
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
                const needLoss = maxW > 0 && weight > maxW ? (weight - maxW) : 0;
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
      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-slate-900">Your Fitness Summary</h3>
        <div className="flex items-center gap-6">
          <div className={`flex h-24 w-24 items-center justify-center rounded-full border-4 ${circleColor(scores.overall)}`}>
            <span className="text-2xl font-bold">{scores.overall}</span>
          </div>
          <div className="flex items-center gap-4">
            {orderedCats.map((cat) => (
              <div key={cat.id} className="flex flex-col items-center">
                <div className={`flex h-14 w-14 items-center justify-center rounded-full border-4 ${circleColor(cat.score)}`}>
                  <span className="text-sm font-semibold">{cat.score}</span>
                </div>
                <span className="mt-2 w-20 truncate text-center text-xs text-slate-600">{niceLabel(cat.id)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h4 className="font-semibold text-slate-900">Areas for Improvement</h4>
          {focusAreas.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">None flagged.</p>
          ) : (
            <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
              {focusAreas.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          )}
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h4 className="font-semibold text-slate-900">Areas of Strength</h4>
          {strengths.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">Will be updated as you progress.</p>
          ) : (
            <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
              {strengths.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-xl font-semibold text-slate-900">Your Roadmap</h3>
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

      <section className="space-y-3">
        <h3 className="text-xl font-semibold text-slate-900">Program Phases</h3>
        <p className="text-sm text-slate-600">These are the phases we’ll move through. The exact timing adapts to your progress and session cadence.</p>
        <div className="grid gap-3 md:grid-cols-2">
          {PROGRAM_PHASES.map(phase => (
            <div key={phase.key} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className={`mt-0.5 h-3 w-3 shrink-0 rounded ${phase.color}`} />
              <div>
                <h4 className="text-sm font-semibold text-slate-900">{phase.title}</h4>
                <p className="mt-1 text-xs text-slate-700">{phase.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-xl font-semibold text-slate-900">Milestones</h3>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">Preview at:</span>
            <input type="range" min={5} max={26} step={5} value={Math.min(26, Math.max(5, weeksByCategory['bodyComp'] ? 10 : 5))} readOnly />
            <div className="text-sm text-slate-700">5 / 10 / 20 / 26 weeks</div>
          </div>
          <ul className="mt-3 list-disc pl-5 text-sm text-slate-700 space-y-1.5">
            <li>5 weeks: better energy, improved movement quality, early strength gains.</li>
            <li>10 weeks: noticeable changes; strength +5–10%; if fat loss, ~3–5 kg down with adherence.</li>
            <li>20 weeks: significant progress; strength +10–20%; if building muscle, +2–4 kg; if fat loss, ~6–10+ kg.</li>
            <li>26 weeks: well on your way; compounded improvements across posture, mobility, strength and cardio.</li>
          </ul>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-xl font-semibold text-slate-900">How we’ll address it</h3>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1.5">
            <li>Body comp: nutrition structure (protein at each meal), aerobic base, progressive resistance training.</li>
            <li>Strength & endurance: compound lifts at appropriate loads, consistent progression, core stability.</li>
            <li>Cardio fitness: Zone 2 sessions, optional tempo/intervals as recovery allows.</li>
            <li>Mobility: targeted hip/shoulder/ankle drills in warm-ups; reinforce new range under light load.</li>
            <li>Posture & alignment: daily posture hygiene, correctives for flagged patterns, ergonomic cues.</li>
          </ul>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-xl font-semibold text-slate-900">Expected timeframe</h3>
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
          {goals && goals.length > 0 ? (
            <p>
              If you’re consistent with {sessionsPerWeek} sessions/week and daily habits, we expect steady progress across all areas.
              {bodyComp?.timeframeWeeks ? ` Body composition changes typically take ${bodyComp.timeframeWeeks}.` : ''} Posture and mobility
              often improve within 4–8 weeks, while strength and aerobic capacity build over 8–16+ weeks.
            </p>
          ) : (
            <p>
              With {sessionsPerWeek} sessions/week and consistent habits, posture and mobility often improve within 4–8 weeks,
              while strength and aerobic capacity build over 8–16+ weeks.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}


