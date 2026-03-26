import type { LucideIcon } from "lucide-react";
import { Dumbbell, Heart, Moon, Scale, Zap } from "lucide-react";
import { getPillarLabel, type ScoringPillarId } from "@/constants/pillars";

/** Clockwise from top — matches SVG polygon vertex order: 50,15 → 85,35 → 75,80 → 25,80 → 15,35 */
const HERO_RADAR_PILLAR_ORDER: readonly ScoringPillarId[] = [
  "bodyComp",
  "cardio",
  "strength",
  "movementQuality",
  "lifestyle",
] as const;

const HERO_RADAR_PILLAR_META: Record<
  ScoringPillarId,
  {
    Icon: LucideIcon;
    value: string;
    ring: string;
    soft: string;
    label: string;
    border: string;
  }
> = {
  bodyComp: {
    Icon: Scale,
    value: "18.5% BF",
    ring: "bg-primary/15 text-gradient-dark dark:bg-primary/25 dark:text-primary",
    soft: "bg-card/95",
    label: "text-foreground",
    border: "border-border/90 dark:border-border",
  },
  cardio: {
    Icon: Heart,
    value: "72/100",
    ring: "bg-primary/15 text-gradient-dark dark:bg-primary/25 dark:text-primary",
    soft: "bg-card/95",
    label: "text-foreground",
    border: "border-border/90 dark:border-border",
  },
  strength: {
    Icon: Dumbbell,
    value: "80/100",
    ring: "bg-primary/15 text-gradient-dark dark:bg-primary/25 dark:text-primary",
    soft: "bg-card/95",
    label: "text-foreground",
    border: "border-border/90 dark:border-border",
  },
  movementQuality: {
    Icon: Zap,
    value: "85/100",
    ring: "bg-primary/15 text-gradient-dark dark:bg-primary/25 dark:text-primary",
    soft: "bg-card/95",
    label: "text-foreground",
    border: "border-border/90 dark:border-border",
  },
  lifestyle: {
    Icon: Moon,
    value: "76/100",
    ring: "bg-primary/15 text-gradient-dark dark:bg-primary/25 dark:text-primary",
    soft: "bg-card/95",
    label: "text-foreground",
    border: "border-border/90 dark:border-border",
  },
};

/** Matches HeroSection radar `lg:inset-[12%]` — map viewBox 0–100 to outer % */
const INSET_PCT = 12;
const INNER_PCT = 100 - 2 * INSET_PCT;

function mapVertex(vx: number, vy: number): { x: number; y: number } {
  return {
    x: INSET_PCT + (INNER_PCT * vx) / 100,
    y: INSET_PCT + (INNER_PCT * vy) / 100,
  };
}

const CHART_CENTROID = mapVertex(50, 49);

/** Lower-right "perfect" anchor (matches previous tuned strength card). */
const RADIAL_REF = { x: 89, y: 93 };

const RADIAL_DISTANCE = Math.hypot(
  RADIAL_REF.x - CHART_CENTROID.x,
  RADIAL_REF.y - CHART_CENTROID.y,
);

function cardCenterPct(vx: number, vy: number): { leftPct: number; topPct: number } {
  const v = mapVertex(vx, vy);
  const dx = v.x - CHART_CENTROID.x;
  const dy = v.y - CHART_CENTROID.y;
  const len = Math.hypot(dx, dy);
  return {
    leftPct: CHART_CENTROID.x + (RADIAL_DISTANCE * dx) / len,
    topPct: CHART_CENTROID.y + (RADIAL_DISTANCE * dy) / len,
  };
}

const HERO_RADAR_PILLAR_POSITIONS_PCT: readonly [
  { leftPct: number; topPct: number },
  { leftPct: number; topPct: number },
  { leftPct: number; topPct: number },
  { leftPct: number; topPct: number },
  { leftPct: number; topPct: number },
] = [
  cardCenterPct(50, 15),
  cardCenterPct(85, 35),
  cardCenterPct(75, 80),
  cardCenterPct(25, 80),
  cardCenterPct(15, 35),
];

/**
 * Five scoring pillars on a common circle from chart centroid (same radius as strength/movement).
 * lg+ only; parent is square `relative` with inset chart.
 */
export function HeroRadarPillarsAround() {
  return (
    <>
      {HERO_RADAR_PILLAR_ORDER.map((id, i) => {
        const meta = HERO_RADAR_PILLAR_META[id];
        const Icon = meta.Icon;
        const { leftPct, topPct } = HERO_RADAR_PILLAR_POSITIONS_PCT[i];
        return (
          <div
            key={id}
            className={`pointer-events-none absolute z-20 hidden w-[4.5rem] flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center shadow-sm backdrop-blur-sm lg:flex xl:w-[5.25rem] xl:gap-1.5 xl:rounded-xl xl:px-1.5 xl:py-2.5 ${meta.border} ${meta.soft}`}
            style={{
              left: `${leftPct}%`,
              top: `${topPct}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full xl:h-8 xl:w-8 ${meta.ring}`}
            >
              <Icon className="h-3.5 w-3.5 xl:h-4 xl:w-4" strokeWidth={2.25} aria-hidden />
            </div>
            <p
              className={`line-clamp-2 text-[8px] font-bold uppercase leading-tight tracking-wide xl:text-[9px] ${meta.label}`}
            >
              {getPillarLabel(id, "short")}
            </p>
            <p className="text-[10px] font-bold tabular-nums text-foreground xl:text-xs">
              {meta.value}
            </p>
          </div>
        );
      })}
    </>
  );
}
