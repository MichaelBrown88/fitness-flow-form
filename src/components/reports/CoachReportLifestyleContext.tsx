/**
 * Lifestyle & Recovery Context - coaching context from client lifestyle form data
 */

import React from 'react';
import { Moon } from 'lucide-react';
import type { FormData } from '@/contexts/FormContext';

const SLEEP_DUR_LABELS: Record<string, string> = {
  'less-than-7': 'Less than 7 hours',
  '7-9': '7–9 hours',
  'more-than-9': 'More than 9 hours',
};

const FACTORS: Array<{ key: keyof FormData; label: string; getNote: (v: string) => string }> = [
  { key: 'sleepQuality', label: 'Sleep quality', getNote: (v) => ['poor', 'fair'].includes(v) ? 'Poor sleep may impact recovery – consider adjusted volume' : 'Sleep quality supports recovery.' },
  { key: 'sleepDuration', label: 'Sleep duration', getNote: (v) => v === 'less-than-7' ? 'Short sleep duration may limit adaptation – prioritize sleep hygiene' : 'Sleep duration appears adequate.' },
  { key: 'stressLevel', label: 'Stress level', getNote: (v) => ['high', 'very-high'].includes(v) ? 'High stress reported – prioritize stress-reducing modalities' : 'Stress level is manageable.' },
  { key: 'nutritionHabits', label: 'Nutrition', getNote: (v) => ['poor', 'fair'].includes(v) ? 'Diet quality may limit gains – consider nutrition support' : 'Nutrition habits support goals.' },
  { key: 'hydrationHabits', label: 'Hydration', getNote: (v) => ['poor', 'fair'].includes(v) ? 'Hydration could limit performance – encourage consistent intake' : 'Hydration habits are supportive.' },
  { key: 'alcoholFrequency', label: 'Alcohol', getNote: (v) => ((v || '').toLowerCase().includes('frequent') || (v || '').toLowerCase().includes('daily')) ? 'Alcohol use may impede recovery – discuss moderation strategies' : 'Alcohol consumption within reasonable range.' },
];

function formatVal(key: string, raw: string): string {
  if (key === 'sleepDuration' && raw) return SLEEP_DUR_LABELS[raw] ?? raw;
  if (!raw) return raw;
  return raw.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

export function CoachReportLifestyleContext({ formData }: { formData: FormData }) {
  const rows = FACTORS.map(({ key, label, getNote }) => {
    const raw = (formData[key] as string)?.trim?.() ?? '';
    if (!raw) return null;
    return { label, val: formatVal(key, raw), note: getNote(raw.toLowerCase()) };
  }).filter(Boolean) as Array<{ label: string; val: string; note: string }>;
  if (rows.length === 0) return null;

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-indigo-600 p-2 rounded-lg">
          <Moon className="h-5 w-5 text-white" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">Lifestyle & Recovery Context</h3>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          {rows.map((r, i) => (
            <div key={i} className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
              <div className="flex gap-2 sm:min-w-[180px]">
                <span className="font-semibold text-slate-700">{r.label}:</span>
                <span className="text-slate-600">{r.val}</span>
              </div>
              <p className="text-sm text-slate-600 italic">{r.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
