import React from 'react';
import Model, { type IExerciseData, type Muscle } from 'react-body-highlighter';

/**
 * Generic body-diagram visualisation. Renders anterior + posterior silhouettes
 * with up to three colour-coded muscle states overlaid.
 *
 * Pillars decide what each colour means:
 *   - Posture / Movement Quality: tight (red) vs weak (blue)
 *   - Strength: strong (green) vs weak (amber)
 *
 * Library: `react-body-highlighter` (MIT). Muscle names must match its
 * `Muscle` union exactly — see `findingMuscleMap.ts` for the canonical list.
 */

export type MuscleHighlightKind = 'tight' | 'weak' | 'strong';

interface MuscleMapProps {
  /** Muscles to highlight in red (tight / overactive). */
  tight?: Muscle[];
  /** Muscles to highlight in blue (weak / underactive). */
  weak?: Muscle[];
  /** Muscles to highlight in green (strong / well-developed). */
  strong?: Muscle[];
  /** Section label shown above the diagrams. */
  title?: string;
  /** Hide the bottom legend chips. */
  hideLegend?: boolean;
  className?: string;
}

const COLORS: Record<MuscleHighlightKind, string> = {
  tight: '#dc2626', // red-600
  strong: '#16a34a', // green-600
  weak: '#2563eb', // blue-600
};

const LABELS: Record<MuscleHighlightKind, string> = {
  tight: 'Tight / overactive',
  strong: 'Strong / well-developed',
  weak: 'Weak / underactive',
};

const BODY_COLOR = 'hsl(220 13% 91%)';

export function MuscleMap({ tight = [], weak = [], strong = [], title, hideLegend, className }: MuscleMapProps) {
  if (tight.length === 0 && weak.length === 0 && strong.length === 0) return null;

  // `react-body-highlighter` colours by frequency: frequency=1 → highlightedColors[0],
  // frequency=2 → highlightedColors[1], etc. We assemble the order to match.
  const order: MuscleHighlightKind[] = [];
  const data: IExerciseData[] = [];
  if (tight.length > 0) {
    order.push('tight');
    data.push({ name: LABELS.tight, muscles: tight, frequency: order.length });
  }
  if (weak.length > 0) {
    order.push('weak');
    data.push({ name: LABELS.weak, muscles: weak, frequency: order.length });
  }
  if (strong.length > 0) {
    order.push('strong');
    data.push({ name: LABELS.strong, muscles: strong, frequency: order.length });
  }
  const highlightedColors = order.map((k) => COLORS[k]);

  return (
    <div className={className ?? 'rounded-lg bg-muted/30 p-3'}>
      {title && (
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
          {title}
        </p>
      )}
      <div className="flex items-start justify-center gap-3">
        <div className="flex flex-col items-center">
          <Model
            type="anterior"
            data={data}
            bodyColor={BODY_COLOR}
            highlightedColors={highlightedColors}
            style={{ width: 'auto', height: 130 }}
          />
          <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Front</p>
        </div>
        <div className="flex flex-col items-center">
          <Model
            type="posterior"
            data={data}
            bodyColor={BODY_COLOR}
            highlightedColors={highlightedColors}
            style={{ width: 'auto', height: 130 }}
          />
          <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Back</p>
        </div>
      </div>
      {!hideLegend && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          {order.map((k) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[k] }} />
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{LABELS[k]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
