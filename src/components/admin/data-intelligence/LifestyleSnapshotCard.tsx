/**
 * Lifestyle Snapshot Card
 *
 * Distribution bars for sleep, stress, nutrition, hydration, activity level,
 * and alcohol frequency, plus pain-reported metrics with per-movement breakdown.
 *
 * Denominator fix: each lifestyle section uses its own sub-total (number of
 * clients who answered that question) rather than the total unique client count,
 * giving accurate per-section percentages regardless of completion rate.
 */
import React from 'react';

interface DistributionBarProps {
  label: string;
  count: number;
  total: number;
  color: string;
}

function DistributionBar({ label, count, total, color }: DistributionBarProps) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-admin-bg rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-10 text-right shrink-0">{pct}%</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-admin-fg-muted font-medium mb-2">{children}</p>;
}

const QUALITY_COLORS: Record<string, string> = {
  excellent: '#22c55e',
  good:      '#6366f1',
  fair:      '#eab308',
  poor:      '#ef4444',
};

const STRESS_COLORS: Record<string, string> = {
  'very-low': '#22c55e',
  low:        '#6366f1',
  moderate:   '#eab308',
  high:       '#ef4444',
};

const ACTIVITY_COLORS: Record<string, string> = {
  sedentary:           '#ef4444',
  'lightly-active':    '#eab308',
  'moderately-active': '#6366f1',
  'very-active':       '#22c55e',
  'extremely-active':  '#10b981',
};

const ALCOHOL_COLORS: Record<string, string> = {
  never:        '#22c55e',
  occasionally: '#6366f1',
  weekly:       '#eab308',
  daily:        '#ef4444',
};

const STRESS_LABELS: Record<string, string> = {
  'very-low': 'Very Low',
  low:        'Low',
  moderate:   'Moderate',
  high:       'High',
};

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary:           'Sedentary',
  'lightly-active':    'Lightly Active',
  'moderately-active': 'Moderately Active',
  'very-active':       'Very Active',
  'extremely-active':  'Extremely Active',
};

const ALCOHOL_LABELS: Record<string, string> = {
  never:        'Never',
  occasionally: 'Occasionally',
  weekly:       'Weekly',
  daily:        'Daily',
};

const QUALITY_KEYS = ['excellent', 'good', 'fair', 'poor'] as const;

interface Props {
  sleep: Record<string, number>;
  stress: Record<string, number>;
  nutrition?: Record<string, number>;
  hydration?: Record<string, number>;
  activity?: Record<string, number>;
  alcohol?: Record<string, number>;
  painReported: number;
  painByMovement?: { ohs: number; hinge: number; lunge: number };
  /** uniqueClientCount — used only for the pain percentage denominator */
  uniqueClientCount: number;
}

export function LifestyleSnapshotCard({
  sleep,
  stress,
  nutrition,
  hydration,
  activity,
  alcohol,
  painReported,
  painByMovement,
  uniqueClientCount,
}: Props) {
  // Each section uses its own sub-total as denominator
  const sleepTotal  = Object.values(sleep).reduce((s, v) => s + v, 0);
  const stressTotal = Object.values(stress).reduce((s, v) => s + v, 0);
  const nutrTotal   = nutrition ? Object.values(nutrition).reduce((s, v) => s + v, 0) : 0;
  const hydrTotal   = hydration ? Object.values(hydration).reduce((s, v) => s + v, 0) : 0;
  const actTotal    = activity  ? Object.values(activity).reduce((s, v)  => s + v, 0) : 0;
  const alcTotal    = alcohol   ? Object.values(alcohol).reduce((s, v)   => s + v, 0) : 0;

  // Pain % uses uniqueClientCount so we're dividing by people, not sessions
  const painPct = uniqueClientCount > 0 ? Math.round((painReported / uniqueClientCount) * 100) : 0;

  const hasNutrition    = nutrTotal > 0;
  const hasHydration    = hydrTotal > 0;
  const hasActivity     = actTotal  > 0;
  const hasAlcohol      = alcTotal  > 0;
  const hasPainBreakdown = painByMovement &&
    (painByMovement.ohs > 0 || painByMovement.hinge > 0 || painByMovement.lunge > 0);

  return (
    <div className="bg-admin-card/50 border border-admin-border rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-admin-fg mb-4">Lifestyle Snapshot</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        {/* Sleep */}
        <div className="space-y-2">
          <SectionTitle>Sleep Quality <span className="text-foreground-secondary">({sleepTotal})</span></SectionTitle>
          {QUALITY_KEYS.map(key => (
            <DistributionBar
              key={key}
              label={key.charAt(0).toUpperCase() + key.slice(1)}
              count={sleep[key] ?? 0}
              total={sleepTotal}
              color={QUALITY_COLORS[key] ?? '#6366f1'}
            />
          ))}
        </div>

        {/* Stress */}
        <div className="space-y-2">
          <SectionTitle>Stress Level <span className="text-foreground-secondary">({stressTotal})</span></SectionTitle>
          {(['very-low', 'low', 'moderate', 'high'] as const).map(key => (
            <DistributionBar
              key={key}
              label={STRESS_LABELS[key]}
              count={stress[key] ?? 0}
              total={stressTotal}
              color={STRESS_COLORS[key] ?? '#6366f1'}
            />
          ))}
        </div>

        {/* Nutrition */}
        {hasNutrition && (
          <div className="space-y-2">
            <SectionTitle>Nutrition Quality <span className="text-foreground-secondary">({nutrTotal})</span></SectionTitle>
            {QUALITY_KEYS.map(key => (
              <DistributionBar
                key={key}
                label={key.charAt(0).toUpperCase() + key.slice(1)}
                count={nutrition?.[key] ?? 0}
                total={nutrTotal}
                color={QUALITY_COLORS[key] ?? '#6366f1'}
              />
            ))}
          </div>
        )}

        {/* Hydration */}
        {hasHydration && (
          <div className="space-y-2">
            <SectionTitle>Hydration Quality <span className="text-foreground-secondary">({hydrTotal})</span></SectionTitle>
            {QUALITY_KEYS.map(key => (
              <DistributionBar
                key={key}
                label={key.charAt(0).toUpperCase() + key.slice(1)}
                count={hydration?.[key] ?? 0}
                total={hydrTotal}
                color={QUALITY_COLORS[key] ?? '#6366f1'}
              />
            ))}
          </div>
        )}

        {/* Alcohol */}
        {hasAlcohol && (
          <div className="space-y-2">
            <SectionTitle>Alcohol Frequency <span className="text-foreground-secondary">({alcTotal})</span></SectionTitle>
            {(['never', 'occasionally', 'weekly', 'daily'] as const).map(key => (
              <DistributionBar
                key={key}
                label={ALCOHOL_LABELS[key]}
                count={alcohol?.[key] ?? 0}
                total={alcTotal}
                color={ALCOHOL_COLORS[key] ?? '#6366f1'}
              />
            ))}
          </div>
        )}

        {/* Activity Level */}
        {hasActivity && (
          <div className="space-y-2 md:col-span-2">
            <SectionTitle>Activity Level <span className="text-foreground-secondary">({actTotal})</span></SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.keys(ACTIVITY_LABELS).map(key => (
                <DistributionBar
                  key={key}
                  label={ACTIVITY_LABELS[key]}
                  count={activity?.[key] ?? 0}
                  total={actTotal}
                  color={ACTIVITY_COLORS[key] ?? '#6366f1'}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pain metrics */}
      <div className="mt-5 pt-4 border-t border-admin-border space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-admin-fg-muted">Clients reporting movement pain</span>
          <span className={`text-sm font-semibold ${painPct >= 30 ? 'text-amber-400' : 'text-muted-foreground'}`}>
            {painPct}%
            <span className="text-xs font-normal text-muted-foreground ml-1">({painReported} of {uniqueClientCount})</span>
          </span>
        </div>

        {hasPainBreakdown && (
          <div className="grid grid-cols-3 gap-2 pt-1">
            {([
              { key: 'ohs',   label: 'Overhead Squat' },
              { key: 'hinge', label: 'Hip Hinge' },
              { key: 'lunge', label: 'Lunge' },
            ] as const).map(({ key, label }) => {
              const count = painByMovement![key];
              const pct   = uniqueClientCount > 0 ? Math.round((count / uniqueClientCount) * 100) : 0;
              return (
                <div key={key} className="rounded-lg bg-muted/80 border border-border px-3 py-2 text-center">
                  <p className="text-sm font-semibold text-amber-400/90">{pct}%</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                  <p className="text-[10px] text-foreground-secondary">{count} client{count !== 1 ? 's' : ''}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
