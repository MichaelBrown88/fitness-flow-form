import React from 'react';
import type { ScoreSummary, RoadmapPhase } from '@/lib/scoring';
import RoadmapTimeline from './RoadmapTimeline';

export default function ClientReport({ scores, roadmap }: { scores: ScoreSummary; roadmap: RoadmapPhase[] }) {
  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h3 className="text-xl font-semibold text-slate-900">Your Fitness Summary</h3>
        <div className="rounded-lg border border-slate-200 p-4 bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Overall score</span>
            <span className="text-2xl font-bold">{scores.overall}</span>
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-slate-200">
            <div className="h-2 rounded-full bg-green-600" style={{ width: `${scores.overall}%` }} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {scores.categories.map((cat) => (
          <div key={cat.id} className="rounded-lg border border-slate-200 p-4 bg-white shadow-sm">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-900">{cat.title}</h4>
              <span className="text-lg font-bold">{cat.score}</span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
              <div className="h-2 rounded-full bg-slate-900" style={{ width: `${cat.score}%` }} />
            </div>
            <ul className="mt-3 grid gap-2">
              {cat.details.map((d) => (
                <li key={d.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{d.label}</span>
                  <span className="font-medium text-slate-900">
                    {d.value}{d.unit ? ` ${d.unit}` : ''}
                  </span>
                </li>
              ))}
            </ul>
            {(cat.strengths.length > 0 || cat.weaknesses.length > 0) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {cat.strengths.map((s, i) => (
                  <span key={`s-${i}`} className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                    Strength: {s}
                  </span>
                ))}
                {cat.weaknesses.map((w, i) => (
                  <span key={`w-${i}`} className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                    Focus: {w}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h3 className="text-xl font-semibold text-slate-900">Your Roadmap</h3>
        <RoadmapTimeline phases={roadmap} />
      </section>
    </div>
  );
}


