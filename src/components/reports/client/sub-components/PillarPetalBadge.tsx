import React, { useId } from 'react';
import {
  petalDimsFor,
  petalPathFromVerts,
  petalVerts,
  pillarColor,
  pillarHueAt,
} from '@/components/reports/OverallRadarChart';
import { cn } from '@/lib/utils';

export type PillarKey =
  | 'bodyComp'
  | 'strength'
  | 'cardio'
  | 'movementQuality'
  | 'lifestyle';

interface PillarPetalBadgeProps {
  /** Pillar id — drives both colour and bloom direction. */
  pillar: PillarKey;
  /** 0-100 score — rendered as the number inside the petal. */
  score: number;
  /** Box edge in px. */
  size?: number;
  className?: string;
}

/**
 * Each pillar has its own bloom direction (Body↑, Strength↗, Cardio↘,
 * Movement↙, Lifestyle↖). Order maps 1:1 to the radar chart; do not
 * reorder unless the chart reorders too.
 */
const PILLAR_ORDER: PillarKey[] = [
  'bodyComp',
  'strength',
  'cardio',
  'movementQuality',
  'lifestyle',
];

const PILLAR_FULL_LABEL: Record<PillarKey, string> = {
  bodyComp: 'Body Composition',
  strength: 'Functional Strength',
  cardio: 'Metabolic Fitness',
  movementQuality: 'Movement Quality',
  lifestyle: 'Lifestyle Factors',
};

function bloomAngle(pillar: PillarKey): number {
  const i = PILLAR_ORDER.indexOf(pillar);
  return -Math.PI / 2 + (i * 2 * Math.PI) / 5;
}

/**
 * Pillar petal — uniform full-bloom AXIS brand mark. Solid filled in
 * the pillar hue, oriented to its bloom position, score in white at
 * the centroid. Same petal geometry as the hero bloom (wilt=0,
 * fatness=0.42) so it scales identically — this IS the AXIS logo
 * applied per-pillar.
 */
export const PillarPetalBadge: React.FC<PillarPetalBadgeProps> = ({
  pillar,
  score,
  size = 144,
  className,
}) => {
  const filterId = useId().replace(/:/g, '');
  const safeFilterId = `petal-badge-glow-${filterId}`;

  const angle = bloomAngle(pillar);
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);

  const baseR = size * 0.50;
  const fatness = 0.42; // Match the hero bloom exactly.
  const dims = petalDimsFor(100, baseR, 1.0, fatness);

  // Place the petal centroid at the badge centre. The kite's centroid
  // sits ~0.395·length from the anchor along the petal axis.
  const centroidDist = 0.395 * dims.length;
  const cBox = size / 2;
  const ax = cBox - ux * centroidDist;
  const ay = cBox - uy * centroidDist;

  const seed = PILLAR_ORDER.indexOf(pillar) + 1;
  const verts = petalVerts(ax, ay, ux, uy, dims.length, dims.halfWidth, 0, seed);
  const d = petalPathFromVerts(verts, 0);

  const hue = pillarHueAt(PILLAR_FULL_LABEL[pillar], PILLAR_FULL_LABEL[pillar], seed - 1);
  const colour = pillarColor(hue);

  // Score font scales with badge size — ~15% of box edge feels right.
  const scoreFontSize = Math.round(size * 0.155);

  return (
    <span
      className={cn('relative inline-flex shrink-0', className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="block"
        aria-hidden
      >
        <defs>
          <filter id={safeFilterId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation={5} />
          </filter>
        </defs>
        {/* Soft halo behind the brand mark */}
        <g filter={`url(#${safeFilterId})`}>
          <path
            d={d}
            fill="none"
            stroke={colour}
            strokeWidth={6}
            strokeOpacity={0.55}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </g>
        {/* Solid filled AXIS petal */}
        <path
          d={d}
          fill={colour}
          stroke={colour}
          strokeWidth={1}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <span
        className="pointer-events-none absolute inset-0 flex items-center justify-center font-extrabold text-white tabular-nums"
        style={{
          fontSize: scoreFontSize,
          letterSpacing: '-0.025em',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.18)',
        }}
      >
        {Math.round(Math.max(0, Math.min(100, score)))}
      </span>
    </span>
  );
};
