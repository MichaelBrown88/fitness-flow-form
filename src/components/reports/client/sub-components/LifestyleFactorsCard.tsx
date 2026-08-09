import React from 'react';
import {
  Activity,
  Armchair,
  Coffee,
  Droplet,
  Moon,
  Salad,
  Wine,
  Zap,
} from 'lucide-react';
import type { FormData } from '@/contexts/FormContext';

interface LifestyleFactorsCardProps {
  formData?: FormData;
}

type Tone = 'good' | 'concern' | 'critical' | 'unknown';

interface Factor {
  id: string;
  label: string;
  value: string;
  tone: Tone;
  icon: React.ComponentType<{ className?: string }>;
}

/**
 * Lifestyle factor grid — replaces the old thin LifestyleFactorsBar.
 * Eight rows covering sleep, stress, nutrition, hydration, activity,
 * sedentary time, caffeine and alcohol. Each row carries a tonal chip
 * (good / concern / critical) so the coach reads health at a glance.
 *
 * Designed to live inside PillarCard's children slot — no outer card
 * chrome, just rows.
 */
export const LifestyleFactorsCard: React.FC<LifestyleFactorsCardProps> = ({ formData }) => {
  if (!formData) {
    return (
      <p className="text-sm text-muted-foreground">
        Lifestyle inputs were not captured for this assessment.
      </p>
    );
  }

  const factors: Factor[] = [];

  // ─── Sleep ────────────────────────────────────────────────────
  const sleepArch = (formData.sleepArchetype || '').toLowerCase();
  const sleepQ = (formData.sleepQuality || '').toLowerCase();
  const sleepC = (formData.sleepConsistency || '').toLowerCase();
  const sleepDur = (formData.sleepDuration || '').toLowerCase();
  if (sleepArch || sleepQ || sleepDur) {
    const sleepLabel = sleepArch
      ? capitalise(sleepArch.replace(/[-_]/g, ' '))
      : [sleepDur, sleepQ].filter(Boolean).map(capitalise).join(' · ');
    let tone: Tone = 'good';
    if (sleepArch.includes('disrupted') || sleepArch.includes('insufficient') || sleepQ === 'poor') {
      tone = 'critical';
    } else if (sleepArch.includes('fragmented') || sleepQ === 'fair' || sleepC.includes('inconsistent')) {
      tone = 'concern';
    }
    factors.push({ id: 'sleep', label: 'Sleep', value: sleepLabel || '—', tone, icon: Moon });
  }

  // ─── Stress ───────────────────────────────────────────────────
  const stress = (formData.stressLevel || '').toLowerCase();
  if (stress) {
    let tone: Tone = 'good';
    if (stress === 'very-high' || stress === 'high') tone = 'critical';
    else if (stress === 'moderate' || stress.includes('moderate')) tone = 'concern';
    factors.push({ id: 'stress', label: 'Stress', value: capitalise(stress.replace(/-/g, ' ')), tone, icon: Zap });
  }

  // ─── Nutrition ────────────────────────────────────────────────
  const nutrition = (formData.nutritionHabits || '').toLowerCase();
  if (nutrition) {
    let tone: Tone = 'good';
    if (nutrition === 'poor') tone = 'critical';
    else if (nutrition === 'fair') tone = 'concern';
    factors.push({ id: 'nutrition', label: 'Nutrition', value: capitalise(nutrition), tone, icon: Salad });
  }

  // ─── Hydration ────────────────────────────────────────────────
  const hydration = (formData.hydrationHabits || '').toLowerCase();
  if (hydration) {
    let tone: Tone = 'good';
    if (hydration === 'poor') tone = 'critical';
    else if (hydration === 'fair') tone = 'concern';
    factors.push({ id: 'hydration', label: 'Hydration', value: capitalise(hydration), tone, icon: Droplet });
  }

  // ─── Activity (steps) ─────────────────────────────────────────
  const steps = parseFloat(formData.stepsPerDay || '0');
  if (steps > 0) {
    let tone: Tone = 'good';
    if (steps < 5000) tone = 'critical';
    else if (steps < 7500) tone = 'concern';
    factors.push({
      id: 'activity',
      label: 'Activity',
      value: `${formatThousands(steps)} steps / day`,
      tone,
      icon: Activity,
    });
  } else if (formData.activityLevel) {
    factors.push({
      id: 'activity',
      label: 'Activity level',
      value: capitalise((formData.activityLevel || '').replace(/-/g, ' ')),
      tone: 'good',
      icon: Activity,
    });
  }

  // ─── Sedentary ────────────────────────────────────────────────
  const sedentary = parseFloat(formData.sedentaryHours || '0');
  if (sedentary > 0) {
    let tone: Tone = 'good';
    if (sedentary >= 10) tone = 'critical';
    else if (sedentary >= 8) tone = 'concern';
    factors.push({
      id: 'sedentary',
      label: 'Sedentary',
      value: `${sedentary.toFixed(sedentary % 1 === 0 ? 0 : 1)} h / day`,
      tone,
      icon: Armchair,
    });
  }

  // ─── Caffeine ─────────────────────────────────────────────────
  const cups = parseFloat(formData.caffeineCupsPerDay || '0');
  const lastCaffeine = formData.lastCaffeineIntake || '';
  if (cups > 0 || lastCaffeine) {
    let tone: Tone = 'good';
    const cutoff = parseInt((lastCaffeine.split(':')[0] || '0'), 10);
    if (cups >= 5 || (lastCaffeine && cutoff >= 16)) tone = 'critical';
    else if (cups >= 3 || (lastCaffeine && cutoff >= 14)) tone = 'concern';
    const parts = [];
    if (cups > 0) parts.push(`${cups} cup${cups === 1 ? '' : 's'}`);
    if (lastCaffeine) parts.push(`last ${formatTime(lastCaffeine)}`);
    factors.push({ id: 'caffeine', label: 'Caffeine', value: parts.join(' · '), tone, icon: Coffee });
  }

  // ─── Alcohol ──────────────────────────────────────────────────
  const alcohol = (formData.alcoholFrequency || '').toLowerCase();
  if (alcohol) {
    let tone: Tone = 'good';
    if (alcohol.includes('daily') || alcohol.includes('most')) tone = 'critical';
    else if (alcohol.includes('week')) tone = 'concern';
    factors.push({ id: 'alcohol', label: 'Alcohol', value: capitalise(alcohol.replace(/-/g, ' ')), tone, icon: Wine });
  }

  if (factors.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Lifestyle inputs were not captured for this assessment.
      </p>
    );
  }

  return (
    <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
      {factors.map((f) => (
        <FactorRow key={f.id} factor={f} />
      ))}
    </div>
  );
};

function iconToneClasses(tone: Tone): string {
  if (tone === 'good') return 'bg-score-green-light text-score-green-fg';
  if (tone === 'concern') return 'bg-score-amber-light text-score-amber-fg';
  if (tone === 'critical') return 'bg-score-red-light text-score-red-fg';
  return 'bg-card-elevated text-foreground-secondary';
}

function FactorRow({ factor }: { factor: Factor }) {
  const Icon = factor.icon;
  return (
    <div className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 border-b border-border py-2.5 last:border-b-0">
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconToneClasses(factor.tone)}`}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-col gap-px">
        <span className="text-[10px] font-bold uppercase tracking-[0.10em] text-muted-foreground">
          {factor.label}
        </span>
        <span className="truncate text-[13px] font-semibold tracking-[-0.005em] text-foreground">
          {factor.value}
        </span>
      </span>
      <ToneChip tone={factor.tone} />
    </div>
  );
}

function clientStatusLabel(tone: Tone): string {
  if (tone === 'good') return 'On track';
  if (tone === 'concern') return 'Room to improve';
  if (tone === 'critical') return 'Worth focusing on';
  return '—';
}

function ToneChip({ tone }: { tone: Tone }) {
  const cls =
    tone === 'good'
      ? 'bg-score-green-light text-score-green-fg'
      : tone === 'concern'
        ? 'bg-score-amber-light text-score-amber-fg'
        : tone === 'critical'
          ? 'bg-score-red-light text-score-red-fg'
          : 'bg-muted text-muted-foreground';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cls}`}>
      {clientStatusLabel(tone)}
    </span>
  );
}

function capitalise(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatThousands(n: number): string {
  return n.toLocaleString('en-GB');
}

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':');
  const hour = parseInt(h, 10);
  const minute = m ? parseInt(m, 10) : 0;
  if (Number.isNaN(hour)) return hhmm;
  const period = hour >= 12 ? 'pm' : 'am';
  const display = ((hour + 11) % 12) + 1;
  return minute > 0 ? `${display}:${String(minute).padStart(2, '0')} ${period}` : `${display} ${period}`;
}
