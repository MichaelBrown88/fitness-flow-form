import React, { useMemo } from 'react';
import type { CoachPlan, BodyCompInterpretation } from '@/lib/recommendations';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreSummary } from '@/lib/scoring';
import { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import OverallRadarChart from './OverallRadarChart';
import { CheckCircle2, AlertCircle, MessageSquare, Target, ClipboardList, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

function niceLabel(id: string): string {
  switch (id) {
    case 'bodyComp': return 'Body Composition';
    case 'strength': return 'Muscular Strength';
    case 'cardio': return 'Metabolic Fitness';
    case 'movementQuality': return 'Movement Quality';
    case 'lifestyle': return 'Lifestyle Factors';
    default: return id;
  }
}

export default function CoachReport({
  plan,
  scores,
  bodyComp,
  formData,
  highlightCategory,
}: {
  plan: CoachPlan;
  scores: ScoreSummary;
  bodyComp?: BodyCompInterpretation;
  formData?: FormData;
  highlightCategory?: string;
}) {
  // Clear highlight after some time
  const [tempHighlight, setTempHighlight] = React.useState<string | undefined>(highlightCategory);
  React.useEffect(() => {
    if (tempHighlight) {
      const timer = setTimeout(() => {
        setTempHighlight(undefined);
        sessionStorage.removeItem('highlightCategory');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [tempHighlight]);

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
            <p className="text-primary font-semibold uppercase tracking-wider text-xs">
              Coach Assessment & Strategy
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {goals.map(g => (
              <span key={g} className="px-3 py-1 bg-brand-light text-primary border border-primary/10 rounded-full text-[10px] font-black uppercase tracking-widest">
                {g.replace('-', ' ')}
              </span>
            ))}
          </div>

          <p className="text-slate-600 text-sm leading-relaxed max-w-xl">
            Based on the assessment data, we've identified the following training priorities and strategy for {clientName || 'this client'}.
          </p>

          {/* Synthesis for Coach */}
          {scores.synthesis && scores.synthesis.length > 0 && (
            <div className="pt-4 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Cross-Pillar Synthesis</h4>
              <div className="grid gap-3">
                {scores.synthesis.map((item, idx) => (
                  <div key={idx} className={`p-3 rounded-xl border flex gap-3 ${
                    item.severity === 'high' ? 'border-rose-100 bg-rose-50/50' : 
                    item.severity === 'medium' ? 'border-amber-100 bg-amber-50/50' : 
                    'border-blue-100 bg-blue-50/50'
                  }`}>
                    <span className="shrink-0">{item.severity === 'high' ? '🚨' : item.severity === 'medium' ? '⚠️' : 'ℹ️'}</span>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">{item.title}</h5>
                      <p className="text-xs text-slate-600 leading-relaxed mt-0.5">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="w-full md:w-72 flex-shrink-0 bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <OverallRadarChart data={overallRadarData} />
        </div>
      </section>

      {/* FIRST SESSION SCRIPT */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg">
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
                      <span className="text-primary font-bold">•</span>
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
                        <span className="text-primary font-bold">{i + 1}.</span>
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

      {/* EXERCISE GUIDANCE */}
      {plan.coachExerciseLists ? (
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-sky-600" />
            <h3 className="text-lg font-bold text-slate-900">Exercise Program Guidance</h3>
          </div>
          
          {/* Priorities */}
          <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
            <div className="text-sm space-y-2">
              <p><strong className="text-slate-900">Equipment Focus:</strong> <span className="text-slate-700">{plan.coachExerciseLists.priorities.equipment}</span></p>
              <p><strong className="text-slate-900">Training Approach:</strong> <span className="text-slate-700">{plan.coachExerciseLists.priorities.focus}</span></p>
              {plan.coachExerciseLists.priorities.keyIssues.length > 0 && (
                <div>
                  <strong className="text-slate-900">Key Issues to Address:</strong>
                  <ul className="list-disc list-inside mt-1 text-slate-700">
                    {plan.coachExerciseLists.priorities.keyIssues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          
          {/* Movement Patterns */}
          <div>
            <h4 className="text-base font-bold text-slate-900 mb-3">By Movement Pattern</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Squat */}
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <h5 className="text-sm font-bold text-slate-900 mb-3">Squat</h5>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {plan.coachExerciseLists.byMovementPattern.squat.map((ex, i) => (
                    <div key={i} className="text-sm border-b border-slate-100 pb-2 last:border-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-slate-700 font-medium">{ex.name}</span>
                        {ex.setsReps && (
                          <span className="text-xs text-slate-500 shrink-0">{ex.setsReps}</span>
                        )}
                      </div>
                      {ex.addresses && (
                        <p className="text-xs text-slate-500 italic mt-1">{ex.addresses}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Hinge */}
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <h5 className="text-sm font-bold text-slate-900 mb-3">Hinge</h5>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {plan.coachExerciseLists.byMovementPattern.hinge.map((ex, i) => (
                    <div key={i} className="text-sm border-b border-slate-100 pb-2 last:border-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-slate-700 font-medium">{ex.name}</span>
                        {ex.setsReps && (
                          <span className="text-xs text-slate-500 shrink-0">{ex.setsReps}</span>
                        )}
                      </div>
                      {ex.addresses && (
                        <p className="text-xs text-slate-500 italic mt-1">{ex.addresses}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Push */}
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <h5 className="text-sm font-bold text-slate-900 mb-3">Push Movements</h5>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {plan.coachExerciseLists.byMovementPattern.push.map((ex, i) => (
                    <div key={i} className="text-sm border-b border-slate-100 pb-2 last:border-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-slate-700 font-medium">{ex.name}</span>
                        {ex.setsReps && (
                          <span className="text-xs text-slate-500 shrink-0">{ex.setsReps}</span>
                        )}
                      </div>
                      {ex.addresses && (
                        <p className="text-xs text-slate-500 italic mt-1">{ex.addresses}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pull */}
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <h5 className="text-sm font-bold text-slate-900 mb-3">Pull Movements</h5>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {plan.coachExerciseLists.byMovementPattern.pull.map((ex, i) => (
                    <div key={i} className="text-sm border-b border-slate-100 pb-2 last:border-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-slate-700 font-medium">{ex.name}</span>
                        {ex.setsReps && (
                          <span className="text-xs text-slate-500 shrink-0">{ex.setsReps}</span>
                        )}
                      </div>
                      {ex.addresses && (
                        <p className="text-xs text-slate-500 italic mt-1">{ex.addresses}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Lunge */}
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <h5 className="text-sm font-bold text-slate-900 mb-3">Lunge</h5>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {plan.coachExerciseLists.byMovementPattern.lunge.map((ex, i) => (
                    <div key={i} className="text-sm border-b border-slate-100 pb-2 last:border-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-slate-700 font-medium">{ex.name}</span>
                        {ex.setsReps && (
                          <span className="text-xs text-slate-500 shrink-0">{ex.setsReps}</span>
                        )}
                      </div>
                      {ex.addresses && (
                        <p className="text-xs text-slate-500 italic mt-1">{ex.addresses}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Core */}
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <h5 className="text-sm font-bold text-slate-900 mb-3">Core</h5>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {plan.coachExerciseLists.byMovementPattern.core.map((ex, i) => (
                    <div key={i} className="text-sm border-b border-slate-100 pb-2 last:border-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-slate-700 font-medium">{ex.name}</span>
                        {ex.setsReps && (
                          <span className="text-xs text-slate-500 shrink-0">{ex.setsReps}</span>
                        )}
                      </div>
                      {ex.addresses && (
                        <p className="text-xs text-slate-500 italic mt-1">{ex.addresses}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Issue-Specific Exercises */}
          {(plan.coachExerciseLists.issueSpecific.postural.length > 0 || 
            plan.coachExerciseLists.issueSpecific.mobility.length > 0 || 
            plan.coachExerciseLists.issueSpecific.asymmetry.length > 0) && (
            <div>
              <h4 className="text-base font-bold text-slate-900 mb-3">Issue-Specific Exercises</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Postural */}
                {plan.coachExerciseLists.issueSpecific.postural.length > 0 && (
                  <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <h5 className="text-sm font-bold text-slate-900 mb-3">Postural Corrections</h5>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {plan.coachExerciseLists.issueSpecific.postural.map((ex, i) => (
                        <div key={i} className="text-sm border-b border-slate-100 pb-2 last:border-0">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-slate-700 font-medium">{ex.name}</span>
                            {ex.setsReps && (
                              <span className="text-xs text-slate-500 shrink-0">{ex.setsReps}</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 italic mt-1">{ex.addresses}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mobility */}
                {plan.coachExerciseLists.issueSpecific.mobility.length > 0 && (
                  <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <h5 className="text-sm font-bold text-slate-900 mb-3">Mobility Work</h5>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {plan.coachExerciseLists.issueSpecific.mobility.map((ex, i) => (
                        <div key={i} className="text-sm border-b border-slate-100 pb-2 last:border-0">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-slate-700 font-medium">{ex.name}</span>
                            {ex.setsReps && (
                              <span className="text-xs text-slate-500 shrink-0">{ex.setsReps}</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 italic mt-1">{ex.addresses}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Asymmetry */}
                {plan.coachExerciseLists.issueSpecific.asymmetry.length > 0 && (
                  <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <h5 className="text-sm font-bold text-slate-900 mb-3">Asymmetry Corrections</h5>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {plan.coachExerciseLists.issueSpecific.asymmetry.map((ex, i) => (
                        <div key={i} className="text-sm border-b border-slate-100 pb-2 last:border-0">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-slate-700 font-medium">{ex.name}</span>
                            {ex.setsReps && (
                              <span className="text-xs text-slate-500 shrink-0">{ex.setsReps}</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 italic mt-1">{ex.addresses}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Warm-up & Cardio */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Warm-up */}
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <h4 className="text-sm font-bold text-slate-900 mb-3">Warm-up Options</h4>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {plan.coachExerciseLists.warmUp.map((ex, i) => (
                  <div key={i} className="text-sm border-b border-slate-100 pb-2 last:border-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-slate-700 font-medium">{ex.name}</span>
                      <span className="text-xs text-slate-500 shrink-0">
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

            {/* Cardio */}
            {plan.coachExerciseLists.cardio.length > 0 && (
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <h4 className="text-sm font-bold text-slate-900 mb-3">Cardio Options</h4>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {plan.coachExerciseLists.cardio.map((ex, i) => (
                    <div key={i} className="text-sm border-b border-slate-100 pb-2 last:border-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-slate-700 font-medium">{ex.name}</span>
                        {ex.time && (
                          <span className="text-xs text-slate-500 shrink-0">{ex.time}</span>
                        )}
                      </div>
                      {ex.addresses && (
                        <p className="text-xs text-slate-500 italic mt-1">{ex.addresses}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      ) : plan.prioritizedExercises && plan.prioritizedExercises.groups ? (
        // Fallback to old format
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-sky-600 p-2 rounded-lg">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Exercise Recommendations & Program Structure</h3>
          </div>

          {/* Priority Groups */}
          <div className="space-y-6">
            {plan.prioritizedExercises.groups.map((group, idx) => {
              const urgencyColors = {
                urgent: 'border-red-300 bg-red-50',
                important: 'border-amber-300 bg-amber-50',
                moderate: 'border-blue-300 bg-blue-50',
                low: 'border-slate-300 bg-slate-50'
              };
              
              return (
                <div key={idx} className={`rounded-2xl border-2 p-6 ${urgencyColors[group.urgency]}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-black text-slate-900 mb-2">{group.title}</h4>
                      <p className="text-sm text-slate-700 leading-relaxed">{group.description}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      group.urgency === 'urgent' ? 'bg-red-600 text-white' :
                      group.urgency === 'important' ? 'bg-amber-600 text-white' :
                      group.urgency === 'moderate' ? 'bg-blue-600 text-white' :
                      'bg-slate-600 text-white'
                    }`}>
                      {group.urgency === 'urgent' ? 'URGENT' :
                       group.urgency === 'important' ? 'IMPORTANT' :
                       group.urgency === 'moderate' ? 'MODERATE' : 'LOW PRIORITY'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {group.exercises.map((ex, i) => (
                      <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-sm font-bold text-slate-900">{ex.name}</span>
                          {ex.setsReps && (
                            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                              {ex.setsReps}
                            </span>
                          )}
                        </div>
                        {ex.notes && (
                          <p className="text-xs text-slate-600 mb-2 italic">{ex.notes}</p>
                        )}
                        <p className="text-xs text-slate-700 leading-tight mb-2">{ex.reason}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {ex.sessionTypes.map((st, j) => (
                            <span key={j} className="text-[10px] font-medium text-primary bg-brand-light px-2 py-0.5 rounded">
                              {st}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Exercises by Session Type - Smarter Grouping */}
          {plan.prioritizedExercises.bySession && plan.prioritizedExercises.bySession.length > 0 && (
            <div className="mt-8">
              <h4 className="text-lg font-bold text-slate-900 mb-4">Exercises Organized by Session Type</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plan.prioritizedExercises.bySession.map((session, idx) => {
                  const sessionLabels: Record<string, string> = {
                    'pull': 'Pull / Back Day',
                    'push': 'Push / Shoulder Day',
                    'legs': 'Legs / Glutes Day',
                    'upper-body': 'Upper Body Day',
                    'lower-body': 'Lower Body Day',
                    'full-body': 'Full Body Day',
                    'cardio': 'Cardio Session',
                    'core': 'Core Session',
                    'strength': 'Strength Session'
                  };
                  
                  // Sort exercises within session: Urgent -> Goal -> Important -> Minor
                  const sortedExercises = [...session.exercises].sort((a, b) => {
                    const order = { 'critical': 0, 'goal-focused': 1, 'important': 2, 'minor': 3 };
                    return order[a.priority] - order[b.priority];
                  });

                  return (
                    <div key={idx} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col h-full">
                      <h5 className="font-bold text-slate-900 mb-3 text-sm uppercase tracking-wider border-b border-slate-100 pb-2">
                        {sessionLabels[session.sessionType] || session.sessionType}
                      </h5>
                      <div className="space-y-3 flex-1">
                        {sortedExercises.map((ex, i) => (
                          <div key={i} className="text-xs border-l-2 pl-3 py-0.5 border-slate-100 hover:border-primary/20 transition-colors">
                            <div className="flex items-start justify-between mb-1">
                              <span className="font-bold text-slate-800 leading-tight">{ex.name}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase shrink-0 ml-2 ${
                                ex.priority === 'critical' ? 'bg-red-600 text-white shadow-sm' :
                                ex.priority === 'goal-focused' ? 'bg-amber-500 text-white' :
                                ex.priority === 'important' ? 'bg-blue-500 text-white' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {ex.priority === 'critical' ? 'URGENT' :
                                 ex.priority === 'goal-focused' ? 'GOAL' :
                                 ex.priority === 'important' ? 'IMP' : 'MINOR'}
                              </span>
                            </div>
                            {ex.setsReps && (
                              <p className="text-[9px] text-primary font-bold mb-0.5">{ex.setsReps}</p>
                            )}
                            <p className="text-[9px] text-slate-500 leading-relaxed italic">{ex.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      ) : null}

      {/* LEGACY PROGRAMMING STRATEGIES (if no prioritized exercises) */}
      {(!plan.prioritizedExercises || plan.prioritizedExercises.groups.length === 0) && (
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-sky-600 p-2 rounded-lg">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Programming Strategies</h3>
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
        </div>
      </section>
      )}

      {/* COMPREHENSIVE POSTURE ANALYSIS */}
      {formData?.postureAiResults && (
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-lg">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">AI Posture Analysis</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(['front', 'back', 'side-left', 'side-right'] as const)
              .filter(view => formData.postureAiResults?.[view])
              .map((view) => {
              const analysis = formData.postureAiResults![view] as PostureAnalysisResult;
              const imageUrl = formData.postureImages?.[view];
              return (
                <div key={view} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-widest text-primary">{view.toUpperCase()} VIEW</span>
                  </div>
                  
                  {/* Posture Image with Overlay - overlay is baked into the image */}
                  {(imageUrl || formData.postureImagesStorage?.[view]) && (
                    <div className="relative aspect-[3/4] rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-50">
                      <img 
                        src={formData.postureImagesStorage?.[view] || imageUrl} 
                        alt={view} 
                        className="w-full h-full object-cover"
                        title="Reference lines: Red vertical (midline/plumb), Red horizontal (shoulders/hips)"
                      />
                      <div className="absolute bottom-2 left-2 right-2 bg-black/60 text-white text-[8px] px-2 py-1 rounded">
                        Reference lines: Vertical midline/plumb | Horizontal shoulder & hip lines
                      </div>
                    </div>
                  )}
                  
                  {/* Comprehensive Analysis */}
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    {analysis.forward_head && (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-700">Forward Head Posture</span>
                          <span className="text-xs font-black text-slate-900">
                            {analysis.forward_head.status} ({analysis.forward_head.deviation_degrees}°)
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-600 leading-tight">{analysis.forward_head.description}</p>
                        {/* Exercise recommendations removed - shown in dedicated exercise section */}
                      </div>
                    )}
                    
                    {analysis.shoulder_alignment && (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-700">Shoulder Alignment</span>
                          <span className="text-xs font-black text-slate-900">{analysis.shoulder_alignment.status}</span>
                        </div>
                        {analysis.shoulder_alignment.left_elevation_cm && (
                          <span className="text-[10px] text-slate-500">
                            Height difference: {Math.abs(analysis.shoulder_alignment.left_elevation_cm)}cm
                          </span>
                        )}
                        <p className="text-[10px] text-slate-600 leading-tight">{analysis.shoulder_alignment.description}</p>
                      </div>
                    )}
                    
                    {analysis.kyphosis && analysis.kyphosis.status !== 'Normal' && (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-700">Thoracic Kyphosis</span>
                          <span className="text-xs font-black text-slate-900">
                            {analysis.kyphosis.status} ({analysis.kyphosis.curve_degrees}°)
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-600 leading-tight">{analysis.kyphosis.description}</p>
                      </div>
                    )}
                    
                    {analysis.lordosis && analysis.lordosis.status !== 'Normal' && (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-700">Lumbar Lordosis</span>
                          <span className="text-xs font-black text-slate-900">
                            {analysis.lordosis.status} ({analysis.lordosis.curve_degrees}°)
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-600 leading-tight">{analysis.lordosis.description}</p>
                      </div>
                    )}
                    
                    {analysis.pelvic_tilt && analysis.pelvic_tilt.status !== 'Neutral' && (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-700">Pelvic Tilt</span>
                          <span className="text-xs font-black text-slate-900">{analysis.pelvic_tilt.status}</span>
                        </div>
                        <p className="text-[10px] text-slate-600 leading-tight">{analysis.pelvic_tilt.description}</p>
                      </div>
                    )}
                    
                    {analysis.overall_assessment && (
                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-[10px] font-semibold text-slate-700 mb-1">Overall Assessment:</p>
                        <p className="text-[10px] text-slate-600 leading-relaxed">{analysis.overall_assessment}</p>
                      </div>
                    )}
                    
                    {analysis.deviations && analysis.deviations.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Identified Deviations:</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {analysis.deviations.map((dev, idx) => (
                            <li key={idx} className="text-[9px] text-slate-600">{dev}</li>
                          ))}
                        </ul>
                  </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {plan.segmentalGuidance && plan.segmentalGuidance.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-lg">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">InBody Segmental Guidance</h3>
          </div>
          <div className="grid gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <ul className="space-y-3">
                {plan.segmentalGuidance.map((item, i) => (
                  <li key={i} className="text-sm text-slate-700 flex gap-3">
                    <span className="text-emerald-500 font-bold">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
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
                        <span className="text-primary font-bold">•</span> {p}
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
                    <div className="p-3 bg-brand-light rounded-xl border border-primary/10">
                      <p className="text-xs font-bold text-primary uppercase tracking-tight">Unilateral Strategy</p>
                      <p className="text-sm text-slate-900">{bodyComp.trainingFocus.unilateralVolume}</p>
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
                  <p className="text-3xl font-black text-primary">{bodyComp.timeframeWeeks}</p>
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


