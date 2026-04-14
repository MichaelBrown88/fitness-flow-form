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

interface PillarMeta {
  Icon: LucideIcon;
  value: string;
  /** Text alignment relative to the anchor point */
  align: "center" | "right" | "left";
}

const HERO_RADAR_PILLAR_META: Record<ScoringPillarId, PillarMeta> = {
  bodyComp:        { Icon: Scale,    value: "76/100",   align: "center" },
  cardio:          { Icon: Heart,    value: "72/100",   align: "right"  },
  strength:        { Icon: Dumbbell, value: "80/100",   align: "right"  },
  movementQuality: { Icon: Zap,      value: "85/100",   align: "left"   },
  lifestyle:       { Icon: Moon,     value: "76/100",   align: "left"   },
};

/**
 * Radar chart lives in `absolute inset-[12%]` of the parent square.
 * SVG viewBox is 0–100 within that inset.
 * We map each vertex to the outer-square percentage and push the label
 * slightly further out from the centroid so it sits just outside the point.
 */
const INSET = 0.12;       // 12% inset on each side
const INNER = 1 - 2 * INSET; // 0.76

/** SVG viewBox vertex → outer-square % (0–100) */
function toOuter(svgX: number, svgY: number): [number, number] {
  return [
    (INSET + (INNER * svgX) / 100) * 100,
    (INSET + (INNER * svgY) / 100) * 100,
  ];
}

const CENTROID: [number, number] = toOuter(50, 49);

/** Push each vertex outward by `push` percentage points from the centroid */
function labelPos(svgX: number, svgY: number, push: number): [number, number] {
  const [ox, oy] = toOuter(svgX, svgY);
  const dx = ox - CENTROID[0];
  const dy = oy - CENTROID[1];
  const len = Math.hypot(dx, dy);
  return [
    ox + (dx / len) * push,
    oy + (dy / len) * push,
  ];
}

// Vertex push distance — how far beyond the vertex point to place the label
const PUSH = 9;

const POSITIONS: [number, number][] = [
  labelPos(50, 15,  PUSH),  // top — bodyComp
  labelPos(85, 35,  PUSH),  // right — cardio
  labelPos(75, 80,  PUSH),  // bottom-right — strength
  labelPos(25, 80,  PUSH),  // bottom-left — movementQuality
  labelPos(15, 35,  PUSH),  // left — lifestyle
];

/** transform-origin for each label so it expands away from the point */
const TRANSFORM: string[] = [
  "translate(-50%, -100%)",   // top: sit above the point
  "translate(0%, -50%)",      // right: sit to the right
  "translate(0%, 0%)",        // bottom-right: expand down-right
  "translate(-100%, 0%)",     // bottom-left: expand down-left
  "translate(-100%, -50%)",   // left: sit to the left
];

/**
 * Compact inline label anchored near each radar vertex.
 * Shown on lg+ only; parent is a square `relative` wrapper.
 */
export function HeroRadarPillarsAround() {
  return (
    <>
      {HERO_RADAR_PILLAR_ORDER.map((id, i) => {
        const meta = HERO_RADAR_PILLAR_META[id];
        const Icon = meta.Icon;
        const [lx, ly] = POSITIONS[i];
        const transform = TRANSFORM[i];

        return (
          <div
            key={id}
            className="pointer-events-none absolute z-20 hidden lg:flex"
            style={{
              left: `${lx}%`,
              top: `${ly}%`,
              transform,
            }}
          >
            {/* Compact label pill */}
            <div className="flex items-center gap-1 rounded-full border border-border/70 bg-background/90 px-1.5 py-0.5 shadow-sm backdrop-blur-sm dark:border-border dark:bg-card/90 xl:px-2 xl:py-1">
              <Icon
                className="h-2.5 w-2.5 shrink-0 text-foreground/70 xl:h-3 xl:w-3"
                strokeWidth={2.5}
                aria-hidden
              />
              <span className="text-[8px] font-bold uppercase leading-none tracking-wide text-foreground/60 xl:text-[9px]">
                {getPillarLabel(id, "short")}
              </span>
              <span className="text-[9px] font-black tabular-nums leading-none text-foreground xl:text-[10px]">
                {meta.value}
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
}
