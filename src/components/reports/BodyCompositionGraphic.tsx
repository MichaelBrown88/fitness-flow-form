import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Body-composition graphic — focused on the lean ↔ fat ratio rather than
 * muscle anatomy. Shows:
 *   - Body-fat % callout (the headline number)
 *   - Stacked horizontal bar visualising lean mass vs fat mass proportion
 *   - Compact key metrics row underneath (visceral, skeletal muscle, BMI)
 *
 * Designed to live in the pillar card's first column. Falls back gracefully
 * when fields are missing.
 */

interface BodyCompositionGraphicProps {
  /** Total body weight in kg (string form from FormData). */
  weightKg?: string | number;
  /** Body fat percentage. */
  bodyFatPct?: string | number;
  /** Body fat mass in kg. */
  bodyFatMassKg?: string | number;
  /** Skeletal muscle mass in kg. */
  skeletalMuscleMassKg?: string | number;
  /** Visceral fat level (1-30 typical scale). */
  visceralFatLevel?: string | number;
  /** BMI. */
  bmi?: string | number;
  className?: string;
}

function num(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function bfTone(bf: number | null): { label: string; class: string; bar: string } {
  if (bf == null) return { label: '—', class: 'text-muted-foreground', bar: 'bg-muted-foreground' };
  // Typical male/unisex bands — kept generic; coach can refine.
  if (bf < 15) return { label: 'Athletic', class: 'text-score-green-fg', bar: 'bg-score-green' };
  if (bf < 20) return { label: 'Fit', class: 'text-score-green-fg', bar: 'bg-score-green' };
  if (bf < 25) return { label: 'Acceptable', class: 'text-score-amber-fg', bar: 'bg-score-amber' };
  if (bf < 32) return { label: 'Above average', class: 'text-score-amber-fg', bar: 'bg-score-amber' };
  return { label: 'High', class: 'text-score-red-fg', bar: 'bg-score-red' };
}

export function BodyCompositionGraphic({
  weightKg,
  bodyFatPct,
  bodyFatMassKg,
  skeletalMuscleMassKg,
  visceralFatLevel,
  bmi,
  className,
}: BodyCompositionGraphicProps) {
  const weight = num(weightKg);
  const bf = num(bodyFatPct);
  const fatMass = num(bodyFatMassKg);
  const muscle = num(skeletalMuscleMassKg);
  const viscFat = num(visceralFatLevel);
  const bmiNum = num(bmi);

  // Derive lean mass + fat mass when possible
  const leanMass = weight != null && fatMass != null ? Math.max(0, weight - fatMass) : null;
  const fat = fatMass;

  // Proportions for the stacked bar (% of total weight)
  const total = (leanMass ?? 0) + (fat ?? 0);
  const leanPct = total > 0 && leanMass != null ? Math.round((leanMass / total) * 100) : null;
  const fatPct = total > 0 && fat != null ? Math.round((fat / total) * 100) : null;

  const tone = bfTone(bf);

  const metrics: Array<{ label: string; value: string }> = [];
  if (weight != null) metrics.push({ label: 'Weight', value: `${weight.toFixed(1)} kg` });
  if (muscle != null) metrics.push({ label: 'Muscle', value: `${muscle.toFixed(1)} kg` });
  if (viscFat != null) metrics.push({ label: 'Visceral fat', value: String(viscFat) });
  if (bmiNum != null) metrics.push({ label: 'BMI', value: bmiNum.toFixed(1) });

  return (
    <div className={cn('rounded-lg bg-muted/30 p-3', className)}>
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
        Composition breakdown
      </p>

      {/* Body fat % headline */}
      <div className="flex items-baseline gap-2">
        <span className={cn('text-3xl font-bold tabular-nums tracking-[-0.02em]', tone.class)}>
          {bf != null ? `${bf.toFixed(1)}%` : '—'}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Body fat · {tone.label}
        </span>
      </div>

      {/* Stacked horizontal bar — lean vs fat */}
      {leanPct != null && fatPct != null ? (
        <div className="mt-3">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
            <div className="bg-score-green" style={{ width: `${leanPct}%` }} />
            <div className="bg-score-amber" style={{ width: `${fatPct}%` }} />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] font-medium">
            <span className="inline-flex items-center gap-1.5 text-foreground-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-score-green" />
              Lean {leanMass!.toFixed(1)} kg · {leanPct}%
            </span>
            <span className="inline-flex items-center gap-1.5 text-foreground-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-score-amber" />
              Fat {fat!.toFixed(1)} kg · {fatPct}%
            </span>
          </div>
        </div>
      ) : null}

      {/* Key metrics */}
      {metrics.length > 0 ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-border pt-3">
          {metrics.map((m) => (
            <div key={m.label} className="flex items-baseline justify-between gap-2 min-w-0">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {m.label}
              </dt>
              <dd className="text-xs font-semibold tabular-nums text-foreground">{m.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
