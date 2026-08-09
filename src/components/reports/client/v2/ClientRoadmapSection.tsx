import React from 'react';
import { Dumbbell, Heart, Scale, Sun, Zap, type LucideIcon } from 'lucide-react';
import type { ClientRoadmapCard } from '@/lib/reports/clientRoadmapCards';
import type { ClientNinetyDayTarget } from '@/lib/reports/clientNinetyDayTarget';
import type { PillarId } from '@/lib/goals/goalContext';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { CHART_PILLAR_COLOR_ORDER } from '@/lib/design/chartColors';
import { cn } from '@/lib/utils';

interface ClientRoadmapSectionProps {
  cards: ClientRoadmapCard[];
  target?: ClientNinetyDayTarget | null;
  embedded?: boolean;
}

const PILLAR_ICONS: Record<PillarId, LucideIcon> = {
  bodyComp: Scale,
  strength: Dumbbell,
  cardio: Heart,
  movementQuality: Zap,
  lifestyle: Sun,
};

const PILLAR_INDEX: Record<PillarId, number> = {
  bodyComp: 0,
  strength: 1,
  cardio: 2,
  movementQuality: 3,
  lifestyle: 4,
};

function TargetStrip({ target }: { target: ClientNinetyDayTarget }) {
  const hasWeight = target.targetWeightKg != null;
  const hasMacros = target.calories != null;
  if (!hasWeight && !hasMacros) return null;

  const deltaLabel =
    target.direction === 'maintain' || target.weightDeltaKg == null
      ? CLIENT_REPORT_COPY.v2RoadmapTargetMaintain
      : `${target.weightDeltaKg > 0 ? '+' : '\u2212'}${Math.abs(target.weightDeltaKg)} kg`;

  return (
    <div className="mt-5 rounded-xl border border-border/60 bg-muted/30 p-4 sm:p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {CLIENT_REPORT_COPY.v2RoadmapTargetLabel}
      </p>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {hasWeight ? (
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">
              {CLIENT_REPORT_COPY.v2RoadmapTargetWeight}
            </p>
            <p className="mt-0.5 flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums tracking-[-0.02em] text-foreground">
                {target.targetWeightKg} kg
              </span>
              <span className="text-[13px] font-semibold text-foreground-secondary">
                {deltaLabel}
              </span>
            </p>
          </div>
        ) : null}

        {hasMacros ? (
          <div className="sm:text-right">
            <p className="text-[11px] font-medium text-muted-foreground">
              {CLIENT_REPORT_COPY.v2RoadmapTargetFuel}
            </p>
            <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-[-0.02em] text-foreground">
              {target.calories?.toLocaleString()}{' '}
              <span className="text-xs font-medium text-muted-foreground">
                {CLIENT_REPORT_COPY.v2RoadmapTargetCalories}
              </span>
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5 sm:justify-end">
              <MacroPill label="Protein" grams={target.proteinG} />
              <MacroPill label="Carbs" grams={target.carbsG} />
              <MacroPill label="Fat" grams={target.fatG} />
            </div>
          </div>
        ) : null}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        {CLIENT_REPORT_COPY.v2RoadmapTargetNote}
      </p>
    </div>
  );
}

function MacroPill({ label, grams }: { label: string; grams: number | null }) {
  if (grams == null) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-2.5 py-1 text-[12px] font-medium text-foreground-secondary">
      {label} <span className="font-semibold text-foreground tabular-nums">{grams}g</span>
    </span>
  );
}

/**
 * High-level 90-day roadmap — one behaviour card per assessed pillar, plus an
 * achievable 90-day weight + macro target and a soft closing CTA.
 * Framework-level only (what to adopt), never programming detail.
 */
export function ClientRoadmapSection({ cards, target, embedded = false }: ClientRoadmapSectionProps) {
  if (cards.length === 0) return null;

  return (
    <section
      className={cn(
        embedded ? '' : 'scroll-mt-24 rounded-2xl bg-card p-6 ring-1 ring-border/60 sm:p-7',
      )}
    >
      <h2 className="text-base font-bold tracking-[-0.01em] text-foreground sm:text-lg">
        {CLIENT_REPORT_COPY.v2RoadmapHeading}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {CLIENT_REPORT_COPY.v2RoadmapSubheading}
      </p>

      {target ? <TargetStrip target={target} /> : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {cards.map((card, index) => {
          const Icon = PILLAR_ICONS[card.pillar];
          const colour = CHART_PILLAR_COLOR_ORDER[PILLAR_INDEX[card.pillar]];
          return (
            <div
              key={card.pillar}
              className="rounded-xl border border-border/60 bg-muted/30 px-4 py-4"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${colour}18` }}
                  aria-hidden
                >
                  <Icon className="h-3.5 w-3.5 opacity-80" style={{ color: colour }} />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground tabular-nums">
                  {index + 1}. {card.pillarLabel}
                </span>
              </div>
              <p className="mt-3 text-[15px] font-semibold tracking-[-0.01em] text-foreground">
                {card.title}
              </p>
              <ul className="mt-2 space-y-1.5">
                {card.prescriptions.map((line) => (
                  <li
                    key={line}
                    className="flex gap-2 text-[13px] leading-relaxed text-foreground-secondary"
                  >
                    <span
                      className="mt-[7px] h-1 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: colour }}
                      aria-hidden
                    />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <p className="mt-5 border-t border-border/60 pt-4 text-center text-[13px] leading-relaxed text-muted-foreground">
        {CLIENT_REPORT_COPY.v2RoadmapCta}
      </p>
    </section>
  );
}
