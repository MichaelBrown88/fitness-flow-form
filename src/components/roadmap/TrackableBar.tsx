import type { Trackable } from '@/lib/roadmap/types';

interface TrackableBarProps {
  trackable: Trackable;
  compact?: boolean;
}

export function TrackableBar({ trackable, compact }: TrackableBarProps) {
  const { label, baseline, target, current } = trackable;
  const range = target - baseline;
  const progress = range > 0 ? Math.min(100, Math.max(0, ((current - baseline) / range) * 100)) : 100;
  const met = current >= target;

  const barColor = met
    ? 'bg-emerald-500'
    : progress > 0
      ? 'bg-amber-400'
      : 'bg-slate-300';

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-[11px]">
        <span className="text-slate-500 w-24 truncate">{label}</span>
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${progress}%` }} />
        </div>
        <span className={`font-semibold tabular-nums w-12 text-right ${met ? 'text-emerald-600' : 'text-slate-600'}`}>
          {current}/{target}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-600 font-medium">{label}</span>
        <span className={`font-semibold tabular-nums ${met ? 'text-emerald-600' : 'text-slate-700'}`}>
          {current} / {target}
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${progress}%` }} />
      </div>
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
