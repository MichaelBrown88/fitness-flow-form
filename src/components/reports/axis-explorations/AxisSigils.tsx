/**
 * AXIS Pillar Sigils — five unique faceted glyphs forming a brand
 * identity system, one per pillar.
 *
 * Each sigil:
 *  - Has a unique geometric silhouette (Monolith / Spike / Crest /
 *    Rotor / Honeycomb).
 *  - Owns its pillar's semantic hue.
 *  - Contains exactly 5 internal facets that fill smoothly with score
 *    (each facet covers a 20-point band, fills continuously).
 *  - Renders cleanly at any size — works as a branding stamp next to a
 *    section header (32px) and as a hero element in the AXIS view (96px+).
 *
 * Pillar → sigil mapping:
 *    Body Composition    → Monolith   (stacked horizontal bands)
 *    Functional Strength → Spike      (nested vertical kites)
 *    Metabolic Fitness   → Crest      (stacked diagonal stripes)
 *    Movement Quality    → Rotor      (5-armed asterisk)
 *    Lifestyle Factors   → Honeycomb  (5-hex cluster)
 *
 * Score → facet fill: each facet i (0..4) fills 0→1 as score crosses
 * its 20-point band. At score=100 every facet is fully saturated
 * (branding state). At score=0 only outline silhouettes show.
 */

import React, { useId } from 'react';
import { pillarColor, pillarHueAt } from '@/components/reports/OverallRadarChart';

const FACETS = 5;
const PTS_PER_FACET = 100 / FACETS;

export type SigilKind = 'monolith' | 'spike' | 'crest' | 'rotor' | 'honeycomb';

const PILLAR_TO_SIGIL: Record<string, SigilKind> = {
  // Canonical full labels
  'Body Composition': 'monolith',
  'Functional Strength': 'spike',
  'Metabolic Fitness': 'crest',
  'Movement Quality': 'rotor',
  'Lifestyle Factors': 'honeycomb',
  // Short labels
  Body: 'monolith',
  Strength: 'spike',
  Cardio: 'crest',
  Movement: 'rotor',
  Lifestyle: 'honeycomb',
};

export function sigilKindFor(name: string, fullLabel: string): SigilKind {
  return PILLAR_TO_SIGIL[fullLabel] ?? PILLAR_TO_SIGIL[name] ?? 'monolith';
}

function facetFill(i: number, score: number): number {
  const start = i * PTS_PER_FACET;
  const t = (score - start) / PTS_PER_FACET;
  return Math.max(0, Math.min(1, t));
}

function facetStyle(i: number, score: number, hue: number) {
  const f = facetFill(i, score);
  return {
    fill: pillarColor(hue, 0.10 + f * 0.65),
    stroke: pillarColor(hue, 0.45 + f * 0.50),
  };
}

// ─── Monolith (Body) ──────────────────────────────────────────────
function Monolith({ score, hue }: { score: number; hue: number }) {
  const cx = 50;
  const cy = 50;
  const w = 32;
  const h = 76;
  const ch = 4;
  const left = cx - w / 2;
  const top = cy - h / 2;
  const bandH = h / FACETS;

  const outer = `
    M ${left + ch} ${top}
    L ${left + w - ch} ${top}
    L ${left + w} ${top + ch}
    L ${left + w} ${top + h - ch}
    L ${left + w - ch} ${top + h}
    L ${left + ch} ${top + h}
    L ${left} ${top + h - ch}
    L ${left} ${top + ch} Z
  `;

  return (
    <g>
      <path d={outer} fill="none" stroke={pillarColor(hue, 0.55)} strokeWidth={1.4} />
      {Array.from({ length: FACETS }).map((_, i) => {
        const s = facetStyle(i, score, hue);
        const bandTop = top + h - (i + 1) * bandH;
        return (
          <rect
            key={i}
            x={left + 2.5}
            y={bandTop + 1.5}
            width={w - 5}
            height={bandH - 3}
            rx={1}
            fill={s.fill}
            stroke={s.stroke}
            strokeWidth={0.9}
          />
        );
      })}
    </g>
  );
}

// ─── Spike (Strength) ─────────────────────────────────────────────
function Spike({ score, hue }: { score: number; hue: number }) {
  const cx = 50;
  const cy = 52;
  const apexY = -40;
  const sideY = -8;
  const bottomY = 28;
  const sideX = 14;

  const kite = (scale: number) => {
    const ax = cx;
    const ay = cy + apexY * scale;
    const rx = cx + sideX * scale;
    const ry = cy + sideY * scale;
    const bx = cx;
    const by = cy + bottomY * scale;
    const lx = cx - sideX * scale;
    const ly = cy + sideY * scale;
    return `M ${ax} ${ay} L ${rx} ${ry} L ${bx} ${by} L ${lx} ${ly} Z`;
  };

  return (
    <g>
      {/* Outer silhouette */}
      <path d={kite(1)} fill="none" stroke={pillarColor(hue, 0.6)} strokeWidth={1.4} />
      {/* 5 nested facets — innermost is i=0, lights first */}
      {Array.from({ length: FACETS }).map((_, i) => {
        const s = facetStyle(i, score, hue);
        const inner = (i / FACETS);
        const outer = ((i + 1) / FACETS);
        return (
          <g key={i}>
            <path
              d={kite(outer) + ' ' + kite(inner)}
              fill={s.fill}
              fillRule="evenodd"
              stroke="none"
            />
            <path
              d={kite(outer)}
              fill="none"
              stroke={s.stroke}
              strokeWidth={0.9}
            />
          </g>
        );
      })}
    </g>
  );
}

// ─── Crest (Cardio) ───────────────────────────────────────────────
function Crest({ score, hue }: { score: number; hue: number }) {
  // Parallelogram silhouette with 5 horizontal slant stripes filling
  // bottom-up. Reads as a layered upward "wave" / building rhythm.
  const cx = 50;
  const cy = 50;
  const w = 60;
  const h = 64;
  const slant = 14; // top is shifted right by `slant`
  const stripeH = h / FACETS;

  const slantAt = (yFromTop: number) => slant * (1 - yFromTop / h);

  const outerPath = (() => {
    const tl = { x: cx - w / 2 + slant, y: cy - h / 2 };
    const tr = { x: cx + w / 2 + slant, y: cy - h / 2 };
    const br = { x: cx + w / 2, y: cy + h / 2 };
    const bl = { x: cx - w / 2, y: cy + h / 2 };
    return `M ${tl.x} ${tl.y} L ${tr.x} ${tr.y} L ${br.x} ${br.y} L ${bl.x} ${bl.y} Z`;
  })();

  return (
    <g>
      <path d={outerPath} fill="none" stroke={pillarColor(hue, 0.6)} strokeWidth={1.4} />
      {Array.from({ length: FACETS }).map((_, i) => {
        const s = facetStyle(i, score, hue);
        // Band i: bottom row is i=0
        const yBot = cy + h / 2 - i * stripeH;
        const yTop = cy + h / 2 - (i + 1) * stripeH;
        const yBotFromTop = yBot - (cy - h / 2);
        const yTopFromTop = yTop - (cy - h / 2);
        const sBot = slantAt(yBotFromTop);
        const sTop = slantAt(yTopFromTop);
        return (
          <path
            key={i}
            d={`
              M ${cx - w / 2 + sBot + 1} ${yBot - 1}
              L ${cx + w / 2 + sBot - 1} ${yBot - 1}
              L ${cx + w / 2 + sTop - 1} ${yTop + 1}
              L ${cx - w / 2 + sTop + 1} ${yTop + 1} Z
            `}
            fill={s.fill}
            stroke={s.stroke}
            strokeWidth={0.9}
          />
        );
      })}
    </g>
  );
}

// ─── Rotor (Movement) ─────────────────────────────────────────────
function Rotor({ score, hue }: { score: number; hue: number }) {
  // 5-armed asterisk — chevron arms radiating from center at 72° intervals.
  // Arms light clockwise from the top.
  const cx = 50;
  const cy = 50;
  const inner = 6;
  const outer = 38;
  const armHalfAngle = (Math.PI * 2) / FACETS / 2 * 0.55; // wedge thickness

  const armPath = (i: number) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / FACETS;
    const ax = cx + outer * Math.cos(ang);
    const ay = cy + outer * Math.sin(ang);
    const lAng = ang - armHalfAngle;
    const rAng = ang + armHalfAngle;
    const lx = cx + inner * Math.cos(lAng);
    const ly = cy + inner * Math.sin(lAng);
    const rx = cx + inner * Math.cos(rAng);
    const ry = cy + inner * Math.sin(rAng);
    return `M ${cx} ${cy} L ${lx} ${ly} L ${ax} ${ay} L ${rx} ${ry} Z`;
  };

  return (
    <g>
      {/* Outer reference circle (subtle) */}
      <circle
        cx={cx}
        cy={cy}
        r={outer + 2}
        fill="none"
        stroke={pillarColor(hue, 0.25)}
        strokeWidth={0.7}
        strokeDasharray="2 4"
      />
      {/* 5 chevron arms */}
      {Array.from({ length: FACETS }).map((_, i) => {
        const s = facetStyle(i, score, hue);
        return (
          <path
            key={i}
            d={armPath(i)}
            fill={s.fill}
            stroke={s.stroke}
            strokeWidth={0.9}
            strokeLinejoin="miter"
          />
        );
      })}
      {/* Center hub */}
      <circle cx={cx} cy={cy} r={3.5} fill={pillarColor(hue, 0.95)} />
    </g>
  );
}

// ─── Honeycomb (Lifestyle) ────────────────────────────────────────
function Honeycomb({ score, hue }: { score: number; hue: number }) {
  // 5 hexagons in a 2-row honeycomb fragment: top row 2, bottom row 3.
  // Cells light up bottom-row-left → top-row-right (foundation first).
  const cx = 50;
  const cy = 50;
  const r = 11; // hex radius (pointy-top)
  const hexW = Math.sqrt(3) * r;
  const rowGap = r * 1.5;

  // Honeycomb fragment positions — bottom row (3), top row (2 staggered)
  const cells = [
    { x: cx - hexW, y: cy + rowGap / 2 },   // 0 — bottom-left
    { x: cx,          y: cy + rowGap / 2 }, // 1 — bottom-center
    { x: cx + hexW, y: cy + rowGap / 2 },   // 2 — bottom-right
    { x: cx - hexW / 2, y: cy - rowGap / 2 }, // 3 — top-left
    { x: cx + hexW / 2, y: cy - rowGap / 2 }, // 4 — top-right
  ];

  const hexPath = (hx: number, hy: number) => {
    const pts: string[] = [];
    for (let k = 0; k < 6; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 3;
      pts.push(`${(hx + r * Math.cos(a)).toFixed(2)},${(hy + r * Math.sin(a)).toFixed(2)}`);
    }
    return `M ${pts[0]} L ${pts.slice(1).join(' L ')} Z`;
  };

  return (
    <g>
      {cells.map((c, i) => {
        const s = facetStyle(i, score, hue);
        return (
          <path
            key={i}
            d={hexPath(c.x, c.y)}
            fill={s.fill}
            stroke={s.stroke}
            strokeWidth={1.1}
            strokeLinejoin="miter"
          />
        );
      })}
    </g>
  );
}

// ─── Public component: PillarSigil ────────────────────────────────

interface PillarSigilProps {
  /** Pillar identifier (canonical full label or short name). */
  pillarName: string;
  /** Pillar score 0–100. Defaults to 100 (full branding state). */
  score?: number;
  /** Pixel rendered size. Defaults to 64. */
  size?: number;
  /** Show subtle outer glow halo. Defaults to true. */
  glow?: boolean;
  /** Optional explicit hue override. */
  hueOverride?: number;
  /** Optional positional index for fallback hue. */
  index?: number;
  className?: string;
}

export default function PillarSigil({
  pillarName,
  score = 100,
  size = 64,
  glow = true,
  hueOverride,
  index = 0,
  className,
}: PillarSigilProps) {
  const reactId = useId();
  const filterId = `sigil-glow-${reactId.replace(/:/g, '')}`;
  const kind = sigilKindFor(pillarName, pillarName);
  const hue = hueOverride ?? pillarHueAt(pillarName, pillarName, index);

  const renderKind = () => {
    switch (kind) {
      case 'monolith': return <Monolith score={score} hue={hue} />;
      case 'spike': return <Spike score={score} hue={hue} />;
      case 'crest': return <Crest score={score} hue={hue} />;
      case 'rotor': return <Rotor score={score} hue={hue} />;
      case 'honeycomb': return <Honeycomb score={score} hue={hue} />;
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label={`${pillarName} sigil — score ${Math.round(score)} of 100`}
    >
      {glow && (
        <defs>
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>
      )}
      {glow && (
        <g filter={`url(#${filterId})`} opacity={Math.max(0.2, Math.min(0.85, score / 100))}>
          {renderKind()}
        </g>
      )}
      <g>{renderKind()}</g>
    </svg>
  );
}

// ─── Programmatic kind dispatch (for callers that already know the kind) ──

interface SigilByKindProps {
  kind: SigilKind;
  score?: number;
  size?: number;
  hue: number;
  glow?: boolean;
  className?: string;
}

export function SigilByKind({ kind, score = 100, size = 64, hue, glow = true, className }: SigilByKindProps) {
  const reactId = useId();
  const filterId = `sigil-k-glow-${reactId.replace(/:/g, '')}`;

  const renderKind = () => {
    switch (kind) {
      case 'monolith': return <Monolith score={score} hue={hue} />;
      case 'spike': return <Spike score={score} hue={hue} />;
      case 'crest': return <Crest score={score} hue={hue} />;
      case 'rotor': return <Rotor score={score} hue={hue} />;
      case 'honeycomb': return <Honeycomb score={score} hue={hue} />;
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label={`${kind} sigil — score ${Math.round(score)} of 100`}
    >
      {glow && (
        <defs>
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>
      )}
      {glow && (
        <g filter={`url(#${filterId})`} opacity={Math.max(0.2, Math.min(0.85, score / 100))}>
          {renderKind()}
        </g>
      )}
      <g>{renderKind()}</g>
    </svg>
  );
}
