import React, { useMemo } from 'react';
import type { CoachPlan, BodyCompInterpretation } from '@/lib/recommendations';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring';
import OverallRadarChart from './OverallRadarChart';
import { CheckCircle2, AlertCircle, MessageSquare, Target, ClipboardList, Activity } from 'lucide-react';

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

export default function CoachReport({
  plan,
  scores,
  bodyComp,
  formData,
}: {
  plan: CoachPlan;
  scores: ScoreSummary;
  bodyComp?: BodyCompInterpretation;
  formData?: FormData;
}) {
  if (!scores || !scores.categories || scores.categories.length === 0) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Results are not available yet. Please complete the assessment steps and try again.
      </div>
    );
  }
  const clientName = (formData?.fullName || '').trim();
  const goals = Array.isArray(formData?.clientGoals) ? (formData!.clientGoals as string[]) : [];
  
  const overallRadarData = useMemo(() => {
    return scores.categories.map(cat => ({
      name: niceLabel(cat.id).split(' ')[0],
      fullLabel: niceLabel(cat.id),
      value: cat.score,
      color: '#3b82f6',
    }));
  }, [scores.categories]);

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <section className="flex flex-col md:flex-row md:items-start justify-between gap-8 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
        <div className="space-y-4 flex-1">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold text-slate-900">
              {clientName ? `${clientName}` : 'Client Overview'}
            </h2>
            <p className="text-indigo-600 font-semibold uppercase tracking-wider text-xs">
              Coach Assessment & Strategy
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {goals.map(g => (
              <span key={g} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold uppercase tracking-wide">
                {g.replace('-', ' ')}
              </span>
            ))}
          </div>

          <p className="text-slate-500 text-sm leading-relaxed max-w-xl italic">
            "Quick snapshot of this client’s priorities, key findings, and how the program will address them while moving toward their goals."
          </p>
        </div>
        <div className="w-full md:w-72 flex-shrink-0 bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <OverallRadarChart data={overallRadarData} />
        </div>
      </section>

      {/* FIRST SESSION SCRIPT */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">First Session Talking Points</h3>
        </div>

        <div className="grid gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">1. What we found</h4>
                <ul className="space-y-2">
                  {plan.clientScript.findings.map((item, i) => (
                    <li key={i} className="flex gap-3 text-slate-700 text-sm">
                      <span className="text-indigo-500 font-bold">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">2. Why this matters for your goals</h4>
                <ul className="space-y-2">
                  {plan.clientScript.whyItMatters.map((item, i) => (
                    <li key={i} className="flex gap-3 text-slate-700 text-sm">
                      <span className="text-amber-500 font-bold">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">3. Our immediate focus</h4>
                <ul className="space-y-2">
                  {plan.clientScript.actionPlan.map((item, i) => (
                    <li key={i} className="flex gap-3 text-slate-700 text-sm font-medium">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid md:grid-cols-2 gap-6 pt-4 mt-4 border-t border-slate-100">
                <div>
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">4. 2-3 Month Outlook</h4>
                  <ul className="space-y-2">
                    {plan.clientScript.threeMonthOutlook.map((item, i) => (
                      <li key={i} className="flex gap-3 text-slate-700 text-sm">
                        <Target className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">5. Your Commitment</h4>
                  <ul className="space-y-2">
                    {plan.clientScript.clientCommitment.map((item, i) => (
                      <li key={i} className="flex gap-3 text-slate-700 text-sm">
                        <span className="text-indigo-500 font-bold">{i + 1}.</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INTERNAL COACH NOTES */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-slate-800 p-2 rounded-lg">
            <ClipboardList className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Internal Coaching Notes</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-6">
            <h4 className="text-emerald-800 font-bold mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              What they're doing well
            </h4>
            <ul className="space-y-3">
              {plan.internalNotes.doingWell.map((note, i) => (
                <li key={i} className="text-emerald-900 text-sm flex gap-2">
                  <span className="font-bold">•</span>
                  {note}
                </li>
              ))}
              {plan.internalNotes.doingWell.length === 0 && <li className="text-emerald-600 text-sm italic">Standard baseline.</li>}
            </ul>
          </div>

          <div className="bg-rose-50 rounded-2xl border border-rose-100 p-6">
            <h4 className="text-rose-800 font-bold mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Areas to address
            </h4>
            <ul className="space-y-3">
              {plan.keyIssues.map((issue, i) => (
                <li key={`issue-${i}`} className="text-rose-900 text-sm font-bold flex gap-2">
                  <span className="text-rose-500">!</span>
                  {issue}
                </li>
              ))}
              {plan.internalNotes.needsAttention.map((note, i) => (
                <li key={`note-${i}`} className="text-rose-900 text-sm flex gap-2 border-t border-rose-100/50 pt-2 first:border-t-0 first:pt-0">
                  <span className="font-bold">•</span>
                  {note}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* PROGRAMMING STRATEGIES */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-sky-600 p-2 rounded-lg">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Programming Strategies & Exercises</h3>
        </div>

        <div className="grid gap-4">
          {plan.programmingStrategies.map((s, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <h4 className="font-bold text-slate-900">{s.title}</h4>
                <span className="px-3 py-1 bg-sky-50 text-sky-700 rounded-full text-[10px] font-bold uppercase tracking-widest">Strategy</span>
              </div>
              <p className="text-sm text-slate-600 mb-4">{s.strategy}</p>
              <div className="flex flex-wrap gap-2">
                {s.exercises.map((ex, j) => (
                  <span key={j} className="px-3 py-1.5 bg-slate-50 border border-slate-100 text-slate-700 rounded-xl text-xs font-medium">
                    {ex}
                  </span>
                ))}
              </div>
            </div>
          ))}
          
          {plan.movementBlocks.map((b, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <h4 className="font-bold text-slate-900">{b.title}</h4>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold uppercase tracking-widest">Movement Block</span>
              </div>
              <ul className="mb-4 space-y-1">
                {b.objectives.map((o, i) => (
                  <li key={i} className="text-xs text-slate-500 flex gap-2">
                    <span className="text-indigo-400 font-bold">•</span> {o}
                  </li>
                ))}
              </ul>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {b.exercises.map((ex, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <span className="text-sm font-bold text-slate-800">{ex.name}</span>
                    <span className="text-xs font-medium text-slate-500">{ex.setsReps}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SEGMENTAL GUIDANCE */}
      {formData?.postureAiResults && (
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">AI Posture Metrics</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(formData.postureAiResults).map(([view, analysis]: [string, any]) => (
              <div key={view} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{view} Analysis</span>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold uppercase tracking-tighter">Head Deviation</span>
                    <span className="font-black text-slate-900">{analysis.head_posture?.deviation_degrees}°</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold uppercase tracking-tighter">Shoulder Offset</span>
                    <span className="font-black text-slate-900">{analysis.shoulder_alignment?.vertical_offset_cm}cm</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold uppercase tracking-tighter">Pelvic Tilt</span>
                    <span className="font-black text-slate-900">{analysis.pelvic_position?.tilt_degrees}°</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-50">
                  <p className="text-[10px] text-slate-600 leading-tight italic">"{analysis.head_posture?.description}"</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SEGMENTAL GUIDANCE */}
      {plan.segmentalGuidance && plan.segmentalGuidance.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-lg">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Lean Mass Distribution</h3>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <ul className="space-y-3">
              {plan.segmentalGuidance.map((item, i) => (
                <li key={i} className="flex gap-3 text-slate-700 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {bodyComp && (
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-amber-600 p-2 rounded-lg">
              <Target className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Body Composition Analysis</h3>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Health Priority & Timeframe */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h4 className="font-bold mb-3 text-sm uppercase tracking-widest text-slate-400">Health Priority</h4>
                {bodyComp.healthPriority.length ? (
                  <ul className="space-y-2">
                    {bodyComp.healthPriority.map((p, i) => (
                      <li key={i} className="text-sm text-slate-700 flex gap-2">
                        <span className="text-indigo-500 font-bold">•</span> {p}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500 italic">No urgent priorities identified.</p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h4 className="font-bold mb-3 text-sm uppercase tracking-widest text-slate-400">Training Focus</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">Primary Block</p>
                    <p className="text-sm text-slate-900 font-semibold">{bodyComp.trainingFocus.primary}</p>
                  </div>
                  {bodyComp.trainingFocus.secondary && (
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">Secondary Focus</p>
                      <ul className="text-sm text-slate-700 list-disc list-inside">
                        {bodyComp.trainingFocus.secondary.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {bodyComp.trainingFocus.unilateralVolume && (
                    <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                      <p className="text-xs font-bold text-indigo-600 uppercase tracking-tight">Unilateral Strategy</p>
                      <p className="text-sm text-indigo-900">{bodyComp.trainingFocus.unilateralVolume}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Nutrition & Lifestyle */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h4 className="font-bold mb-3 text-sm uppercase tracking-widest text-slate-400">Nutritional Strategy</h4>
                <div className="space-y-4">
                  {bodyComp.nutrition.calorieRange && (
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">Energy Intake</p>
                      <p className="text-sm text-slate-900">{bodyComp.nutrition.calorieRange}</p>
                    </div>
                  )}
                  {bodyComp.nutrition.proteinTarget && (
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">Protein Goal</p>
                      <p className="text-sm text-slate-900">{bodyComp.nutrition.proteinTarget}</p>
                    </div>
                  )}
                  {bodyComp.nutrition.hydration && (
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">Hydration</p>
                      <p className="text-sm text-slate-900">{bodyComp.nutrition.hydration}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h4 className="font-bold mb-3 text-sm uppercase tracking-widest text-slate-400">Timeframe Projection</h4>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black text-indigo-600">{bodyComp.timeframeWeeks}</p>
                  <p className="text-xs text-slate-400 italic">Target Range</p>
                </div>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Estimated time to reach recommended body composition markers based on standard physiological adaptation rates.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}


