/**
 * Renders programming strategies (goal-based approach and suggested exercises).
 */

import type { CoachPlan } from '@/lib/recommendations';
import { getCoachReportSectionId } from '@/constants/coachReport';

interface CoachReportProgrammingStrategiesProps {
  plan: CoachPlan;
}

export function CoachReportProgrammingStrategies({ plan }: CoachReportProgrammingStrategiesProps) {
  const strategies = plan.programmingStrategies ?? [];
  if (strategies.length === 0) return null;

  return (
    <section
      id={getCoachReportSectionId('program-strategy')}
      className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm transition-apple"
    >
      <h3 className="text-base font-bold text-foreground mb-4">Program strategy</h3>
      <div className="space-y-6">
        {strategies.map((item, i) => (
          <div key={i} className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">{item.title}</h4>
            <p className="text-sm text-foreground-secondary leading-relaxed">{item.strategy}</p>
            {item.exercises?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {item.exercises.map((ex, j) => (
                  <span
                    key={j}
                    className="px-2 py-0.5 rounded-lg bg-muted text-foreground text-xs font-medium"
                  >
                    {ex}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
