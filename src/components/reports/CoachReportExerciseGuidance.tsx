/**
 * CoachReport Exercise Guidance Component
 * Displays exercise recommendations organized by movement patterns, issues, and session types
 */

import React from 'react';
import { Activity } from 'lucide-react';
import type { CoachPlan } from '@/lib/recommendations';

interface ExerciseItem {
  name: string;
  setsReps?: string;
  time?: string;
  notes?: string;
  addresses?: string;
}

interface ExerciseGuidanceProps {
  plan: CoachPlan;
}

function ExerciseCard({ ex }: { ex: ExerciseItem }) {
  return (
    <div className="text-sm border-b border-slate-100 pb-2 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <span className="text-slate-700 font-medium">{ex.name}</span>
        {(ex.setsReps || ex.time) && (
          <span className="text-xs text-slate-500 shrink-0">{ex.setsReps || ex.time}</span>
        )}
      </div>
      {ex.addresses && <p className="text-xs text-slate-500 italic mt-1">{ex.addresses}</p>}
    </div>
  );
}

function MovementPatternSection({ title, exercises }: { title: string; exercises: ExerciseItem[] }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <h5 className="text-sm font-bold text-slate-900 mb-3">{title}</h5>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {exercises.map((ex, i) => (
          <ExerciseCard key={i} ex={ex} />
        ))}
      </div>
    </div>
  );
}

export function CoachReportExerciseGuidance({ plan }: ExerciseGuidanceProps) {
  if (!plan.coachExerciseLists) {
    // Fallback to legacy format
    if (plan.prioritizedExercises && plan.prioritizedExercises.groups) {
      return <LegacyExerciseGuidance plan={plan} />;
    }
    return null;
  }

  const { priorities, byMovementPattern, issueSpecific, warmUp, cardio } = plan.coachExerciseLists;

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-sky-600" />
        <h3 className="text-lg font-bold text-slate-900">Exercise Program Guidance</h3>
      </div>

      {/* Priorities */}
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
        <div className="text-sm space-y-2">
          <p>
            <strong className="text-slate-900">Equipment Focus:</strong>{' '}
            <span className="text-slate-700">{priorities.equipment}</span>
          </p>
          <p>
            <strong className="text-slate-900">Training Approach:</strong>{' '}
            <span className="text-slate-700">{priorities.focus}</span>
          </p>
          {priorities.keyIssues.length > 0 && (
            <div>
              <strong className="text-slate-900">Key Issues to Address:</strong>
              <ul className="list-disc list-inside mt-1 text-slate-700">
                {priorities.keyIssues.map((issue, i) => (
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
          <MovementPatternSection title="Squat" exercises={byMovementPattern.squat} />
          <MovementPatternSection title="Hinge" exercises={byMovementPattern.hinge} />
          <MovementPatternSection title="Push Movements" exercises={byMovementPattern.push} />
          <MovementPatternSection title="Pull Movements" exercises={byMovementPattern.pull} />
          <MovementPatternSection title="Lunge" exercises={byMovementPattern.lunge} />
          <MovementPatternSection title="Core" exercises={byMovementPattern.core} />
        </div>
      </div>

      {/* Issue-Specific Exercises */}
      {(issueSpecific.postural.length > 0 ||
        issueSpecific.mobility.length > 0 ||
        issueSpecific.asymmetry.length > 0) && (
        <div>
          <h4 className="text-base font-bold text-slate-900 mb-3">Issue-Specific Exercises</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {issueSpecific.postural.length > 0 && (
              <MovementPatternSection title="Postural Corrections" exercises={issueSpecific.postural} />
            )}
            {issueSpecific.mobility.length > 0 && (
              <MovementPatternSection title="Mobility Work" exercises={issueSpecific.mobility} />
            )}
            {issueSpecific.asymmetry.length > 0 && (
              <MovementPatternSection title="Asymmetry Corrections" exercises={issueSpecific.asymmetry} />
            )}
          </div>
        </div>
      )}

      {/* Warm-up & Cardio */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MovementPatternSection title="Warm-up Options" exercises={warmUp} />
        {cardio.length > 0 && <MovementPatternSection title="Cardio Options" exercises={cardio} />}
      </div>
    </section>
  );
}

function LegacyExerciseGuidance({ plan }: ExerciseGuidanceProps) {
  if (!plan.prioritizedExercises?.groups) return null;

  const urgencyColors = {
    urgent: 'border-score-red-muted bg-score-red-light',
    important: 'border-score-amber-muted bg-score-amber-light',
    moderate: 'border-blue-300 bg-blue-50',
    low: 'border-slate-300 bg-slate-50',
  };

  const sessionLabels: Record<string, string> = {
    pull: 'Pull / Back Day',
    push: 'Push / Shoulder Day',
    legs: 'Legs / Glutes Day',
    'upper-body': 'Upper Body Day',
    'lower-body': 'Lower Body Day',
    'full-body': 'Full Body Day',
    cardio: 'Cardio Session',
    core: 'Core Session',
    strength: 'Strength Session',
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-sky-600 p-2 rounded-lg">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">Exercise Recommendations & Program Structure</h3>
      </div>

      {/* Priority Groups */}
      <div className="space-y-6">
        {plan.prioritizedExercises.groups.map((group, idx) => (
          <div key={idx} className={`rounded-2xl border-2 p-6 ${urgencyColors[group.urgency]}`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="text-lg font-black text-slate-900 mb-2">{group.title}</h4>
                <p className="text-sm text-slate-700 leading-relaxed">{group.description}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                  group.urgency === 'urgent'
                    ? 'bg-score-red text-white'
                    : group.urgency === 'important'
                    ? 'bg-score-amber text-white'
                    : group.urgency === 'moderate'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-600 text-white'
                }`}
              >
                {group.urgency === 'urgent'
                  ? 'URGENT'
                  : group.urgency === 'important'
                  ? 'IMPORTANT'
                  : group.urgency === 'moderate'
                  ? 'MODERATE'
                  : 'LOW PRIORITY'}
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
                  {ex.notes && <p className="text-xs text-slate-600 mb-2 italic">{ex.notes}</p>}
                  <p className="text-xs text-slate-700 leading-tight mb-2">{ex.reason}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {ex.sessionTypes.map((st, j) => (
                      <span
                        key={j}
                        className="text-xs font-medium text-primary bg-brand-light px-2 py-0.5 rounded"
                      >
                        {st}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Exercises by Session Type */}
      {plan.prioritizedExercises.bySession && plan.prioritizedExercises.bySession.length > 0 && (
        <div className="mt-8">
          <h4 className="text-lg font-bold text-slate-900 mb-4">Exercises Organized by Session Type</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plan.prioritizedExercises.bySession.map((session, idx) => {
              const sortedExercises = [...session.exercises].sort((a, b) => {
                const order: Record<string, number> = { critical: 0, 'goal-focused': 1, important: 2, minor: 3 };
                return (order[a.priority] || 3) - (order[b.priority] || 3);
              });

              return (
                <div key={idx} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col h-full">
                  <h5 className="font-bold text-slate-900 mb-3 text-sm uppercase tracking-wider border-b border-slate-100 pb-2">
                    {sessionLabels[session.sessionType] || session.sessionType}
                  </h5>
                  <div className="space-y-3 flex-1">
                    {sortedExercises.map((ex, i) => (
                      <div
                        key={i}
                        className="text-xs border-l-2 pl-3 py-0.5 border-slate-100 hover:border-primary/20 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <span className="font-bold text-slate-800 leading-tight">{ex.name}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-xs font-black uppercase shrink-0 ml-2 ${
                              ex.priority === 'critical'
                                ? 'bg-score-red text-white shadow-sm'
                                : ex.priority === 'goal-focused'
                                ? 'bg-score-amber text-white'
                                : ex.priority === 'important'
                                ? 'bg-blue-500 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {ex.priority === 'critical'
                              ? 'URGENT'
                              : ex.priority === 'goal-focused'
                              ? 'GOAL'
                              : ex.priority === 'important'
                              ? 'IMP'
                              : 'MINOR'}
                          </span>
                        </div>
                        {ex.setsReps && <p className="text-xs text-primary font-bold mb-0.5">{ex.setsReps}</p>}
                        <p className="text-xs text-slate-500 leading-relaxed italic">{ex.reason}</p>
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
  );
}

