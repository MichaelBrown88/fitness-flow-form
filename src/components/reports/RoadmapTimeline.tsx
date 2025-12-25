import React from 'react';
import type { RoadmapPhase } from '@/lib/scoring';

export default function RoadmapTimeline({ phases }: { phases: RoadmapPhase[] }) {
  const totalWeeks = phases.reduce((acc, p) => acc + p.weeks, 0) || 1;
  return (
    <div className="space-y-4">
      <div className="relative w-full rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-stretch gap-2">
          {phases.map((p, idx) => {
            const widthPct = (p.weeks / totalWeeks) * 100;
            return (
              <div
                key={idx}
                className="rounded-md border border-slate-200 bg-slate-50 p-3"
                style={{ width: `${widthPct}%` }}
              >
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-semibold text-slate-900 truncate pr-2">{p.title}</h5>
                  <span className="text-[10px] text-slate-500 whitespace-nowrap">{p.weeks} wk</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
                  <div
                    className="h-2 rounded-full bg-green-600"
                    style={{ width: `${Math.min(100, p.expectedDelta)}%` }}
                    title={`Expected improvement ~${p.expectedDelta}%`}
                  />
                </div>
                <div className="mt-2 text-[11px] text-slate-600 line-clamp-2">{p.rationale}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {phases.map((p, idx) => (
          <div key={`focus-${idx}`} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <h6 className="font-semibold text-slate-900">{p.title}</h6>
              <span className="text-xs text-green-700">~+{p.expectedDelta}%</span>
            </div>
            <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
              {p.focus.slice(0, 4).map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        ))}
      </div>
      
      {/* Disclaimer */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mt-6">
        <p className="text-xs text-amber-900 leading-relaxed">
          <strong className="font-semibold">Important:</strong> These timeframes are estimates based on typical response rates and assume consistent adherence to the program. 
          Individual results vary significantly based on genetics, adherence, lifestyle factors, and other variables. 
          These projections do not account for missed sessions, travel, illness, or other interruptions. 
          Adherence to the plan, consistency with training and nutrition, and following coach guidance are essential for achieving these timelines. 
          These are not guarantees, and your actual progress may be faster or slower than projected.
        </p>
      </div>
    </div>
  );
}


