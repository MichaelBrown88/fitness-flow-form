/**
 * Renders movement blocks (session blocks with objectives and exercises).
 */

import type { CoachPlan } from '@/lib/recommendations';
import { getCoachReportSectionId } from '@/constants/coachReport';

interface CoachReportMovementBlocksProps {
  plan: CoachPlan;
}

export function CoachReportMovementBlocks({ plan }: CoachReportMovementBlocksProps) {
  const blocks = plan.movementBlocks ?? [];
  if (blocks.length === 0) return null;

  return (
    <section
      id={getCoachReportSectionId('movement-blocks')}
      className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm transition-apple"
    >
      <h3 className="text-base font-bold text-foreground mb-4">Movement blocks</h3>
      <div className="space-y-6">
        {blocks.map((block, i) => (
          <div key={i} className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">{block.title}</h4>
            {block.objectives?.length > 0 && (
              <ul className="list-disc list-inside text-sm text-foreground-secondary space-y-0.5">
                {block.objectives.map((obj, j) => (
                  <li key={j}>{obj}</li>
                ))}
              </ul>
            )}
            {block.exercises?.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm text-foreground">
                {block.exercises.map((ex, j) => (
                  <li key={j} className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium">{ex.name}</span>
                    {ex.setsReps && (
                      <span className="text-foreground-secondary text-xs">{ex.setsReps}</span>
                    )}
                    {ex.notes && (
                      <span className="text-foreground-secondary text-xs italic">{ex.notes}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
