/**
 * ClientReport Workout Component
 * Displays sample workout structure with warm-up, main exercises, and finisher
 */

import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Target as TargetIcon } from 'lucide-react';
import type { CoachPlan } from '@/lib/recommendations';

interface ClientReportWorkoutProps {
  plan?: CoachPlan;
  goalLabel?: string;
}

export function ClientReportWorkout({ plan, goalLabel }: ClientReportWorkoutProps) {
  const workoutContent = useMemo(() => {
    if (plan?.clientWorkout) {
      return (
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
                      <span className="text-slate-500 text-xs">{ex.setsReps || ex.time || ''}</span>
                    </div>
                    {ex.addresses && <p className="text-xs text-slate-500 italic mt-1">{ex.addresses}</p>}
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
                      <span className="text-primary font-semibold text-xs">{ex.setsReps || ''}</span>
                    </div>
                    {ex.addresses && <p className="text-xs text-slate-500 italic mt-1">{ex.addresses}</p>}
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
      );
    }

    if (plan?.prioritizedExercises) {
      return (
        <div className="space-y-6">
          <p className="text-sm text-slate-600">
            This is how we'll blend your immediate needs with your long-term goals in a typical session.
          </p>

          <div className="grid gap-6">
            {/* Warm-up / Prep */}
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold italic">
                    A
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Performance Tuning (Warm-up)</h3>
                </div>
                <Badge variant="outline" className="border-blue-200 text-blue-600 bg-blue-50 font-bold">
                  5-10 MIN
                </Badge>
              </div>
              <p className="text-sm text-slate-500">
                We start every session by "unlocking" your restricted patterns to prepare for load.
              </p>
              <div className="grid gap-3">
                {plan.prioritizedExercises.groups
                  .filter((g) => g.priority === 'critical' || g.priority === 'important')
                  .flatMap((g) => g.exercises.slice(0, 3))
                  .map((ex, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{ex.name}</p>
                        <p className="text-xs text-slate-500 uppercase tracking-widest">
                          {ex.addresses.join(' • ')}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-slate-400">{ex.setsReps || '2 x 30s'}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Main Block */}
            <div className="bg-white rounded-3xl border-2 border-primary p-8 shadow-md space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-primary text-white text-xs font-black px-4 py-2 rotate-12 shadow-lg">
                GOAL BLOCK
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center text-white font-bold italic">
                  B
                </div>
                <h3 className="text-lg font-bold text-slate-900">Main Training Block (The Work)</h3>
              </div>
              <p className="text-sm text-slate-500">
                The "heavy lifting" focused entirely on your primary goal of {goalLabel || 'your goals'}.
              </p>
              <div className="grid gap-3">
                {plan.prioritizedExercises.goalExercises.slice(0, 3).map((goal: string, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-brand-light/50 border border-primary/10">
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <TargetIcon className="h-4 w-4 text-white" />
                    </div>
                    <p className="text-sm font-bold text-slate-900">{goal}</p>
                  </div>
                ))}
                {plan.prioritizedExercises.groups
                  .find((g) => g.priority === 'goal-focused')
                  ?.exercises.map((ex, i) => (
                    <div key={`ex-${i}`} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{ex.name}</p>
                        <p className="text-xs text-slate-500 italic mt-0.5">{ex.reason}</p>
                      </div>
                      <Badge className="bg-primary text-white border-none text-xs font-black">
                        {ex.setsReps || '3-4 Sets'}
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  }, [plan, goalLabel]);

  if (!workoutContent) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900">Your Sample Workout</h2>
      {workoutContent}
    </section>
  );
}

