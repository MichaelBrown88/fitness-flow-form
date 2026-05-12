/**
 * AXIS Explorations — internal design comparison.
 *
 * Hero showcase of the AXIS Pentagon — a symmetric cohesive shape
 * built from five score-driven wedges, one per pillar. At equal scores
 * the pentagon is perfectly symmetric; asymmetric scores produce a
 * jagged silhouette that visualises imbalance directly.
 *
 * Sections:
 *   1. Cinematic dark hero — the full AXIS Pentagon at the chosen preset.
 *   2. Symmetry test — all five presets rendered side-by-side so you
 *      can verify "balanced" → perfectly symmetric pentagon.
 *   3. Branding stamp preview — single PillarWedge in section headers.
 *   4. Per-pillar score evolution — wedge filling 0 → 100.
 *   5. Side-by-side contrast with the current AXIS Bloom.
 */

import React, { useMemo, useState } from 'react';
import OverallRadarChart, { type RadarData } from '@/components/reports/OverallRadarChart';
import AxisPentagonHero, {
  PillarWedge,
} from '@/components/reports/axis-explorations/AxisPentagon';

type PresetKey = 'mixed' | 'strong' | 'weak' | 'balanced' | 'lopsided';

const PRESETS: Record<PresetKey, number[]> = {
  mixed: [72, 58, 81, 64, 47],
  strong: [88, 84, 91, 86, 82],
  weak: [34, 28, 41, 30, 22],
  balanced: [65, 65, 65, 65, 65],
  lopsided: [92, 28, 88, 24, 71],
};

const PILLARS: Array<{ name: string; full: string; color: string }> = [
  { name: 'Body', full: 'Body Composition', color: '#06b6d4' },
  { name: 'Strength', full: 'Functional Strength', color: '#f43f5e' },
  { name: 'Cardio', full: 'Metabolic Fitness', color: '#f59e0b' },
  { name: 'Movement', full: 'Movement Quality', color: '#6366f1' },
  { name: 'Lifestyle', full: 'Lifestyle Factors', color: '#10b981' },
];

function buildData(values: number[]): RadarData[] {
  return PILLARS.map((p, i) => ({
    name: p.name,
    fullLabel: p.full,
    value: values[i] ?? 0,
    color: p.color,
  }));
}

function presetLabel(key: PresetKey): string {
  switch (key) {
    case 'mixed': return 'Mixed (realistic)';
    case 'strong': return 'Strong (all 80+)';
    case 'weak': return 'Weak (all <45)';
    case 'balanced': return 'Balanced (all 65)';
    case 'lopsided': return 'Lopsided (extreme split)';
  }
}

const SECTION_DESCRIPTIONS: Record<string, string> = {
  Body: 'Lean mass, fat distribution, hydration markers',
  Strength: 'Functional load capacity across compound patterns',
  Cardio: 'VO₂ profile, recovery, aerobic baseline',
  Movement: 'Mobility, range, kinetic chain quality',
  Lifestyle: 'Sleep, nutrition, stress, recovery habits',
};

const DARK_FRAME_VARS: React.CSSProperties = {
  '--background': '220 32% 4%',
  '--foreground': '220 12% 92%',
  '--muted-foreground': '220 12% 62%',
  '--border': '220 12% 22%',
} as React.CSSProperties;

export default function AxisExplorations() {
  const [preset, setPreset] = useState<PresetKey>('balanced');
  const data = useMemo(() => buildData(PRESETS[preset]), [preset]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Internal · Design exploration
          </p>
          <h1 className="text-3xl font-bold tracking-tight">AXIS Pentagon</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Five pillar wedges of one shared pentagon. At equal scores the
            shape is perfectly symmetric; asymmetric scores produce a jagged
            silhouette that reads imbalance at a glance. Each wedge can be
            lifted out as a standalone branding stamp for its pillar section.
          </p>
        </header>

        {/* Preset switcher */}
        <div className="mb-8 flex flex-wrap items-center gap-2">
          <span className="mr-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Preset
          </span>
          {(Object.keys(PRESETS) as PresetKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setPreset(key)}
              className={
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors ' +
                (preset === key
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-transparent text-muted-foreground hover:text-foreground')
              }
            >
              {presetLabel(key)}
            </button>
          ))}
          <span className="ml-3 font-mono text-xs text-muted-foreground">
            [{PRESETS[preset].join(', ')}]
          </span>
        </div>

        {/* Hero — dark cinematic frame */}
        <section
          className="relative mb-12 overflow-hidden rounded-3xl border border-white/10"
          style={{
            background:
              'radial-gradient(120% 90% at 50% 35%, #0a0f1f 0%, #05070d 60%, #02030a 100%)',
            color: 'hsl(220 12% 92%)',
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(60% 50% at 50% 50%, rgba(80,140,200,0.08) 0%, rgba(0,0,0,0) 70%)',
            }}
          />
          <div className="relative px-6 py-10 sm:px-10 sm:py-14">
            <div className="mb-6 flex items-baseline justify-between gap-3">
              <p
                className="text-[10px] font-bold tracking-[0.32em] text-white/55"
                style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
              >
                AXIS · ASSESSMENT SIGNATURE
              </p>
              <p
                className="text-[10px] font-medium tracking-[0.18em] text-white/40 tabular-nums"
                style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
              >
                REV.A · 2026
              </p>
            </div>

            <div
              className="relative mx-auto aspect-square w-full max-w-[680px]"
              style={DARK_FRAME_VARS}
            >
              <AxisPentagonHero data={data} />
            </div>
          </div>
        </section>

        {/* Symmetry test — proves the cohesive-shape property */}
        <section className="mb-12">
          <h2 className="mb-1 text-lg font-bold tracking-tight">
            Symmetry test
          </h2>
          <p className="mb-6 text-xs text-muted-foreground">
            Each preset rendered the same size. <strong className="text-foreground">Balanced</strong>{' '}
            and <strong className="text-foreground">Strong</strong> produce a
            perfectly symmetric pentagon. Mixed and lopsided produce
            asymmetric silhouettes — the imbalance becomes the message.
          </p>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {(Object.keys(PRESETS) as PresetKey[]).map((key) => (
              <article
                key={key}
                className="flex flex-col rounded-2xl border border-border bg-card p-3"
              >
                <div className="aspect-square w-full">
                  <AxisPentagonHero data={buildData(PRESETS[key])} />
                </div>
                <div className="mt-2 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground">
                    {presetLabel(key)}
                  </p>
                  <p
                    className="mt-0.5 text-[10px] tabular-nums text-muted-foreground"
                    style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                  >
                    [{PRESETS[key].join(',')}]
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Branding-stamp preview — how each wedge looks beside a section header */}
        <section className="mb-12">
          <h2 className="mb-1 text-lg font-bold tracking-tight">
            Wedge as a branding stamp
          </h2>
          <p className="mb-6 text-xs text-muted-foreground">
            One pillar's wedge, lifted out and rendered standalone — pointing
            up, in pillar colour, with its tip glyph identifier. Same
            component as the hero — different context.
          </p>
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {PILLARS.map((p, i) => (
              <div key={p.name} className="flex items-center gap-5 px-5 py-4">
                <PillarWedge
                  pillarName={p.full}
                  score={data[i].value}
                  size={56}
                  index={i}
                />
                <div className="flex-1">
                  <h3 className="text-sm font-bold tracking-tight">{p.full}</h3>
                  <p className="text-xs text-muted-foreground">
                    {SECTION_DESCRIPTIONS[p.name]}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className="text-2xl font-bold tabular-nums"
                    style={{ letterSpacing: '-0.03em' }}
                  >
                    {data[i].value}
                  </p>
                  <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    /100
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Per-wedge score evolution */}
        <section className="mb-12">
          <h2 className="mb-1 text-lg font-bold tracking-tight">
            How each wedge fills with score
          </h2>
          <p className="mb-6 text-xs text-muted-foreground">
            Each row is one pillar; columns show score 0 → 100 in 25-point
            increments. Five concentric facets light up from inside out as
            score climbs.
          </p>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="grid grid-cols-[120px_repeat(5,1fr)] items-center border-b border-border bg-muted/40 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              <span>Pillar</span>
              {[0, 25, 50, 75, 100].map((s) => (
                <span key={s} className="text-center font-mono">{s}</span>
              ))}
            </div>
            {PILLARS.map((p, i) => (
              <div
                key={p.name}
                className="grid grid-cols-[120px_repeat(5,1fr)] items-center border-b border-border px-3 py-3 last:border-b-0"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                  {p.name}
                </span>
                {[0, 25, 50, 75, 100].map((s) => (
                  <div key={s} className="flex justify-center">
                    <PillarWedge pillarName={p.full} score={s} size={64} index={i} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* Side-by-side: new hero vs current Bloom */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <article className="flex flex-col rounded-2xl border border-border bg-card p-5">
            <header className="mb-4">
              <h2 className="text-lg font-bold tracking-tight">AXIS Pentagon</h2>
              <p className="text-xs text-muted-foreground">
                New direction — light-mode rendering
              </p>
            </header>
            <div className="aspect-square w-full">
              <AxisPentagonHero data={data} />
            </div>
          </article>
          <article className="flex flex-col rounded-2xl border border-border bg-card p-5">
            <header className="mb-4">
              <h2 className="text-lg font-bold tracking-tight">AXIS Bloom (current)</h2>
              <p className="text-xs text-muted-foreground">
                For contrast — the existing five-petal version
              </p>
            </header>
            <div className="aspect-square w-full">
              <OverallRadarChart data={data} />
            </div>
          </article>
        </section>

        <footer className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
          Sample data only. The PillarWedge component is built to be reused
          throughout the report — once you sign off, I&apos;ll thread it
          through section headers and replace OverallRadarChart with the
          AxisPentagonHero.
        </footer>
      </div>
    </div>
  );
}
