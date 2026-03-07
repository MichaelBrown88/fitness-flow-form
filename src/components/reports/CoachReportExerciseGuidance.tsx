/**
 * CoachReport Training Context Component
 * Provides context for program design without prescribing specific exercises
 */

import { Compass } from 'lucide-react';
import type { CoachPlan } from '@/lib/recommendations';

interface ExerciseGuidanceProps {
  plan: CoachPlan;
}

function getMovementHint(exercises: Array<{ name: string }>): string | null {
  if (!exercises.length) return null;
  const first = exercises[0].name.toLowerCase();
  return first ? `prioritize ${first} variations` : null;
}

export function CoachReportExerciseGuidance({ plan }: ExerciseGuidanceProps) {
  if (!plan.coachExerciseLists) {
    return null;
  }

  const { priorities, byMovementPattern, issueSpecific } = plan.coachExerciseLists;
  const patternLabels: Record<string, string> = {
    squat: 'Squat',
    hinge: 'Hinge',
    push: 'Push',
    pull: 'Pull',
    lunge: 'Lunge',
    core: 'Core',
  };

  const movementSummaries = (Object.entries(byMovementPattern) as [string, Array<{ name: string }>][])
    .filter(([, exs]) => exs.length > 0)
    .map(([key, exs]) => {
      const label = patternLabels[key] ?? key;
      const hint = getMovementHint(exs);
      return `${label} pattern: ${exs.length} exercise${exs.length > 1 ? 's' : ''} suggested${hint ? `, ${hint}` : ''}`;
    });

  const posturalCount = issueSpecific.postural.length;
  const mobilityCount = issueSpecific.mobility.length;
  const asymmetryCount = issueSpecific.asymmetry.length;

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2">
        <Compass className="h-4 w-4 text-primary" />
        <h3 className="text-lg font-bold text-foreground">Training Context</h3>
      </div>

      {/* Training Approach */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">Training Approach</h4>
        <p className="text-sm text-foreground-secondary">{priorities.focus}</p>
        <p className="text-sm text-foreground-secondary/80 mt-1">{priorities.equipment}</p>
      </div>

      {/* Movement Considerations */}
      {movementSummaries.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">Movement Considerations</h4>
          <ul className="space-y-1.5 text-sm text-foreground-secondary">
            {movementSummaries.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Areas Requiring Attention */}
      {(posturalCount > 0 || mobilityCount > 0 || asymmetryCount > 0) && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">Areas Requiring Attention</h4>
          <ul className="space-y-1 text-sm text-foreground-secondary">
            {posturalCount > 0 && (
              <li>Postural corrections needed in {posturalCount} area{posturalCount > 1 ? 's' : ''}</li>
            )}
            {mobilityCount > 0 && (
              <li>Mobility work recommended for {mobilityCount} pattern{mobilityCount > 1 ? 's' : ''}</li>
            )}
            {asymmetryCount > 0 && (
              <li>Asymmetry corrections: {asymmetryCount} area{asymmetryCount > 1 ? 's' : ''} flagged</li>
            )}
          </ul>
        </div>
      )}
    </section>
  );
}
