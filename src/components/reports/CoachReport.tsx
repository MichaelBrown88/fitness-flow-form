import React from 'react';
import type { CoachPlan, BodyCompInterpretation } from '@/lib/recommendations';
import type { ScoreSummary } from '@/lib/scoring';

export default function CoachReport({ plan, scores, bodyComp }: { plan: CoachPlan; scores: ScoreSummary; bodyComp?: BodyCompInterpretation }) {
  return (
    <div className="space-y-8">
      {bodyComp && (
        <section className="space-y-3">
          <h3 className="text-xl font-semibold text-slate-900">Body Composition Interpretation</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h4 className="font-semibold text-slate-900">Health Priority</h4>
              {bodyComp.healthPriority.length ? (
                <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
                  {bodyComp.healthPriority.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              ) : (
                <p className="text-sm text-slate-600">No urgent priorities identified.</p>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h4 className="font-semibold text-slate-900">Timeframe Projection</h4>
              <p className="mt-2 text-sm text-slate-700">{bodyComp.timeframeWeeks}</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h4 className="font-semibold text-slate-900">Training Focus</h4>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
                <li><span className="font-medium">Primary:</span> {bodyComp.trainingFocus.primary}</li>
                {bodyComp.trainingFocus.secondary?.map((s, i) => <li key={i}><span className="font-medium">Secondary:</span> {s}</li>)}
                {bodyComp.trainingFocus.corrective?.map((c, i) => <li key={i}><span className="font-medium">Corrective:</span> {c}</li>)}
                {bodyComp.trainingFocus.unilateralVolume && <li><span className="font-medium">Unilateral:</span> {bodyComp.trainingFocus.unilateralVolume}</li>}
              </ul>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h4 className="font-semibold text-slate-900">Nutrition & Lifestyle</h4>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
                {bodyComp.nutrition.calorieRange && <li><span className="font-medium">Calories:</span> {bodyComp.nutrition.calorieRange}</li>}
                {bodyComp.nutrition.proteinTarget && <li><span className="font-medium">Protein:</span> {bodyComp.nutrition.proteinTarget}</li>}
                {bodyComp.nutrition.hydration && <li><span className="font-medium">Hydration:</span> {bodyComp.nutrition.hydration}</li>}
                {bodyComp.nutrition.carbTiming && <li><span className="font-medium">Carb timing:</span> {bodyComp.nutrition.carbTiming}</li>}
                {bodyComp.lifestyle.sleep && <li><span className="font-medium">Sleep:</span> {bodyComp.lifestyle.sleep}</li>}
                {bodyComp.lifestyle.stress && <li><span className="font-medium">Stress:</span> {bodyComp.lifestyle.stress}</li>}
                {bodyComp.lifestyle.dailyMovement && <li><span className="font-medium">Daily movement:</span> {bodyComp.lifestyle.dailyMovement}</li>}
                {bodyComp.lifestyle.inflammationReduction && <li><span className="font-medium">Inflammation:</span> {bodyComp.lifestyle.inflammationReduction}</li>}
              </ul>
            </div>
          </div>
        </section>
      )}
      <section className="space-y-2">
        <h3 className="text-xl font-semibold text-slate-900">Key Issues</h3>
        {plan.keyIssues.length === 0 ? (
          <p className="text-sm text-slate-600">No critical issues detected. Maintain strengths and progress gradually.</p>
        ) : (
          <ul className="list-disc pl-6 text-sm text-slate-700">
            {plan.keyIssues.map((i, idx) => <li key={idx}>{i}</li>)}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-slate-900">Programming Blocks</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {plan.movementBlocks.map((b, idx) => (
            <div key={`${b.title}-${idx}`} className="rounded-lg border border-slate-200 p-4 bg-white shadow-sm">
              <h4 className="font-semibold text-slate-900">{b.title}</h4>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
                {b.objectives.map((o, i) => <li key={i}>{o}</li>)}
              </ul>
              <div className="mt-3 space-y-2">
                {b.exercises.map((ex, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-slate-800">{ex.name}</span>
                    <span className="text-slate-500">{ex.setsReps}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-xl font-semibold text-slate-900">Category Scores</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {scores.categories.map(cat => (
            <div key={cat.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-700">{cat.title}</span>
                <span className="font-semibold">{cat.score}</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-slate-900" style={{ width: `${cat.score}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}


