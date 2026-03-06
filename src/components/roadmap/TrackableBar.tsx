import type { Trackable, TrackableZone } from '@/lib/roadmap/types';

interface TrackableBarProps {
  trackable: Trackable;
  compact?: boolean;
}

const ZONE_COLORS: Record<NonNullable<TrackableZone['color']>, string> = {
  red: 'hsl(var(--score-red, 0 84% 60%))',
  amber: 'hsl(var(--score-amber))',
  green: 'hsl(var(--score-green))',
};

const DEFAULT_ZONES: TrackableZone[] = [
  { min: 0, max: 40, color: 'red', label: 'Needs focus' },
  { min: 40, max: 70, color: 'amber', label: 'Building' },
  { min: 70, max: 100, color: 'green', label: 'Optimal' },
];

function fmt(val: number, unit?: string): string {
  const n = Number.isInteger(val) ? String(val) : val.toFixed(1);
  return unit ? `${n} ${unit}` : n;
}

/** Scale spans min..max with padding so markers aren't at 0% or 100%. */
function toScale(baseline: number, current: number, target: number, padPct = 0.1): { minVal: number; maxVal: number } {
  const lo = Math.min(baseline, current, target);
  const hi = Math.max(baseline, current, target);
  const range = hi - lo || 1;
  const pad = Math.max(range * padPct, 5);
  return { minVal: lo - pad, maxVal: hi + pad };
}

function toPct(val: number, minVal: number, maxVal: number): number {
  const range = maxVal - minVal || 1;
  return Math.min(100, Math.max(0, ((val - minVal) / range) * 100));
}

/** Whoop-style: filled bar amber→green (low→high), arrows above/below with labels on each. */
function WhoopStyleBar({
  baselinePct,
  currentPct,
  goalPct,
  dispBaseline,
  dispCurrent,
  dispTarget,
  unit,
  compact,
}: {
  baselinePct: number;
  currentPct: number;
  goalPct: number;
  dispBaseline: number;
  dispCurrent: number;
  dispTarget: number;
  unit?: string;
  compact: boolean;
}) {
  const barH = compact ? 'h-2' : 'h-2.5';
  const textSize = compact ? 'text-[10px]' : 'text-xs';

  const MarkerTop = ({ pct, label, sublabel }: { pct: number; label: string; sublabel?: string }) => (
    <div
      className="absolute flex flex-col items-center"
      style={{ left: `${pct}%`, transform: 'translateX(-50%)', top: 0 }}
    >
      <span className={`font-semibold tabular-nums ${textSize} text-foreground`}>{label}</span>
      {!compact && sublabel && (
        <span className="text-[10px] text-foreground-secondary">{sublabel}</span>
      )}
      <div
        className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-foreground"
        style={{ marginTop: 2 }}
      />
    </div>
  );

  const MarkerBottom = ({ pct, label, sublabel }: { pct: number; label: string; sublabel: string }) => (
    <div
      className="absolute flex flex-col items-center"
      style={{ left: `${pct}%`, transform: 'translateX(-50%)', bottom: 0 }}
    >
      <div
        className="w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-border"
        style={{ marginBottom: 2 }}
      />
      <span className={`font-semibold tabular-nums ${textSize} text-foreground`}>{label}</span>
      {!compact && sublabel && (
        <span className="text-[10px] text-foreground-secondary">{sublabel}</span>
      )}
    </div>
  );

  const bottomMarkers: { pct: number; label: string; sublabel: string }[] = [
    { pct: baselinePct, label: fmt(dispBaseline, unit), sublabel: 'Starting' },
    { pct: goalPct, label: fmt(dispTarget, unit), sublabel: 'Goal' },
  ];

  const pt = compact ? 'pt-4' : 'pt-5';
  const pb = compact ? 'pb-4' : 'pb-5';

  return (
    <div className={`relative ${pt} ${pb}`}>
      <MarkerTop pct={currentPct} label={fmt(dispCurrent, unit)} sublabel="Now" />
      <div
        className={`relative ${barH} w-full rounded-full overflow-visible`}
        style={{
          background: 'linear-gradient(to right, hsl(var(--score-amber)) 0%, hsl(var(--score-green)) 100%)',
        }}
      />
      {bottomMarkers.map((m, i) => (
        <MarkerBottom key={i} pct={m.pct} label={m.label} sublabel={m.sublabel} />
      ))}
    </div>
  );
}

/** Zone/range bar: segmented sections (e.g. sleep, nutrition, stress). Scale 0–100. */
function ZoneBar({
  baselinePct,
  currentPct,
  goalPct,
  dispBaseline,
  dispCurrent,
  dispTarget,
  unit,
  zones,
  compact,
}: {
  baselinePct: number;
  currentPct: number;
  goalPct: number;
  dispBaseline: number;
  dispCurrent: number;
  dispTarget: number;
  unit?: string;
  zones: TrackableZone[];
  compact: boolean;
}) {
  const barH = compact ? 'h-2' : 'h-2.5';
  const textSize = compact ? 'text-[10px]' : 'text-xs';

  const MarkerTop = ({ pct, label, sublabel }: { pct: number; label: string; sublabel?: string }) => (
    <div
      className="absolute flex flex-col items-center z-10"
      style={{ left: `${pct}%`, transform: 'translateX(-50%)', top: 0 }}
    >
      <span className={`font-semibold tabular-nums ${textSize} text-foreground`}>{label}</span>
      {!compact && sublabel && (
        <span className="text-[10px] text-foreground-secondary">{sublabel}</span>
      )}
      <div
        className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-foreground"
        style={{ marginTop: 2 }}
      />
    </div>
  );

  const MarkerBottom = ({ pct, label, sublabel }: { pct: number; label: string; sublabel: string }) => (
    <div
      className="absolute flex flex-col items-center z-10"
      style={{ left: `${pct}%`, transform: 'translateX(-50%)', bottom: 0 }}
    >
      <div
        className="w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-border"
        style={{ marginBottom: 2 }}
      />
      <span className={`font-semibold tabular-nums ${textSize} text-foreground`}>{label}</span>
      {!compact && sublabel && (
        <span className="text-[10px] text-foreground-secondary">{sublabel}</span>
      )}
    </div>
  );

  const bottomMarkers: { pct: number; label: string; sublabel: string }[] = [
    { pct: baselinePct, label: fmt(dispBaseline, unit), sublabel: 'Starting' },
    { pct: goalPct, label: fmt(dispTarget, unit), sublabel: 'Goal' },
  ];

  const pt = compact ? 'pt-4' : 'pt-5';
  const pb = compact ? 'pb-4' : 'pb-5';

  return (
    <div className={`relative ${pt} ${pb}`}>
      <MarkerTop pct={currentPct} label={fmt(dispCurrent, unit)} sublabel="Now" />
      <div className={`relative ${barH} w-full rounded-full overflow-hidden flex`}>
        {zones.map((z) => {
          const widthPct = z.max - z.min;
          return (
            <div
              key={`${z.min}-${z.max}`}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${widthPct}%`,
                backgroundColor: ZONE_COLORS[z.color],
              }}
            />
          );
        })}
      </div>
      {bottomMarkers.map((m, i) => (
        <MarkerBottom key={i} pct={m.pct} label={m.label} sublabel={m.sublabel} />
      ))}
    </div>
  );
}

export function TrackableBar({ trackable, compact }: TrackableBarProps) {
  const {
    label,
    baseline,
    target,
    current,
    unit,
    valueBaseline,
    valueCurrent,
    valueTarget,
  } = trackable;
  const useValues = valueBaseline != null && valueCurrent != null;
  const dispBaseline = useValues && valueBaseline != null ? valueBaseline : baseline;
  const dispCurrent = useValues && valueCurrent != null ? valueCurrent : current;
  const dispTarget = useValues && valueTarget != null ? valueTarget : target;

  const valBaseline = useValues ? valueBaseline! : baseline;
  const valCurrent = useValues ? valueCurrent! : current;
  const valTarget = useValues
    ? (valueTarget ?? Math.max(valBaseline, valCurrent) + Math.max(5, (valCurrent - valBaseline) || 5))
    : target;

  const isZone = trackable.displayMode === 'zone';
  const zones = trackable.zones ?? DEFAULT_ZONES;

  let baselinePct: number;
  let currentPct: number;
  let goalPct: number;
  if (isZone) {
    baselinePct = Math.min(100, Math.max(0, valBaseline));
    currentPct = Math.min(100, Math.max(0, valCurrent));
    goalPct = Math.min(100, Math.max(0, valTarget));
  } else {
    const { minVal, maxVal } = toScale(valBaseline, valCurrent, valTarget);
    baselinePct = toPct(valBaseline, minVal, maxVal);
    currentPct = toPct(valCurrent, minVal, maxVal);
    goalPct = toPct(valTarget, minVal, maxVal);
  }

  if (isZone) {
    return (
      <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
        {!compact && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground-secondary font-medium">{label}</span>
          </div>
        )}
        <ZoneBar
          baselinePct={baselinePct}
          currentPct={currentPct}
          goalPct={goalPct}
          dispBaseline={dispBaseline}
          dispCurrent={dispCurrent}
          dispTarget={dispTarget}
          unit={unit}
          zones={zones}
          compact={compact}
        />
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-1">
        <WhoopStyleBar
          baselinePct={baselinePct}
          currentPct={currentPct}
          goalPct={goalPct}
          dispBaseline={dispBaseline}
          dispCurrent={dispCurrent}
          dispTarget={dispTarget}
          unit={unit}
          compact
        />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-foreground-secondary font-medium">{label}</span>
      </div>
      <WhoopStyleBar
          baselinePct={baselinePct}
          currentPct={currentPct}
          goalPct={goalPct}
        dispBaseline={dispBaseline}
        dispCurrent={dispCurrent}
        dispTarget={dispTarget}
        unit={unit}
        compact={false}
      />
    </div>
  );
}

interface TrackableListProps {
  trackables: Trackable[];
  compact?: boolean;
}

export function TrackableList({ trackables, compact }: TrackableListProps) {
  if (!trackables || trackables.length === 0) return null;

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2.5'}>
      {trackables.map((t) => (
        <TrackableBar key={t.id} trackable={t} compact={compact} />
      ))}
    </div>
  );
}
